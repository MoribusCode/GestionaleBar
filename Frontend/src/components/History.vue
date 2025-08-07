<script setup>
import axios from 'axios';

async function getOrders() {
    try {
        const response = await axios.get('http://localhost:3000/api/orders');

        console.log("Orders retrieved successfully", response.data);
    } catch (e) {
        console.error('Error retrieving orders:', e);
    }
}

</script>

<template>
    <div>
        <h1>Storico ordini</h1>
        <button @click="getOrders">Carica ordini</button>
    </div>
</template>


<style scoped></style>