<script setup>
import { ref, computed, onMounted, defineProps } from 'vue';
import { io } from 'socket.io-client';
import axios from 'axios';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { API_BASE_URL, SOCKET_PATH, SOCKET_URL } from '@/store';

const props = defineProps({
  category: {
    type: Array,
    required: true
  }
});

const categoryLabel = computed(() => props.category.join(', '));

const orders = ref([]);

// Socket.io SETUP
const socket = io(`${SOCKET_URL}`, {
  path: SOCKET_PATH,
  withCredentials: true,
  transports: ['websocket', 'polling'],

  // recconnect options
  reconnection: true,
});

socket.on('reconnect', () => {
  fetchPendingOrders(); // quando fa il reconnect, faccio un fetch per aggiornare la lista degli ordini
});

// variables for managing the confirmation dialog
const showConfirmDialog = ref(false);
const orderToClose = ref(null);

function filterItemsByCategory(orderItems, categories) {
  const lowerCategories = categories.map((c) => c.toLowerCase());
  return orderItems.filter(item => lowerCategories.includes(item.category.toLowerCase()));
}

// le categorie di questa postazione che compaiono davvero negli articoli dell'ordine
function categoriesInOrder(order) {
  const orderCategories = new Set(order.items.map((item) => item.category.toLowerCase()));
  return props.category.filter((category) => orderCategories.has(category.toLowerCase()));
}

async function fetchPendingOrders() {
  try {
    const res = await axios.get(`${API_BASE_URL}/orders/pending`);

    // creo una nuova lista in modo da non avere duplicati se chiamo di nuovo il fetch
    const newOrders = [];

    res.data.forEach(order => {
      const filtered = filterItemsByCategory(order.items, props.category);
      if (filtered.length > 0) {
        newOrders.push({
          id: order.id,
          items: filtered,
          note: order.note
        });
      }
    });

    // aggiorno la lista degli ordini
    orders.value = newOrders;

  } catch (err) {
    console.error("Errore nel recupero ordini in attesa:", err);
  }
}

// Funzione per chiudere un ordine
async function closeOrder(orderId) {
  orderToClose.value = { id: orderId };
  showConfirmDialog.value = true;
}

// Funzione per gestire la conferma della chiusura
async function handleConfirm() {
  try {
    const order = orders.value.find((o) => o.id === orderToClose.value.id);
    const categoriesToClose = order ? categoriesInOrder(order) : [];

    await Promise.all(
      categoriesToClose.map((category) =>
        axios.put(`${API_BASE_URL}/orders/${orderToClose.value.id}/category/${category}/close`)
      )
    );

    orders.value = orders.value.filter(o => o.id !== orderToClose.value.id);
  } catch (err) {
    console.error("Errore chiusura ordine:", err.response?.data || err.message);
  } finally {
    showConfirmDialog.value = false;
    orderToClose.value = null;
  }
}

// Funzione per gestire la cancellazione della chiusura
function handleCancel() {
  showConfirmDialog.value = false;
  orderToClose.value = null;
}

onMounted(() => {
  fetchPendingOrders();

  socket.on('new-order', (orderData) => {
    const filteredItems = filterItemsByCategory(orderData.items, props.category);
    if (filteredItems.length > 0) {
      orders.value.push({
        id: orderData.id,
        items: filteredItems,
        note: orderData.note
      });
    }
  });
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
    <div class="rounded-2xl border-2 border-slate-200/70 bg-white/85 p-4 backdrop-blur-sm">
      <h1 class="text-center text-3xl font-black capitalize text-zinc-900">Ordini da preparare - {{ categoryLabel }}</h1>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card v-for="order in orders" :key="order.id" class="rounded-2xl border-2 border-slate-200/70 bg-white/85 backdrop-blur-sm">
        <template #content>
          <div class="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h3 class="text-xl font-bold text-zinc-900">Ordine #{{ order.id }}</h3>
            <Button
              label="Completa"
              class="w-1/2! justify-center! rounded-xl! bg-slate-800! py-2.5! text-base! font-semibold! text-white! hover:bg-slate-900!"
              @click="closeOrder(order.id)"
            />
          </div>

          <div v-if="order.note" class="mb-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-base text-zinc-700">
            <span class="font-semibold text-zinc-800">Nota:</span>
            {{ order.note }}
          </div>

          <div class="space-y-2">
            <div v-for="item in order.items" :key="item.name" class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
              <span class="text-2xl font-bold text-zinc-900">{{ item.name }}</span>
              <span class="text-2xl font-black text-zinc-900">x{{ item.quantity }}</span>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div v-if="orders.length === 0" class="rounded-2xl border-2 border-slate-200/70 bg-white/85 p-8 text-center text-zinc-500 backdrop-blur-sm">
      Nessun ordine in attesa.
    </div>

    <Dialog
      v-model:visible="showConfirmDialog"
      modal
      header="Conferma completamento"
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
        <p class="text-sm text-slate-700">
          Sei sicuro di voler contrassegnare come completati gli articoli in <span class="font-semibold text-slate-900">{{ categoryLabel }}</span> per l'ordine <span class="font-semibold text-slate-900">#{{ orderToClose?.id }}</span>?
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button
            label="Annulla"
            severity="secondary"
            outlined
            class="rounded-full border-slate-300 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-400"
            @click="handleCancel"
          />
          <Button
            label="Completa"
            icon="pi pi-check"
            class="rounded-full bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-900"
            @click="handleConfirm"
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