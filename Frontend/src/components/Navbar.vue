<template>
  <Menubar :model="menuItems" class="fixed left-0 right-0 top-0 z-50 border-2 border-slate-200/70 bg-transparent py-4 px-8 backdrop-blur-md">
    
    <template #start>
      <div class="flex items-center gap-2 mr-8 cursor-pointer" @click="$router.push('/')">
        <img :src="logo" alt="BarH" class="h-18 w-auto" />
      </div>
    </template>

    <template #item="{ item }">
      <router-link 
        v-if="item.route && (!item.visible || item.visible())" 
        :to="item.route" 
        custom 
        v-slot="{ href, navigate, isActive }"
      >
        <a 
          :href="href" 
          @click="navigate"
          :class="[
            'inline-flex items-center gap-2 justify-center px-4 py-2 mx-1 rounded-lg transition-all duration-200 font-medium leading-none',
            isActive 
              ? 'bg-slate-800 text-white' 
              : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            ]"
            >
          <i 
            v-if="item.icon?.type === 'material'" 
            class="material-icons leading-none text-base"
          >
            {{ item.icon.name }}
          </i>
          <i v-else-if="item.icon" :class="[item.icon, 'leading-none']"></i>
          <span class="leading-none">{{ item.label }}</span>
        </a>
      </router-link>
    </template>

    <template #end>
      <div class="ml-auto flex items-center">
        <Button 
          label="Logout" 
          icon="pi pi-sign-out"
          severity="danger" 
          text 
          class="logout-btn inline-flex items-center justify-center rounded-lg mx-1 font-semibold hover:bg-red-200 px-4 py-2 leading-none"
          @click="handleLogout" 
          />
      </div>
    </template>
  </Menubar>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import logo from '@/assets/images/logo.png';

const router = useRouter();
const userStore = useUserStore();

const isAdmin = () => userStore.user?.role === 'admin';
const isCashier = () => userStore.user?.role === 'cashier';
const isFood = () => userStore.user?.role === 'Cicchetti';
const isBeer = () => userStore.user?.role === 'Spina';
const isBar = () => userStore.user?.role === 'Bar';
const isDrink = () => userStore.user?.role === 'Drinks';
const isStaff = () => ['admin', 'cashier', 'Cicchetti', 'Spina', 'Bar', 'Drinks'].includes(userStore.user?.role);
const isAuthenticated = () => !!userStore.user;

// Definiamo le rotte per la navigazione
const menuItems = ref([
  { label: 'Home', route: '/', icon: { type: 'material', name: 'home' }, visible: isStaff },
  { label: 'Bilancio', route: '/bilancio', icon: { type: 'material', name: 'account_balance_wallet' }, visible: isAuthenticated },
  { label: 'Admin', route: '/admin', icon: { type: 'material', name: 'admin_panel_settings' }, visible: isAdmin },
  { label: 'Storico', route: '/history', icon: { type: 'material', name: 'history' }, visible: isStaff },
  { label: 'Cassa', route: '/orders', icon: { type: 'material', name: 'shopping_cart' }, visible: isCashier },
  { label: 'Cicchetti', route: '/cicchetti', icon: { type: 'material', name: 'fastfood' }, visible: isFood },
  { label: 'Birre', route: '/birre', icon: { type: 'material', name: 'local_bar' }, visible: isBeer },
  { label: 'Bar', route: '/bar', icon: { type: 'material', name: 'coffee' }, visible: isBar },
  { label: 'Drinks', route: '/drinks', icon: { type: 'material', name: 'local_drink' }, visible: isDrink },
]);

const handleLogout = async () => {
  await userStore.logout();
  router.push('/login');
};
</script>

<style scoped>
:deep(.p-menubar) {
  background: transparent;
}

:deep(.p-menubar-root-list) {
  gap: 0.25rem;
}

:deep(.p-menubar-item),
:deep(.p-menubar-item-content),
:deep(.p-menubar-item-link) {
  background: transparent !important;
  border-radius: 0 !important;
  padding: 0 !important;
}

:deep(.p-menubar-item-link:hover),
:deep(.p-menubar-item-link:focus),
:deep(.p-menubar-item-link:focus-visible) {
  background: transparent !important;
  box-shadow: none !important;
}

:deep(.p-menubar-end) {
  margin-left: auto;
  display: flex;
  align-items: center;
}

:deep(.logout-btn.p-button) {
  height: 2 rem;
  display: inline-flex;
  align-items: center;
}
</style>