<script setup>
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const isAdmin = () => userStore.user?.role === 'admin';
const isCashier = () => userStore.user?.role === 'cashier';
const isFood = () => userStore.user?.role === 'food';
const isBeer = () => userStore.user?.role === 'beer';
const isBar = () => userStore.user?.role === 'bar';
const isDrink = () => userStore.user?.role === 'drink';
const isStaff = () => ['admin', 'cashier', 'food', 'beer', 'drink', 'bar'].includes(userStore.user?.role);
</script>

<template>
  <div class="home-container">
    <div class="menu-grid">
      <router-link v-if="isAdmin()" to="/admin" class="menu-card admin">
        <i class="fas fa-cog" style="font-size: 2.5rem; color: white;"></i>
        <h2>Admin Dashboard</h2>
        <span class="card-description">Gestione sistema</span>
      </router-link>

      <router-link v-if="isCashier()" to="/orders" class="menu-card orders">
        <i class="fas fa-plus" style="font-size: 2.5rem; color: white;"></i>
        <h2>Nuovo ordine</h2>
        <span class="card-description">Crea un nuovo ordine</span>
      </router-link>

      <router-link v-if="isStaff()" to="/history" class="menu-card history">
        <i class="fas fa-history" style="font-size: 2.5rem; color: white;"></i>
        <h2>Storico</h2>
        <span class="card-description">Visualizza ordini</span>
      </router-link>

      <router-link v-if="isFood()" to="/cicchetti" class="menu-card food">
        <i class="fa-solid fa-burger" style="font-size: 2.5rem; color: white;"></i>
        <h2>Cicchetti</h2>
        <span class="card-description">Gestione cicchetti</span>
      </router-link>

      <router-link v-if="isBeer()" to="/birre" class="menu-card beer">
        <i class="fa-solid fa-beer-mug-empty" style="font-size: 2.5rem; color: white;"></i>
        <h2>Spina</h2>
        <span class="card-description">Gestione spina</span>
      </router-link>

      <router-link v-if="isBar()" to="/bar" class="menu-card drinks">
        <i class="fa-solid fa-mug-hot" style="font-size: 2.5rem; color: white;"></i>
        <h2>Bar</h2>
        <span class="card-description">Gestione bar</span>
      </router-link>

      <router-link v-if="isDrink()" to="/drinks" class="menu-card drinks">
        <i class="fa-solid fa-martini-glass" style="font-size: 2.5rem; color: white;"></i>
        <h2>Drink</h2>
        <span class="card-description">Gestione drinks</span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.menu-card {
  background: #4A4A4A;
  border-radius: 20px;
  padding: 2.5rem;
  text-decoration: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  aspect-ratio: 1;
  justify-content: center; 
  gap: 0.75rem;
}

.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.menu-card h2 {
  margin: 0;
  font-size: 1.75rem;
  color: white;
  font-weight: 500;
}

.card-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
}

.menu-card.admin,
.menu-card.orders,
.menu-card.history,
.menu-card.food,
.menu-card.beer,
.menu-card.drinks {
  background: #4A4A4A;
}

.menu-card.admin .card-description,
.menu-card.orders .card-description,
.menu-card.history .card-description,
.menu-card.food .card-description,
.menu-card.beer .card-description,
.menu-card.drinks .card-description {
  color: rgba(255, 255, 255, 0.9);
}

.logout-btn {
  margin-top: auto;
  padding: 0.75rem 1.5rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
  align-self: center;
}

.logout-btn:hover {
  background: #bb2d3b;
}

@media (max-width: 768px) {
  .home-container {
    padding: 1rem;
    position: relative;
    z-index: 1;
    width: 100%;
    left: 0;
  }

  .menu-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
    width: 100%;
  }

  .menu-card {
    padding: 1rem;
    aspect-ratio: 1;
    max-width: 180px;
    width: 100%;
  }

  .menu-card h2 {
    font-size: 1.2rem;
  }

  .card-description {
    font-size: 0.9rem; 
  }
  
  .menu-card i {
    font-size: 2rem !important; 
  }
}
</style>