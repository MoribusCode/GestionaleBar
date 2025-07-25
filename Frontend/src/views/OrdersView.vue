<script setup>
import ItemsTemplate from '@/components/ItemsTemplate.vue';
import { addedToOrder } from '@/store.js';
import { ref } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true,
    // item structure: { id: Number, name: String, price: Number, quantity: Number, category: String }
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
</template>    
