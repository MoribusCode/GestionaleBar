<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
import Dropdown from 'primevue/dropdown';
import OrderCard from '@/components/OrderCard.vue';
import { API_BASE_URL } from '@/store';

const route = useRoute();
const router = useRouter();
const transaction = ref(null);
const items = ref([]);
const orders = ref([]);
const catalogItems = ref([]);
const loading = ref(true);
const errorMessage = ref('');

// filtri: orario da/a, ricerca libera (articolo o numero ordine), categoria
const filterFrom = ref('');
const filterTo = ref('');
const filterSearch = ref('');
const ALL_CATEGORIES = 'all';
const filterCategory = ref(ALL_CATEGORIES);

function resetFilters() {
  filterFrom.value = '';
  filterTo.value = '';
  filterSearch.value = '';
  filterCategory.value = ALL_CATEGORIES;
}

const hasActiveFilters = computed(() => !!(filterFrom.value || filterTo.value || filterSearch.value || filterCategory.value !== ALL_CATEGORIES));

// categoria di ogni articolo, presa dal catalogo attuale (non salvata nello snapshot della chiusura)
const categoryByItemName = computed(() => {
  const map = new Map();
  catalogItems.value.forEach((item) => map.set(item.name, item.category));
  return map;
});

const categoryFilterOptions = computed(() => {
  const categories = new Set();
  items.value.forEach((item) => {
    const category = categoryByItemName.value.get(item.item_name);
    if (category) categories.add(category);
  });

  return [
    { value: ALL_CATEGORIES, label: 'Tutte le categorie' },
    ...[...categories].sort().map((category) => ({ value: category, label: category }))
  ];
});

function parseOrderDate(value) {
  if (!value) return null;
  const normalized = String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function matchesTimeRange(date) {
  const fromMinutes = timeToMinutes(filterFrom.value);
  const toMinutes = timeToMinutes(filterTo.value);
  if (fromMinutes === null && toMinutes === null) return true;
  if (!date) return false;

  const minutes = date.getHours() * 60 + date.getMinutes();

  if (fromMinutes !== null && toMinutes !== null) {
    // intervallo che attraversa la mezzanotte (es. 22:00 -> 02:00)
    if (fromMinutes <= toMinutes) return minutes >= fromMinutes && minutes <= toMinutes;
    return minutes >= fromMinutes || minutes <= toMinutes;
  }

  return fromMinutes !== null ? minutes >= fromMinutes : minutes <= toMinutes;
}

function matchesSearch(order) {
  const query = filterSearch.value.trim().toLowerCase();
  if (!query) return true;

  if (String(order.orderNumber ?? '').toLowerCase().includes(query)) return true;
  return (order.items || []).some((item) => item.name?.toLowerCase().includes(query));
}

function matchesCategory(order) {
  if (filterCategory.value === ALL_CATEGORIES) return true;
  const selected = filterCategory.value.toLowerCase();

  return (order.items || []).some((item) => {
    const category = categoryByItemName.value.get(item.name);
    if (!category) return false;
    const normalized = category.toLowerCase();
    return normalized === selected || normalized.startsWith(`${selected}_`);
  });
}

// un ordine può contenere più articoli diversi: se la ricerca/categoria trova corrispondenza
// solo su alcuni, mostra (e conta nei totali) solo quelli, non l'intero ordine com'era prima,
// che faceva comparire/contare anche articoli estranei presenti nello stesso ordine (es.
// cercando "Coca Cola" spuntava anche lo Spritz ordinato insieme)
function narrowOrderItems(order) {
  let displayItems = order.items || [];

  const query = filterSearch.value.trim().toLowerCase();
  const matchesByOrderNumber = query && String(order.orderNumber ?? '').toLowerCase().includes(query);
  if (query && !matchesByOrderNumber) {
    const matched = displayItems.filter((item) => item.name?.toLowerCase().includes(query));
    if (matched.length > 0) displayItems = matched;
  }

  if (filterCategory.value !== ALL_CATEGORIES) {
    const selected = filterCategory.value.toLowerCase();
    const matched = displayItems.filter((item) => {
      const category = categoryByItemName.value.get(item.name);
      if (!category) return false;
      const normalized = category.toLowerCase();
      return normalized === selected || normalized.startsWith(`${selected}_`);
    });
    if (matched.length > 0) displayItems = matched;
  }

  return displayItems;
}

// una chiusura riguarda sempre ordini già serviti: lo stato non viene salvato, la spunta
// verde nella card è solo visiva, impostata qui senza dipendere da un valore persistito
const sortedOrders = computed(() => [...orders.value]
  .map((order) => ({
    ...order,
    parsedDate: parseOrderDate(order.createdAt),
    items: (order.items || []).map((item) => ({ ...item, status: 'completato' }))
  }))
  .sort((left, right) => (left.parsedDate?.getTime() || 0) - (right.parsedDate?.getTime() || 0)));

// ordini che rispettano i filtri, con gli articoli già ristretti a quelli pertinenti: da qui
// derivano sia le card di riepilogo sia la tabella articoli sia lo storico ordini, così i filtri
// valgono su tutta la pagina in modo coerente
const filteredOrders = computed(() => sortedOrders.value
  .filter((order) => matchesTimeRange(order.parsedDate) && matchesSearch(order) && matchesCategory(order))
  .map((order) => ({ ...order, items: narrowOrderItems(order) })));

// tabella/grafico articoli ricalcolati dagli ordini filtrati, così i filtri valgono su tutta la
// pagina; le chiusure vecchie senza snapshot ordini (orders.length === 0) restano invariate
const filteredItems = computed(() => {
  const map = new Map();
  filteredOrders.value.forEach((order) => {
    (order.items || []).forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.price) || 0;
      const existing = map.get(item.name) || { item_name: item.name, quantity: 0, unit_price: unitPrice, total_price: 0 };
      existing.quantity += quantity;
      existing.total_price += quantity * unitPrice;
      map.set(item.name, existing);
    });
  });
  return [...map.values()];
});

const displayedItems = computed(() => (orders.value.length ? filteredItems.value : items.value));

// riepilogo incasso per metodo di pagamento: calcolato sugli articoli GIÀ FILTRATI (stesso dato
// della tabella "Articoli venduti"), non sul totale intero dell'ordine — così se cerchi "Coca
// Cola" queste card mostrano l'incasso reale di Coca Cola, non quello di tutto l'ordine in cui
// magari c'era anche altro. Senza filtri attivi coincide con l'incasso reale della giornata.
const paymentTotals = computed(() => {
  let contanti = 0, pos = 0, altro = 0;
  filteredOrders.value.forEach((order) => {
    const orderItemsTotal = (order.items || []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
      0
    );
    if (order.paymentMethod === 'contanti') contanti += orderItemsTotal;
    else if (order.paymentMethod === 'pos') pos += orderItemsTotal;
    else altro += orderItemsTotal;
  });
  return { contanti, pos, altro, totale: contanti + pos + altro };
});

const totalQuantity = computed(() => displayedItems.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
const totalItems = computed(() => displayedItems.value.reduce((sum, item) => sum + Number(item.total_price || 0), 0));
const topItems = computed(() => [...displayedItems.value]
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

// stesso ciclo di 24 ore usato in Home per l'andamento orario, così la giornata di un bar che
// resta aperto oltre mezzanotte non perde le ore dopo le 00:00
const chartHours = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3
];

const hourlySeries = computed(() => {
  const buckets = chartHours.map((hour) => ({ hour, total: 0, count: 0 }));
  const bucketIndexByHour = new Map(chartHours.map((hour, index) => [hour, index]));

  filteredOrders.value.forEach((order) => {
    if (!order.parsedDate) return;
    const bucketIndex = bucketIndexByHour.get(order.parsedDate.getHours());
    if (bucketIndex === undefined) return;

    buckets[bucketIndex].total += Number(order.totalPrice) || 0;
    buckets[bucketIndex].count += 1;
  });

  return buckets;
});

const hourlyChartData = computed(() => ({
  labels: hourlySeries.value.map((entry) => `${String(entry.hour).padStart(2, '0')}:00`),
  datasets: [
    {
      type: 'line',
      label: 'Incasso',
      data: hourlySeries.value.map((entry) => Number(entry.total.toFixed(2))),
      yAxisID: 'y',
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.20)',
      fill: true,
      tension: 0.36,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#22d3ee',
      pointBorderColor: '#0f172a',
      pointBorderWidth: 2
    },
    {
      type: 'bar',
      label: 'Ordini',
      data: hourlySeries.value.map((entry) => entry.count),
      yAxisID: 'y1',
      backgroundColor: 'rgba(34, 197, 94, 0.35)',
      borderColor: 'rgba(34, 197, 94, 0.7)',
      borderWidth: 1,
      borderRadius: 8,
      maxBarThickness: 16
    }
  ]
}));

const hourlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      labels: {
        color: '#cbd5e1',
        boxWidth: 12,
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      borderColor: 'rgba(148, 163, 184, 0.25)',
      borderWidth: 1,
      callbacks: {
        label(context) {
          if (context.dataset.label === 'Incasso') {
            return `Incasso: ${formatCurrency(context.parsed.y)}`;
          }
          return `Ordini: ${context.parsed.y}`;
        }
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#94a3b8',
        autoSkip: true,
        maxTicksLimit: 8
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.12)',
        drawBorder: false
      }
    },
    y: {
      position: 'left',
      ticks: {
        color: '#7dd3fc',
        callback(value) {
          return `${value}€`;
        }
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.12)',
        drawBorder: false
      }
    },
    y1: {
      position: 'right',
      ticks: {
        color: '#86efac',
        stepSize: 1
      },
      grid: {
        drawOnChartArea: false,
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

function formatTime(date) {
  if (!date) return '-';
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatPaymentMethod(method) {
  const labels = { contanti: 'Contanti', pos: 'POS' };
  return labels[method?.toLowerCase()] || method || '-';
}

// ristampa da uno snapshot di chiusura: l'ordine originale non esiste più nelle tabelle
// orders/order_items (cancellate alla chiusura), quindi usa l'id della riga transaction_orders
const reprintingId = ref(null);

async function reprintOrder(id, event) {
  event?.stopPropagation();
  if (reprintingId.value) return;

  reprintingId.value = id;
  try {
    await axios.post(`${API_BASE_URL}/transaction-orders/${id}/reprint`, {}, { withCredentials: true });
  } catch (e) {
    console.error(`Errore durante la ristampa dell'ordine ${id}:`, e);
    alert(e.response?.data?.message || 'Errore durante la ristampa dello scontrino');
  } finally {
    reprintingId.value = null;
  }
}

async function fetchItems() {
  try {
    const response = await axios.get(`${API_BASE_URL}/transaction-items/${route.params.id}`, { withCredentials: true });
    transaction.value = response.data.transaction;
    items.value = response.data.items || [];
    orders.value = response.data.orders || [];
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Errore nel recupero della giornata';
  } finally {
    loading.value = false;
  }
}

async function fetchCatalog() {
  try {
    const response = await axios.get(`${API_BASE_URL}/get-items`, { withCredentials: true });
    catalogItems.value = response.data.items || [];
  } catch (error) {
    console.error('Errore nel recupero del catalogo:', error);
  }
}

onMounted(() => {
  fetchItems();
  fetchCatalog();
});
</script>

<template>
  <div class="min-h-[calc(100vh-7rem)] bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div class="flex items-center justify-between gap-4">
        <Button icon="pi pi-arrow-left" label="Transazioni" text class="text-slate-700" @click="router.push('/bilancio')" />
        <span class="text-sm text-slate-500">Dettaglio giornata</span>
      </div>

      <section class="rounded-3xl border-2 border-slate-200/70 bg-white/85 p-6 backdrop-blur-sm sm:p-8">
        <h1 class="text-2xl font-semibold text-slate-900">Riepilogo della giornata</h1>
        <p v-if="transaction" class="mt-2 text-sm text-slate-500">
          {{ transaction.description }} · {{ formatDate(transaction.date) }}
        </p>

        <p v-if="loading" class="mt-8 text-center text-sm text-slate-500">Caricamento...</p>
        <p v-else-if="errorMessage" class="mt-8 text-center text-sm font-medium text-red-600">{{ errorMessage }}</p>
        <p v-else-if="items.length === 0" class="mt-8 text-center text-sm text-slate-500">Nessun articolo registrato.</p>

        <template v-else>
          <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border-2 border-slate-200/70 bg-slate-900 p-4 text-white">
              <p class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Totale</p>
              <p class="mt-1 text-2xl font-semibold">{{ formatCurrency(orders.length ? paymentTotals.totale : transaction?.amount) }}</p>
            </div>
            <div v-if="orders.length" class="rounded-2xl border-2 border-slate-200/70 bg-slate-50/80 p-4">
              <p class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Totale contanti</p>
              <p class="mt-1 text-2xl font-semibold text-slate-900">{{ formatCurrency(paymentTotals.contanti) }}</p>
            </div>
            <div v-if="orders.length" class="rounded-2xl border-2 border-slate-200/70 bg-slate-50/80 p-4">
              <p class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Totale POS</p>
              <p class="mt-1 text-2xl font-semibold text-slate-900">{{ formatCurrency(paymentTotals.pos) }}</p>
            </div>
          </div>

          <div v-if="orders.length" class="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-slate-500">Orario da</label>
              <input
                type="time"
                v-model="filterFrom"
                class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-700"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-slate-500">Orario a</label>
              <input
                type="time"
                v-model="filterTo"
                class="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-700"
              />
            </div>
            <div class="flex min-w-48 flex-1 flex-col gap-1">
              <label class="text-xs font-semibold text-slate-500">Cerca</label>
              <input
                type="text"
                v-model="filterSearch"
                placeholder="Articolo o numero ordine"
                class="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:border-slate-700"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-slate-500">Categoria</label>
              <Dropdown
                v-model="filterCategory"
                :options="categoryFilterOptions"
                optionLabel="label"
                optionValue="value"
                class="h-10 w-48 items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-800"
                :pt="{ label: { class: 'flex items-center py-0 text-sm' }, trigger: { class: 'w-8' }, overlay: { class: 'mt-2' } }"
              />
            </div>
            <Button
              v-if="hasActiveFilters"
              label="Azzera filtri"
              icon="pi pi-times"
              severity="secondary"
              outlined
              class="h-10! rounded-full! border-slate-300! px-4! text-sm! font-semibold! text-slate-600! hover:bg-slate-100! hover:border-slate-400!"
              @click="resetFilters"
            />
          </div>

          <p v-if="orders.length && filteredOrders.length === 0" class="mt-8 text-center text-sm text-slate-500">
            Nessun ordine corrisponde ai filtri selezionati.
          </p>

          <template v-else>
            <h2 class="mt-8 text-base font-semibold text-slate-900">Articoli venduti</h2>
            <div class="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
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
                  <tr v-for="item in displayedItems" :key="item.item_name">
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

            <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div class="mb-3 flex items-center justify-between gap-3">
                <h2 class="text-base font-semibold text-slate-900">I 5 articoli più venduti</h2>
                <span class="text-xs font-medium text-slate-500">Quantità venduta</span>
              </div>
              <div class="h-64">
                <Chart type="bar" :data="topItemsChartData" :options="topItemsChartOptions" class="h-full w-full" />
              </div>
            </div>

            <template v-if="orders.length">
              <div class="mt-8 rounded-3xl border-2 border-slate-200/70 bg-slate-950 p-4 text-white sm:p-6">
                <p class="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">Andamento orario</p>
                <p class="mt-1 text-sm text-slate-300">Incasso e numero ordini per ogni ora della serata</p>
                <div class="mt-4 h-64 rounded-2xl border-2 border-white/10 bg-white/5 p-3 sm:p-4">
                  <Chart type="bar" :data="hourlyChartData" :options="hourlyChartOptions" class="h-full w-full" />
                </div>
              </div>

              <h2 class="mt-8 text-base font-semibold text-slate-900">Storico ordini della serata</h2>
              <div class="mt-3 flex flex-col items-center gap-3">
                <OrderCard
                  v-for="order in filteredOrders"
                  :key="order.id"
                  :order-number="order.orderNumber ?? '-'"
                  :time="formatTime(order.parsedDate)"
                  :payment-method="formatPaymentMethod(order.paymentMethod)"
                  :items="order.items"
                  :total="order.totalPrice"
                >
                  <template #actions>
                    <Button
                      icon="pi pi-print"
                      :loading="reprintingId === order.id"
                      text
                      rounded
                      class="rounded-xl text-slate-600 transition-colors hover:bg-slate-200/70"
                      v-tooltip="'Ristampa scontrino'"
                      @click="reprintOrder(order.id, $event)"
                    />
                  </template>
                </OrderCard>
              </div>
            </template>
          </template>
        </template>
      </section>
    </div>
  </div>
</template>
