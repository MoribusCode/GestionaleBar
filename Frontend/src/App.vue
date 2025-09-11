<script setup>
import { ref, provide, computed } from 'vue';
import { RouterView, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'

const route = useRoute();

const isSidebarCollapsed = ref(false);
provide('sidebarState', isSidebarCollapsed);

const showSidebar = computed(() => {
  // Hide sidebar on login pages
  return route.name !== 'login';
});
</script>

<template>
    <div class="app-container">
        <Sidebar
        v-if="showSidebar"
        v-model:collapsed="isSidebarCollapsed" 
        />
        <main :class="[
          'main-content', 
          { 
            'content-expanded': isSidebarCollapsed,
            'no-sidebar': !showSidebar
          }
        ]">
          <RouterView />
        </main>
    </div>
</template>

<style scoped>
.app-container {
  display: flex;
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

.no-sidebar {
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
