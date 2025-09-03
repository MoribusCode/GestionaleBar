<script setup>
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const isAdmin = () => userStore.user?.role === 'admin';
const isCashier = () => userStore.user?.role === 'cashier';
const isFood = () => userStore.user?.role === 'food';
const isBeer = () => userStore.user?.role === 'beer';
const isDrink = () => userStore.user?.role === 'drink';
const isStaff = () => ['admin', 'cashier', 'food', 'beer', 'drink'].includes(userStore.user?.role);
</script>

<template>
  <div class="home-container">
    <div class="menu-grid">
      <router-link 
        v-if="isAdmin()" 
        to="/admin" 
        class="menu-card admin"
      >
        <h2>Admin Dashboard</h2>
        <span class="card-description">Gestione sistema</span>
      </router-link>

      <router-link 
        v-if="isCashier()" 
        to="/orders" 
        class="menu-card orders"
      >
        <h2>Nuovo ordine</h2>
        <span class="card-description">Crea un nuovo ordine</span>
      </router-link>

      <router-link 
        v-if="isStaff()" 
        to="/history" 
        class="menu-card history"
      >
        <h2>Storico</h2>
        <span class="card-description">Visualizza ordini</span>
      </router-link>

      <router-link 
        v-if="isFood()" 
        to="/cicchetti" 
        class="menu-card food"
      >
        <h2>Cicchetti</h2>
        <span class="card-description">Gestione cicchetti</span>
      </router-link>

      <router-link 
        v-if="isBeer()" 
        to="/birre" 
        class="menu-card beer"
      >
        <h2>Birre</h2>
        <span class="card-description">Gestione birre</span>
      </router-link>

      <router-link 
        v-if="isDrink()" 
        to="/drinks" 
        class="menu-card drinks"
      >
        <h2>Drinks</h2>
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
  display: flex;
  flex-direction: column;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.menu-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  text-decoration: none;
  color: #2c3e50;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.menu-card h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.card-description {
  color: #666;
  font-size: 0.9rem;
}

/* Card variations */
.menu-card.admin {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.menu-card.orders {
  background: linear-gradient(135deg, #2dd4bf 0%, #0ea5e9 100%);
  color: white;
}

.menu-card.history {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
  color: white;
}

.menu-card.food {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: white;
}

.menu-card.beer {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
}

.menu-card.drinks {
  background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
  color: white;
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
  }

  .menu-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .menu-card {
    padding: 1.5rem;
  }

  .menu-card h2 {
    font-size: 1.25rem;
  }
}
</style>