<script setup>
import { addedToOrder } from '@/store';
import ItemsTemplate from './ItemsTemplate.vue';
import ActiveOrder from './ActiveOrder.vue';

const props = defineProps({
  items: {
    type: Array,
    required: true,
    // item structure: { id: Number, name: String, price: Number, category: String }
  },
});

function addToOrder(id) {
  let existing = addedToOrder.value.find(item => item.id === id);
  if (existing) {
    existing.quantity++;
  }
  else {
    let item = props.items.find(item => item.id == id);
    if (item) {
      addedToOrder.value.push({...item, quantity: 1});
    }
  }
}

</script>

<template>

  <div class="griglia-articoli">
    <ItemsTemplate :items="props.items" @item-added="addToOrder" />
  </div>

  <ActiveOrder />

</template>

  