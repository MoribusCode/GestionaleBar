<script setup>
import { ref } from 'vue';
import Card from 'primevue/card';
import Tag from 'primevue/tag';

defineProps({
  orderNumber: { type: [String, Number], required: true },
  status: { type: String, default: null }, // tag di stato dell'ordine (es. "in attesa"/"completato"); null = nessun tag
  time: { type: String, default: null }, // orario già formattato (es. "14:32"), per lo storico di una chiusura passata
  paymentMethod: { type: String, default: null }, // es. "Contanti", mostrato solo se passato
  items: { type: Array, required: true }, // [{ name, quantity, status? }]
  total: { type: [String, Number], required: true }
});

const expanded = ref(false);

function toggle() {
  expanded.value = !expanded.value;
}

function statusSeverity(status) {
  return status === 'completato' ? 'success' : status === 'parziale' ? 'warn' : 'info';
}
</script>

<template>
  <Card class="w-full rounded-2xl border-2 border-slate-200/70 bg-white/85 backdrop-blur-sm">
    <template #content>
      <div class="flex cursor-pointer items-center justify-between gap-3" @click="toggle">
        <div class="flex flex-wrap items-center gap-2">
          <strong class="text-lg text-zinc-900">Ordine #{{ orderNumber }}</strong>
          <span v-if="time" class="text-sm font-medium text-slate-500">{{ time }}</span>
          <Tag v-if="status" :value="status" :severity="statusSeverity(status)" class="capitalize px-3 py-1" />
          <Tag v-if="paymentMethod" :value="paymentMethod" severity="secondary" class="capitalize px-3 py-1" />
        </div>
        <div class="flex items-center gap-1" @click.stop>
          <slot name="actions" />
        </div>
      </div>

      <div v-if="expanded" class="mt-3 border-t border-zinc-200 pt-3">
        <ul class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <li
            v-for="(item, index) in items"
            :key="index"
            class="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
          >
            <span class="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <i
                v-if="item.status === 'completato'"
                class="pi pi-check-circle text-green-600"
                v-tooltip="'Completato'"
              ></i>
              <span v-else-if="item.status" class="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" v-tooltip="'In attesa'"></span>
              {{ item.name }}
            </span>
            <span class="text-sm font-semibold text-zinc-700">x{{ item.quantity }}</span>
          </li>
        </ul>

        <div class="mt-3 text-right text-lg font-bold text-zinc-900">
          Totale: {{ total }} €
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
:deep(.p-card-body) {
  padding: 0;
}

:deep(.p-card-content) {
  padding: 1rem;
}
</style>
