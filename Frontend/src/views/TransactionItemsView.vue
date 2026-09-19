<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
import { API_BASE_URL } from '@/store';

const route = useRoute();
const router = useRouter();
const transaction = ref(null);
const items = ref([]);
const loading = ref(true);
const errorMessage = ref('');

const totalQuantity = computed(() => items.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
const totalItems = computed(() => items.value.reduce((sum, item) => sum + Number(item.total_price || 0), 0));
const topItems = computed(() => [...items.value]
  .sort((left, right) => Number(right.quantity || 0) - Number(left.quantity || 0))
  .slice(0, 5));

const topItemsChartData = computed(() => ({
  labels: topItems.value.map((item) => item.item_name),
  datasets: [
    {
      label: 'Quantità venduta',
      data: topItems.value.map((item) => Number(item.quantity) || 0),
      backgroundColor: [
        'rgba(34, 197, 94, 0.60)',
        'rgba(14, 165, 233, 0.58)',
        'rgba(56, 189, 248, 0.56)',
        'rgba(125, 211, 252, 0.52)',
        'rgba(163, 230, 53, 0.52)'
      ],
      borderColor: [
        'rgba(34, 197, 94, 0.95)',
        'rgba(14, 165, 233, 0.95)',
        'rgba(56, 189, 248, 0.95)',
        'rgba(125, 211, 252, 0.9)',
        'rgba(163, 230, 53, 0.9)'
      ],
      borderWidth: 1,
      borderRadius: 10
    }
  ]
}));

const topItemsChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label(context) {
          return `Quantità: ${context.parsed.x}`;
        }
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        color: '#64748b',
        stepSize: 1
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.18)',
        drawBorder: false
      }
    },
    y: {
      ticks: {
        color: '#334155'
      },
      grid: {
        display: false,
        drawBorder: false
      }
    }
  }
};

function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '-';
  const normalized = String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('it-IT');
}

async function fetchItems() {
  try {
    const response = await axios.get(`${API_BASE_URL}/transaction-items/${route.params.id}`, { withCredentials: true });
    transaction.value = response.data.transaction;
    items.value = response.data.items || [];
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Errore nel recupero degli articoli';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchItems);
</script>

<template>
  <div class="min-h-[calc(100vh-7rem)] bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div class="flex items-center justify-between gap-4">
        <Button icon="pi pi-arrow-left" label="Transazioni" text class="text-slate-700" @click="router.push('/bilancio')" />
        <span class="text-sm text-slate-500">Dettaglio chiusura</span>
      </div>

      <section class="rounded-3xl border-2 border-slate-200/70 bg-white/85 p-6 backdrop-blur-sm sm:p-8">
        <h1 class="text-2xl font-semibold text-slate-900">Articoli venduti nella chiusura</h1>
        <p v-if="transaction" class="mt-2 text-sm text-slate-500">
          {{ transaction.description }} · {{ formatDate(transaction.date) }}
        </p>

        <p v-if="loading" class="mt-8 text-center text-sm text-slate-500">Caricamento...</p>
        <p v-else-if="errorMessage" class="mt-8 text-center text-sm font-medium text-red-600">{{ errorMessage }}</p>
        <p v-else-if="items.length === 0" class="mt-8 text-center text-sm text-slate-500">Nessun articolo registrato.</p>
        <div v-else class="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table class="w-full min-w-150 text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Articolo</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Quantità</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Prezzo unitario</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Totale</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr v-for="item in items" :key="item.item_name">
                <td class="px-4 py-3 font-medium text-slate-800">{{ item.item_name }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ item.quantity }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ formatCurrency(item.unit_price) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-slate-800">{{ formatCurrency(item.total_price) }}</td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-50 font-semibold text-slate-800">
              <tr>
                <td class="px-4 py-3">Totale</td>
                <td class="px-4 py-3 text-right">{{ totalQuantity }}</td>
                <td></td>
                <td class="px-4 py-3 text-right">{{ formatCurrency(totalItems) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-if="items.length" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-slate-900">I 5 articoli più venduti</h2>
            <span class="text-xs font-medium text-slate-500">Quantità venduta</span>
          </div>
          <div class="h-64">
            <Chart type="bar" :data="topItemsChartData" :options="topItemsChartOptions" class="h-full w-full" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>