import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { API_BASE_URL } from '@/store';


export const useUserStore = defineStore('user', () => {
  const router = useRouter();

  // --- state ---
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)
  // timestamp (ms) di scadenza del JWT, letto dal backend (claim "exp"): serve a un timer
  // locale in App.vue per sapere quando la sessione scade senza dover ripetere /check
  const sessionExpiresAt = ref(null)

  // --- getters ---
  const isAuthenticated = computed(() => !!user.value)

  // --- actions ---
  // ritorna true/false: usato sia dalla guardia di navigazione sia dal controllo periodico
  // in App.vue per sapere se la sessione è ancora valida, non solo per popolare lo stato
  async function checkAuth() {
    try {
      const response = await axios.get(`${API_BASE_URL}/check`, {
        withCredentials: true
      });

      if (response.data.authenticated) {
        user.value = response.data.user;
        sessionExpiresAt.value = response.data.expiresAt ?? null;
        return true;
      }

      user.value = null;
      sessionExpiresAt.value = null;
      return false;

    } catch (err) {
      console.error("Check error:", err.message)
      user.value = null;
      sessionExpiresAt.value = null;
      return false;
    }
  }

  // token scaduto/non valido rilevato mentre l'utente era già dentro (non un login fallito):
  // pulisce la sessione lato server/client e manda al login con un messaggio, invece di
  // lasciare l'app in uno stato rotto dove le richieste falliscono silenziosamente
  let sessionExpiredHandled = false;
  async function handleSessionExpired() {
    if (sessionExpiredHandled) return;
    sessionExpiredHandled = true;

    try {
      await axios.post(`${API_BASE_URL}/logout`, {}, { withCredentials: true });
    } catch (err) {
      // il cookie potrebbe già essere invalido: non è un problema, va pulito comunque lato client
    }

    $reset();
    router.push({ name: 'login', query: { expired: '1' } });

    // riabilita per la prossima sessione, dopo che il redirect è partito
    setTimeout(() => { sessionExpiredHandled = false; }, 1000);
  }

  async function login(username, password) {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username,
        password
      }, {
        withCredentials: true
      })

      user.value = response.data.user
      sessionExpiresAt.value = response.data.expiresAt ?? null

    } catch (err) {
      error.value = err.response.data.message || "Login failed"
    } finally {
      // termina il process di login
      loading.value = false
    }
  }

  async function logout() {
    try {
      const response = await axios.post(`${API_BASE_URL}/logout`, {}, {
        withCredentials: true
      })

      if (response.status === 200) {
        $reset();

        // redirect to login page
        router.push('/login');
      }

    } catch (err) {
      error.value = err.response.data.message || "Logout failed"
    }
  }

  function setUser(newUser) {
    user.value = newUser
  }

  function $reset() {
    user.value = null;
    loading.value = false;
    error.value = null;
    sessionExpiresAt.value = null;
  }

  return {
    // state
    user,
    loading,
    error,
    sessionExpiresAt,
    // getters
    isAuthenticated,
    // actions
    login,
    logout,
    setUser,
    checkAuth,
    handleSessionExpired,
    $reset
  }
});