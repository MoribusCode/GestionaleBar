<script setup>
import { ref, onMounted, defineProps } from 'vue';
import { io } from 'socket.io-client';

const props = defineProps({
  category: {
    type: String,
    required: true
  }
});

const orders = ref([]);
 
const socket = io(`${import.meta.env.VITE_URL}`);

function filterItemsByCategory(orderItems, category) {
  return orderItems.filter(item => item.category.toLowerCase() === category.toLowerCase());
}

onMounted(() => {
  socket.on('new-order', (orderData) => {
    // Filtra gli articoli per categoria a seconda della pagina
    const filteredItems = filterItemsByCategory(orderData.items, props.category);

    if (filteredItems.length > 0) {
      // aggiungi questo ordine filtrato alla lista
      orders.value.push({
        id: orderData.id,
        items: filteredItems
      });
    }
  });
});
</script>

<template>
  <div>
    <h1>Ordini da preparare</h1>
    <ul>
      <li v-for="order in orders" :key="order.id">
        <h3>Ordine #{{ order.id }}</h3>
        <ul>
          <li v-for="item in order.items" :key="item.name">{{ item.name }} x{{ item.quantity }}</li>
        </ul>
      </li>
    </ul>
  </div>
</template>
