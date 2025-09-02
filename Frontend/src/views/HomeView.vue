<script setup>
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

async function handleLogout() {
    await userStore.logout();
}

const isAdmin = () => userStore.user?.role === 'admin';
const isCashier = () => userStore.user?.role === 'cashier';
const isFood = () => userStore.user?.role === 'food';
const isBeer = () => userStore.user?.role === 'beer';
const isDrink = () => userStore.user?.role === 'drink';
const isStaff = () => ['admin', 'cashier', 'food', 'beer', 'drink'].includes(userStore.user?.role);
</script>

<template>
    <div class="routes-h">
        <div v-if="isAdmin()">
            <router-link to="/admin">
                <h1>Admin Dashboard</h1>
            </router-link>
        </div>
        <div v-if="isCashier()">
            <router-link to="/orders">
                <h1>Nuovo ordine</h1>
            </router-link>
        </div>
        <div v-if="isStaff()">
            <router-link to="/history">
                <h1>Storico</h1>
            </router-link>
        </div>
        <div v-if="isFood()">
            <router-link to="/cicchetti">
                <h1>Cicchetti</h1>
            </router-link>
        </div>
        <div v-if="isBeer()">
            <router-link to="/birre">
                <h1>Birre</h1>
            </router-link>
        </div>
        <div v-if="isDrink()">
            <router-link to="/drinks">
                <h1>Drinks</h1>
            </router-link>
        </div>
    </div>

    <button @click="handleLogout">Logout</button>

</template>

<style scoped>
.routes-h {
    display: flex;
    gap: 20px;
}
</style>