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
  <div class="min-h-screen bg-zinc-100 p-3 lg:p-4">
    <div class="xl:fixed xl:left-4 xl:right-92 xl:top-32 xl:bottom-4 xl:overflow-y-auto">
      <ItemsTemplate :items="props.items" @item-added="addToOrder" />
    </div>

    <div class="mt-4 xl:fixed xl:right-4 xl:top-32 xl:bottom-4 xl:mt-0 xl:w-85">
      <ActiveOrder class="h-full" />
    </div>
  </div>
</template>

  