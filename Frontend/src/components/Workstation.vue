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

// variables for managing the confirmation dialog
const showConfirmDialog = ref(false);
const orderToClose = ref(null);

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
    console.error("Errore nel recupero ordini in attesa:", err);
  }
}

// Funzione per chiudere un ordine
async function closeOrder(orderId, category) {
  orderToClose.value = { id: orderId, category };
  showConfirmDialog.value = true;
}

// Funzione per gestire la conferma della chiusura
async function handleConfirm() {
  try {
    // PUT corretto verso l'endpoint che funziona con il backend
    const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/orders/${orderToClose.value.id}/category/${orderToClose.value.category}/close`);

    // Rimuovo solo se la risposta va a buon fine
    if (res.status === 200) {
      orders.value = orders.value.filter(o => o.id !== orderToClose.value.id);
    }
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
  <div class="workstation-container">
    <h1 class="workstation-title">Ordini da preparare - {{ props.category }}</h1>

    <div class="orders-grid">
      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-header">
          <h3 class="order-id">Ordine #{{ order.id }}</h3>
          <button class="close-btn" @click="closeOrder(order.id, props.category)">
            Completa
          </button>
        </div>

        <div class="order-note" v-if="order.note">
          <span class="note-label">Nota:</span>
          {{ order.note }}
        </div>

        <div class="items-list">
          <div v-for="item in order.items" :key="item.name" class="order-item">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-quantity">x{{ item.quantity }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showConfirmDialog" class="overlay">
      <div class="dialog">
        <h3>Conferma chiusura</h3>
        <p>Sei sicuro di voler chiudere l'ordine #{{ orderToClose?.id }}?</p>
        <div class="dialog-actions">
          <button class="cancel-btn" @click="handleCancel">Annulla</button>
          <button class="confirm-btn" @click="handleConfirm">Conferma</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workstation-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

.workstation-title {
  color: black;
  margin-bottom: 2rem;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  text-transform: capitalize;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.order-card {
  position: relative;
  background-color: var(--secondary-color);
  border-radius: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.order-header {
  background: var(--secondary-color);
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #555;
}

.order-id {
  margin: 0;
  color: white;
  font-size: 1.2rem;
}

.close-btn {
  background: var(--secondary-color);
  color: white;
  border-width: 1px;
  border-color: var(--primary-color);
  border-style: solid;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: #333333;
}

.order-note {
  border-color: white;
  border-style: solid;
  border-width: 1px;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: #333333;
  color: #d3d3d3;
  font-size: 0.9rem;
}

.note-label {
  font-weight: 600;
  margin-right: 0.5rem;
  color: #d3d3d3;
}

.items-list {
  padding: 1rem;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #555;
}

.order-item:last-child {
  border-bottom: none;
}

.item-name {
  color: white;
  font-weight: 500;
}

.item-quantity {
  background: #3333;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: white;
  font-weight: 600;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #4A4A4A;
  border-radius: 20px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.2s ease;
}

.dialog h3 {
  margin: 0 0 1rem 0;
  color: white;
}

.dialog p {
  margin: 0 0 1.5rem 0;
  color: #ffffff;
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.confirm-btn {
  padding: 0.5rem 1rem;
  border-width: 1px;
  border-color: white;
  border-style: solid;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.cancel-btn {
  background: var(--primary-color);
  color: white;
}

.cancel-btn:hover {
  background: var(--primary-hover);
}

.confirm-btn {
  background: #4a4a4a;
  color: white;
}

.confirm-btn:hover {
  background: #333333;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .workstation-container {
    padding: 1rem;
  }

  .orders-grid {
    grid-template-columns: 1fr;
  }

  .workstation-title {
    font-size: 1.5rem;
  }
}
</style>