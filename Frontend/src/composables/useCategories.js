import { ref, computed } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '@/store';

// Elenco categorie condiviso 
export function useCategories() {
  const categories = ref([]); // [{ id, name }]
  const categoryNames = computed(() => categories.value.map((c) => c.name));

  async function fetchCategories() {
    try {
      const res = await axios.get(`${API_BASE_URL}/categories`, { withCredentials: true });
      categories.value = res.data.categories || [];
      
    } catch (error) {
      console.error('Errore nel recupero delle categorie:', error);
    }
  }

  return { categories, categoryNames, fetchCategories };
}
