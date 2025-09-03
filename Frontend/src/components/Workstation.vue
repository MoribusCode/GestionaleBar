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
    console.error("Errore nel recupero ordini pending:", err);
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
}

.workstation-title {
  color: #2c3e50;
  margin-bottom: 2rem;
  text-align: center;
  font-size: 1.8rem;
  text-transform: capitalize;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.order-card {
  position: relative;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.order-header {
  background: #f8f9fa;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.order-id {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.close-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: #218838;
}

.order-note {
  padding: 0.75rem 1rem;
  background: #fff3cd;
  color: #664d03;
  font-size: 0.9rem;
}

.note-label {
  font-weight: 600;
  margin-right: 0.5rem;
}

.items-list {
  padding: 1rem;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.order-item:last-child {
  border-bottom: none;
}

.item-name {
  color: #2c3e50;
  font-weight: 500;
}

.item-quantity {
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: #495057;
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
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.2s ease;
}

.dialog h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.dialog p {
  margin: 0 0 1.5rem 0;
  color: #666;
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.cancel-btn, .confirm-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
}

.confirm-btn {
  background: #28a745;
  color: white;
}

.confirm-btn:hover {
  background: #218838;
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