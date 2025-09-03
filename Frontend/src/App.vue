<script setup>
import { ref, provide } from 'vue';
import { RouterView } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'

const isSidebarCollapsed = ref(false);
provide('sidebarState', isSidebarCollapsed);
</script>

<template>
    <div class="app-container">
        <Sidebar v-model:collapsed="isSidebarCollapsed" />
        <main :class="['main-content', { 'content-expanded': isSidebarCollapsed }]">
            <RouterView />
        </main>
    </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: 240px;
  padding: 1rem;
  transition: margin-left 0.3s ease;
  width: calc(100% - 240px);
}

.content-expanded {
  margin-left: 0;
  width: 100%;
}

/* Add media query for mobile responsiveness */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    width: 100%;
  }
}
</style>
