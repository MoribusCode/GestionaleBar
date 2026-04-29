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
import { API_BASE_URL } from '@/store';

const items = ref([]);
const loading = ref(false);
const selectedItem = ref(null);
const showFormDialog = ref(false);
const isEditing = ref(false);
const deleteConfirm = ref(false);
const itemToDelete = ref(null);

const categories = ref(['Cicchetti', 'Spina', 'Bar', 'Drinks']);

const formData = ref({
  name: '',
  price: null,
  category: null,
  note: '',
  min_stock: 0,
  practical_unit: '',
  flag_sale: false,
  flag_purchase: false
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
    flag_purchase: false
  };
  selectedItem.value = null;
  isEditing.value = false;
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
    flag_purchase: item.item_purchase === 1 || item.item_purchase === true
  };
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
        flag_purchase: formData.value.flag_purchase
      };
      await axios.patch(`${API_BASE_URL}/update-item/${selectedItem.value.id}`, payload, {
        withCredentials: true
      });
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
        flag_purchase: formData.value.flag_purchase
      };
      await axios.post(`${API_BASE_URL}/add-item`, payload, {
        withCredentials: true
      });
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

<style scoped>
/* ── DataTable ───────────────────────────────────────────── */
:deep(.p-datatable .p-datatable-thead > tr > th) {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #334155;
  font-weight: 600;
  padding: 1rem;
}
:deep(.p-datatable .p-datatable-tbody > tr > td) {
  border-color: #e2e8f0;
  padding: 1rem;
  color: #475569;
}
:deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background: #f1f5f9;
}

/* ── Dialog shell ────────────────────────────────────────── */
:deep(.item-dialog-root) {
  border-radius: 1.5rem !important;
  box-shadow:
    0 0 0 1px rgba(0,0,0,.06),
    0 24px 48px -12px rgba(15, 23, 42, .22) !important;
  overflow: hidden;
  border: none !important;
  background: #fff !important;
  gap: 0 !important;
}
:deep(.item-dialog-mask) {
  backdrop-filter: blur(6px);
  background: rgba(15, 23, 42, .35) !important;
}
:deep(.item-dialog-header) {
  padding: 2.25rem 2.75rem 2rem !important;
  border-bottom: 1.5px solid #f1f5f9 !important;
  background: #fff !important;
}
:deep(.item-dialog-content) {
  padding: 0 !important;
  overflow: hidden;
  background: #fff;
}

/* ── Dialog header custom elements ───────────────────────── */
.dialog-icon-wrap {
  width: 3rem;
  height: 3rem;
  border-radius: 0.875rem;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dialog-header-flex {
  width: 100%;
  padding: 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.dialog-header-main-flex {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  min-width: 0;
  flex: 1;
}
.dialog-icon {
  color: #fff;
  font-size: 1rem;
}
.dialog-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}
.dialog-subtitle {
  font-size: 0.775rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}
.dialog-close-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .15s ease;
  font-size: 0.8rem;
  flex-shrink: 0;
}
.dialog-close-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

/* ── Form layout ─────────────────────────────────────────── */
.dialog-form {
  padding: 1.75rem 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.fields-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

/* ── Field ───────────────────────────────────────────────── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  letter-spacing: .02em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.required-badge {
  font-size: 0.65rem;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  text-transform: none;
  letter-spacing: 0;
}

:deep(.field-input .p-inputtext),
:deep(.field-input.p-inputtext),
:deep(.field-input .p-inputnumber-input),
:deep(.field-input.p-dropdown),
:deep(.field-input .p-dropdown),
:deep(.field-input.p-select),
:deep(.field-input .p-select) {
  border-radius: 0.75rem !important;
  border: 1.5px solid #e2e8f0 !important;
  background: #f8fafc !important;
  color: #1e293b !important;
  font-size: 0.9rem !important;
  padding: 0.625rem 0.875rem !important;
  transition: border-color .15s, box-shadow .15s, background .15s !important;
}
:deep(.field-input .p-inputtext:focus),
:deep(.field-input.p-inputtext:focus),
:deep(.field-input .p-inputnumber-input:focus),
:deep(.field-input.p-dropdown.p-focus),
:deep(.field-input .p-dropdown.p-focus),
:deep(.field-input.p-select.p-focus),
:deep(.field-input .p-select.p-focus) {
  border-color: #334155 !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(51, 65, 85, .10) !important;
  outline: none !important;
}
:deep(.field-input.p-dropdown .p-dropdown-trigger),
:deep(.field-input.p-select .p-select-dropdown) {
  border-radius: 0 0.75rem 0.75rem 0 !important;
  background: transparent !important;
  color: #94a3b8 !important;
}
:deep(.field-input.p-select .p-select-label) {
  padding: 0 !important;
  color: #1e293b !important;
  font-size: 0.9rem !important;
}
:deep(.field-input.p-select .p-select-label.p-placeholder) {
  color: #94a3b8 !important;
}
:deep(.field-input.p-inputnumber) {
  width: 100%;
}
:deep(.field-input.p-inputnumber .p-inputtext) {
  width: 100%;
}

.field-textarea {
  border-radius: 0.75rem;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  color: #1e293b;
  font-size: 0.9rem;
  padding: 0.625rem 0.875rem;
  resize: none;
  font-family: inherit;
  transition: border-color .15s, box-shadow .15s, background .15s;
  line-height: 1.5;
}
.field-textarea:focus {
  border-color: #334155;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(51, 65, 85, .10);
  outline: none;
}
.field-textarea::placeholder {
  color: #cbd5e1;
}


/* ── Dropdown panel ──────────────────────────────────────── */
:deep(.p-dropdown-panel) {
  border-radius: 0.875rem !important;
  border: 1.5px solid #e2e8f0 !important;
  box-shadow: 0 8px 24px -4px rgba(15,23,42,.14) !important;
  overflow: hidden !important;
  margin-top: 0.375rem !important;
}
:deep(.p-dropdown-panel .p-dropdown-items-wrapper) {
  border-radius: 0.875rem !important;
  padding: 0.375rem 0.375rem 0.375rem 0.9rem !important;
}
:deep(.p-select-panel .p-select-list) {
  padding: 0.375rem 0.375rem 0.375rem 0.9rem !important;
}
:deep(.p-dropdown-panel .p-dropdown-item),
:deep(.p-select-panel .p-select-option) {
  border-radius: 0.5rem !important;
  font-size: 0.875rem !important;
  color: #334155 !important;
  padding: 0.6rem 1.25rem !important;
  transition: background .12s !important;
}
:deep(.p-dropdown-panel .p-dropdown-item:hover),
:deep(.p-select-panel .p-select-option:hover) {
  background: #f1f5f9 !important;
  color: #0f172a !important;
}
:deep(.p-dropdown-panel .p-dropdown-item.p-highlight),
:deep(.p-select-panel .p-select-option.p-select-option-selected) {
  background: #1e293b !important;
  color: #fff !important;
  font-weight: 600 !important;
}

/* ── Options section ─────────────────────────────────────── */
.options-section {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 1rem;
  padding: 1rem 1.125rem;
}
.options-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}
.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.option-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  transition: border-color .15s, background .15s, box-shadow .15s;
  user-select: none;
}
.option-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.option-card.active {
  border-color: #334155;
  background: #f0f4f8;
  box-shadow: 0 0 0 3px rgba(51,65,85,.08);
}
.option-content {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}
.option-icon {
  font-size: 0.95rem;
  color: #64748b;
}
.option-card.active .option-icon {
  color: #1e293b;
}
.option-title {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1;
}
.option-desc {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 0.2rem;
}
:deep(.option-checkbox .p-checkbox-box) {
  border-radius: 0.375rem !important;
  border-color: #cbd5e1 !important;
  width: 1.1rem !important;
  height: 1.1rem !important;
  transition: all .15s !important;
}
:deep(.option-checkbox .p-checkbox-box.p-highlight) {
  background: #1e293b !important;
  border-color: #1e293b !important;
}

/* ── Dialog footer / actions ─────────────────────────────── */
.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
  margin-top: 0.25rem;
}

:deep(.delete-dialog-root) {
  border-radius: 1.5rem !important;
  box-shadow:
    0 0 0 1px rgba(0,0,0,.06),
    0 24px 48px -12px rgba(15, 23, 42, .22) !important;
  overflow: hidden;
  border: none !important;
  background: #fff !important;
}

:deep(.delete-dialog-content) {
  padding: 2.5rem 2.5rem 2rem !important;
  overflow: hidden !important;
}

.delete-dialog-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.25rem;
}

.delete-text-block {
  display: flex;
  padding-top: 15px;
  flex-direction: column;
  gap: 0.5rem;
}

.delete-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.delete-desc {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
}

.delete-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 0.78rem;
  color: #dc2626;
  background: #fff5f5;
  border: 1px solid #fecaca;
  border-radius: 0.625rem;
  padding: 0.45rem 0.875rem;
  margin-top: 0.25rem;
}

.delete-dialog-actions-flex {
  display: flex;
  justify-content: center;
  gap: 0.875rem;
  width: 100%;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-top: 1px solid #f1f5f9;
}

:deep(.action-delete.p-button) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 0.6rem 1.5rem !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 2px 8px rgba(220,38,38,.30) !important;
  transition: opacity .15s, transform .15s, box-shadow .15s !important;
}
:deep(.action-delete.p-button:hover) {
  opacity: 0.88 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 14px rgba(220,38,38,.35) !important;
}

@media (max-width: 768px) {
  .dialog-header-flex {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .dialog-close-btn {
    align-self: flex-end;
  }

  .fields-row {
    grid-template-columns: 1fr;
  }

  .dialog-actions,
  .delete-dialog-actions-flex {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  :deep(.action-submit.p-button),
  :deep(.action-cancel.p-button),
  :deep(.delete-dialog-actions-flex .p-button) {
    width: 100%;
  }
}
:deep(.action-cancel.p-button) {
  color: #64748b !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 0.6rem 1.25rem !important;
  border-radius: 0.75rem !important;
  transition: background .15s !important;
}
:deep(.action-cancel.p-button:hover) {
  background: #f1f5f9 !important;
  color: #1e293b !important;
}
:deep(.action-submit.p-button) {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  padding: 0.6rem 1.5rem !important;
  border-radius: 0.75rem !important;
  box-shadow: 0 2px 8px rgba(15,23,42,.25) !important;
  transition: opacity .15s, transform .15s, box-shadow .15s !important;
}
:deep(.action-submit.p-button:hover) {
  opacity: 0.92 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 14px rgba(15,23,42,.30) !important;
}
:deep(.action-submit.p-button:active) {
  transform: translateY(0) !important;
}
</style>

<style>
.p-select-list {
  padding: 0.375rem !important;
}
.p-select-option {
  padding: 0.45rem 1rem !important;
  border-radius: 0.5rem !important;
}
</style>