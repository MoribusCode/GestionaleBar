<script setup>
import { ref, provide, computed, onBeforeUnmount, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import Navbar from '@/components/Navbar.vue';
import { useUserStore } from '@/stores/user';


const route = useRoute();
const userStore = useUserStore();

/*
const isSidebarCollapsed = ref(false);
provide('sidebarState', isSidebarCollapsed);
*/

const showMenubar = computed(() => route.name !== 'login');

// authguard: sa esattamente quando scade il token (claim "exp" del JWT, letto da login/check)
// e programma un timer locale su quell'istante preciso, invece di riinterrogare il backend a
// intervalli — zero chiamate di rete finché la sessione non scade davvero. Senza questo, una
// cassa lasciata aperta e ferma per ore (nessuna navigazione, nessuna chiamata) non si
// accorgeva mai che il token era scaduto finché non si provava a fare qualcosa
let sessionTimeout = null;

watch(() => userStore.sessionExpiresAt, (expiresAt) => {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }

  if (!expiresAt) return;

  const delay = expiresAt - Date.now();
  if (delay <= 0) {
    userStore.handleSessionExpired();
    return;
  }

  sessionTimeout = setTimeout(() => {
    userStore.handleSessionExpired();
  }, delay);
}, { immediate: true });

onBeforeUnmount(() => {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
  }
});
</script>

<template>

  <div class="h-screen bg-slate-100 font-sans text-slate-900">
    <Navbar v-if="showMenubar" />

    <main class="h-full overflow-y-auto overflow-x-hidden px-3 pb-4 pt-[76px] lg:px-5 lg:pb-5 lg:pt-[96px]">
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
