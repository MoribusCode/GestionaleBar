<script setup>
import axios from 'axios';
import { ref, watch, onUnmounted} from 'vue';
import { addedToOrder } from '@/store.js';

// Emit logic to store the list order
const emit = defineEmits(['orderStored'])

const list = ref([]);
const orderNote = ref('');

async function storeOrder() {
    try {
        //send the order to the backend
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/orders`, {
            order: list.value,
            totalPrice: totalPrice(),
            note: orderNote.value
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
    orderNote.value = '';
}

watch(addedToOrder, handleItemsAdded,
    {deep: true, immediate: true}
);

onUnmounted(() => {
  clean();
});

</script>

<template>
  <div class="active-order-container">
    <h1 class="order-title">Comanda attiva</h1>
    
    <div class="order-content">
      <ul class="order-list">
        <li class="itemList" v-for="(item, index) in list" :key="index">
          <div class="item-details">
            <span class="item-name">{{ item.name }} x{{ item.quantity }}</span>
            <button class="remove-btn" @click="removeItem(index)">-</button>
          </div>    
        </li>
      </ul>

      <div class="note-section">
        <textarea
          id="order-note"
          v-model="orderNote"
          placeholder="Nota Ordine"
          class="order-note"
        > </textarea>
      </div>

      <div class="total-section">
        <h2>Totale: €{{ totalPrice().toFixed(2) }}</h2>
      </div>
    </div>

    <div class="action-buttons">
      <button class="btn reset" @click="clean">Reset</button>
      <button class="btn submit" @click="storeOrder">Invia Ordine</button>
    </div>
    
    <router-link to="/" class="home-link">
      <h3>Home</h3>
    </router-link>
  </div>
</template>


<style scoped>
.active-order-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.order-title {
  color: #2c3e50;
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.order-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}

.itemList {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.item-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.item-name {
  font-size: 1.1rem;
  color: #2c3e50;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.remove-btn:hover {
  background: #bb2d3b;
}

.note-section {
  margin: 1.5rem 0;
}

.order-note {
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
}

.total-section {
  margin: 1.5rem 0;
  text-align: right;
  color: #2c3e50;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0;
}

.btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.reset {
  background: #6c757d;
  color: white;
}

.submit {
  background: #28a745;
  color: white;
}

.reset:hover {
  background: #5a6268;
}

.submit:hover {
  background: #218838;
}

.home-link {
  display: block;
  text-align: center;
  color: #0d6efd;
  text-decoration: none;
  margin-top: 1rem;
}

.home-link:hover {
  text-decoration: underline;
}

/* Custom Scrollbar */
.order-list::-webkit-scrollbar {
  width: 6px;
}

.order-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.order-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.order-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>