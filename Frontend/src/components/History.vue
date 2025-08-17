<script setup>
import axios from 'axios';
import { onMounted, ref } from 'vue';

let orders = ref([]);
const shown = ref(null);

onMounted(() => {
    getOrders();
});

async function getOrders() {
    try {
        const response = await axios.get(`${import.meta.env.VITE_URL}/api/orders`);
        orders.value = response.data;
        console.log('Orders retrieved successfully', orders.value);

    } catch (e) {
        console.error('Error retrieving orders:', e);
    }
}

function toggleOrder(id) {
    shown.value = shown.value === id ? null : id;
}

</script>

<template>
    <div>
        <h1>Storico ordini</h1>
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