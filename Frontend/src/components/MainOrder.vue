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
  <div class="order-layout">
    <div class="items-grid">
      <ItemsTemplate :items="props.items" @item-added="addToOrder" />
    </div>

    <div class="active-order-sidebar">
      <ActiveOrder />
    </div>
  </div>
</template>

<style scoped>
.order-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  padding: 1.5rem;
  min-height: 100vh;
}

.items-grid {
  padding-right: 1rem;
}

.active-order-sidebar {
  position: sticky;
  top: 1.5rem;
  height: calc(100vh - 3rem);
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .order-layout {
    grid-template-columns: 1fr;
  }

  .active-order-sidebar {
    position: static;
    height: auto;
  }
}
</style>

  