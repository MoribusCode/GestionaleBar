<script setup>
import MainOrder from '@/components/MainOrder.vue';

const catalog = [
  { id: 1, name: 'Caffè', price: 1.00, category: 'Bevande' },
  { id: 2, name: 'Aperol', price: 3.00, category: 'Bevande' },
  { id: 3, name: 'Cicchetti', price: 3.50, category: 'Cibo' },
  { id: 4, name: 'Gin Tonic', price: 6.00, category: 'Bevande' },
  { id: 6, name: 'Panino', price: 5.00, category: 'Cibo' },
  { id: 7, name: 'Acqua', price: 1.50, category: 'Bevande' },
  { id: 8, name: 'Birra', price: 2.50, category: 'Bevande' },
];

</script>

<template>
  <div> <MainOrder :items="catalog"/> </div>
</template>    
