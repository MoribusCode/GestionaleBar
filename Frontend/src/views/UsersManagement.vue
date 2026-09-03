<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import ManagementTemplate from '@/components/ManagementTemplate.vue';
import { useCategories } from '@/composables/useCategories';
import { API_BASE_URL } from '@/store';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-700 focus:bg-white';

const managementTemplate = ref(null);
const { categoryNames, fetchCategories } = useCategories();

const users = ref(); // undefined finché non arriva la prima risposta: la tabella lo interpreta come "in caricamento"
const bars = ref([]);
const selectedUser = ref(null);
const userToDelete = ref(null);

const availableRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'postazione', label: 'Postazione' }
];

const formData = ref({
  username: '',
  password: '',
  role: null,
  bar_id: null,
  categories: []
});

const resetForm = () => {
  formData.value = { username: '', password: '', role: null, bar_id: null, categories: [] };
  selectedUser.value = null;
};

watch(() => formData.value.role, (role) => {
  if (role === 'admin') {
    formData.value.bar_id = null;
  }
});

const isCategorySelected = (category) => formData.value.categories.includes(category);

const toggleCategory = (category) => {
  const index = formData.value.categories.indexOf(category);
  if (index === -1) {
    formData.value.categories.push(category);
  } else {
    formData.value.categories.splice(index, 1);
  }
};

const fetchUsers = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/users`, { withCredentials: true });
    users.value = res.data.users || [];
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    users.value ??= [];
  }
};

const fetchBars = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/bars`, { withCredentials: true });
    bars.value = res.data.bars || [];
  } catch (error) {
    console.error('Errore nel recupero dei bar:', error);
  }
};

const getBarLabel = (bar_id) => {
  const bar = bars.value.find((b) => b.id === bar_id);
  return bar ? `Bar #${bar.id} - ${bar.printer_ip}` : '—';
};

const barOptions = computed(() =>
  bars.value.map((bar) => ({ value: bar.id, label: `Bar #${bar.id} - ${bar.printer_ip}` }))
);

const openCreateDialog = () => {
  resetForm();
  fetchBars();
};

const openEditDialog = (user) => {
  selectedUser.value = user;
  formData.value = {
    username: user.username,
    password: '',
    role: user.role,
    bar_id: user.bar_id,
    categories: [...(user.categories || [])]
  };
  managementTemplate.value.openEdit();
  fetchBars();
};

const saveUser = async () => {
  const missingPassword = !selectedUser.value && !formData.value.password;

  if (!formData.value.username || !formData.value.role || missingPassword) {
    alert('Per favore compila i campi obbligatori');
    return;
  }

  try {
    if (selectedUser.value) {
      await axios.put(`${API_BASE_URL}/update-user/${selectedUser.value.id}`, formData.value, {
        withCredentials: true
      });
    } else {
      await axios.post(`${API_BASE_URL}/create-user`, formData.value, { withCredentials: true });
    }
    managementTemplate.value.closeForm();
    resetForm();
    fetchUsers();
  } catch (error) {
    console.error('Errore nel salvataggio dell\'utente:', error);
    alert(error.response?.data?.error || 'Errore nel salvataggio dell\'utente');
  }
};

const confirmDelete = (user) => {
  userToDelete.value = user;
  managementTemplate.value.openDelete();
};

const deleteUser = async () => {
  if (!userToDelete.value) return;

  try {
    await axios.delete(`${API_BASE_URL}/delete-user/${userToDelete.value.id}`, { withCredentials: true });
    managementTemplate.value.closeDelete();
    userToDelete.value = null;
    fetchUsers();
  } catch (error) {
    console.error('Errore nella cancellazione dell\'utente:', error);
    alert('Errore nella cancellazione dell\'utente');
  }
};

onMounted(() => {
  fetchUsers();
  fetchBars();
  fetchCategories();
});
</script>

<template>
  <ManagementTemplate
    ref="managementTemplate"
    title="Gestione Utenti"
    subtitle="Crea e gestisci tutti gli utenti del sistema"
    entity-name="Utente"
    create-icon="pi pi-user-plus"
    :items="users"
    @new="openCreateDialog"
    @submit="saveUser"
    @cancel-form="resetForm"
    @confirm-delete="deleteUser"
  >
    <template #columns>
      <Column field="id" header="ID" style="width: 10%"></Column>
      <Column field="username" header="Username"></Column>
      <Column field="role" header="Ruolo" style="width: 18%"></Column>
      <Column header="Bar" style="width: 22%">
        <template #body="{ data }">
          {{ getBarLabel(data.bar_id) }}
        </template>
      </Column>
      <Column header="Azioni" style="width: 15%">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-pencil"
              class="p-button-rounded p-button-text p-button-warning text-blue-600 hover:bg-blue-50"
              @click="openEditDialog(data)"
              v-tooltip="'Modifica'"
            />
            <Button
              icon="pi pi-trash"
              class="p-button-rounded p-button-text p-button-danger text-red-600 hover:bg-red-50"
              @click="confirmDelete(data)"
              v-tooltip="'Elimina'"
            />
          </div>
        </template>
      </Column>
    </template>

    <template #form="{ isEditing }">
      <!-- Username -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Username
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">obbligatorio</span>
        </label>
        <InputText
          v-model="formData.username"
          placeholder="es. mario.rossi"
          :class="fieldClass"
          required
        />
      </div>

      <!-- Password -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Password
          <span v-if="!isEditing" class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">obbligatorio</span>
          <span v-else class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">lascia vuoto per non modificarla</span>
        </label>
        <InputText
          v-model="formData.password"
          type="password"
          :placeholder="isEditing ? 'Nuova password (opzionale)' : 'Inserisci una password'"
          :class="fieldClass"
          :required="!isEditing"
        />
      </div>

      <!-- Ruolo -->
      <div class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Ruolo
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold normal-case text-slate-400">obbligatorio</span>
        </label>
        <Dropdown
          v-model="formData.role"
          :options="availableRoles"
          optionLabel="label"
          optionValue="value"
          placeholder="Seleziona ruolo"
          :class="fieldClass"
        />
      </div>

      <!-- Bar associato -->
      <div v-if="formData.role !== 'admin'" class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Bar associato</label>
        <Dropdown
          v-model="formData.bar_id"
          :options="barOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Nessun bar associato"
          showClear
          :class="fieldClass"
        />
      </div>

      <!-- Categorie gestite (solo per il ruolo Postazione) -->
      <div v-if="formData.role === 'postazione'" class="flex flex-col gap-1.5">
        <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Categorie gestite</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="category in categoryNames"
            :key="category"
            type="button"
            class="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
            :class="isCategorySelected(category)
              ? 'border-slate-800 bg-slate-800 text-white'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'"
            @click="toggleCategory(category)"
          >
            {{ category }}
          </button>
        </div>
      </div>
    </template>

    <template #delete-message>
      <p class="text-sm text-slate-500">
        Sei sicuro di voler eliminare l'utente
        <span class="font-semibold text-slate-800">{{ userToDelete?.username }}</span>?
      </p>
      <p class="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
        <i class="pi pi-exclamation-circle"></i>
        Questa azione non può essere annullata.
      </p>
    </template>
  </ManagementTemplate>
</template>
