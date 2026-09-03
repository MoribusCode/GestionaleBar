<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { API_BASE_URL } from '@/store'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['item-added'])

function addItem(item) {
  emit('item-added', item.id)
}

const groupedItems = computed(() => {
  const groups = {}

  for (const item of props.items) {
    const key = item.category?.toLowerCase() || ''
    groups[key] ??= []
    groups[key].push(item)
  }

  return groups
})

const categories = computed(() => Object.keys(groupedItems.value))

const FAVORITES_TAB = 'preferiti'

function isFavorite(item) {
  return item.item_favorite === 1 || item.item_favorite === true
}

const tabCategories = computed(() => {
  const hasFavorites = props.items.some(isFavorite)
  return hasFavorites ? [FAVORITES_TAB, ...categories.value] : categories.value
})


const selectedCategory = ref(localStorage.getItem("category"))

function selectCategory(category) {
  selectedCategory.value = category
  localStorage.setItem("category", category)
}

const activeCategory = computed(() => {
  if (selectedCategory.value && tabCategories.value.includes(selectedCategory.value)) {
    return selectedCategory.value
  }
  return tabCategories.value[0] || null
})

const visibleItems = computed(() => {

  // tab "Preferiti": tutti gli articoli preferiti, di ogni categoria già
  if (activeCategory.value === FAVORITES_TAB) {
    return props.items.filter(isFavorite)
  }

  const items = groupedItems.value[activeCategory.value] || []
  return [...items].sort((a, b) => Number(isFavorite(b)) - Number(isFavorite(a)))
})


const categoryIcons = {
  preferiti: 'mdi:star',
  cicchetti: 'mdi:food-fork-drink',
  spina: 'mdi:beer',
  bar: 'mdi:glass-cocktail',
  drinks: 'mdi:cup',
}


const defaultItemImage = import.meta.glob('../assets/images/items/default.svg', {
  eager: true,
  import: 'default',
})
const DEFAULT_ITEM_IMAGE = Object.values(defaultItemImage)[0]


function imageForItem(item) {
  return item.has_image ? `${API_BASE_URL}/item-image/${item.id}` : DEFAULT_ITEM_IMAGE
}

const GRID_GAP = 0.75 //Distanza tra i bottoni 
const gridUnit = 4.125 //Scala di riferimento per la griglia


function unitsFor(item) {
  if (isFavorite(item)) return { col: 4, row: 2 }
  return { col: 2, row: 2 }
}

function spanFor(item) {
  const { col, row } = unitsFor(item)
  return { col: `span ${col}`, row: `span ${row}` }
}

function iconFor(category) {
  return categoryIcons[category?.toLowerCase()] || 'mdi:silverware-fork-knife'
}


// scala (rem) impostata a mano per icona/nome/prezzo: è la stessa per tutte le tile perché
// l'altezza (righe) è sempre la stessa, cambia solo la larghezza per i preferiti
function metricsFor() {
  const scale = 9

  return {
    icon: `${scale * 0.58}rem`,
    name: `${Math.max(scale * 0.11, 0.75)}rem`,
    price: `${Math.max(scale * 0.09, 0.7)}rem`,
  }
}


</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="category in tabCategories"
        :key="category"
        type="button"
        @click="selectCategory(category)"
        class="flex shrink-0 items-center gap-1.5 rounded-full border-2 px-[1.1rem] py-2 text-[0.9rem] font-bold capitalize transition-transform duration-100 active:scale-95"
        :class="activeCategory === category
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-slate-200 bg-white/85 text-zinc-600'"
      >
        <Icon :icon="iconFor(category)" class="text-lg" />
        <span>{{ category }}</span>
      </button>
    </div>

    
    <div
      class="grid pb-4"
      :style="{
        gap: `${GRID_GAP}rem`,
        gridTemplateColumns: `repeat(auto-fill, ${gridUnit}rem)`,
        gridAutoRows: `${gridUnit}rem`,
        gridAutoFlow: 'dense'
      }"
    >
      <template v-for="item in visibleItems" :key="item.id">
        <button
          v-for="metrics in [metricsFor()]"
          type="button"
          @click="addItem(item)"
          :style="{ gridColumn: spanFor(item).col, gridRow: spanFor(item).row }"
          class="relative flex items-center rounded-[1.25rem] border-2 border-slate-200 bg-white/85 p-3 transition-transform duration-100 active:scale-95"
          :class="isFavorite(item) ? 'flex-row justify-center gap-3 text-left' : 'flex-col justify-start gap-1.5 text-center'"
        >
          <Icon
            v-if="isFavorite(item)"
            icon="mdi:star"
            class="absolute right-2 top-2 text-base text-amber-400"
          />

          <img
            :src="imageForItem(item)"
            :alt="item.name"
            :style="{ width: metrics.icon, height: metrics.icon }"
            class="shrink-0 object-contain"
            :class="isFavorite(item) ? '' : 'mb-2'"
          />
          <div
            class="flex min-w-0 flex-col gap-[0.15rem]"
            :class="isFavorite(item) ? '' : 'absolute inset-x-0 bottom-1.5 items-center px-2'"
          >
            <span
              :style="{ fontSize: metrics.name }"
              class="line-clamp-2 font-bold leading-[1.15] text-zinc-800"
            >{{ item.name }}</span>
            <span
              :style="{ fontSize: metrics.price }"
              class="font-extrabold text-zinc-600"
            >€{{ item.price.toFixed(2) }}</span>
          </div>
        </button>
      </template>

      <p v-if="visibleItems.length === 0" class="w-full py-10 text-center text-zinc-400">
        Nessun articolo in questa categoria.
      </p>
    </div>
  </div>
</template>
