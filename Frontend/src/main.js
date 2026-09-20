import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'
import App from './App.vue'
import router from './router'
import { useUserStore } from '@/stores/user'

// main CSS file con anche l'import di Tailwind
import './assets/main.css'

// import di PrimeVue, il Tema e le Icone
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import 'chart.js/auto';

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

// authguard lato frontend
axios.interceptors.response.use(
  (response) => {
    // il backend rinnova il token (a scorrimento) quando manca poco alla scadenza e lo segnala
    const expiresAtHeader = response.headers?.['x-session-expires-at'];
    if (expiresAtHeader) {
      const expiresAt = Number(expiresAtHeader);
      if (Number.isFinite(expiresAt)) {
        useUserStore().sessionExpiresAt = expiresAt;
      }
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // /login (credenziali sbagliate) e /check (già gestito dalla guardia di navigazione) non
    // devono innescare il logout automatico, altrimenti un login fallito ti sbatterebbe fuori
    const isAuthEndpoint = /\/(login|logout|check)(\?|$)/.test(url);

    if (status === 401 && !isAuthEndpoint) {
      useUserStore().handleSessionExpired();
    }

    return Promise.reject(error);
  }
);
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: 'none',
            cssLayer: {
                name: 'primevue',
                order: 'tailwind-base, primevue, tailwind-utilities'
            }
        }
    }
})

app.mount('#app')
 