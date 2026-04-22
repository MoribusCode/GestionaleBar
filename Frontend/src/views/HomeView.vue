<script setup>
import { useUserStore } from '@/stores/user';
import Card from 'primevue/card';

const userStore = useUserStore();

const isAdmin = () => userStore.user?.role === 'admin';
const isCashier = () => userStore.user?.role === 'cashier';
const isFood = () => userStore.user?.role === 'Cicchetti';
const isBeer = () => userStore.user?.role === 'Spina';
const isBar = () => userStore.user?.role === 'Bar';
const isDrink = () => userStore.user?.role === 'Drinks';
const isStaff = () => ['admin', 'cashier', 'Cicchetti', 'Spina', 'Drinks', 'Bar'].includes(userStore.user?.role);
</script>

<template>
  <div class="flex flex-col items-center justify-center mt-16 px-6">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-slate-800 tracking-tight mb-2">Benvenuto nel Gestionale ufficiale BarH!</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full max-w-6xl">
      <Card
        v-if="isAdmin()"
        class="bg-slate-800 text-white rounded-3xl border border-slate-700/50 shadow-xl hover:shadow-primary/20 hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden group"
        @click="$router.push('/admin')"
      >
        <template #content>
          <div class="flex flex-col items-center p-10 text-center">
            <div class="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <i class="fas fa-cog text-5xl text-slate-300 group-hover:text-primary transition-colors duration-300"></i>
            </div>
            <h2 class="text-3xl font-bold mb-3 tracking-tight">Admin Dashboard</h2>
            <p class="text-slate-400 font-medium text-lg">Gestione sistema</p>
          </div>
        </template>
      </Card>

      <Card
        v-if="isCashier()"
        class="bg-slate-800 text-white rounded-3xl border border-slate-700/50 shadow-xl hover:shadow-primary/20 hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden group"
        @click="$router.push('/orders')"
      >
        <template #content>
          <div class="flex flex-col items-center p-10 text-center">
            <div class="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <i class="fas fa-plus text-5xl text-slate-300 group-hover:text-primary transition-colors duration-300"></i>
            </div>
            <h2 class="text-3xl font-bold mb-3 tracking-tight">Nuovo ordine</h2>
            <p class="text-slate-400 font-medium text-lg">Crea un nuovo ordine</p>
          </div>
        </template>
      </Card>

      <Card
        v-if="isStaff()"
        class="bg-slate-800 text-white rounded-3xl border border-slate-700/50 shadow-xl hover:shadow-primary/20 hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden group"
        @click="$router.push('/history')"
      >
        <template #content>
          <div class="flex flex-col items-center p-10 text-center">
            <div class="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <i class="fas fa-history text-5xl text-slate-300 group-hover:text-primary transition-colors duration-300"></i>
            </div>
            <h2 class="text-3xl font-bold mb-3 tracking-tight">Storico</h2>
            <p class="text-slate-400 font-medium text-lg">Visualizza ordini</p>
          </div>
        </template>
      </Card>

      <Card
        v-if="isFood()"
        class="bg-slate-800 text-white rounded-3xl border border-slate-700/50 shadow-xl hover:shadow-primary/20 hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden group"
        @click="$router.push('/cicchetti')"
      >
        <template #content>
          <div class="flex flex-col items-center p-10 text-center">
            <div class="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <i class="fa-solid fa-burger text-5xl text-slate-300 group-hover:text-primary transition-colors duration-300"></i>
            </div>
            <h2 class="text-3xl font-bold mb-3 tracking-tight">Cicchetti</h2>
            <p class="text-slate-400 font-medium text-lg">Gestione cicchetti</p>
          </div>
        </template>
      </Card>

      <Card
        v-if="isBeer()"
        class="bg-slate-800 text-white rounded-3xl border border-slate-700/50 shadow-xl hover:shadow-primary/20 hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden group"
        @click="$router.push('/birre')"
      >
        <template #content>
          <div class="flex flex-col items-center p-10 text-center">
            <div class="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <i class="fa-solid fa-beer-mug-empty text-5xl text-slate-300 group-hover:text-primary transition-colors duration-300"></i>
            </div>
            <h2 class="text-3xl font-bold mb-3 tracking-tight">Spina</h2>
            <p class="text-slate-400 font-medium text-lg">Gestione spina</p>
          </div>
        </template>
      </Card>

      <Card
        v-if="isBar()"
        class="bg-slate-800 text-white rounded-3xl border border-slate-700/50 shadow-xl hover:shadow-primary/20 hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden group"
        @click="$router.push('/bar')"
      >
        <template #content>
          <div class="flex flex-col items-center p-10 text-center">
            <div class="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <i class="fa-solid fa-mug-hot text-5xl text-slate-300 group-hover:text-primary transition-colors duration-300"></i>
            </div>
            <h2 class="text-3xl font-bold mb-3 tracking-tight">Bar</h2>
            <p class="text-slate-400 font-medium text-lg">Gestione bar</p>
          </div>
        </template>
      </Card>

      <Card
        v-if="isDrink()"
        class="bg-slate-800 text-white rounded-3xl border border-slate-700/50 shadow-xl hover:shadow-primary/20 hover:border-primary/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden group"
        @click="$router.push('/drinks')"
      >
        <template #content>
          <div class="flex flex-col items-center p-10 text-center">
            <div class="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <i class="fa-solid fa-martini-glass text-5xl text-slate-300 group-hover:text-primary transition-colors duration-300"></i>
            </div>
            <h2 class="text-3xl font-bold mb-3 tracking-tight">Drink</h2>
            <p class="text-slate-400 font-medium text-lg">Gestione drinks</p>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-card-body) {
  padding: 0;
}

:deep(.p-card-content) {
  padding: 0;
}
</style>