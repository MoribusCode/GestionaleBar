<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import ManagementTemplate from '@/components/ManagementTemplate.vue';
import { API_BASE_URL } from '@/store';

const managementTemplate = ref(null);

const categories = ref();
const selectedCategory = ref(null);
const categoryToDelete = ref(null);

const formData = ref({ name: '', auto_complete: false });

const resetForm = () => {
  formData.value = { name: '', auto_complete: false };
  selectedCategory.value = null;
};

const fetchCategories = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/categories`, { withCredentials: true });
    categories.value = res.data.categories || [];
  } catch (error) {
    console.error('Errore nel recupero delle categorie:', error);
    categories.value ??= [];
  }
};

const openCreateDialog = () => {
  resetForm();
};

const openEditDialog = (category) => {
  selectedCategory.value = category;
  formData.value = { name: category.name, auto_complete: !!category.auto_complete };
  managementTemplate.value.openEdit();
};

const saveCategory = async () => {
  if (!formData.value.name.trim()) {
    alert('Per favore compila i campi obbligatori');
    return;
  }

  try {
    if (selectedCategory.value) {
      await axios.put(`${API_BASE_URL}/update-category/${selectedCategory.value.id}`, formData.value, {
        withCredentials: true
      });
    } else {
      await axios.post(`${API_BASE_URL}/create-category`, formData.value, { withCredentials: true });
    }
    managementTemplate.value.closeForm();
    resetForm();
    fetchCategories();
  } catch (error) {
    console.error('Errore nel salvataggio della categoria:', error);
    alert(error.response?.data?.error || 'Errore nel salvataggio della categoria');
  }
};

const confirmDelete = (category) => {
  categoryToDelete.value = category;
  managementTemplate.value.openDelete();
};

const deleteCategory = async () => {
  if (!categoryToDelete.value) return;

  try {
    await axios.delete(`${API_BASE_URL}/delete-category/${categoryToDelete.value.id}`, { withCredentials: true });
    managementTemplate.value.closeDelete();
    categoryToDelete.value = null;
    fetchCategories();
  } catch (error) {
    console.error('Errore nella cancellazione della categoria:', error);
    alert(error.response?.data?.error || 'Errore nella cancellazione della categoria');
  }
};

onMounted(() => {
  fetchCategories();
});
</script>

<template>
  <ManagementTemplate
    ref="managementTemplate"
    title="Gestione Categorie"
    subtitle="Crea, modifica e gestisci le categorie di articoli e postazioni"
    entity-name="Categoria"
    create-icon="pi pi-tags"
    :items="categories"
    dialog-width-class="md:w-[480px]"
    @new="openCreateDialog"
    @submit="saveCategory"
    @cancel-form="resetForm"
    @confirm-delete="deleteCategory"
  >
    <template #columns>
      <Column field="id" header="ID" style="width: 15%"></Column>
      <Column field="name" header="Nome"></Column>
      <Column header="Auto-completa" style="width: 18%">
        <template #body="{ data }">
          <span
            class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="data.auto_complete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'"
          >
            {{ data.auto_complete ? 'Sì' : 'No' }}
          </span>
        </template>
      </Column>
      <Column header="Azioni" style="width: 15%">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-pencil"
              class="p-button-rounded p-button-text p-button-warning text-blue-600 hover:bg-blue-50"
              @click="openEditDialog(data)"
              v-tooltip="'Modifica'"
            />
            <Button
              icon="pi pi-trash"
              class="p-button-rounded p-button-text p-button-danger text-red-600 hover:bg-red-50"
              @click="confirmDelete(data)"
              v-tooltip="'Elimina'"
            />
          </div>
        </template>
      </Column>
    </template>

    <template #form>
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Nome
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">obbligatorio</span>
        </label>
        <InputText
          v-model="formData.name"
          placeholder="es. Cicchetti"
          class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-700 focus:bg-white"
          required
        />
      </div>

      <!-- Auto-completa -->
      <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
        <div class="min-w-0">
          <label class="text-xs font-semibold uppercase tracking-wide text-slate-600">Auto-completa</label>
          <p class="mt-0.5 text-xs text-slate-400">Gli articoli di questa categoria risultano già pronti alla creazione dell'ordine, senza passare da una Postazione</p>
        </div>
        <ToggleSwitch v-model="formData.auto_complete" class="shrink-0" />
      </div>
    </template>

    <template #delete-message>
      <p class="text-sm text-slate-500">
        Sei sicuro di voler eliminare la categoria
        <span class="font-semibold text-slate-800">{{ categoryToDelete?.name }}</span>?
      </p>
      <p class="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
        <i class="pi pi-exclamation-circle"></i>
        Gli articoli già assegnati a questa categoria non vengono modificati.
      </p>
    </template>
  </ManagementTemplate>
</template>
