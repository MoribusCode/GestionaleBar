<script setup>
import { computed } from 'vue'

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
  <div class="items-container">
    <div v-for="(items, category) in groupedItems" :key="category" class="category-block">
      <!-- Category title -->
      <h2 class="category-title">{{ category }}</h2>
      <hr class="category-divider" />

      <!-- Items in this category -->
      <div class="items-grid">
        <button
          v-for="item in items"
          :key="item.id"
          @click="addItem(item)"
          class="item-card"
        >
          <div class="item-content">
            <h3 class="item-name">{{ item.name }}</h3>
            <div class="item-price">
              €{{ item.price.toFixed(2) }}
            </div>
            <div class="item-category">{{ item.category }}</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.items-container {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.category-block {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
  margin: 0;
}

.category-divider {
  border: none;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  margin: 0.5rem 0 0rem 0;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
}

/* Keep your existing item-card styles here */
.item-card {
  background: var(--secondary-color);
  border: none;
  border-radius: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  padding: 1.5rem;
  overflow: hidden;
  width: 100%;
  text-align: center;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.item-card:active {
  transform: translateY(0);
  background-color: #f8f9fa;
}

.item-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.item-name {
  margin: 0;
  font-size: 1.2rem;
  color: white;
  font-weight: 500;
}

.item-price {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--primary-color);
  margin: 0;
}

.item-category {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}
</style>
