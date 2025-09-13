<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true,
    // item structure: { id: Number, name: String, price: Number, quantity: Number, category: String }
  },
})

//emit logic to notify and pass the added items to the parent component
const emit = defineEmits(['itemAdded'])

function addItem(item) {
  emit('itemAdded', item.id);
}
</script>


<template>
  <div class="items-container">
    <div class="items-grid">
      <button v-for="item in props.items" :key="item.id" @click="addItem(item)" class="item-card">
        <div class="item-content">
          <h3 class="item-name">{{ item.name }}</h3>
          <div class="item-price">€{{ item.price.toFixed(2) }}</div>
          <div class="item-category">{{ item.category }}</div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.items-container {
  padding: 3rem 3rem 3rem 3rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
}

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
  font-size: 1.75rem;
  color: white;
  font-weight: 500;
}

.item-price {
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--primary-color);
  margin: 0;
}

.item-category {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: none;
  letter-spacing: normal;
}

@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .items-container {
    padding: 1rem;
  }

  .item-card {
    padding: 1rem;
  }

  .item-name {
    font-size: 1.2rem;
  }

  .item-price {
    font-size: 1.2rem;
  }

  .item-category {
    font-size: 0.9rem;
  }
}
</style>