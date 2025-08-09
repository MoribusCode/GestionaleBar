<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

import MainOrder from '@/components/MainOrder.vue';

const catalog = ref([]);

onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/items');
    const data = res.data;

    // fill the catalog with the data received from the backend
    catalog.value = data;

  } catch (error) {
    console.error('Errore nel recupero degli articoli:', error);
  }
});

</script>

<template>
  <div> <MainOrder :items="catalog"/> </div>
</template>    
