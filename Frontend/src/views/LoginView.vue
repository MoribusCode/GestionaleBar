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
    justify-content: center;
    align-items: center;
    height: 100vh;
}

.login-form {
    width: 300px;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
}

.form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

button {
    width: 100%;
    padding: 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.error {
    color: red;
    margin-top: 10px;
    text-align: center;
}
</style>