<script setup>
import { ref, onMounted, defineProps } from 'vue';
import { io } from 'socket.io-client';
import axios from 'axios';

const props = defineProps({
  category: {
    type: String,
    required: true
  }
});

const orders = ref([]);
const socket = io(`${import.meta.env.VITE_API_URL}`, {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

function filterItemsByCategory(orderItems, category) {
  return orderItems.filter(item => item.category.toLowerCase() === category.toLowerCase());
}

async function fetchPendingOrders() {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/orders/pending`);
    res.data.forEach(order => {
      const filtered = filterItemsByCategory(order.items, props.category);
      if (filtered.length > 0) {
        orders.value.push({
          id: order.id,
          items: filtered,
          note: order.note
        });
      }
    });
  } catch (err) {
    console.error("Errore nel recupero ordini pending:", err);
  }
}

// Funzione per chiudere un ordine
async function closeOrder(orderId, category) {
  const confirmed = window.confirm("Chiudere l'ordine?");
  if (!confirmed) return;

  try {
    // PUT corretto verso l'endpoint che funziona con il backend
    const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/category/${category}/close`);

    // Rimuovo solo se la risposta va a buon fine
    if (res.status === 200) {
      orders.value = orders.value.filter(o => o.id !== orderId);
    }
  } catch (err) {
    console.error("Errore chiusura ordine:", err.response?.data || err.message);
  }
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
  <div>
    <h1>Ordini da preparare ({{ props.category }})</h1>
    <ul>
      <li v-for="order in orders" :key="order.id">
        <h3>Ordine #{{ order.id }}</h3>
        <h5>{{ order.note }}</h5>
        <ul>
          <li v-for="item in order.items" :key="item.name">
            {{ item.name }} x{{ item.quantity }}
          </li>
        </ul>
        <button @click="closeOrder(order.id, props.category)">Chiudi ordine</button>
      </li>
    </ul>
  </div>
</template>