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

</script>

<template>
    <div class="history-container">
        <div class="header">
            <h1>Storico ordini</h1>
            <button class="export-btn" @click="exportToExcel">
                Esporta in Excel
            </button>
        </div>

        <div class="orders-list">
            <div v-for="order in orders" :key="order.id" class="order-card" :class="{ 'expanded': shown === order.id }"
                @click="toggleOrder(order.id)">
                <div class="order-header">
                    <strong>Ordine #{{ order.id }}</strong>
                    <span class="order-status" :class="order.status.toLowerCase()">
                        {{ order.status }}
                    </span>
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
    </div>
</template>


<style scoped>
.history-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  color: #2c3e50;
  margin: 0;
}

.export-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.export-btn:hover {
  background: #218838;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.order-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.order-status {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.order-status.completed {
  background: #d1e7dd;
  color: #0f5132;
}

.order-status.pending {
  background: #fff3cd;
  color: #664d03;
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
  padding: 0.35rem 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  margin: 0;
  border: none;
}

.order-item:last-child {
  border-bottom: none;
}

.item-name {
  color: #2c3e50;
  font-size: 0.95rem;
  margin-right: 0.5rem;
}

.item-quantity {
  color: #6c757d;
  font-weight: 500;
  font-size: 0.95rem;
  min-width: 2.5rem;
  text-align: right;
}

.order-total {
  padding-top: 0.75rem;
  border-top: 1px solid #eee;
  text-align: right;
  font-weight: 600;
  color: #2c3e50;
  font-size: 1rem;
}

.home-link {
  display: block;
  text-align: center;
  margin-top: 2rem;
  color: #0d6efd;
  text-decoration: none;
  transition: color 0.2s ease;
}

.home-link:hover {
  color: #0a58ca;
}

@media (max-width: 768px) {
  .history-container {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
}
</style>