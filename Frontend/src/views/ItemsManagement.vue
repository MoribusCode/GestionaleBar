<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Dropdown from 'primevue/dropdown';
import { API_BASE_URL, ITEM_CATEGORIES } from '@/store';

const items = ref([]);
const loading = ref(false);
const selectedItem = ref(null);
const showFormDialog = ref(false);
const isEditing = ref(false);
const deleteConfirm = ref(false);
const itemToDelete = ref(null);

// immagine articolo: file scelto (non ancora caricato) + url per l'anteprima
const selectedImageFile = ref(null);
const imagePreviewUrl = ref(null);
const imageFileInput = ref(null);

function imageUrlForItem(item) {
  return item.has_image ? `${API_BASE_URL}/item-image/${item.id}` : null;
}

function onImageFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  selectedImageFile.value = file;

  if (imagePreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }
  imagePreviewUrl.value = URL.createObjectURL(file);
}

async function uploadItemImage(itemId) {
  if (!selectedImageFile.value) return;

  const body = new FormData();
  body.append('file', selectedImageFile.value);

  try {
    await axios.post(`${API_BASE_URL}/item-image/${itemId}`, body, {
      withCredentials: true
    });
  } catch (error) {
    console.error('Errore nel caricamento dell\'immagine:', error);
    alert('Articolo salvato, ma il caricamento dell\'immagine è fallito');
  }
}

const categories = ref(ITEM_CATEGORIES);

const formData = ref({
  name: '',
  price: null,
  category: null,
  note: '',
  min_stock: 0,
  practical_unit: '',
  flag_sale: false,
  flag_purchase: false,
  flag_favorite: false
});

const resetForm = () => {
  formData.value = {
    name: '',
    price: null,
    category: null,
    note: '',
    min_stock: 0,
    practical_unit: '',
    flag_sale: false,
    flag_purchase: false,
    flag_favorite: false
  };
  selectedItem.value = null;
  isEditing.value = false;

  if (imagePreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }
  selectedImageFile.value = null;
  imagePreviewUrl.value = null;
};

const fetchItems = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`${API_BASE_URL}/get-items`, {
      withCredentials: true
    });
    items.value = res.data.items || [];
  } catch (error) {
    console.error('Errore nel recupero degli articoli:', error);
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  resetForm();
  showFormDialog.value = true;
};

const openEditDialog = (item) => {
  selectedItem.value = item;
  isEditing.value = true;
  formData.value = {
    name: item.name,
    price: item.price,
    category: item.category,
    note: item.note || '',
    min_stock: item.minimum_stock || 0,
    practical_unit: item.practical_unit,
    flag_sale: item.item_sale === 1 || item.item_sale === true,
    flag_purchase: item.item_purchase === 1 || item.item_purchase === true,
    flag_favorite: item.item_favorite === 1 || item.item_favorite === true
  };
  imagePreviewUrl.value = imageUrlForItem(item);
  showFormDialog.value = true;
};

const saveItem = async () => {
  if (!formData.value.name || !formData.value.price || !formData.value.practical_unit) {
    alert('Per favore compila i campi obbligatori');
    return;
  }

  try {
    if (isEditing.value && selectedItem.value) {
      // Update
      const payload = {
        name: formData.value.name,
        price: formData.value.price,
        category: formData.value.category,
        note: formData.value.note,
        min_stock: formData.value.min_stock,
        practical_unit: formData.value.practical_unit,
        flag_sale: formData.value.flag_sale,
        flag_purchase: formData.value.flag_purchase,
        flag_favorite: formData.value.flag_favorite
      };
      await axios.patch(`${API_BASE_URL}/update-item/${selectedItem.value.id}`, payload, {
        withCredentials: true
      });
      await uploadItemImage(selectedItem.value.id);
      console.log('Articolo aggiornato con successo');
    } else {
      // Create
      const payload = {
        name: formData.value.name,
        price: formData.value.price,
        category: formData.value.category,
        note: formData.value.note,
        min_stock: formData.value.min_stock,
        practical_unit: formData.value.practical_unit,
        flag_sale: formData.value.flag_sale,
        flag_purchase: formData.value.flag_purchase,
        flag_favorite: formData.value.flag_favorite
      };
      const res = await axios.post(`${API_BASE_URL}/add-item`, payload, {
        withCredentials: true
      });
      await uploadItemImage(res.data.id);
      console.log('Articolo creato con successo');
    }
    showFormDialog.value = false;
    resetForm();
    fetchItems();
  } catch (error) {
    console.error('Errore nel salvataggio dell\'articolo:', error);
    alert('Errore nel salvataggio dell\'articolo');
  }
};

const confirmDelete = (item) => {
  itemToDelete.value = item;
  deleteConfirm.value = true;
};

const deleteItem = async () => {
  if (!itemToDelete.value) return;

  try {
    await axios.delete(`${API_BASE_URL}/delete-item/${itemToDelete.value.id}`, {
      withCredentials: true
    });
    console.log('Articolo eliminato con successo');
    deleteConfirm.value = false;
    itemToDelete.value = null;
    fetchItems();
  } catch (error) {
    console.error('Errore nella cancellazione dell\'articolo:', error);
    alert('Errore nella cancellazione dell\'articolo');
  }
};

onMounted(() => {
  fetchItems();
});
</script>

<template>
  <div class="m-4 flex flex-col bg-slate-50 rounded-3xl border-2 border-slate-200">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 px-8 py-6 top-0 z-40 rounded-t-3xl overflow-hidden">
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <h1 class="text-4xl font-bold text-slate-800">Gestione Articoli</h1>
          <p class="text-slate-600 mt-1">Crea, modifica e gestisci tutti gli articoli del sistema</p>
        </div>
        <Button
          label="Nuovo Articolo"
          icon="pi pi-plus"
          class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Content Area -->
    <div class="px-8 py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Items Table -->
        <div class="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
          <DataTable
            :value="items"
            :loading="loading"
            tableStyle="min-width: 100%"
          >
            <Column header="Foto" style="width: 6%">
              <template #body="{ data }">
                <img
                  v-if="data.has_image"
                  :src="imageUrlForItem(data)"
                  alt=""
                  class="h-10 w-10 rounded-lg object-cover border border-slate-200"
                />
                <div v-else class="h-10 w-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                  <i class="pi pi-image text-slate-300"></i>
                </div>
              </template>
            </Column>
            <Column field="id" header="ID" style="width: 8%"></Column>
            <Column field="name" header="Nome"></Column>
            <Column field="price" header="Prezzo" style="width: 12%">
              <template #body="{ data }">
                <span class="font-semibold text-slate-800">€{{ data.price.toFixed(2) }}</span>
              </template>
            </Column>
            <Column field="category" header="Categoria" style="width: 15%"></Column>
            <Column field="practical_unit" header="Unità" style="width: 10%"></Column>
            <Column field="item_sale" header="Vendita" style="width: 10%">
              <template #body="{ data }">
                <i :class="[
                  data.item_sale ? 'pi pi-check text-green-600' : 'pi pi-times text-red-600',
                  'text-xl'
                ]"></i>
              </template>
            </Column>
            <Column field="item_purchase" header="Acquisto" style="width: 10%">
              <template #body="{ data }">
                <i :class="[
                  data.item_purchase ? 'pi pi-check text-green-600' : 'pi pi-times text-red-600',
                  'text-xl'
                ]"></i>
              </template>
            </Column>
            <Column header="Azioni" style="width: 18%">
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
      class="item-dialog w-full md:w-[680px]"
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
              <i :class="isEditing ? 'pi pi-pencil' : 'pi pi-box'" class="dialog-icon"></i>
            </div>
            <div>
              <h2 class="dialog-title">{{ isEditing ? 'Modifica Articolo' : 'Nuovo Articolo' }}</h2>
              <p class="dialog-subtitle">{{ isEditing ? 'Aggiorna le informazioni dell\'articolo' : 'Compila i campi per aggiungere un articolo' }}</p>
            </div>
          </div>
          <button class="dialog-close-btn" @click="showFormDialog = false">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </template>

      <form @submit.prevent="saveItem" class="dialog-form">

        <!-- Nome Articolo -->
        <div class="field-group field-full">
          <label class="field-label">
            Nome Articolo
            <span class="required-badge">obbligatorio</span>
          </label>
          <InputText
            v-model="formData.name"
            placeholder="es. Birra Moretti"
            class="field-input w-full"
            required
          />
        </div>

        <!-- Immagine -->
        <div class="field-group field-full">
          <label class="field-label">Immagine</label>
          <div
            class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
            @click="imageFileInput?.click()"
          >
            <img
              v-if="imagePreviewUrl"
              :src="imagePreviewUrl"
              alt=""
              class="h-14 w-14 shrink-0 rounded-lg object-cover border border-slate-200"
            />
            <input ref="imageFileInput" type="file" accept="image/*" @change="onImageFileChange" />
          </div>
        </div>

        <!-- Prezzo + Unità -->
        <div class="fields-row">
          <div class="field-group">
            <label class="field-label">
              Prezzo (€)
              <span class="required-badge">obbligatorio</span>
            </label>
            <InputNumber
              v-model="formData.price"
              :useGrouping="false"
              :maxFractionDigits="2"
              placeholder="0.00"
              class="field-input w-full"
              required
            />
          </div>
          <div class="field-group">
            <label class="field-label">
              Unità di misura
              <span class="required-badge">obbligatorio</span>
            </label>
            <InputText
              v-model="formData.practical_unit"
              placeholder="Inserisci unità (es. pezzi, litri...)"
              class="field-input w-full"
              required
            />
          </div>
        </div>

        <!-- Categoria + Stock -->
        <div class="fields-row">
          <div class="field-group">
            <label class="field-label">Categoria</label>
            <Dropdown
              v-model="formData.category"
              :options="categories"
              placeholder="Seleziona categoria"
              class="field-input w-full"
            />
          </div>
          <div class="field-group">
            <label class="field-label">Stock Minimo</label>
            <InputNumber
              v-model="formData.min_stock"
              :useGrouping="false"
              placeholder="0"
              class="field-input w-full"
            />
          </div>
        </div>

        <!-- Note -->
        <div class="field-group field-full">
          <label class="field-label">Note</label>
          <textarea
            v-model="formData.note"
            placeholder="Aggiungi note opzionali…"
            rows="3"
            class="field-textarea w-full"
          />
        </div>

        <!-- Opzioni -->
        <div class="options-section">
          <p class="options-label">Opzioni di visibilità</p>
          <div class="options-grid">
            <label class="option-card" :class="{ active: formData.flag_sale }">
              <Checkbox v-model="formData.flag_sale" binary inputId="flag_sale" class="option-checkbox" />
              <div class="option-content">
                <i class="pi pi-tag option-icon"></i>
                <div>
                  <span class="option-title">In vendita</span>
                  <span class="option-desc">Visibile nei cataloghi</span>
                </div>
              </div>
            </label>
            <label class="option-card" :class="{ active: formData.flag_purchase }">
              <Checkbox v-model="formData.flag_purchase" binary inputId="flag_purchase" class="option-checkbox" />
              <div class="option-content">
                <i class="pi pi-shopping-cart option-icon"></i>
                <div>
                  <span class="option-title">Per l'inventario</span>
                  <span class="option-desc">Da acquistare</span>
                </div>
              </div>
            </label>
            <label class="option-card" :class="{ active: formData.flag_favorite }">
              <Checkbox v-model="formData.flag_favorite" binary inputId="flag_favorite" class="option-checkbox" />
              <div class="option-content">
                <i class="pi pi-star option-icon"></i>
                <div>
                  <span class="option-title">Preferito</span>
                  <span class="option-desc">In evidenza in cassa</span>
                </div>
              </div>
            </label>
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
            :label="isEditing ? 'Salva Modifiche' : 'Crea Articolo'"
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
            Sei sicuro di voler eliminare l'articolo
            <span class="font-semibold text-slate-800">{{ itemToDelete?.name }}</span>?
          </p>
          <p class="delete-warning">
            <i class="pi pi-exclamation-circle" style="font-size:0.8rem"></i>
            Questa azione non può essere annullata.
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
            label="Elimina articolo"
            icon="pi pi-trash"
            @click="deleteItem"
            class="action-delete"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
