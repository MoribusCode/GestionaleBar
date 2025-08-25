import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue')
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/OrdersView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/cicchetti',
      name: 'cicchetti',
      component: () => import('@/views/Cicchetti.vue')
    },
    {
      path: '/birre',
      name: 'birre',
      component: () => import('@/views/Birre.vue')
    },
    {
      path: '/drinks',
      name: 'drinks',
      component: () => import('@/views/Drinks.vue')
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  await userStore.checkAuth();

  // if the route requires auth and user isn't authenticated, redirect to login
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next({ name: 'login' });
  } 
  // if user is authenticated and tries to access login page, redirect to home
  else if (to.name === 'login' && userStore.isAuthenticated) {
    next({ name: 'home' });
  }
  else {
    next();
  }
});

export default router
