<script setup>
import axios from 'axios';
import { onMounted, ref } from 'vue';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

let orders = ref([]);
const shown = ref(null);

onMounted(() => {
  getOrders();
});

async function getOrders() {
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/orders`);
    orders.value = response.data;
    console.log('Orders retrieved successfully', orders.value);

  } catch (e) {
    console.error('Error retrieving orders:', e);
  }
}

async function deleteOrder(id, event) {
  // Prevent the click from propagating to the card's click handler
  event.stopPropagation();

  const confirmed = window.confirm(`Sei sicuro di voler eliminare l'ordine #${id}? Questa azione non può essere annullata.`);
  if (!confirmed) return;

  try {
    const res = await axios.delete(`${import.meta.env.VITE_API_URL}/api/delete-order/${id}`);
    if (res.status === 200) {
      orders.value = orders.value.filter(order => order.id !== id);
      if (shown.value === id) {
        shown.value = null; // Collapse if the deleted order was expanded
      }
    }
  } catch (e) {
    console.error(`Error deleting order ${id}:`, e);
  }
}

function toggleOrder(id) {
  shown.value = shown.value === id ? null : id;
}

function exportToExcel() {
  const mappedOrders = orders.value.map(order => ({
    ID: order.id,
    Totale: order.totalPrice + "€",
    Articoli: order.items.map(i => `${i.name} x${i.quantity}`).join(", "),
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

  // download the file
  saveAs(data, `orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function closeDay() {

  const confirmed = window.confirm(
    "Vuoi chiudere la giornata?\nTUTTI gli ordini di oggi saranno esportati in Excel e poi cancellati."
  );
  if (!confirmed) {
    return;
  }

  try {
    exportToExcel();

    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/orders/close-day`);

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
  <div class="history-container">
    <div class="header">
      <h1>Storico ordini</h1>
    </div>

    <div class="orders-list">
      <div v-for="order in orders" :key="order.id" class="order-card" :class="{ 'expanded': shown === order.id }">
        <div class="order-header" @click="toggleOrder(order.id)">
          <div class="order-info">
            <strong>Ordine #{{ order.id }}</strong>
            <span class="order-status" :class="order.status.toLowerCase().replace(' ', '-')">
              {{ order.status }}
            </span>
          </div>
          <button class="delete-btn" @click="deleteOrder(order.id, $event)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>

        <div v-if="shown === order.id" class="order-details">
          <ul class="items-list">
            <li v-for="(item, index) in order.items" :key="index" class="order-item">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-quantity">x{{ item.quantity }}</span>
            </li>
          </ul>
          <div class="order-total">
            Totale: <span>{{ order.totalPrice }} €</span>
          </div>
        </div>
      </div>
    </div>

    <router-link to="/" class="home-link">
      <h3>Home</h3>
    </router-link>

    <div class="footer">
      <div class="footer-buttons">
        <button class="export-btn" @click="exportToExcel">
          Esporta in Excel
        </button>
        <button class="export-btn" @click="closeDay">
          Chiudi giornata
        </button>
      </div>
    </div>
  </div>
</template>


<style scoped>
.history-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 6rem 2rem 2rem;
  min-height: 100vh;
  position: relative;
}

h1 {
  font-weight: 700;
  font-size: 2.5rem;
  margin: 0px 0px 0px 0px;
}

.footer {
  position: fixed;
  bottom: 0;
  right: 0;
  left: 0;
  background: #f1f1f1;
  padding: 1rem 2rem;
  border-top-color: white;
  border-top-style: solid;
  border-top-width: 1px;
  z-index: 99;
}


.footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  max-width: 900px;
  margin-left: auto;
}

.header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  color: black;
  font-size: 2.5rem;
}

.export-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.export-btn:hover {
  background-color: var(--primary-hover);
  transform: translateY(-2px);
}

.delete-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  padding: 0.5rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.delete-btn:hover {
  color: #FF4444;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.order-card {
  background: #4A4A4A;
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.order-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  color: white;
}

.order-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.order-status {
  padding: 0.25rem 1rem;
  border-style: solid;
  border-width: 1px;
  border-radius: 999px;
  font-size: 0.875rem;
  color: white;
  background: var(--secondary-color);
}

.order-status.completato {
  border-color: rgb(142, 221, 22);
}

.order-status.in-attesa {
  border-color: var(--primary-color);
}

.order-status.parziale {
  border-color: rgb(255, 193, 7)
}

.order-details {
  padding: 0.75rem;
  border-top: 1px solid #eee;
  max-width: 600px;
  margin: 0 auto;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  margin-bottom: 0.5rem;
  color: white;
}

.order-item:last-child {
  border-bottom: none;
}

.item-name {
  color: white;
  font-size: 0.95rem;
  margin-right: 0.5rem;
}

.item-quantity {
  color: white;
  font-weight: 500;
  font-size: 0.95rem;
  min-width: 2.5rem;
  text-align: right;
}

.order-total {
  text-align: right;
  color: white;
  font-size: 1.2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.home-link {
  display: block;
  text-align: center;
  padding: 1rem;
  color: rgba(0, 0, 0, 0.8);
  text-decoration: none;
  background: #f1f1f1;
  border-radius: 12px;
  margin: 0 auto;
  max-width: 200px;
  transition: all 0.3s ease;
}

.action-buttons {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  gap: 1rem;
}

h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.home-link:hover {
  transform: translateY(-2px)
}


@media (max-width: 768px) {
  .history-container {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    gap: 1rem;
  }

  .footer {
    padding: 1rem;
  }

  .footer-buttons {
    padding-right: 1rem;
    flex-direction: column;
    gap: 0.5rem;
  }

  .export-btn {
    width: auto;
    min-width: 150px; 
  }
}
</style>