import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter ({
  history: createWebHistory(import.meta.env.BASE_URL),
  
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/orders', name: 'orders', component: () => import('@/views/OrdersView.vue') },
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue') },
    { path: '/cicchetti', name: 'cicchetti', component: () => import('@/views/Cicchetti.vue') },
    { path: '/birre', name: 'birre', component: () => import('@/views/Birre.vue') },
    { path: '/drinks', name: 'drinks', component: () => import('@/views/Drinks.vue') }
]
})

export default router
