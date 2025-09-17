import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';


export const useUserStore = defineStore('user', () => {
  const router = useRouter();

  // --- state ---
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // --- getters ---
  const isAuthenticated = computed(() => !!user.value)

  // --- actions ---
  async function checkAuth() {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/check`, {
        withCredentials: true
      });

      if (response.data.authenticated) { user.value = response.data.user }

    } catch (err) {
      console.error("Check error:", err.message)
      return err.response.data.authenticated
    }
  }

  async function login(username, password) {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, {
        username,
        password
      }, {
        withCredentials: true
      })

      user.value = response.data.user

    } catch (err) {
      error.value = err.response.data.message || "Login failed"
    } finally {
      // termina il process di login
      loading.value = false
    }
  }

  async function logout() {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/logout`, {}, {
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
  }

  return {
    // state
    user,
    loading,
    error,
    // getters
    isAuthenticated,
    // actions
    login,
    logout,
    setUser,
    checkAuth,
    $reset
  }
});