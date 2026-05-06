<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'

const props = defineProps({
  items: {
    type: Array,
    required: true,
    // item structure: { id: Number, name: String, price: Number, quantity: Number, category: String }
  },
})

const emit = defineEmits(['item-added'])

function addItem(item) {
  emit('item-added', item.id)
}

// Group items by category
const groupedItems = computed(() => {
  return props.items.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = []
    }
    groups[item.category].push(item)
    return groups
  }, {})
})
</script>

<template>
  <div class="flex gap-3 overflow-x-auto pb-2">
    <div
      v-for="(items, category) in groupedItems"
      :key="category"
      class="flex min-w-44 flex-1 shrink-0 flex-col rounded-2xl border-2 border-slate-200/70 bg-white/85 p-3 backdrop-blur-sm"
    >
      <h2 class="pb-2 text-center text-xl font-black tracking-tight text-zinc-800">{{ category }}</h2>
      <div class="mb-2 h-px bg-slate-200"></div>

      <div class="flex max-h-[70vh] flex-col gap-1 overflow-y-auto pr-1">
        <Button
          v-for="item in items"
          :key="item.id"
          @click="addItem(item)"
          :label="item.name"
          class="h-8! w-full! shrink-0! justify-start! rounded-md! border! border-slate-200! bg-slate-50/80! px-2! py-0! text-left! text-sm! font-medium! text-zinc-700! hover:bg-slate-100!"
        />
      </div>
    </div>
  </div>
</template>
