<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')

async function handleLogin() {
    await userStore.login(username.value.trim(), password.value);

    if (userStore.isAuthenticated) {
        router.push('/');
    } else {
        error.value = 'Login failed';
    }
}
</script>

<template>
    <div class="login-container">
        <div class="logo-container">
            <img src="@/assets/images/logo.png" alt="Logo" class="logo">
        </div>
        <form @submit.prevent="handleLogin" class="login-form">
            <h2>Login</h2>

            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" v-model="username" required>
            </div>

            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" v-model="password" required>
            </div>

            <button type="submit">Login</button>

            <p v-if="error" class="error">{{ error }}</p>
        </form>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

.login-form {
    width: 400px;
    padding: 2rem;
    background-color: #333333;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.logo {
    max-width: 1000px;
    height: auto;
}

.logo-container {
    margin-bottom: 2rem;
    text-align: center;
}

h2 {
    color: white;
    text-align: center;
    font-size: 2rem;
    margin-bottom: 2rem;
}


.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    color: white;
    margin-bottom: 0.5rem;
    font-size: 1rem;
}

.form-group input {
    width: 100%;
    padding: 0.8rem;
    border: none;
    border-radius: 8px;
    background-color: white;
    font-size: 1rem;
    box-sizing: border-box;
}

button {
    width: 100%;
    padding: 0.8rem;
    background-color: #FF5733;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 500;
    transition: background-color 0.2s ease;
}

button:hover {
    background-color: #ff4019;
}

.error {
    color: #ff4444;
    margin-top: 1rem;
    text-align: center;
    font-size: 0.9rem;
}
</style>