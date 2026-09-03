<script setup>
import axios from 'axios';
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import Button from 'primevue/button';
import { addedToOrder } from '@/store.js';
import { API_BASE_URL, SOCKET_PATH, SOCKET_URL } from '@/store';

// Emit logic to store the list order
const emit = defineEmits(['orderStored'])

const list = ref([]);
const orderNote = ref('');
const showConfirmation = ref(false);
const lastOrderId = ref(null);
let confirmationTimeout = null;

// se il bar di questa cassa non ha il POS abilitato, nascondiamo il pulsante
const posEnabled = ref(false);

onMounted(async () => {
 try {
    const res = await axios.get(`${API_BASE_URL}/pos/enabled`);
    posEnabled.value = !!res.data.enabled;
  } catch (e) {
    console.error('Errore nel controllo disponibilità POS:', e);
  }
});


const socket = io(`${SOCKET_URL}`, {
  path: SOCKET_PATH,
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
});

socket.on('connect', () => console.log('[POS] socket connesso', socket.id));
socket.on('disconnect', (reason) => console.log('[POS] socket disconnesso:', reason));
socket.on('connect_error', (err) => console.error('[POS] socket errore di connessione:', err.message));

// stato del pagamento POS: 'idle' | 'waiting' | 'error'
const posStatus = ref('idle');
const posError = ref('');
let posClientTransactionId = null;

// il socket è condiviso da tutte le casse dello stesso bar (stessa room "bar-<id>"): questo
// controllo garantisce che ogni cassa reagisca solo al pagamento che ha avviato lei stessa,
// ignorando l'evento se un'altra cassa sullo stesso bar ha in corso un pagamento diverso.
function isCurrentPosPayment(payload) {
  const isMine = posClientTransactionId && payload.clientTransactionId === posClientTransactionId;

  if (!isMine) {
    console.log('[POS] evento pos-payment-status ignorato (non è il mio pagamento):', payload);
  }
  return isMine;
}

async function resolvePosPayment(status) {
  if (status === 'successful') {
    posStatus.value = 'idle';
    await storeOrder('pos');
  } else if (status === 'cancelled') {
    // annullato (es. direttamente dal lettore): stesso comportamento del pulsante "Annulla pagamento"
    posStatus.value = 'idle';
  } else if (status === 'failed') {
    posStatus.value = 'error';
    posError.value = 'Pagamento rifiutato dalla carta';
  }
}

socket.on('pos-payment-status', (payload) => {
  if (posStatus.value === 'waiting' && isCurrentPosPayment(payload)) {
    resolvePosPayment(payload.status);
  }
});

async function payWithPos() {
  posStatus.value = 'waiting';
  posError.value = '';

  try {
    const response = await axios.post(`${API_BASE_URL}/pos/checkout`, {
      amount: totalPrice(),
      description: orderNote.value || 'Ordine BarH'
    });
    posClientTransactionId = response.data.clientTransactionId;
    console.log('[POS] checkout creato, in attesa di:', posClientTransactionId);
  } catch (e) {
    posStatus.value = 'error';
    posError.value = e.response?.data?.message || 'Errore nell\'avvio del pagamento POS';
  }
}

// annulla il pagamento POS in corso
function terminatePosPayment() {
  if (posStatus.value !== 'waiting') return;
  posStatus.value = 'idle';

  const url = `${API_BASE_URL}/pos/checkout/terminate`;
  const body = { clientTransactionId: posClientTransactionId };
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([JSON.stringify(body)], { type: 'application/json' }));
  } else {
    axios.post(url, body).catch(() => {});
  }
}

async function storeOrder(paymentMethod) {
  try {
    //send the order to the backend
    const response = await axios.post(`${API_BASE_URL}/orders`, {
      order: list.value,
      totalPrice: totalPrice(),
      note: orderNote.value,
      paymentMethod: paymentMethod
    });
    console.log('Order stored successfully', response.data);

    lastOrderId.value = response.data?.id ?? null;

    showConfirmation.value = true;

    if (confirmationTimeout) {
      clearTimeout(confirmationTimeout);
    }

    confirmationTimeout = setTimeout(() => {
      showConfirmation.value = false;
    }, 5000);

    //clear the order list after storing
    clean();
  }
  catch (e) {
    console.error('Error storing order:', e);
  }
}

function handleItemsAdded() {
  list.value = addedToOrder.value;
}

// function that evaluate the total price of the active order
function totalPrice() {
  return list.value.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
}

function removeItem(index) {
  if (list.value[index].quantity > 1) {
    list.value[index].quantity--;
  } else {
    list.value.splice(index, 1);
  }
}

function clean() {
  addedToOrder.value = [];
  orderNote.value = '';
}

watch(addedToOrder, handleItemsAdded,
  { deep: true, immediate: true }
);

window.addEventListener('beforeunload', terminatePosPayment);

onUnmounted(() => {
  if (confirmationTimeout) {
    clearTimeout(confirmationTimeout);
  }
  terminatePosPayment();
  window.removeEventListener('beforeunload', terminatePosPayment);
  socket.disconnect();
  clean();
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col rounded-2xl border-2 border-slate-200/70 bg-white/85 p-3 backdrop-blur-sm">
    <h1 class="mb-3 text-center text-3xl font-black text-zinc-900">Comanda</h1>

    <div class="flex flex-1 flex-col">
      <ul class="h-80 space-y-2 overflow-y-auto rounded-2xl border-2 border-slate-200/70 bg-slate-50/80 p-3">
        <li class="rounded-md border border-slate-200 bg-white/90 p-2" v-for="(item, index) in list" :key="index">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm font-medium text-zinc-800"><span class="font-extrabold">{{ item.quantity }}  </span> {{ item.name }}</span>
            <div class="flex shrink-0 items-center gap-2">
              <span class="text-sm font-medium text-zinc-800">€{{ (item.price * item.quantity).toFixed(2) }}</span>
              <Button @click="removeItem(index)" label="-" class="h-7! w-7! rounded-md! border! border-red-100! bg-red-50! p-0! text-red-400! hover:bg-red-100!" />
            </div>
          </div>
        </li>
      </ul>

      <div class="my-2">
        <textarea
          id="order-note"
          v-model="orderNote"
          placeholder="Nota Ordine"
          class="min-h-20 w-full rounded-xl border border-slate-200 bg-white/90 p-2 text-sm text-zinc-800 outline-none"
        ></textarea>
      </div>

      <div class="mb-3 text-center text-3xl font-black text-zinc-800">
        Totale: €{{ totalPrice().toFixed(2) }}
      </div>
    </div>

    <div v-if="posStatus === 'waiting'" class="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-center">
      <i class="pi pi-spin pi-spinner text-2xl text-slate-600"></i>
      <span class="text-sm font-semibold text-slate-700">In attesa del pagamento sul POS...</span>
      <Button @click="terminatePosPayment" label="Annulla pagamento" class="h-9! rounded-lg! border! border-red-100! bg-red-50! font-bold! text-red-400! hover:bg-red-100!" />
    </div>

    <div v-else class="flex flex-col gap-3">
      <div v-if="posStatus === 'error'" class="rounded-lg border border-red-200 bg-red-50 p-2 text-center text-sm font-semibold text-red-600">
        {{ posError }}
      </div>

      <div class="flex gap-3">
        <Button @click="storeOrder('contanti')" class="h-20! flex-1! flex-col! gap-1! rounded-lg! border-none! bg-slate-800! font-bold! text-white! hover:bg-slate-900!">
          <i class="pi pi-money-bill text-xl!"></i>
          <span>Contanti</span>
        </Button>
        <Button v-if="posEnabled" @click="payWithPos" class="h-20! flex-1! flex-col! gap-1! rounded-lg! border-none! bg-slate-800! font-bold! text-white! hover:bg-slate-900!">
          <i class="pi pi-credit-card text-xl!"></i>
          <span>POS</span>
        </Button>
      </div>
      <Button @click="clean" label="Cancella" class="h-10! w-full! rounded-lg! border! border-red-100! bg-red-50! font-bold! text-red-400! hover:bg-red-100!" />
    </div>

    <div v-if="showConfirmation" class="mt-2 rounded-lg border border-emerald-300 bg-emerald-100 p-2 text-center text-sm font-semibold text-emerald-800">
      Ordine {{ lastOrderId ? '#' + lastOrderId : '' }} inviato!
    </div>
  </div>
</template>