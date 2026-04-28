<script setup>
import axios from 'axios';
import { onMounted, ref } from 'vue';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import { API_BASE_URL } from '@/store';

let orders = ref([]);
const shown = ref(null);

const showDeleteOrderDialog = ref(false);
const orderToDeleteId = ref(null);
const showCloseDayDialog = ref(false);

onMounted(() => {
  getOrders();
});

async function getOrders() {
  try {
    const response = await axios.get(`${API_BASE_URL}/orders`);
    orders.value = response.data;
    console.log('Orders retrieved successfully', orders.value);

  } catch (e) {
    console.error('Error retrieving orders:', e);
  }
}

function confirmDeleteOrder(id, event) {
  event.stopPropagation();
  orderToDeleteId.value = id;
  showDeleteOrderDialog.value = true;
}

function cancelDeleteOrder() {
  showDeleteOrderDialog.value = false;
  orderToDeleteId.value = null;
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
  }
}

function toggleOrder(id) {
  shown.value = shown.value === id ? null : id;
}

async function exportToExcel() {
  const mappedOrders = orders.value.map(order => ({
    ID: order.id,
    Totale: order.totalPrice + "€",
    Articoli: order.items.map(i => `${i.name} x${i.quantity}`).join(", "),
    Data: new Date().toLocaleDateString('it-IT')
  }));

  const totalSum = orders.value.reduce((sum, order) => sum + order.totalPrice, 0);
  mappedOrders.push({});
  mappedOrders.push({
    ID: 'TotaleGiornata',
    Totale: totalSum + "€",
    Articoli: ''
  });

  const worksheet = XLSX.utils.json_to_sheet(mappedOrders);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

  // buffer to convert workbook into binary
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  // downloadable file from browser (blob)
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });

  // download the file locally
  saveAs(data, `orders_${new Date().toISOString().slice(0, 10)}.xlsx`);

  try {
    await axios.post(`${API_BASE_URL}/export-excel`, {
      orders: orders.value
    }, {
      withCredentials: true
    });
    console.log('Excel file saved on server');
  } catch (error) {
    console.error('Error saving Excel on server:', error);
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
    exportToExcel();

    const res = await axios.post(`${API_BASE_URL}/orders/close-day`);

    if (res.status === 200) {
      orders.value = [];
      shown.value = null;
      console.log("Giornata chiusa con successo!");
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

    <div class="flex flex-col items-center gap-3">
      <Card v-for="order in orders" :key="order.id" class="w-full max-w-2xl rounded-2xl border-2 border-slate-200/70 bg-white/85 backdrop-blur-sm">
        <template #content>
          <div class="flex cursor-pointer items-center justify-between gap-3" @click="toggleOrder(order.id)">
            <div class="flex flex-wrap items-center gap-2">
              <strong class="text-lg text-zinc-900">Ordine #{{ order.id }}</strong>
              <Tag
                :value="order.status"
                :severity="order.status === 'completato' ? 'success' : order.status === 'parziale' ? 'warn' : 'info'"
                class="capitalize px-3 py-1"
              />
            </div>
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              class="rounded-xl transition-colors hover:bg-red-100"
              @click="confirmDeleteOrder(order.id, $event)"
            />
          </div>

          <div v-if="shown === order.id" class="mt-3 border-t border-zinc-200 pt-3">
            <ul class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <li
                v-for="(item, index) in order.items"
                :key="index"
                class="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <span class="text-sm font-medium text-zinc-800">{{ item.name }}</span>
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
                Sei sicuro di voler eliminare l'ordine <span class="font-semibold text-slate-900">#{{ orderToDeleteId }}</span>?
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
                <p class="text-sm font-medium text-red-700">Questa operazione esporta e <span class="font-bold underline">cancella tutti gli ordini</span> di oggi.</p>
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