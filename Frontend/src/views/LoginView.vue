<script setup>
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import EyeIcon from '@primevue/icons/eye'
import EyeSlashIcon from '@primevue/icons/eyeslash'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import logoUrl from '@/assets/images/logo.png'

const userStore = useUserStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = computed(() => userStore.loading)

async function handleLogin() {
    error.value = ''

    await userStore.login(username.value.trim(), password.value)

    if (userStore.isAuthenticated) {
        router.push('/')
    } else {
        error.value = userStore.error || 'Controlla le credenziali e riprova.'
    }
}
</script>

<template>
    <div class="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-100 px-4 text-slate-900 sm:px-6">
        <div class="w-full max-w-md">
            <div class="mb-5 flex justify-center">
                <img :src="logoUrl" alt="Logo Gestionale Bar" class="h-36 w-auto sm:h-40" />
            </div>

            <Card class="overflow-hidden rounded-3xl border-2 border-white/70 bg-white">
                <template #content>
                    <div class="border-b border-slate-100 bg-slate-900 px-6 py-5 text-center sm:px-8">
                        <span class="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                            Accesso riservato
                        </span>
                        <h2 class="mt-3 text-2xl font-semibold tracking-tight text-white">Accedi al gestionale</h2>
                    </div>

                    <form @submit.prevent="handleLogin" class="space-y-5 px-6 py-6 sm:px-8">
                        <div class="space-y-2">
                            <label for="username" class="text-sm font-medium text-slate-700">Username</label>
                            <InputText
                                id="username"
                                v-model="username"
                                autocomplete="username"
                                placeholder="Inserisci lo username"
                                class="w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-slate-200"
                                required
                            />
                        </div>

                        <div class="space-y-2">
                            <label for="password" class="text-sm font-medium text-slate-700">Password</label>
                            <Password
                                id="password"
                                v-model="password"
                                autocomplete="current-password"
                                placeholder="Inserisci la password"
                                toggleMask
                                :feedback="false"
                                class="login-password relative w-full"
                                inputClass="w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 pe-12 text-slate-900 focus:border-slate-400 focus:ring-slate-200"
                                required
                            >
                                <template #maskicon="{ toggleCallback }">
                                    <button
                                        type="button"
                                        class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                        aria-label="Mostra password"
                                        @click="toggleCallback"
                                    >
                                        <EyeSlashIcon class="h-4 w-4" />
                                    </button>
                                </template>
                                <template #unmaskicon="{ toggleCallback }">
                                    <button
                                        type="button"
                                        class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                        aria-label="Nascondi password"
                                        @click="toggleCallback"
                                    >
                                        <EyeIcon class="h-4 w-4" />
                                    </button>
                                </template>
                            </Password>
                        </div>

                        <p v-if="error" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {{ error }}
                        </p>

                        <Button
                            type="submit"
                            label="Accedi"
                            icon="pi pi-arrow-right"
                            iconPos="right"
                            :loading="loading"
                            class="h-12 w-full rounded-2xl border-0 bg-slate-900 font-semibold text-white transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-300"
                        />

                        <p class="text-center text-xs leading-5 text-slate-500">
                            Accesso dedicato allo staff del locale.
                        </p>
                    </form>
                </template>
            </Card>
        </div>
    </div>
</template>