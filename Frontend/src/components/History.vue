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
    <div>
        <h1>Storico ordini</h1>
    </div>
    <div>
        <button @click="exportToExcel">Esporta in Excel</button>
    </div>
    <div>
        <div>
            <ul>
                <li v-for="order in orders" :key="order.id" @click="toggleOrder(order.id)">
                    <div>
                        <strong>Ordine #{{ order.id }}</strong>
                        <span v-if="shown === order.id">
                            <ul>
                                <li v-for="(item, index) in order.items" :key="index">
                                    {{ item.name }} x{{ item.quantity }}
                                </li>
                            </ul>
                            <p>Stato ordine: {{ order.status }} </p>
                            <p>Totale: {{ order.totalPrice }} €</p>
                        </span>
                    </div>
                </li>
            </ul>
        </div>

    </div>

    <router-link to="/">
        <h3>Home</h3>
    </router-link>
</template>


<style scoped></style>