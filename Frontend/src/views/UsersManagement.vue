<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import { API_BASE_URL } from '@/store';

const users = ref([]);
const bars = ref([]);
const loading = ref(false);
const selectedUser = ref(null);
const showFormDialog = ref(false);
const isEditing = ref(false);
const deleteConfirm = ref(false);
const userToDelete = ref(null);

const availableRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'Cicchetti', label: 'Cicchetti' },
  { value: 'Spina', label: 'Spina' },
  { value: 'Bar', label: 'Bar' },
  { value: 'Drinks', label: 'Drinks' }
];

const formData = ref({
  username: '',
  password: '',
  role: null,
  bar_id: null
});

const resetForm = () => {
  formData.value = { username: '', password: '', role: null, bar_id: null };
  selectedUser.value = null;
  isEditing.value = false;
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`${API_BASE_URL}/users`, { withCredentials: true });
    users.value = res.data.users || [];
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
  } finally {
    loading.value = false;
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

const openCreateDialog = async () => {
  resetForm();
  await fetchBars();
  showFormDialog.value = true;
};

const openEditDialog = async (user) => {
  selectedUser.value = user;
  isEditing.value = true;
  formData.value = {
    username: user.username,
    password: '',
    role: user.role,
    bar_id: user.bar_id
  };
  await fetchBars();
  showFormDialog.value = true;
};

const saveUser = async () => {
  const missingPassword = !isEditing.value && !formData.value.password;

  if (!formData.value.username || !formData.value.role || missingPassword) {
    alert('Per favore compila i campi obbligatori');
    return;
  }

  try {
    if (isEditing.value && selectedUser.value) {
      await axios.put(`${API_BASE_URL}/update-user/${selectedUser.value.id}`, formData.value, {
        withCredentials: true
      });
    } else {
      await axios.post(`${API_BASE_URL}/create-user`, formData.value, { withCredentials: true });
    }
    showFormDialog.value = false;
    resetForm();
    fetchUsers();
  } catch (error) {
    console.error('Errore nel salvataggio dell\'utente:', error);
    alert(error.response?.data?.error || 'Errore nel salvataggio dell\'utente');
  }
};

const confirmDelete = (user) => {
  userToDelete.value = user;
  deleteConfirm.value = true;
};

const deleteUser = async () => {
  if (!userToDelete.value) return;

  try {
    await axios.delete(`${API_BASE_URL}/delete-user/${userToDelete.value.id}`, { withCredentials: true });
    deleteConfirm.value = false;
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
});
</script>

<template>
  <div class="m-4 flex flex-col bg-slate-50 rounded-3xl border-2 border-slate-200">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 px-8 py-6 top-0 z-40 rounded-t-3xl overflow-hidden">
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <h1 class="text-4xl font-bold text-slate-800">Gestione Utenti</h1>
          <p class="text-slate-600 mt-1">Crea e gestisci tutti gli utenti del sistema</p>
        </div>
        <Button
          label="Nuovo Utente"
          icon="pi pi-plus"
          class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Content Area -->
    <div class="px-8 py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Users Table -->
        <div class="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
          <DataTable
            :value="users"
            :loading="loading"
            tableStyle="min-width: 100%"
          >
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
          </DataTable>
        </div>
      </div>
    </div>

    <!-- Form Dialog -->
    <Dialog
      v-model:visible="showFormDialog"
      :modal="true"
      :closable="false"
      class="item-dialog w-full md:w-[520px]"
      :pt="{
        root: { class: 'item-dialog-root' },
        header: { class: 'item-dialog-header' },
        content: { class: 'item-dialog-content' },
        footer: { class: 'item-dialog-footer' },
        mask: { class: 'item-dialog-mask' }
      }"
    >
      <!-- Custom Header -->
      <template #header>
        <div class="dialog-header-flex">
          <div class="dialog-header-main-flex">
            <div class="dialog-icon-wrap">
              <i :class="isEditing ? 'pi pi-pencil' : 'pi pi-user-plus'" class="dialog-icon"></i>
            </div>
            <div>
              <h2 class="dialog-title">{{ isEditing ? 'Modifica Utente' : 'Nuovo Utente' }}</h2>
              <p class="dialog-subtitle">{{ isEditing ? 'Aggiorna le informazioni dell\'utente' : 'Compila i campi per aggiungere un utente' }}</p>
            </div>
          </div>
          <button class="dialog-close-btn" @click="showFormDialog = false">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </template>

      <form @submit.prevent="saveUser" class="dialog-form">

        <!-- Username -->
        <div class="field-group field-full">
          <label class="field-label">
            Username
            <span class="required-badge">obbligatorio</span>
          </label>
          <InputText
            v-model="formData.username"
            placeholder="es. mario.rossi"
            class="field-input w-full"
            required
          />
        </div>

        <!-- Password -->
        <div class="field-group field-full">
          <label class="field-label">
            Password
            <span v-if="!isEditing" class="required-badge">obbligatorio</span>
            <span v-else class="required-badge">lascia vuoto per non modificarla</span>
          </label>
          <InputText
            v-model="formData.password"
            type="password"
            :placeholder="isEditing ? 'Nuova password (opzionale)' : 'Inserisci una password'"
            class="field-input w-full"
            :required="!isEditing"
          />
        </div>

        <!-- Ruolo -->
        <div class="field-group field-full">
          <label class="field-label">
            Ruolo
            <span class="required-badge">obbligatorio</span>
          </label>
          <Dropdown
            v-model="formData.role"
            :options="availableRoles"
            optionLabel="label"
            optionValue="value"
            placeholder="Seleziona ruolo"
            class="field-input w-full"
          />
        </div>

        <!-- Bar associato -->
        <div class="field-group field-full">
          <label class="field-label">Bar associato</label>
          <Dropdown
            v-model="formData.bar_id"
            :options="barOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Nessun bar associato"
            showClear
            class="field-input w-full"
          />
        </div>

        <!-- Footer Actions -->
        <div class="dialog-actions">
          <Button
            label="Annulla"
            text
            @click="showFormDialog = false"
            class="action-cancel"
          />
          <Button
            :label="isEditing ? 'Salva Modifiche' : 'Crea Utente'"
            :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'"
            type="submit"
            class="action-submit"
          />
        </div>
      </form>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="deleteConfirm"
      :modal="true"
      :closable="false"
      class="delete-dialog w-full md:w-[420px]"
      :pt="{
        root: { class: 'delete-dialog-root' },
        header: { style: 'display:none' },
        content: { class: 'delete-dialog-content' },
        mask: { class: 'item-dialog-mask' }
      }"
    >
      <div class="delete-dialog-inner">
        <div class="delete-text-block">
          <h3 class="delete-title">Conferma Eliminazione</h3>
          <p class="delete-desc">
            Sei sicuro di voler eliminare l'utente
            <span class="font-semibold text-slate-800">{{ userToDelete?.username }}</span>?
          </p>
          <p class="delete-warning">
            <i class="pi pi-exclamation-circle" style="font-size:0.8rem"></i>
            Questa azione non può essere annullata.
          </p>
        </div>
        <div class="delete-dialog-actions-flex">
          <Button
            label="Annulla"
            text
            @click="deleteConfirm = false"
            class="action-cancel"
          />
          <Button
            label="Elimina utente"
            icon="pi pi-trash"
            @click="deleteUser"
            class="action-delete"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
