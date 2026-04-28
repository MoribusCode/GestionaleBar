<script setup>
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { API_BASE_URL } from '@/store';

const loading = ref(false);
const savingById = ref({});
const savingAll = ref(false);
const rows = ref([]);

const hasRows = computed(() => rows.value.length > 0);

function normalizeInt(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function mapItem(item) {
  const currentQuantity = normalizeInt(item.current_quantity);
  const minimumStock = normalizeInt(item.minimum_stock);

  return {
    id: item.id,
    name: item.name,
    category: item.category || '-',
    practicalUnit: item.practical_unit || '-',
    minimumStock,
    currentQuantity,
    draftCurrentQuantity: currentQuantity
  };
}

function quantityToBuy(row) {
  return Math.max(0, normalizeInt(row.minimumStock) - normalizeInt(row.draftCurrentQuantity));
}

function quantityExcess(row) {
  return Math.max(0, normalizeInt(row.draftCurrentQuantity) - normalizeInt(row.minimumStock));
}

async function fetchInventoryOverview() {
  loading.value = true;
  try {
    const response = await axios.get(`${API_BASE_URL}/inventory-overview`, {
      withCredentials: true
    });

    rows.value = (response.data.items || []).map(mapItem);
  } catch (error) {
    console.error('Errore nel recupero panoramica inventario:', error);
    alert('Impossibile recuperare i dati inventario');
  } finally {
    loading.value = false;
  }
}

async function saveCurrentQuantity(row) {
  const quantity = normalizeInt(row.draftCurrentQuantity);
  savingById.value[row.id] = true;

  try {
    await axios.put(
      `${API_BASE_URL}/update-inventory/${row.id}`,
      { quantity },
      { withCredentials: true }
    );

    row.currentQuantity = quantity;
    row.draftCurrentQuantity = quantity;
  } catch (error) {
    console.error(`Errore nel salvataggio quantita per item ${row.id}:`, error);
    alert(`Errore nel salvataggio per ${row.name}`);
  } finally {
    savingById.value[row.id] = false;
  }
}

async function saveAllQuantities() {
  savingAll.value = true;

  try {
    await Promise.all(rows.value.map((row) => saveCurrentQuantity(row)));
    alert('Quantita inventario salvate con successo');
  } catch (error) {
    console.error('Errore nel salvataggio globale inventario:', error);
    alert('Errore durante il salvataggio delle quantita');
  } finally {
    savingAll.value = false;
  }
}

onMounted(() => {
  fetchInventoryOverview();
});
</script>

<template>
  <div class="m-4 flex flex-col rounded-3xl border-2 border-slate-200 bg-slate-50">
    <div class="rounded-t-3xl border-b border-slate-200 bg-white px-8 py-6">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold text-slate-800">Pianificazione Acquisti</h1>
          <p class="mt-1 text-slate-600">
            Imposta la quantita presente in magazzino e controlla subito la quantita da acquistare.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <Button
            label="Salva"
            icon="pi pi-save"
            :loading="savingAll"
            :disabled="savingAll || loading"
            class="rounded-full bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-900"
            @click="saveAllQuantities"
          />
          <Button
            label="Aggiorna"
            icon="pi pi-refresh"
            :disabled="savingAll || loading"
            class="rounded-full bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-900"
            @click="fetchInventoryOverview"
          />
        </div>
      </div>
    </div>

    <div class="px-8 py-8">
      <div class="mx-auto max-w-7xl rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
        <DataTable
          :value="rows"
          :loading="loading"
          tableStyle="min-width: 100%"
          stripedRows
          responsiveLayout="scroll"
          sortField="name"
          :sortOrder="1"
          class="inventory-table"
        >
          <template #empty>
            <span class="text-slate-500">Nessun articolo disponibile</span>
          </template>

          <Column field="name" header="Articolo" sortable style="min-width: 16rem"></Column>
          <Column field="category" header="Categoria" style="width: 12rem"></Column>
          <Column field="practicalUnit" header="Unità" style="width: 10rem"></Column>

          <Column field="minimumStock" header="Quantità minima" style="width: 12rem">
            <template #body="{ data }">
              <span class="font-semibold text-slate-700">{{ data.minimumStock }}</span>
            </template>
          </Column>

          <Column field="draftCurrentQuantity" header="Quantità presente" style="width: 16rem">
            <template #body="{ data }">
              <InputNumber
                v-model="data.draftCurrentQuantity"
                :useGrouping="false"
                inputClass="w-20 text-center font-semibold text-slate-700"
                class="w-20 inline-block"
                :min="0"
              />
            </template>
          </Column>

          <Column header="In eccesso" style="width: 14rem">
            <template #body="{ data }">
              <Tag
                :value="quantityExcess(data)"
                :severity="quantityExcess(data) > 0 ? 'info' : 'secondary'"
              />
            </template>
          </Column>

          <Column header="Da acquistare" style="width: 14rem">
            <template #body="{ data }">
              <Tag
                :value="quantityToBuy(data)"
                :severity="quantityToBuy(data) > 0 ? 'warning' : 'success'"
              />
            </template>
          </Column>

        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.inventory-table .p-datatable-thead > tr > th) {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #334155;
  font-weight: 600;
  padding: 1rem;
}

:deep(.inventory-table .p-datatable-tbody > tr > td) {
  border-color: #e2e8f0;
  padding: 1rem;
  color: #475569;
  vertical-align: middle;
}

:deep(.inventory-table .p-datatable-tbody > tr:hover) {
  background: #f1f5f9;
}

:deep(.inventory-table .p-inputnumber input) {
  padding: 0.5rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
}

:deep(.inventory-table .p-tag) {
  border-radius: 9999px;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  min-width: 3.4rem;
  justify-content: center;
}
</style>
