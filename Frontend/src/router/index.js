import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),

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
      path: '/admin',
      component: () => import('@/views/AdminLayout.vue'),
      meta: {
        requiresAuth: true,
        roles: ['admin']
      },
      children: [
        {
          path: '',
          name: 'admin',
          component: () => import('@/views/AdminDashboard.vue')
        },
        {
          path: 'items-management',
          name: 'items-management',
          component: () => import('@/views/ItemsManagement.vue')
        },
        {
          path: 'users-management',
          name: 'users-management',
          component: () => import('@/views/UsersManagement.vue')
        },
        {
          path: 'bars-management',
          name: 'bars-management',
          component: () => import('@/views/BarsManagement.vue')
        },
        {
          path: 'inventory-planning',
          name: 'inventory-planning',
          component: () => import('@/views/InventoryPlanningView.vue')
        }
      ]
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/OrdersView.vue'),
      meta: { 
        requiresAuth: true,
        roles: ['cashier']
       }
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { 
        requiresAuth: true,
        roles: ['admin', 'cashier', 'Cicchetti', 'Spina', 'Drinks', 'Bar']
      }
    },
    {
      path: '/bilancio',
      name: 'bilancio',
      component: () => import('@/views/BilancioView.vue'),
      meta: {
        requiresAuth: true
      }
    },
    {
      path: '/cicchetti',
      name: 'cicchetti',
      component: () => import('@/views/Cicchetti.vue'),
      meta: {
        requiresAuth: true,
        roles: ['Cicchetti']
      }
    },
    {
      path: '/birre',
      name: 'birre',
      component: () => import('@/views/Birre.vue'),
      meta: {
        requiresAuth: true,
        roles: ['Spina']
      }
    },
    {
      path: '/bar',
      name: 'bar',
      component: () => import('@/views/Bar.vue'),
      meta: {
        requiresAuth: true,
        roles: ['Bar']
      }
    },
    {
      path: '/drinks',
      name: 'drinks',
      component: () => import('@/views/Drinks.vue'),
      meta: {
        requiresAuth: true,
        roles: ['Drinks']
      }
    },
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

  else if (to.meta.roles && !to.meta.roles.includes(userStore.user?.role)) {
    next ({ name: 'home' });
  }

  else { next(); }
});

export default router
