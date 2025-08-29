<script setup>
import axios from 'axios';
import { ref, watch } from 'vue';
import { addedToOrder } from '@/store.js';

// Emit logic to store the list order
const emit = defineEmits(['orderStored'])

const list = ref([]);

async function storeOrder() {
    try {
        //send the order to the backend
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/orders`, {
            order: list.value,
            totalPrice: totalPrice()
        });

        console.log('Order stored successfully', response.data);

        //clear the order list after storing
        clean();         
    }
    catch (e) {
        console.error('Error storing order:', e);
    }
}

function handleItemsAdded() {
    list.value = addedToOrder.value;
}

// function that evaluate the total price of the active order
function totalPrice() {
    return list.value.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
}

function removeItem(index) {
    if (list.value[index].quantity > 1) {
        list.value[index].quantity--;
    } else {
        list.value.splice(index, 1);
    }
}

function clean() {
    addedToOrder.value = [];
}

watch(addedToOrder, handleItemsAdded,
    {deep: true, immediate: true}
);

</script>

<template>
    <div>
        <h1>Comanda attiva</h1>
        <ul>
            <li class=itemList v-for="(item, index) in list" :key="index">
                <div class="item-details">
                    <div>{{ item.name }} x{{ item.quantity }}</div>
                    <div>
                        <button class="btn btn-primary" @click="removeItem(index)"> - </button>
                    </div>
                </div>    
            </li>
        </ul>
        <div>
            <h2>Totale: {{ totalPrice().toFixed(2) }} </h2>
        </div>
    </div>

    <button @click="clean">Reset</button>

    <button @click="storeOrder">Invia Ordine</button>
    
    <router-link to="/">
        <h3>Home</h3>
    </router-link>
</template>


<style scoped>

.item-details {
    display: flex;
    gap: 30px;
    align-items: center;
}
</style>