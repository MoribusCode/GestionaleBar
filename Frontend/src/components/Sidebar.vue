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
  width: 280px;
  background-color: #333333;
  color: white;
  padding: 1rem 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
  z-index: 100;
  transition: transform 0.3s ease;
  transform: translateX(0);
}

.sidebar.collapsed {
  transform: translateX(-280px);
}

.sidebar-container {
  position: relative;
}

.sidebar.collapsed .nav-text {
  display: none;
}

.hamburger-btn {
  position: fixed;
  left: 0.5rem;
  top: 0.5rem;
  z-index: 1000;
  background: #333333;
  border: none;
  color: #FF5733;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn {
  margin: auto 1rem 1rem 1rem;
  padding: 0.75rem 1.5rem;
  background: #FF5733;
  color: white;
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
  background: #E64A2E;  
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
  left: 220px;
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
  margin-top: 5rem;;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 1.25rem 2rem;
  color: #fff;
  text-decoration: none;
  transition: background-color 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  font-size: 1.5rem;
  font-weight: 500;
}

.nav-item:hover {
  background-color: #444444;
}

.nav-item.router-link-active {
  background-color: #444444;
}

.nav-text {
  margin-left: 0.5rem;
}

.nav-icon {
  width: 24px;
  text-align: center;
  margin-right: 0.5rem;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 240px;
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 999;
  }

  .sidebar.collapsed {
    transform: translateX(-240px);
  }

  .sidebar.collapsed + .home-container {
    margin-left: 0;
  }

  .nav-item {
    padding: 0.75rem 1.5rem; 
    font-size: 1.2rem;
  }

  .hamburger-btn {
    left: 1rem;
    top: 1rem;
    padding: 0.5rem;
    position: fixed;
  }

  .hamburger-btn svg {
    width: 20px;
    height: 20px; 
  }

  .hamburger-btn.sidebar-open {
    left: 1rem; 
  }

  .sidebar.collapsed {
    transform: translateX(0);
    width: 240px;
  }

  .sidebar.collapsed .nav-text {
    display: block;
  }

  
  .sidebar-nav {
    margin-top: 4rem; 
    gap: 0.25rem; 
  }

    .logout-btn {
    padding: 0.75rem 1.25rem; 
    font-size: 1rem; 
    margin: auto 1rem 1rem 1rem; 
    gap: 0.75rem; 
  }

  .logout-btn svg {
    width: 18px; 
    height: 18px;
  }

  .btn-text {
    display: inline-block !important;
  }

  .collapsed .btn-text {
    display: inline-block !important;
  }
}
</style>