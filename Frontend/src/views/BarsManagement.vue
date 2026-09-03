<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ManagementTemplate from '@/components/ManagementTemplate.vue';
import { useCategories } from '@/composables/useCategories';
import { API_BASE_URL } from '@/store';

const managementTemplate = ref(null);
const { categoryNames, fetchCategories } = useCategories();

const bars = ref();
const selectedBar = ref(null);
const barToDelete = ref(null);

const formData = ref({
  printer_ip: '',
  categories: []
});

const resetForm = () => {
  formData.value = { printer_ip: '', categories: [] };
  selectedBar.value = null;
};

const fetchBars = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/bars`, { withCredentials: true });
    bars.value = res.data.bars || [];
  } catch (error) {
    console.error('Errore nel recupero dei bar:', error);
    bars.value ??= [];
  }
};

const openCreateDialog = () => {
  resetForm();
};

const openEditDialog = (bar) => {
  selectedBar.value = bar;
  formData.value = {
    printer_ip: bar.printer_ip,
    categories: [...(bar.categories || [])]
  };
  managementTemplate.value.openEdit();
};

const isCategorySelected = (category) => {
  return formData.value.categories.includes(category);
};

const toggleCategory = (category) => {
  const index = formData.value.categories.indexOf(category);
  if (index === -1) {
    formData.value.categories.push(category); //aggiugo
  } else {
    formData.value.categories.splice(index, 1); //rimuovo
  }
};

const saveBar = async () => {
  if (!formData.value.printer_ip) {
    alert('Per favore compila i campi obbligatori');
    return;
  }

  try {
    if (selectedBar.value) {
      await axios.put(`${API_BASE_URL}/update-bar/${selectedBar.value.id}`, formData.value, {
        withCredentials: true
      });
    } else {
      await axios.post(`${API_BASE_URL}/create-bar`, formData.value, { withCredentials: true });
    }
    managementTemplate.value.closeForm();
    resetForm();
    fetchBars();
  } catch (error) {
    console.error('Errore nel salvataggio del bar:', error);
    alert('Errore nel salvataggio del bar');
  }
};

const confirmDelete = (bar) => {
  barToDelete.value = bar;
  managementTemplate.value.openDelete();
};

const deleteBar = async () => {
  if (!barToDelete.value) return;

  try {
    await axios.delete(`${API_BASE_URL}/delete-bar/${barToDelete.value.id}`, { withCredentials: true });
    managementTemplate.value.closeDelete();
    barToDelete.value = null;
    fetchBars();
  } catch (error) {
    console.error('Errore nella cancellazione del bar:', error);
    alert(error.response?.data?.error || 'Errore nella cancellazione del bar');
  }
};

onMounted(() => {
  fetchBars();
  fetchCategories();
});
</script>

<template>
  <ManagementTemplate
    ref="managementTemplate"
    subtitle="Crea, modifica e gestisci tutti i bar del sistema"
    entity-name="Bar"
    create-icon="pi pi-building"
    :items="bars"
    dialog-width-class="md:w-[560px]"
    @new="openCreateDialog"
    @submit="saveBar"
    @cancel-form="resetForm"
    @confirm-delete="deleteBar"
  >
    <template #columns>
      <Column field="id" header="ID" style="width: 8%"></Column>
      <Column field="printer_ip" header="IP Stampante" style="width: 22%"></Column>
      <Column header="Categorie">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="category in data.categories"
              :key="category"
              class="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
            >
              {{ category }}
            </span>
            <span v-if="!data.categories?.length" class="text-slate-400 text-sm">—</span>
          </div>
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
      <!-- IP Stampante -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          IP Stampante
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">obbligatorio</span>
        </label>
        <InputText
          v-model="formData.printer_ip"
          placeholder="es. 192.168.1.50"
          class= "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-700 focus:bg-white"
          required
        />
      </div>

      <!-- Categorie -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Categorie</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="category in categoryNames"
            :key="category"
            type="button"
            class="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
            :class="isCategorySelected(category)
              ? 'border-slate-800 bg-slate-800 text-white'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'"
            @click="toggleCategory(category)"
          >
            {{ category }}
          </button>
        </div>
      </div>
    </template>

    <template #delete-message>
      <p class="text-sm text-slate-500">
        Sei sicuro di voler eliminare il bar
        <span class="font-semibold text-slate-800">{{ barToDelete?.printer_ip }}</span>?
      </p>
      <p class="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
        <i class="pi pi-exclamation-circle"></i>
        Questa azione non può essere annullata. Fallisce se ci sono utenti associati al bar.
      </p>
    </template>
  </ManagementTemplate>
</template>
