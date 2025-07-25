<script setup>
import { ref, watch } from 'vue';
import { addedToOrder } from '@/store.js';

// Emit logic to store the list order
const emit = defineEmits(['orderStored'])

const list = ref([]);

function storeOrder() {
    emit('orderStored', list.value);
    console.log('Ordine inviato');
}

function handleItemsAdded() {
    list.value = addedToOrder.value;
    console.log('Evento chiamato');
}

// function that evaluate the total price of the active order
function totalPrice() {
    return list.value.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
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
                <div>
                    <div>{{ item.name }} x{{ item.quantity }}</div>
                    <div>
                        <button class="btn btn-primary" @click=""> remove </button>
                    </div>
                </div>    
            </li>
        </ul>
        <div>
            <h2>Totale: {{ totalPrice().toFixed(2) }} </h2>
        </div>
    </div>

    <button @click="storeOrder">Invia Ordine</button>
    
</template>

<style scoped>


</style>