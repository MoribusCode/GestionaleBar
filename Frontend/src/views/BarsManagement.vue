<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { API_BASE_URL, ITEM_CATEGORIES } from '@/store';

const bars = ref([]);
const loading = ref(false);
const selectedBar = ref(null);
const showFormDialog = ref(false);
const isEditing = ref(false);
const deleteConfirm = ref(false);
const barToDelete = ref(null);

const formData = ref({
  printer_ip: '',
  categories: []
});

const resetForm = () => {
  formData.value = { printer_ip: '', categories: [] };
  selectedBar.value = null;
  isEditing.value = false;
};

const fetchBars = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`${API_BASE_URL}/bars`, { withCredentials: true });
    bars.value = res.data.bars || [];
  } catch (error) {
    console.error('Errore nel recupero dei bar:', error);
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  resetForm();
  showFormDialog.value = true;
};

const openEditDialog = (bar) => {
  selectedBar.value = bar;
  isEditing.value = true;
  formData.value = {
    printer_ip: bar.printer_ip,
    categories: [...(bar.categories || [])]
  };
  showFormDialog.value = true;
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
    if (isEditing.value && selectedBar.value) {
      await axios.put(`${API_BASE_URL}/update-bar/${selectedBar.value.id}`, formData.value, {
        withCredentials: true
      });
    } else {
      await axios.post(`${API_BASE_URL}/create-bar`, formData.value, { withCredentials: true });
    }
    showFormDialog.value = false;
    resetForm();
    fetchBars();
  } catch (error) {
    console.error('Errore nel salvataggio del bar:', error);
    alert('Errore nel salvataggio del bar');
  }
};

const confirmDelete = (bar) => {
  barToDelete.value = bar;
  deleteConfirm.value = true;
};

const deleteBar = async () => {
  if (!barToDelete.value) return;

  try {
    await axios.delete(`${API_BASE_URL}/delete-bar/${barToDelete.value.id}`, { withCredentials: true });
    deleteConfirm.value = false;
    barToDelete.value = null;
    fetchBars();
  } catch (error) {
    console.error('Errore nella cancellazione del bar:', error);
    alert(error.response?.data?.error || 'Errore nella cancellazione del bar');
  }
};

onMounted(() => {
  fetchBars();
});
</script>

<template>
  <div class="m-4 flex flex-col bg-slate-50 rounded-3xl border-2 border-slate-200">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 px-8 py-6 top-0 z-40 rounded-t-3xl overflow-hidden">
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <h1 class="text-4xl font-bold text-slate-800">Gestione Bar</h1>
          <p class="text-slate-600 mt-1">Crea, modifica e gestisci tutti i bar del sistema</p>
        </div>
        <Button
          label="Nuovo Bar"
          icon="pi pi-plus"
          class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Content Area -->
    <div class="px-8 py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Bars Table -->
        <div class="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
          <DataTable
            :value="bars"
            :loading="loading"
            tableStyle="min-width: 100%"
          >
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
          </DataTable>
        </div>
      </div>
    </div>

    <!-- Form Dialog -->
    <Dialog
      v-model:visible="showFormDialog"
      :modal="true"
      :closable="false"
      class="item-dialog w-full md:w-[560px]"
      :pt="{
        root: { class: 'item-dialog-root' },
        header: { class: 'item-dialog-header' },
        content: { class: 'item-dialog-content' },
        footer: { class: 'item-dialog-footer' },
        mask: { class: 'item-dialog-mask' }
      }"
    >
      <!-- Custom Header -->
      <template #header>
        <div class="dialog-header-flex">
          <div class="dialog-header-main-flex">
            <div class="dialog-icon-wrap">
              <i :class="isEditing ? 'pi pi-pencil' : 'pi pi-building'" class="dialog-icon"></i>
            </div>
            <div>
              <h2 class="dialog-title">{{ isEditing ? 'Modifica Bar' : 'Nuovo Bar' }}</h2>
              <p class="dialog-subtitle">{{ isEditing ? 'Aggiorna le informazioni del bar' : 'Compila i campi per aggiungere un bar' }}</p>
            </div>
          </div>
          <button class="dialog-close-btn" @click="showFormDialog = false">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </template>

      <form @submit.prevent="saveBar" class="dialog-form">

        <!-- IP Stampante -->
        <div class="field-group field-full">
          <label class="field-label">
            IP Stampante
            <span class="required-badge">obbligatorio</span>
          </label>
          <InputText
            v-model="formData.printer_ip"
            placeholder="es. 192.168.1.50"
            class="field-input w-full"
            required
          />
        </div>

        <!-- Categorie -->
        <div class="field-group field-full">
          <label class="field-label">Categorie</label>
          <div class="categories-picker">
            <button
              v-for="category in ITEM_CATEGORIES"
              :key="category"
              type="button"
              class="category-chip"
              :class="{ active: isCategorySelected(category) }"
              @click="toggleCategory(category)"
            >
              {{ category }}
            </button>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="dialog-actions">
          <Button
            label="Annulla"
            text
            @click="showFormDialog = false"
            class="action-cancel"
          />
          <Button
            :label="isEditing ? 'Salva Modifiche' : 'Crea Bar'"
            :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'"
            type="submit"
            class="action-submit"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="deleteConfirm"
      :modal="true"
      :closable="false"
      class="delete-dialog w-full md:w-[420px]"
      :pt="{
        root: { class: 'delete-dialog-root' },
        header: { style: 'display:none' },
        content: { class: 'delete-dialog-content' },
        mask: { class: 'item-dialog-mask' }
      }"
    >
      <div class="delete-dialog-inner">
        <div class="delete-text-block">
          <h3 class="delete-title">Conferma Eliminazione</h3>
          <p class="delete-desc">
            Sei sicuro di voler eliminare il bar
            <span class="font-semibold text-slate-800">{{ barToDelete?.printer_ip }}</span>?
          </p>
          <p class="delete-warning">
            <i class="pi pi-exclamation-circle" style="font-size:0.8rem"></i>
            Questa azione non può essere annullata. Fallisce se ci sono utenti associati al bar.
          </p>
        </div>
        <div class="delete-dialog-actions-flex">
          <Button
            label="Annulla"
            text
            @click="deleteConfirm = false"
            class="action-cancel"
          />
          <Button
            label="Elimina bar"
            icon="pi pi-trash"
            @click="deleteBar"
            class="action-delete"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
