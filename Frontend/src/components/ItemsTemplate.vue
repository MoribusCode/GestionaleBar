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
      <button 
        v-for="item in props.items" 
        :key="item.id"
        @click="addItem(item)"
        class="item-card"
      >
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
  padding: 1rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.item-card {
  background: white;
  border: none;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  width: 100%;
  text-align: left;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.item-card:active {
  transform: translateY(0);
  background-color: #f8f9fa;
}

.item-content {
  padding: 1rem;
}

.item-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 600;
}

.item-price {
  font-size: 1.2rem;
  font-weight: 500;
  color: #0d6efd;
  margin-bottom: 0.5rem;
}

.item-category {
  font-size: 0.8rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .item-content {
    padding: 0.75rem;
  }

  .item-name {
    font-size: 1rem;
  }
  
  .item-price {
    font-size: 1.1rem;
  }
}
</style>