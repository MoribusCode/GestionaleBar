<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import ManagementTemplate from '@/components/ManagementTemplate.vue';
import { API_BASE_URL, ITEM_CATEGORIES } from '@/store';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-700 focus:bg-white';

// stile della card "opzione" (In vendita / Per l'inventario / Preferito), attiva o no
function optionCardClass(active) {
  return [
    'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:border-slate-300',
    active ? 'border-slate-700 bg-slate-100' : 'border-slate-200 bg-white',
  ];
}

const managementTemplate = ref(null);

const items = ref(); // undefined finché non arriva la prima risposta: la tabella lo interpreta come "in caricamento"
const selectedItem = ref(null);
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

  if (imagePreviewUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }
  selectedImageFile.value = null;
  imagePreviewUrl.value = null;
};

const fetchItems = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/get-items`, {
      withCredentials: true
    });
    items.value = res.data.items || [];
  } catch (error) {
    console.error('Errore nel recupero degli articoli:', error);
    items.value ??= [];
  }
};

const openCreateDialog = () => {
  resetForm();
};

const openEditDialog = (item) => {
  selectedItem.value = item;
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
  managementTemplate.value.openEdit();
};

const saveItem = async () => {
  if (!formData.value.name || !formData.value.price || !formData.value.practical_unit) {
    alert('Per favore compila i campi obbligatori');
    return;
  }

  try {
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

    if (selectedItem.value) {
      await axios.patch(`${API_BASE_URL}/update-item/${selectedItem.value.id}`, payload, {
        withCredentials: true
      });
      await uploadItemImage(selectedItem.value.id);
    } else {
      const res = await axios.post(`${API_BASE_URL}/add-item`, payload, {
        withCredentials: true
      });
      await uploadItemImage(res.data.id);
    }
    managementTemplate.value.closeForm();
    resetForm();
    fetchItems();
  } catch (error) {
    console.error('Errore nel salvataggio dell\'articolo:', error);
    alert('Errore nel salvataggio dell\'articolo');
  }
};

const confirmDelete = (item) => {
  itemToDelete.value = item;
  managementTemplate.value.openDelete();
};

const deleteItem = async () => {
  if (!itemToDelete.value) return;

  try {
    await axios.delete(`${API_BASE_URL}/delete-item/${itemToDelete.value.id}`, {
      withCredentials: true
    });
    managementTemplate.value.closeDelete();
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
  <ManagementTemplate
    ref="managementTemplate"
    title="Gestione Articoli"
    subtitle="Crea, modifica e gestisci tutti gli articoli del sistema"
    entity-name="Articolo"
    create-icon="pi pi-box"
    :items="items"
    dialog-width-class="md:w-[680px]"
    @new="openCreateDialog"
    @submit="saveItem"
    @cancel-form="resetForm"
    @confirm-delete="deleteItem"
  >
    <template #columns>
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
    </template>

    <template #form>
      <!-- Nome Articolo -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Nome Articolo
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">obbligatorio</span>
        </label>
        <InputText
          v-model="formData.name"
          placeholder="es. Birra Moretti"
          :class="fieldClass"
          required
        />
      </div>

      <!-- Immagine -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Immagine</label>
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
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Prezzo (€)
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">obbligatorio</span>
          </label>
          <InputNumber
            v-model="formData.price"
            :useGrouping="false"
            :maxFractionDigits="2"
            placeholder="0.00"
            :inputClass="fieldClass"
            required
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Unità di misura
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">obbligatorio</span>
          </label>
          <InputText
            v-model="formData.practical_unit"
            placeholder="Inserisci unità (es. pezzi, litri...)"
            :class="fieldClass"
            required
          />
        </div>
      </div>

      <!-- Categoria + Stock -->
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Categoria</label>
          <Dropdown
            v-model="formData.category"
            :options="categories"
            placeholder="Seleziona categoria"
            :class="fieldClass"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Stock Minimo</label>
          <InputNumber
            v-model="formData.min_stock"
            :useGrouping="false"
            placeholder="0"
            :inputClass="fieldClass"
          />
        </div>
      </div>

      <!-- Note -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Note</label>
        <textarea
          v-model="formData.note"
          placeholder="Aggiungi note opzionali…"
          rows="3"
          class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-700 focus:bg-white"
        />
      </div>

      <!-- Opzioni -->
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Opzioni di visibilità</p>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label :class="optionCardClass(formData.flag_sale)">
            <input type="checkbox" v-model="formData.flag_sale" class="h-4 w-4 shrink-0 rounded accent-slate-800" />
            <i class="pi pi-tag" :class="formData.flag_sale ? 'text-slate-800' : 'text-slate-500'"></i>
            <div>
              <span class="block text-sm font-semibold text-slate-800">In vendita</span>
              <span class="block text-xs text-slate-400">Visibile nei cataloghi</span>
            </div>
          </label>
          <label :class="optionCardClass(formData.flag_purchase)">
            <input type="checkbox" v-model="formData.flag_purchase" class="h-4 w-4 shrink-0 rounded accent-slate-800" />
            <i class="pi pi-shopping-cart" :class="formData.flag_purchase ? 'text-slate-800' : 'text-slate-500'"></i>
            <div>
              <span class="block text-sm font-semibold text-slate-800">Per l'inventario</span>
              <span class="block text-xs text-slate-400">Da acquistare</span>
            </div>
          </label>
          <label :class="optionCardClass(formData.flag_favorite)">
            <input type="checkbox" v-model="formData.flag_favorite" class="h-4 w-4 shrink-0 rounded accent-slate-800" />
            <i class="pi pi-star" :class="formData.flag_favorite ? 'text-slate-800' : 'text-slate-500'"></i>
            <div>
              <span class="block text-sm font-semibold text-slate-800">Preferito</span>
              <span class="block text-xs text-slate-400">In evidenza in cassa</span>
            </div>
          </label>
        </div>
      </div>
    </template>

    <template #delete-message>
      <p class="text-sm text-slate-500">
        Sei sicuro di voler eliminare l'articolo
        <span class="font-semibold text-slate-800">{{ itemToDelete?.name }}</span>?
      </p>
      <p class="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
        <i class="pi pi-exclamation-circle"></i>
        Questa azione non può essere annullata.
      </p>
    </template>
  </ManagementTemplate>
</template>
