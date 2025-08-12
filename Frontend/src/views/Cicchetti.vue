<script setup>
import { ref, onMounted } from 'vue';
import { io } from 'socket.io-client';

const orders = ref([]);

const socket = io('http://localhost:3000');

function filterItemsByCategory(orderItems, category) {
  return orderItems.filter(item => item.category.toLowerCase() === category.toLowerCase());
}

onMounted(() => {
  socket.on('new-order', (orderData) => {
    // Filtra gli articoli per categoria a seconda della pagina
    const category = 'cibo'; //<----------questo è da cambiare <------------- 
    const filteredItems = filterItemsByCategory(orderData.items, category);

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
