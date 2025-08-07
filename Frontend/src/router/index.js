import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter ({
  history: createWebHistory(import.meta.env.BASE_URL),
  
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/orders', name: 'orders', component: () => import('@/views/OrdersView.vue') },
    { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue') },
]
})

export default router
