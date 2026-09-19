<script setup>
import { ref, computed, watch } from 'vue';
import { Icon } from '@iconify/vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
  visible: { type: Boolean, default: false },
  total: { type: Number, default: 0 }, // in euro
});

const emit = defineEmits(['update:visible', 'confirm']);


const receivedCents = ref(0);
const totalCents = computed(() => Math.round(props.total * 100));
const changeCents = computed(() => receivedCents.value - totalCents.value);
const isSufficient = computed(() => receivedCents.value >= totalCents.value);


watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    receivedCents.value = 0;
  }
});

const denominations = [
  { value: 10000, label: '100', type: 'note' },
  { value: 5000, label: '50', type: 'note' },
  { value: 2000, label: '20', type: 'note' },
  { value: 1000, label: '10', type: 'note' },
  { value: 500, label: '5', type: 'note' },
  { value: 200, label: '2', type: 'coin' },
  { value: 100, label: '1', type: 'coin' },
  { value: 50, label: '0,50', type: 'coin' },
  { value: 20, label: '0,20', type: 'coin' },
  { value: 10, label: '0,10', type: 'coin' },
];

// Colori per le icone delle banconote, in base al valore
const noteIconColors = {
  10000: 'text-emerald-300',
  5000: 'text-orange-300',
  2000: 'text-sky-300',
  1000: 'text-rose-300',
  500: 'text-slate-300',
};

function iconColor(d) {
  if (d.type === 'note') return noteIconColors[d.value] || 'text-slate-300';
  return d.value >= 100 ? 'text-amber-300' : 'text-orange-200';
}

function euroLabel(cents) {
  return `€${(cents / 100).toFixed(2)}`;
}

function addCash(value) {
  receivedCents.value += value;
}

function resetCash() {
  receivedCents.value = 0;
}

// scompone il resto nel minor numero di banconote/monete possibile (algoritmo greedy)
const changeBreakdown = computed(() => {
  let remaining = Math.max(0, changeCents.value);
  const result = [];
  for (const d of denominations) {
    const count = Math.floor(remaining / d.value);
    if (count > 0) {
      result.push({ ...d, count });
      remaining -= count * d.value;
    }
  }
  return result;
});

function close() {
  emit('update:visible', false);
}

// il calcolo del resto è solo un aiuto facoltativo per il cassiere: la conferma
// non è mai bloccata, si può confermare anche senza inserire nulla
function confirm() {
  emit('confirm');
}
</script>

<template>
  <Dialog
      :visible="visible"
      @update:visible="(v) => emit('update:visible', v)"
      modal
      header="Pagamento in contanti"
      :draggable="false"
      class="dialog w-[95vw] max-w-xl"
      :pt="{
          header: { class: 'p-4 pb-4' },
          content: { class: 'p-4 pt-0' },
          footer: { class: 'p-4 pt-4' },
          closeButton: { class: 'flex h-9 w-9 items-center justify-center rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:shadow-none focus:ring-0', style: 'outline:none;box-shadow:none' }
      }"
  >
    <div class="flex flex-col gap-3 pt-1">
      <div class="rounded-xl bg-slate-100 px-4 py-4 text-center">
        <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Totale da pagare</p>
        <p class="text-3xl font-black text-slate-800">{{ euroLabel(totalCents) }}</p>
      </div>

      <div class="flex items-center justify-between rounded-xl border-2 border-slate-200 px-4 py-3">
        <span class="text-sm font-semibold text-slate-600">Contante inserito</span>
        <div class="flex items-center gap-2">
          <span class="text-xl font-black text-slate-800">{{ euroLabel(receivedCents) }}</span>
          <Button @click="resetCash" icon="pi pi-eraser" text rounded severity="secondary" class="h-10! w-10!" aria-label="Azzera" />
        </div>
      </div>

      <div>
        <p class="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Banconote</p>
        <div class="grid grid-cols-5 gap-2">
          <button
            v-for="d in denominations.filter(d => d.type === 'note')"
            :key="d.value"
            type="button"
            @click="addCash(d.value)"
            class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-slate-200 bg-white/85 py-4 text-zinc-700 transition-transform duration-100 hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <Icon icon="mdi:cash" class="text-2xl" :class="iconColor(d)" />
            <span class="text-lg font-extrabold">€{{ d.label }}</span>
          </button>
        </div>
      </div>

      <div>
        <p class="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Monete</p>
        <div class="grid grid-cols-5 gap-2">
          <button
            v-for="d in denominations.filter(d => d.type === 'coin')"
            :key="d.value"
            type="button"
            @click="addCash(d.value)"
            class="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-full border-2 border-slate-200 bg-white/85 text-zinc-700 transition-transform duration-100 hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <Icon icon="mdi:coin-outline" class="text-xl" :class="iconColor(d)" />
            <span class="text-base font-extrabold">{{ d.label }}</span>
          </button>
        </div>
      </div>

      <div
        v-if="receivedCents > 0"
        class="flex items-center justify-between rounded-xl px-4 py-3"
        :class="isSufficient ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-red-50 border-2 border-red-200'"
      >
        <span class="text-sm font-semibold" :class="isSufficient ? 'text-emerald-700' : 'text-red-700'">
          {{ isSufficient ? 'Resto' : 'Mancano' }}
        </span>
        <span class="text-xl font-black" :class="isSufficient ? 'text-emerald-800' : 'text-red-700'">
          {{ euroLabel(Math.abs(changeCents)) }}
        </span>
      </div>

      <div v-if="receivedCents > 0 && isSufficient && changeBreakdown.length" class="flex flex-col gap-1.5">
        <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Dai al cliente</p>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div
            v-for="d in changeBreakdown"
            :key="d.value"
            class="flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-2"
          >
            <Icon :icon="d.type === 'note' ? 'mdi:cash' : 'mdi:coin-outline'" class="text-2xl" :class="iconColor(d)" />
            <span class="text-lg font-black text-emerald-900">€{{ d.label }}</span>
            <span class="ml-auto text-lg font-black text-emerald-700">×{{ d.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <Button
            label="Annulla"
            severity="secondary"
            outlined
            class="rounded-full border-slate-300 px-6 py-3 text-base! font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-400"
            @click="close"
        />
        <Button
            label="Conferma pagamento"
            icon="pi pi-check"
            class="rounded-full bg-slate-800 px-6 py-3 text-base! font-semibold text-white hover:bg-slate-900"
            @click="confirm"
        />
      </div>
    </template>
  </Dialog>
</template>
