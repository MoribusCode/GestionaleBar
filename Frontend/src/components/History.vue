<script setup>
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';
import { saveAs } from 'file-saver';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import ToggleSwitch from 'primevue/toggleswitch';
import { API_BASE_URL } from '@/store';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const isAdmin = computed(() => userStore.user?.role === 'admin');

let orders = ref([]);
const shown = ref(null);

const ALL_BARS = 'all'; // PrimeVue Dropdown tratta null/'' come "nessuna selezione": serve un valore non vuoto
const bars = ref([]);
const selectedBarId = ref(ALL_BARS);

const showDeleteOrderDialog = ref(false);
const orderToDeleteId = ref(null);
const orderToDeleteNumber = ref(null);
const showCloseDayDialog = ref(false);

onMounted(() => {
  getOrders();
  if (isAdmin.value) {
    fetchBars();
  } else {
    fetchPrintTags();
  }
});

async function fetchBars() {
  try {
    const res = await axios.get(`${API_BASE_URL}/bars`, { withCredentials: true });
    bars.value = res.data.bars || [];
  } catch (error) {
    console.error('Errore nel recupero dei bar:', error);
  }
}

const barFilterOptions = computed(() => [
  { value: ALL_BARS, label: 'Tutti i bar' },
  ...bars.value.map((bar) => ({ value: bar.id, label: `Bar #${bar.id} - ${bar.printer_ip}` }))
]);

async function getOrders() {
  try {
    const params = isAdmin.value && selectedBarId.value !== ALL_BARS ? { bar_id: selectedBarId.value } : {};
    const response = await axios.get(`${API_BASE_URL}/orders`, { params });
    orders.value = response.data;
    console.log('Orders retrieved successfully', orders.value);

  } catch (e) {
    console.error('Error retrieving orders:', e);
  }
}

function confirmDeleteOrder(order, event) {
  event.stopPropagation();
  orderToDeleteId.value = order.id;
  orderToDeleteNumber.value = order.orderNumber;
  showDeleteOrderDialog.value = true;
}

function cancelDeleteOrder() {
  showDeleteOrderDialog.value = false;
  orderToDeleteId.value = null;
  orderToDeleteNumber.value = null;
}

async function proceedDeleteOrder() {
  if (!orderToDeleteId.value) return;
  const id = orderToDeleteId.value;

  try {
    const res = await axios.delete(`${API_BASE_URL}/delete-order/${id}`);
    if (res.status === 200) {
      orders.value = orders.value.filter(order => order.id !== id);
      if (shown.value === id) {
        shown.value = null; // Collapse if the deleted order was expanded
      }
    }
  } catch (e) {
    console.error(`Error deleting order ${id}:`, e);
  } finally {
    showDeleteOrderDialog.value = false;
    orderToDeleteId.value = null;
    orderToDeleteNumber.value = null;
  }
}

function onBarFilterChange() {
  getOrders();
}

function toggleOrder(id) {
  shown.value = shown.value === id ? null : id;
}

const reprintingId = ref(null);

async function reprintOrder(id, event) {
  event.stopPropagation();
  if (reprintingId.value) return;

  reprintingId.value = id;
  try {
    await axios.post(`${API_BASE_URL}/orders/${id}/reprint`, {}, { withCredentials: true });
  } catch (e) {
    console.error(`Errore durante la ristampa dell'ordine ${id}:`, e);
    alert(e.response?.data?.message || 'Errore durante la ristampa dello scontrino');
  } finally {
    reprintingId.value = null;
  }
}

const completingId = ref(null);
const completingAll = ref(false);

async function completeOrder(id, event) {
  event?.stopPropagation();
  if (completingId.value || completingAll.value) return;

  completingId.value = id;
  try {
    await axios.put(`${API_BASE_URL}/orders/${id}/complete`, {}, { withCredentials: true });
    const order = orders.value.find(o => o.id === id);
    if (order) order.status = 'completato';
  } catch (e) {
    console.error(`Errore durante il completamento dell'ordine ${id}:`, e);
    alert(e.response?.data?.message || 'Errore durante il completamento dell\'ordine');
  } finally {
    completingId.value = null;
  }
}

async function completeAllOrders() {
  if (completingId.value || completingAll.value) return;

  const toComplete = orders.value.filter(o => o.status !== 'completato');
  if (toComplete.length === 0) return;

  completingAll.value = true;
  try {
    await Promise.all(
      toComplete.map(o => axios.put(`${API_BASE_URL}/orders/${o.id}/complete`, {}, { withCredentials: true }))
    );
    for (const order of toComplete) {
      order.status = 'completato';
    }
  } catch (e) {
    console.error('Errore durante il completamento di tutti gli ordini:', e);
    alert('Errore durante il completamento di alcuni ordini');
  } finally {
    completingAll.value = false;
  }
}

// abilita/disabilita la stampa dei tagliandini postazione per il proprio bar (cassa/postazione,
// senza dover passare da Gestione Bar che è riservata all'admin)
const printTags = ref(true);
const printTagsLoaded = ref(false);

async function fetchPrintTags() {
  try {
    const res = await axios.get(`${API_BASE_URL}/bar/print-tags`, { withCredentials: true });
    printTags.value = !!res.data.print_tags;
    printTagsLoaded.value = true;
  } catch (e) {
    console.error('Errore nel recupero dello stato tagliandini:', e);
  }
}

async function onPrintTagsChange() {
  try {
    await axios.put(`${API_BASE_URL}/bar/print-tags`, { print_tags: printTags.value }, { withCredentials: true });
  } catch (e) {
    console.error('Errore nel salvataggio dello stato tagliandini:', e);
    printTags.value = !printTags.value; // rollback se la chiamata fallisce
  }
}

// stesso registro "Vendite Bar" generato dalla chiusura giornata (colonne per prodotto,
// formule, evidenziazione weekend), scaricato per gli ordini attualmente aperti senza chiuderli
async function exportToExcel() {
  try {
    const params = isAdmin.value && selectedBarId.value !== ALL_BARS ? { bar_id: selectedBarId.value } : {};
    const response = await axios.get(`${API_BASE_URL}/export-excel`, {
      params,
      withCredentials: true,
      responseType: 'blob'
    });

    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const fileName = match ? match[1] : `venditeBar_${new Date().toISOString().slice(0, 10)}.xlsx`;

    saveAs(response.data, fileName);
  } catch (error) {
    console.error('Errore nell\'esportazione Excel:', error);
  }
}

function confirmCloseDay() {
  showCloseDayDialog.value = true;
}

function cancelCloseDay() {
  showCloseDayDialog.value = false;
}

async function proceedCloseDay() {
  showCloseDayDialog.value = false;

  try {
    // Il server chiude tutti i bar se admin, solo il proprio altrimenti; crea una
    // transazione e un file Excel per ciascun bar coinvolto
    const res = await axios.post(`${API_BASE_URL}/orders/close-day`);

    if (res.status === 200) {
      orders.value = [];
      shown.value = null;
      console.log("Giornata chiusa con successo!", res.data);
    }
  } catch (e) {
    console.error("Errore durante la chiusura della giornata:", e);
  }
}

</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-36">
    <div class="rounded-2xl border-2 border-slate-200/70 bg-white/85 p-4 backdrop-blur-sm">
      <h1 class="text-center text-3xl font-black text-zinc-900">Storico ordini</h1>
    </div>

    <div v-if="isAdmin" class="sticky -top-3 z-10 flex items-center justify-end gap-2 bg-slate-100 py-2">
      <label class="text-sm font-semibold text-slate-600">Bar</label>
      <Dropdown
        v-model="selectedBarId"
        :options="barFilterOptions"
        optionLabel="label"
        optionValue="value"
        class="w-64 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-700 focus:bg-white"
        @change="onBarFilterChange"
      />
    </div>

    <div v-if="!isAdmin && printTagsLoaded" class="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-sm">
      <div class="min-w-0">
        <label class="text-sm font-semibold text-slate-700">Stampa tagliandini postazione</label>
        <p class="mt-0.5 text-xs text-slate-400">Se disattivato, alla stampa esce solo lo scontrino principale, senza i tagliandini per le postazioni</p>
      </div>
      <ToggleSwitch v-model="printTags" class="shrink-0" @change="onPrintTagsChange" />
    </div>

    <div class="flex flex-col items-center gap-3">
      <Card v-for="order in orders" :key="order.id" class="w-full max-w-2xl rounded-2xl border-2 border-slate-200/70 bg-white/85 backdrop-blur-sm">
        <template #content>
          <div class="flex cursor-pointer items-center justify-between gap-3" @click="toggleOrder(order.id)">
            <div class="flex flex-wrap items-center gap-2">
              <strong class="text-lg text-zinc-900">Ordine #{{ order.orderNumber }}</strong>
              <Tag
                :value="order.status"
                :severity="order.status === 'completato' ? 'success' : order.status === 'parziale' ? 'warn' : 'info'"
                class="capitalize px-3 py-1"
              />
            </div>
            <div class="flex items-center gap-1">
              <Button
                v-if="order.status !== 'completato'"
                icon="pi pi-check"
                :loading="completingId === order.id"
                text
                rounded
                class="rounded-xl text-emerald-600 transition-colors hover:bg-emerald-100"
                v-tooltip="'Completa ordine'"
                @click="completeOrder(order.id, $event)"
              />
              <Button
                icon="pi pi-print"
                :loading="reprintingId === order.id"
                text
                rounded
                class="rounded-xl text-slate-600 transition-colors hover:bg-slate-200/70"
                v-tooltip="'Ristampa scontrino'"
                @click="reprintOrder(order.id, $event)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                class="rounded-xl transition-colors hover:bg-red-100"
                @click="confirmDeleteOrder(order, $event)"
              />
            </div>
          </div>

          <div v-if="shown === order.id" class="mt-3 border-t border-zinc-200 pt-3">
            <ul class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <li
                v-for="(item, index) in order.items"
                :key="index"
                class="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <span class="flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <i
                    v-if="item.status === 'completato'"
                    class="pi pi-check-circle text-green-600"
                    v-tooltip="'Completato'"
                  ></i>
                  <span v-else class="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" v-tooltip="'In attesa'"></span>
                  {{ item.name }}
                </span>
                <span class="text-sm font-semibold text-zinc-700">x{{ item.quantity }}</span>
              </li>
            </ul>

            <div class="mt-3 text-right text-lg font-bold text-zinc-900">
              Totale: {{ order.totalPrice }} €
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div v-if="orders.length === 0" class="rounded-2xl border-2 border-slate-200/70 bg-white/85 p-8 text-center text-zinc-500 backdrop-blur-sm">
      Nessun ordine nello storico.
    </div>

    <div class="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/70 bg-white/95 px-3 py-4 backdrop-blur-sm lg:px-5">
      <div class="mx-auto flex w-full max-w-5xl flex-wrap justify-end gap-3">
        <div v-if="orders.some(o => o.status !== 'completato')" class="rounded-xl border border-slate-200 bg-slate-50/80 p-1">
          <Button
            label="Completa tutti"
            icon="pi pi-check-circle"
            severity="success"
            :loading="completingAll"
            class="h-9! w-40!"
            @click="completeAllOrders"
          />
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-1">
          <Button label="Esporta in Excel" icon="pi pi-file-excel" class="h-9! w-40!" @click="exportToExcel" />
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-1">
          <Button label="Chiudi giornata" severity="danger" icon="pi pi-check-circle" class="h-9! w-40!" @click="confirmCloseDay" />
        </div>
      </div>
    </div>

    <!-- ░░ MODAL: ELIMINA ORDINE ░░ -->
    <Dialog
        v-model:visible="showDeleteOrderDialog"
        modal
        header="Elimina ordine"
        :draggable="false"
        class="dialog w-[92vw] max-w-lg"
        :pt="{ 
            header: { class: 'p-4 pb-4' },
            content: { class: 'p-4 pt-0' },
            footer: { class: 'p-4 pt-4' },
            closeButton: { class: 'flexxs h-9 w-9 items-center justify-center rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:shadow-none focus:ring-0', style: 'outline:none;box-shadow:none' } 
        }"
    >
        <div class="p-2">
            <div class="mb-4 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3">
                <i class="pi pi-exclamation-triangle text-lg text-red-600"></i>
                <p class="text-sm font-medium text-red-700">Questa operazione non può essere annullata.</p>
            </div>
            <p class="text-sm text-slate-700">
                Sei sicuro di voler eliminare l'ordine <span class="font-semibold text-slate-900">#{{ orderToDeleteNumber }}</span>?
            </p>
        </div>
        <template #footer>
            <div class="flex justify-end gap-3">
                <Button
                    label="Annulla"
                    severity="secondary"
                    outlined
                    class="rounded-full border-slate-300 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-400"
                    @click="cancelDeleteOrder"
                />
                <Button
                    label="Elimina definitivamente"
                    icon="pi pi-trash"
                    class="rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700"
                    @click="proceedDeleteOrder"
                />
            </div>
        </template>
    </Dialog>

    <!-- ░░ MODAL: CHIUDI GIORNATA ░░ -->
    <Dialog
        v-model:visible="showCloseDayDialog"
        modal
        header="Chiudi giornata"
        :draggable="false"
        class="dialog w-[92vw] max-w-lg"
        :pt="{ 
            header: { class: 'p-6 pb-4' },
            content: { class: 'p-6 pt-0' },
            footer: { class: 'p-6 pt-4' },
            closeButton: { class: 'flex h-9 w-9 items-center justify-center rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:shadow-none focus:ring-0', style: 'outline:none;box-shadow:none' } 
        }"
    >
        <div class="p-2">
            <div class="mb-4 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3">
                <i class="pi pi-exclamation-triangle text-lg text-red-600"></i>
                <p class="text-sm font-medium text-red-700">
                  Questa operazione esporta e
                  <span class="font-bold underline">cancella tutti gli ordini {{ isAdmin ? 'di tutti i bar' : 'del tuo bar' }}</span>
                  di oggi.
                </p>
            </div>
            <p class="text-sm text-slate-700">
                Vuoi procedere con la chiusura della giornata?
            </p>
        </div>
        <template #footer>
            <div class="flex justify-end gap-3">
                <Button
                    label="Annulla"
                    severity="secondary"
                    outlined
                    class="rounded-full border-slate-300 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-400"
                    @click="cancelCloseDay"
                />
                <Button
                    label="Chiudi giornata"
                    icon="pi pi-check"
                    class="rounded-full bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-900"
                    @click="proceedCloseDay"
                />
            </div>
        </template>
    </Dialog>
  </div>
</template>

<style scoped>
:deep(.p-card-body) {
  padding: 0;
}

:deep(.p-card-content) {
  padding: 1rem;
}
</style>