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
    <button class="itemButton" v-for="item in props.items" @click="addItem(item)">
        <div class="itemName">{{ item.name }} </div>
        <div class="itemPrice">{{ item.price.toFixed(2) }} €</div>
    </button>
    
</template>

<style scoped>
.itemButton {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  text-align: center;
  user-select: none;
}
</style>