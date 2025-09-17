<script setup>
import axios from 'axios';
import { ref, watch, onUnmounted } from 'vue';
import { addedToOrder } from '@/store.js';
import { API_BASE_URL } from '@/store';

// Emit logic to store the list order
const emit = defineEmits(['orderStored'])

const list = ref([]);
const orderNote = ref('');
const showConfirmation = ref(false);

async function storeOrder() {
  try {
    //send the order to the backend
    const response = await axios.post(`${API_BASE_URL}/orders`, {
      order: list.value,
      totalPrice: totalPrice(),
      note: orderNote.value
    });
    console.log('Order stored successfully', response.data);

    showConfirmation.value = true;

    setTimeout(() => {
      showConfirmation.value = false;
    }, 3000);

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
  { deep: true, immediate: true }
);

onUnmounted(() => {
  clean();
});

function launch_toast() {
  var x = document.getElementById("toast")
  x.className = "show";

  setTimeout(function () {
    x.className = x.className.replace("show", "");
  }, 5000);
}
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
        <textarea id="order-note" v-model="orderNote" placeholder="Nota Ordine" class="order-note"> </textarea>
      </div>

      <div class="total-section">
        <h2>Totale: €{{ totalPrice().toFixed(2) }}</h2>
      </div>
    </div>

    <div class="action-buttons">
      <button class="btn reset" @click="clean">Reset</button>
      <button class="btn submit" @click="storeOrder(); launch_toast()">Invia Ordine</button>
    </div>

    <router-link to="/" class="home-link">
      <h3>Home</h3>
    </router-link>

    <!-- Toast Popup -->
    <div id="toast">
      <div id="desc">ORDINE INVIATO!</div>
    </div>

  </div>
</template>


<style scoped>
.active-order-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--secondary-color);
  border-radius: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.order-title {
  color: white;
  font-size: 2rem;
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}


.item-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.item-name {
  font-size: 1.1rem;
  color: white;
}

.remove-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.remove-btn:hover {
  background: var(--primary-hover);
}

.note-section {
  margin: 1.5rem 0;
}

.order-note {
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  resize: vertical;
  font-family: inherit;
  background: rgba(0, 0, 0, 0.2);
  color: white;
}

.total-section {
  margin: 1.5rem 0;
  text-align: right;
  color: white;
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
  border-radius: 12px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset {
  background: var(--secondary-color);
  border-width: 1px;
  border-color: white;
  border-style: solid;
  color: white;
}

.submit {
  background: var(--primary-color);
  color: white;
}

.submit:hover {
  background: var(--primary-hover);
}

.reset:hover,
.submit:hover {
  transform: translateY(-2px);
}

.home-link {
  display: block;
  text-align: center;
  color: white;
  text-decoration: none;
  margin-top: 1rem;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.home-link:hover {
  opacity: 1;
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

/* Toast CSS */
#toast {
  visibility: hidden;
  max-width: 50px;
  height: 50px;
  background-color: var(--secondary-color);
  color: #fff;
  text-align: center;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  position: fixed;
  z-index: 1;
  right: 20px;
  bottom: 30px;
  font-size: 17px;
  white-space: nowrap;
}

#toast #desc {
  color: #fff;
  padding: 0;
  font-weight: bold;
  overflow: hidden;
  white-space: nowrap;
  opacity: 0;
  display: flex; 
  align-items: center; 
  justify-content: center; 
  height: 100%;
  width: 100%;
}

#toast.show {
  visibility: visible;
  -webkit-animation: fadein 0.5s, expand 0.5s 0.5s, stay 3s 1s, shrink 0.5s 2s, fadeout 0.5s 2.5s;
  animation: fadein 0.5s, expand 0.5s 0.5s, stay 3s 1s, shrink 0.5s 4s, fadeout 0.5s 4.5s;
}

#toast.show #desc {
  -webkit-animation: textfadein 0.3s 1s forwards, textfadeout 0.3s 4.3s forwards;
  animation: textfadein 0.3s 1s forwards, textfadeout 0.3s 4.3s forwards;
}

@-webkit-keyframes fadein {
  from {
    bottom: 0;
    opacity: 0;
  }

  to {
    bottom: 30px;
    opacity: 1;
  }
}

@keyframes fadein {
  from {
    bottom: 0;
    opacity: 0;
  }

  to {
    bottom: 30px;
    opacity: 1;
  }
}

@-webkit-keyframes expand {
  from {
    min-width: 50px
  }

  to {
    min-width: 350px
  }
}

@keyframes expand {
  from {
    min-width: 50px
  }

  to {
    min-width: 350px
  }
}

@-webkit-keyframes textfadein {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes textfadein {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@-webkit-keyframes textfadeout {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes textfadeout {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@-webkit-keyframes stay {
  from {
    min-width: 350px
  }

  to {
    min-width: 350px
  }
}

@keyframes stay {
  from {
    min-width: 350px
  }

  to {
    min-width: 350px
  }
}

@-webkit-keyframes shrink {
  from {
    min-width: 350px;
  }

  to {
    min-width: 50px;
  }
}

@keyframes shrink {
  from {
    min-width: 350px;
  }

  to {
    min-width: 50px;
  }
}

@-webkit-keyframes fadeout {
  from {
    bottom: 30px;
    opacity: 1;
  }

  to {
    bottom: 60px;
    opacity: 0;
  }
}

@keyframes fadeout {
  from {
    bottom: 30px;
    opacity: 1;
  }

  to {
    bottom: 60px;
    opacity: 0;
  }
}

/* End Toast CSS */

@media (max-width: 1024px) {
  .action-buttons {
    gap: 2rem;
    /* Increased from 1rem to 2rem */
    padding: 0 2rem;
    /* Add horizontal padding */
    margin: 2rem 0;
    /* Increased vertical margin */
  }

  .btn {
    padding: 1rem;
    /* Increased padding */
    font-size: 1.1rem;
    /* Slightly larger font */
  }
}

/* Further adjust for mobile */
@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
    /* Stack buttons vertically */
    gap: 1rem;
    padding: 0 1rem;
  }

  .btn {
    width: 100%;
    padding: 1rem;
  }
}
</style>