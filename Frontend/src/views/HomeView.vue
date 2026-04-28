<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useRouter } from 'vue-router';
import Chart from 'primevue/chart';
import { useUserStore } from '@/stores/user';
import { API_BASE_URL, SOCKET_PATH, SOCKET_URL } from '@/store';

const userStore = useUserStore();
const router = useRouter();

const liveOrders = ref([]);
const refreshInterval = ref(null);
let socket = null;

const isAdmin = () => userStore.user?.role === 'admin';
const isCashier = () => userStore.user?.role === 'cashier';
const isFood = () => userStore.user?.role === 'Cicchetti';
const isBeer = () => userStore.user?.role === 'Spina';
const isBar = () => userStore.user?.role === 'Bar';
const isDrink = () => userStore.user?.role === 'Drinks';
const isStaff = () => ['admin', 'cashier', 'Cicchetti', 'Spina', 'Drinks', 'Bar'].includes(userStore.user?.role);
const isAuthenticated = () => !!userStore.user;

const navigationCards = [
  {
    key: 'admin',
    visible: isAdmin,
    title: 'Admin Dashboard',
    description: 'Gestione sistema',
    icon: 'fas fa-cog',
    route: '/admin'
  },
  {
    key: 'cashier',
    visible: isCashier,
    title: 'Nuovo ordine',
    description: 'Crea un nuovo ordine',
    icon: 'fas fa-plus',
    route: '/orders'
  },
  {
    key: 'history',
    visible: isStaff,
    title: 'Storico',
    description: 'Visualizza ordini',
    icon: 'fas fa-history',
    route: '/history'
  },
  {
    key: 'balance',
    visible: isAuthenticated,
    title: 'Bilancio',
    description: 'Saldo e transazioni',
    icon: 'fas fa-wallet',
    route: '/bilancio'
  },
  {
    key: 'food',
    visible: isFood,
    title: 'Cicchetti',
    description: 'Gestione cicchetti',
    icon: 'fa-solid fa-burger',
    route: '/cicchetti'
  },
  {
    key: 'beer',
    visible: isBeer,
    title: 'Spina',
    description: 'Gestione spina',
    icon: 'fa-solid fa-beer-mug-empty',
    route: '/birre'
  },
  {
    key: 'bar',
    visible: isBar,
    title: 'Bar',
    description: 'Gestione bar',
    icon: 'fa-solid fa-mug-hot',
    route: '/bar'
  },
  {
    key: 'drink',
    visible: isDrink,
    title: 'Drink',
    description: 'Gestione drinks',
    icon: 'fa-solid fa-martini-glass',
    route: '/drinks'
  }
];

const visibleCards = computed(() => navigationCards.filter((card) => card.visible()));

function goTo(route) {
  router.push(route);
}

function parseOrderDate(value) {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(value || 0);
}

function sameLocalDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

async function fetchLiveOrders() {
  try {
    const response = await axios.get(`${API_BASE_URL}/orders`, { withCredentials: true });

    liveOrders.value = response.data.map((order) => ({
      ...order,
      totalPrice: Number(order.totalPrice) || 0,
      createdAt: order.createdAt || order.created_at || null
    }));
  } catch (error) {
    console.error('Errore nel recupero degli ordini live:', error);
  }
}

const todayOrders = computed(() => {
  const now = new Date();

  return liveOrders.value
    .map((order) => ({
      ...order,
      parsedDate: parseOrderDate(order.createdAt)
    }))
    .filter((order) => order.parsedDate && sameLocalDay(order.parsedDate, now));
});

const chartHours = [
  9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 0
];

const hourlySeries = computed(() => {
  const buckets = chartHours.map((hour) => ({
    hour,
    total: 0,
    count: 0
  }));

  const bucketIndexByHour = new Map(chartHours.map((hour, index) => [hour, index]));

  todayOrders.value.forEach((order) => {
    const hour = order.parsedDate.getHours();
    const bucketIndex = bucketIndexByHour.get(hour);

    if (bucketIndex === undefined) {
      return;
    }

    buckets[bucketIndex].total += order.totalPrice;
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

const hourlyChartOptions = computed(() => ({
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
}));

const topItems = computed(() => {
  const grouped = new Map();

  todayOrders.value.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = item.name;
      const quantity = Number(item.quantity) || 0;

      grouped.set(key, (grouped.get(key) || 0) + quantity);
    });
  });

  return [...grouped.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 5);
});

const topItemLabel = computed(() => {
  if (!topItems.value.length) {
    return 'Nessun prodotto venduto';
  }

  const best = topItems.value[0];
  return `${best.name} (${best.quantity})`;
});

const topItemsChartData = computed(() => {
  if (!topItems.value.length) {
    return {
      labels: ['Nessun dato'],
      datasets: [
        {
          label: 'Quantita venduta',
          data: [0],
          backgroundColor: ['rgba(148, 163, 184, 0.28)'],
          borderColor: ['rgba(148, 163, 184, 0.6)'],
          borderWidth: 1,
          borderRadius: 10
        }
      ]
    };
  }

  return {
    labels: topItems.value.map((item) => item.name),
    datasets: [
      {
        label: 'Quantita venduta',
        data: topItems.value.map((item) => item.quantity),
        backgroundColor: [
          'rgba(34, 197, 94, 0.60)',
          'rgba(14, 165, 233, 0.58)',
          'rgba(56, 189, 248, 0.56)',
          'rgba(125, 211, 252, 0.52)',
          'rgba(163, 230, 53, 0.52)',
          'rgba(244, 244, 245, 0.38)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 0.95)',
          'rgba(14, 165, 233, 0.95)',
          'rgba(56, 189, 248, 0.95)',
          'rgba(125, 211, 252, 0.9)',
          'rgba(163, 230, 53, 0.9)',
          'rgba(226, 232, 240, 0.7)'
        ],
        borderWidth: 1,
        borderRadius: 10
      }
    ]
  };
});

const topItemsChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      callbacks: {
        label(context) {
          return `Quantita: ${context.parsed.x}`;
        }
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        color: '#94a3b8',
        stepSize: 1
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.12)',
        drawBorder: false
      }
    },
    y: {
      ticks: {
        color: '#cbd5e1'
      },
      grid: {
        display: false,
        drawBorder: false
      }
    }
  }
}));

const peakHour = computed(() => {
  const bestSlot = hourlySeries.value.reduce((best, entry) => (entry.total > best.total ? entry : best), hourlySeries.value[0]);

  if (!bestSlot || bestSlot.total === 0) {
    return 'Nessun picco ancora';
  }

  return `${String(bestSlot.hour).padStart(2, '0')}:00`;
});

const lastUpdateLabel = computed(() => {
  const latestOrder = [...todayOrders.value]
    .sort((left, right) => right.parsedDate - left.parsedDate)[0];

  if (!latestOrder) {
    return 'In attesa di nuovi ordini';
  }

  return latestOrder.parsedDate.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

const liveTotal = computed(() => todayOrders.value.reduce((sum, order) => sum + order.totalPrice, 0));

const liveOrdersCount = computed(() => todayOrders.value.length);

const currentHourValue = computed(() => {
  const currentHour = new Date().getHours();
  return hourlySeries.value.find((entry) => entry.hour === currentHour) || { total: 0, count: 0 };
});

function scheduleRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }

  refreshInterval.value = setInterval(() => {
    void fetchLiveOrders();
  }, 60000);
}

onMounted(async () => {
  await fetchLiveOrders();
  scheduleRefresh();

  socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true
  });

  socket.on('connect', () => {
    void fetchLiveOrders();
  });

  socket.on('reconnect', () => {
    void fetchLiveOrders();
  });

  socket.on('new-order', () => {
    void fetchLiveOrders();
  });
});

onBeforeUnmount(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }
});
</script>

<template>
  <div class="min-h-[calc(100vh-7rem)] bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">

    <div class="mx-auto grid h-full w-full max-w-352 gap-6 lg:grid-cols-12">
      <section class="flex flex-col gap-6 lg:col-span-6">
        <div class="rounded-3xl border-2 border-slate-200/70 bg-white/80 px-8 py-8 backdrop-blur-sm sm:px-10 sm:py-10">
          <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Home
          </span>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Benvenuto nel Gestionale ufficiale BarH!
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
            Accesso rapido alle aree operative e panoramica live dell'andamento della giornata.
          </p>
        </div>

        <div class="grid auto-rows-fr grid-cols-2 items-stretch gap-4 xl:grid-cols-3 xl:gap-6">
          <button
            v-for="card in visibleCards"
            :key="card.key"
            type="button"
            @click="goTo(card.route)"
            class="group flex h-full min-h-62 flex-col items-center justify-center gap-6 rounded-3xl border-2 border-slate-200/70 bg-white/80 p-7 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 sm:p-8"
          >
            <span class="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-white transition-transform duration-300 group-hover:scale-110">
              <i :class="card.icon + ' text-3xl'"></i>
            </span>
            <div>
              <p class="text-lg font-semibold text-slate-900 sm:text-xl">
                {{ card.title }}
              </p>
              <p class="mt-2 text-sm leading-snug text-slate-500">
                {{ card.description }}
              </p>
            </div>
          </button>
        </div>
      </section>

      <aside class="lg:col-span-6">
        <div class="sticky top-8 flex h-full flex-col rounded-3xl border-2 border-slate-200/70 bg-white/85 p-6 backdrop-blur-sm sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <span class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                Live oggi
              </span>
              <h2 class="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Andamento della giornata
              </h2>
            </div>

            <div class="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
              <p class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">
                Totale oggi
              </p>
              <p class="mt-1 text-xl font-semibold">
                {{ formatCurrency(liveTotal) }}
              </p>
            </div>
          </div>

          <div class="mt-6 grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-4 sm:gap-4">
            <div class="w-full max-w-48 rounded-2xl border-2 border-slate-200/70 bg-slate-50/80 p-3">
              <p class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Ordini</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">{{ liveOrdersCount }}</p>
            </div>
            <div class="w-full max-w-48 rounded-2xl border-2 border-slate-200/70 bg-slate-50/80 p-3">
              <p class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Picco</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">{{ peakHour }}</p>
            </div>
            <div class="w-full max-w-48 rounded-2xl border-2 border-slate-200/70 bg-slate-50/80 p-3">
              <p class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Venduto di piu</p>
              <p class="mt-2 truncate text-lg font-semibold text-slate-900">{{ topItemLabel }}</p>
            </div>
            <div class="w-full max-w-48 rounded-2xl border-2 border-slate-200/70 bg-slate-50/80 p-3">
              <p class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Ultimo update</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">{{ lastUpdateLabel }}</p>
            </div>
          </div>

          <div class="mt-6 rounded-4xl border-2 border-slate-200/70 bg-slate-950 p-4 text-white sm:p-6">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">Andamento orario</p>
                <p class="mt-2 text-sm text-slate-300">Incasso e numero ordini per ogni ora</p>
              </div>
              <div class="text-right">
                <p class="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">Fascia attuale</p>
                <p class="mt-2 text-sm text-slate-200">{{ currentHourValue.count }} ordini</p>
              </div>
            </div>

            <div class="mt-5 overflow-hidden rounded-3xl border-2 border-white/10 bg-white/5 p-3 sm:p-4">
              <div class="h-64">
                <Chart type="bar" :data="hourlyChartData" :options="hourlyChartOptions" class="h-full w-full" />
              </div>
            </div>

            <div class="mt-5 rounded-3xl border-2 border-white/10 bg-white/5 p-3 sm:p-4">
              <div class="mb-3 flex items-center justify-between gap-2">
                <p class="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">Top venduti oggi</p>
                <p class="text-xs font-semibold text-slate-300">Totale voci: {{ topItems.length }}</p>
              </div>
              <div class="h-56">
                <Chart type="bar" :data="topItemsChartData" :options="topItemsChartOptions" class="h-full w-full" />
              </div>
            </div>

          </div>
        </div>
      </aside>
    </div>
  </div>
</template>