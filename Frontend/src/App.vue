<script setup>
import { ref, provide, computed } from 'vue';
import { RouterView, useRoute } from 'vue-router'
import Navbar from '@/components/Navbar.vue';
import Sidebar from '@/components/Sidebar.vue'

const route = useRoute();

/*
const isSidebarCollapsed = ref(false);
provide('sidebarState', isSidebarCollapsed);
*/

const showMenubar = computed(() => route.name !== 'login');

</script>

<template>

  <div class="min-h-screen bg-slate-100 font-sans text-slate-900">
    <Navbar v-if="showMenubar" />

    <main class="container mx-auto p-6">
      <router-view />
    </main>
  </div>
<!-- 
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

  -->
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
  padding: 0px;
}

.no-sidebar {
  margin-left: 0;
  width: 100%;
  padding: 0px;
}

/* Add media query for mobile responsiveness */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    width: 100%;
  }
}
</style>
