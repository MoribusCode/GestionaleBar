<script setup>
import axios from 'axios';
import { ref, watch, onUnmounted } from 'vue';
import Button from 'primevue/button';
import { addedToOrder } from '@/store.js';
import { API_BASE_URL } from '@/store';

// Emit logic to store the list order
const emit = defineEmits(['orderStored'])

const list = ref([]);
const orderNote = ref('');
const showConfirmation = ref(false);
const lastOrderId = ref(null);
let confirmationTimeout = null;

async function storeOrder() {
  try {
    //send the order to the backend
    const response = await axios.post(`${API_BASE_URL}/orders`, {
      order: list.value,
      totalPrice: totalPrice(),
      note: orderNote.value
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

onUnmounted(() => {
  if (confirmationTimeout) {
    clearTimeout(confirmationTimeout);
  }
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
            <span class="truncate text-sm font-medium text-zinc-800">{{ item.name }} x{{ item.quantity }}</span>
            <Button @click="removeItem(index)" label="-" class="h-7! w-7! rounded-md! border! border-slate-300! bg-slate-200! p-0! text-zinc-800! hover:bg-slate-300!" />
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

    <div class="flex gap-3">
      <Button @click="clean" label="Cancella" class="h-10! flex-1! rounded-lg! border! border-zinc-200! bg-zinc-200! font-bold! text-zinc-500! hover:bg-zinc-300!" />
      <Button @click="storeOrder" label="Conferma" class="h-10! flex-1! rounded-lg! border! border-zinc-200! bg-white! font-bold! text-zinc-900! hover:bg-zinc-100!" />
    </div>

    <div v-if="showConfirmation" class="mt-2 rounded-lg border border-emerald-300 bg-emerald-100 p-2 text-center text-sm font-semibold text-emerald-800">
      Ordine {{ lastOrderId ? '#' + lastOrderId : '' }} inviato!
    </div>
  </div>
</template>