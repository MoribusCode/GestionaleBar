<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '@/store';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

// Modal states
const showUsersModal    = ref(false);
const showCreateUserModal = ref(false);
const showDeleteConfirmDialog = ref(false);
const userToDeleteId = ref(null);

// Form data
const newUser    = ref({ username: '', password: '', role: '' });
const usersList  = ref([]);
const createUserSuccessMessage = ref('');

const availableRoles = [
    { value: 'admin', label: 'Admin' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'Cicchetti', label: 'Cicchetti' },
    { value: 'Spina', label: 'Spina' },
    { value: 'Bar', label: 'Bar' },
    { value: 'Drinks', label: 'Drinks' }
];

async function handleCreate() {
    try {
        await axios.post(`${API_BASE_URL}/create-user`, newUser.value, { withCredentials: true });
        showCreateUserModal.value = false;
        createUserSuccessMessage.value = `Utente ${newUser.value.username} creato con successo`;
        newUser.value = { username: '', password: '', role: '' };
        setTimeout(() => {
            createUserSuccessMessage.value = '';
        }, 3500);
    } catch (error) {
        console.error('Error creating user:', error);
    }
}

function confirmDeleteUser(id) {
    userToDeleteId.value = id;
    showDeleteConfirmDialog.value = true;
}

function cancelDeleteUser() {
    showDeleteConfirmDialog.value = false;
    userToDeleteId.value = null;
}

async function proceedDeleteUser() {
    if (!userToDeleteId.value) return;
    try {
        const res = await axios.delete(`${API_BASE_URL}/delete-user/${userToDeleteId.value}`, { withCredentials: true });
        if (res.status === 200) usersList.value = usersList.value.filter(u => u.id !== userToDeleteId.value);
    } catch (error) {
        console.error('Error deleting user:', error);
    } finally {
        showDeleteConfirmDialog.value = false;
        userToDeleteId.value = null;
    }
}

async function handleFetchUsers() {
    try {
        const res = await axios.get(`${API_BASE_URL}/users`, { withCredentials: true });
        usersList.value = res.data.users;
        showUsersModal.value = true;
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

</script>

<template>
    <!-- ░░ PAGE BACKGROUND ░░ -->
    <div class="relative isolate h-[calc(100vh-7rem)] overflow-hidden px-4 py-8 sm:px-6 lg:px-10">

        <div class="mx-auto flex h-full w-full max-w-6xl flex-col gap-8">

            <Transition name="fade">
                <div
                    v-if="createUserSuccessMessage"
                    class="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800"
                >
                    {{ createUserSuccessMessage }}
                </div>
            </Transition>

            <!-- ░░ HERO HEADER CARD ░░ -->
            <div class="rounded-3xl border-2 border-slate-200/60 bg-white/80 px-8 py-8 backdrop-blur-sm sm:px-10 sm:py-10">
                <span class="inline-block rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
                    Admin Dashboard
                </span>
                <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    Seleziona una sezione
                </h1>
                <p class="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
                    Gestione rapida di utenti e articoli, con accesso diretto alle funzioni amministrative.
                </p>
            </div>

            <!-- ░░ ACTION CARDS GRID ░░ -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">

                <!-- Visualizza Utenti -->
                <button
                    @click="handleFetchUsers"
                    class="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200/60 bg-white/80 p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 sm:p-6 cursor-pointer"
                >
                    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14">
                        <i class="pi pi-users text-xl"></i>
                    </span>
                    <div>
                        <p class="text-base font-semibold text-slate-900 sm:text-lg">Utenti</p>
                        <p class="mt-1 text-xs text-slate-500 leading-snug sm:text-sm">Visualizza tutti gli utenti</p>
                    </div>
                </button>

                <!-- Crea Utente -->
                <button
                    @click="showCreateUserModal = true"
                    class="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200/60 bg-white/80 p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 sm:p-6 cursor-pointer"
                >
                    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14">
                        <i class="pi pi-user-plus text-xl"></i>
                    </span>
                    <div>
                        <p class="text-base font-semibold text-slate-900 sm:text-lg">Crea Utente</p>
                        <p class="mt-1 text-xs text-slate-500 leading-snug sm:text-sm">Aggiungi un nuovo utente</p>
                    </div>
                </button>

                <!-- Planning Inventario -->
                <router-link
                    to="/inventory-planning"
                    class="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200/60 bg-white/80 p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 sm:p-6 no-underline"
                >
                    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14">
                        <i class="pi pi-clipboard text-xl"></i>
                    </span>
                    <div>
                        <p class="text-base font-semibold text-slate-900 sm:text-lg">Planning Inventario</p>
                        <p class="mt-1 text-xs text-slate-500 leading-snug sm:text-sm">Scorte e fabbisogno acquisti</p>
                    </div>
                </router-link>

                <!-- Gestione Articoli -->
                <router-link
                    to="/items-management"
                    class="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200/60 bg-white/80 p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 sm:p-6 no-underline"
                >
                    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14">
                        <i class="pi pi-wrench text-xl"></i>
                    </span>
                    <div>
                        <p class="text-base font-semibold text-slate-900 sm:text-lg">Gestione Articoli</p>
                        <p class="mt-1 text-xs text-slate-500 leading-snug sm:text-sm">Crea, modifica gli articoli</p>
                    </div>
                </router-link>

            </div>


        </div>
    </div>

    <!-- ░░ MODAL: LISTA UTENTI ░░ -->
    <Teleport to="body">
        <Transition name="fade">
            <div v-if="showUsersModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showUsersModal = false"></div>
                <div class="relative w-full max-w-3xl rounded-3xl border-2 border-slate-200/60 bg-white">
                    <!-- Header -->
                    <div class="flex items-center justify-between border-b border-slate-100 px-8 py-6">
                        <h2 class="text-lg font-semibold text-slate-900">Lista Utenti</h2>
                        <button @click="showUsersModal = false" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                            <i class="pi pi-times text-sm"></i>
                        </button>
                    </div>
                    <!-- Body -->
                    <div class="max-h-[60vh] overflow-y-auto px-8 py-4">
                        <table v-if="usersList.length" class="w-full text-sm">
                            <thead>
                                <tr class="border-b border-slate-100">
                                    <th class="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">ID</th>
                                    <th class="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Username</th>
                                    <th class="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Ruolo</th>
                                    <th class="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Azioni</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                <tr v-for="user in usersList" :key="user.id" class="hover:bg-slate-50/60 transition-colors">
                                    <td class="py-3 text-slate-400 font-mono text-xs">{{ user.id }}</td>
                                    <td class="py-3 font-medium text-slate-800">{{ user.username }}</td>
                                    <td class="py-3">
                                        <span class="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{{ user.role }}</span>
                                    </td>
                                    <td class="py-3">
                                        <button
                                            @click="confirmDeleteUser(user.id)"
                                            class="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                                        >
                                            Rimuovi
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p v-else class="py-8 text-center text-sm text-slate-400">Nessun utente trovato</p>
                    </div>
                    <!-- Footer -->
                    <div class="flex justify-end border-t border-slate-100 px-8 py-5">
                        <button @click="showUsersModal = false" class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80">
                            Chiudi
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>

    <!-- ░░ MODAL: CREA UTENTE ░░ -->
    <Teleport to="body">
        <Transition name="fade">
            <div v-if="showCreateUserModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showCreateUserModal = false"></div>
                <div class="relative w-full max-w-md rounded-3xl border-2 border-slate-200/60 bg-white">
                    <div class="flex items-center justify-between border-b border-slate-100 px-8 py-6">
                        <h2 class="text-lg font-semibold text-slate-900">Crea nuovo utente</h2>
                        <button @click="showCreateUserModal = false" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                            <i class="pi pi-times text-sm"></i>
                        </button>
                    </div>
                    <div class="px-8 py-6 flex flex-col gap-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">Username</label>
                            <input v-model="newUser.username" type="text" required
                                class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
                            <input v-model="newUser.password" type="password" required
                                class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">Ruolo</label>
                            <select v-model="newUser.role" required
                                class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all">
                                <option value="">Seleziona ruolo</option>
                                <option
                                    v-for="role in availableRoles"
                                    :key="role.value"
                                    :value="role.value"
                                >
                                    {{ role.label }}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 border-t border-slate-100 px-8 py-5">
                        <button @click="showCreateUserModal = false" class="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            Annulla
                        </button>
                        <button @click="handleCreate" class="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:opacity-80 transition-opacity">
                            Crea
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>

    <!-- ░░ MODAL: CONFERMA ELIMINAZIONE ░░ -->
    <Dialog
        v-model:visible="showDeleteConfirmDialog"
        modal
        header="Elimina utente"
        :draggable="false"
        class="dialog w-[92vw] max-w-lg"
        :pt="{ 
            header: { class: 'p-6 pb-4' },
            content: { class: 'p-6 pt-0' },
            footer: { class: 'p-6 pt-4' },
            closeButton: { class: 'flex h-9 w-9 items-center justify-center rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:shadow-none focus:ring-0', style: 'outline:none;box-shadow:none' } 
        }"
    >
        <div class="p-2">
            <div class="mb-4 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3">
                <i class="pi pi-exclamation-triangle text-lg text-red-600"></i>
                <p class="text-sm font-medium text-red-700">Questa operazione non può essere annullata.</p>
            </div>
            <p class="text-sm text-slate-700">
                Sei sicuro di voler eliminare l'utente?
            </p>
        </div>
        <template #footer>
            <div class="flex justify-end gap-3">
                <Button
                    label="Annulla"
                    severity="secondary"
                    outlined
                    class="rounded-full border-slate-300 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-400"
                    @click="cancelDeleteUser"
                />
                <Button
                    label="Elimina definitivamente"
                    icon="pi pi-trash"
                    class="rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700"
                    @click="proceedDeleteUser"
                />
            </div>
        </template>
    </Dialog>

</template>

<style scoped>
/* Modal transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>