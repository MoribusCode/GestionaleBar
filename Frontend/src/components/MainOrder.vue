<script setup>
import OrdersView from '@/views/OrdersView.vue';
import ActiveOrder from './ActiveOrder.vue';

const catalog = [
  { id: 1, name: 'Caffè', price: 1.00, category: 'Bevande' },
  { id: 2, name: 'Aperol', price: 3.00, category: 'Bevande' },
  { id: 3, name: 'Cicchetti', price: 3.50, category: 'Cibo' },
  { id: 4, name: 'Gin Tonic', price: 6.00, category: 'Bevande' },
];

</script>

<template>

    <OrdersView :items="catalog" />
    <ActiveOrder />

</template>