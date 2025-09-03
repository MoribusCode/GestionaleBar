<script setup>
import { useUserStore } from '@/stores/user';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const emit = defineEmits(['update:collapsed']);

const userStore = useUserStore();
const router = useRouter();
const isCollapsed = ref(false);

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  emit('update:collapsed', isCollapsed.value);
};

const handleLogout = async () => {
  await userStore.logout();
  router.push('/login');
};

const isAdmin = () => userStore.user?.role === 'admin';
const isCashier = () => userStore.user?.role === 'cashier';
const isFood = () => userStore.user?.role === 'food';
const isBeer = () => userStore.user?.role === 'beer';
const isDrink = () => userStore.user?.role === 'drink';
const isStaff = () => ['admin', 'cashier', 'food', 'beer', 'drink'].includes(userStore.user?.role);
</script>

<template>
  <div class="sidebar-container">
    <button class="hamburger-btn" @click="toggleSidebar" :class="{ 'sidebar-open': !isCollapsed }">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </button>

    <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item home">
          <span class="nav-text">Home</span>
        </router-link>

        <router-link v-if="isAdmin()" to="/admin" class="nav-item">
          <span class="nav-text">Admin</span>
        </router-link>

        <router-link v-if="isCashier()" to="/orders" class="nav-item">
          <span class="nav-text">Ordini</span>
        </router-link>

        <router-link v-if="isStaff()" to="/history" class="nav-item">
          <span class="nav-text">Storico</span>
        </router-link> 

        <router-link v-if="isFood()" to="/cicchetti" class="nav-item">
          <span class="nav-text">Cicchetti</span>
        </router-link>

        <router-link v-if="isBeer()" to="/birre" class="nav-item">
          <span class="nav-text">Birre</span>
        </router-link>

        <router-link v-if="isDrink()" to="/drinks" class="nav-item">
          <span class="nav-text">Drinks</span>
        </router-link>
      </nav>

      <button class="logout-btn" @click="handleLogout">
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          />
        </svg>
        <span class="btn-text" v-show="!isCollapsed">Logout</span>
      </button>

    </aside>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background-color: #2c3e50;
  color: white;
  padding: 4rem 0 1rem;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  z-index: 100;
  transition: transform 0.3s ease;
  transform: translateX(0);
}

.sidebar.collapsed {
  transform: translateX(-240px);
}

.sidebar-container {
  position: relative;
}

.sidebar.collapsed .nav-text {
  display: none;
}

.hamburger-btn {
  position: fixed;
  left: 1rem;
  top: 1rem;
  z-index: 1000;
  background: #2c3e50;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logout-btn {
  margin: 1rem;
  padding: 0.75rem;
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: rgba(220, 53, 69, 0.2);
}

.btn-text {
  white-space: nowrap;
}

.collapsed .logout-btn {
  padding: 0.75rem;
}

.collapsed .btn-text {
  display: none;
}

.hamburger-btn.sidebar-open {
  left: 200px;
}

.hamburger-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.hamburger-btn.active {
  transform: rotate(180deg);
}

.hamburger-btn svg {
  transition: transform 0.3s ease;
}

.sidebar.collapsed .nav-text {
  display: none;
}

.sidebar-nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: #fff;
  text-decoration: none;
  transition: background-color 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-item.router-link-active {
  background-color: rgba(255, 255, 255, 0.15);
  font-weight: 500;
}

.nav-text {
  margin-left: 0.5rem;
}

.nav-icon {
  width: 24px;
  text-align: center;
  margin-right: 0.5rem;
}

.toggle-btn:hover {
  background: #f8f9fa;
}

.toggle-btn {
  position: absolute;
  right: -12px;
  top: 20px;
  width: 24px;
  height: 24px;
  background: white;
  border: none;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 101;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.collapsed {
    transform: translateX(0);
    width: 240px;
  }

  .sidebar.collapsed .nav-text {
    display: block;
  }
}
</style>