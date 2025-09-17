<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

import MainOrder from '@/components/MainOrder.vue';
import { API_BASE_URL } from '@/store';

const catalog = ref([]);

onMounted(async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/items`);

    // fill the catalog with the data received from the backend
    catalog.value = res.data.items;

  } catch (error) {
    console.error('Errore nel recupero degli articoli:', error);
  }
});

</script>

<template>
  <div> <MainOrder :items="catalog"/> </div>
</template>    
