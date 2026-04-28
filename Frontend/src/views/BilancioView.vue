<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { io } from 'socket.io-client';
import axios from 'axios';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useUserStore } from '@/stores/user';
import { API_BASE_URL, SOCKET_PATH, SOCKET_URL } from '@/store';

const userStore = useUserStore();

const transactions = ref([]);
const loading = ref(false);
const submitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const refreshInterval = ref(null);
const submittingEdit = ref(false);
const deletingTransaction = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);
const transactionToDelete = ref(null);
const editTransactionId = ref(null);
const editOriginalHasReceipt = ref(false);

const expenseForm = ref({
  amount: null,
  description: '',
  receiptName: null,
  receiptMimeType: null,
  receiptData: null
});

const editForm = ref({
  amount: null,
  type: 'OUT',
  description: '',
  receiptName: null,
  receiptMimeType: null,
  receiptData: null,
  removeReceipt: false
});

let socket = null;
const isAdmin = computed(() => userStore.user?.role === 'admin');

function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const normalized = String(value).includes('T')
    ? value
    : String(value).replace(' ', 'T');

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function fetchTransactions() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await axios.get(`${API_BASE_URL}/get-transactions`, {
      withCredentials: true
    });

    transactions.value = (response.data.transactions || []).map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount) || 0
    }));
  } catch (error) {
    console.error('Errore nel recupero transazioni:', error);
    errorMessage.value = 'Errore nel recupero delle transazioni';
  } finally {
    loading.value = false;
  }
}

const balance = computed(() => {
  return transactions.value.reduce((sum, transaction) => {
    if (transaction.type === 'OUT') {
      return sum - transaction.amount;
    }

    return sum + transaction.amount;
  }, 0);
});

const latestUpdateLabel = computed(() => {
  if (!transactions.value.length) {
    return 'Nessuna transazione registrata';
  }

  return `Ultimo aggiornamento: ${formatDate(transactions.value[0].date)}`;
});

function clearForm() {
  expenseForm.value = {
    amount: null,
    description: '',
    receiptName: null,
    receiptMimeType: null,
    receiptData: null
  };
}

function clearEditForm() {
  editForm.value = {
    amount: null,
    type: 'OUT',
    description: '',
    receiptName: null,
    receiptMimeType: null,
    receiptData: null,
    removeReceipt: false
  };
  editTransactionId.value = null;
  editOriginalHasReceipt.value = false;
}

function handleReceiptChange(event) {
  const file = event.target.files?.[0];

  if (!file) {
    expenseForm.value.receiptName = null;
    expenseForm.value.receiptMimeType = null;
    expenseForm.value.receiptData = null;
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    expenseForm.value.receiptName = file.name;
    expenseForm.value.receiptMimeType = file.type || 'application/octet-stream';
    expenseForm.value.receiptData = typeof reader.result === 'string' ? reader.result : null;
  };

  reader.onerror = () => {
    errorMessage.value = 'Impossibile leggere il file allegato';
  };

  reader.readAsDataURL(file);
}

function handleEditReceiptChange(event) {
  const file = event.target.files?.[0];

  if (!file) {
    editForm.value.receiptName = null;
    editForm.value.receiptMimeType = null;
    editForm.value.receiptData = null;
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    editForm.value.receiptName = file.name;
    editForm.value.receiptMimeType = file.type || 'application/octet-stream';
    editForm.value.receiptData = typeof reader.result === 'string' ? reader.result : null;
    editForm.value.removeReceipt = false;
  };

  reader.onerror = () => {
    errorMessage.value = 'Impossibile leggere il file allegato';
  };

  reader.readAsDataURL(file);
}

function openEditDialog(transaction) {
  editTransactionId.value = transaction.transaction_id;
  editOriginalHasReceipt.value = !!transaction.receipt_data;
  editForm.value = {
    amount: Number(transaction.amount) || 0,
    type: transaction.type === 'IN' ? 'IN' : 'OUT',
    description: transaction.description || '',
    receiptName: null,
    receiptMimeType: null,
    receiptData: null,
    removeReceipt: false
  };
  showEditDialog.value = true;
}

function closeEditDialog() {
  showEditDialog.value = false;
  clearEditForm();
}

function openDeleteDialog(transaction) {
  transactionToDelete.value = transaction;
  showDeleteDialog.value = true;
}

function closeDeleteDialog() {
  transactionToDelete.value = null;
  showDeleteDialog.value = false;
}

async function submitExpense() {
  const amount = Number(expenseForm.value.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    errorMessage.value = 'Inserisci un importo valido maggiore di 0';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await axios.post(`${API_BASE_URL}/add-transaction`, {
      amount,
      type: 'OUT',
      description: expenseForm.value.description || 'Spesa senza descrizione',
      receiptName: expenseForm.value.receiptName,
      receiptMimeType: expenseForm.value.receiptMimeType,
      receiptData: expenseForm.value.receiptData
    }, {
      withCredentials: true
    });

    successMessage.value = 'Spesa registrata con successo';
    clearForm();
    await fetchTransactions();
  } catch (error) {
    console.error('Errore registrazione spesa:', error);
    errorMessage.value = 'Errore durante la registrazione della spesa';
  } finally {
    submitting.value = false;
  }
}

async function submitEditTransaction() {
  if (!editTransactionId.value) {
    return;
  }

  const amount = Number(editForm.value.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    errorMessage.value = 'Inserisci un importo valido';
    return;
  }

  if (editForm.value.type !== 'IN' && editForm.value.type !== 'OUT') {
    errorMessage.value = 'Tipo transazione non valido';
    return;
  }

  submittingEdit.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const payload = {
      amount,
      type: editForm.value.type,
      description: editForm.value.description || null
    };

    if (editForm.value.removeReceipt) {
      payload.receiptName = null;
      payload.receiptMimeType = null;
      payload.receiptData = null;
    } else if (editForm.value.receiptData) {
      payload.receiptName = editForm.value.receiptName;
      payload.receiptMimeType = editForm.value.receiptMimeType;
      payload.receiptData = editForm.value.receiptData;
    }

    await axios.put(`${API_BASE_URL}/update-transaction/${editTransactionId.value}`, payload, {
      withCredentials: true
    });

    successMessage.value = 'Transazione aggiornata con successo';
    closeEditDialog();
    await fetchTransactions();
  } catch (error) {
    console.error('Errore aggiornamento transazione:', error);
    errorMessage.value = 'Errore durante l\'aggiornamento della transazione';
  } finally {
    submittingEdit.value = false;
  }
}

async function confirmDeleteTransaction() {
  if (!transactionToDelete.value) {
    return;
  }

  deletingTransaction.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await axios.delete(`${API_BASE_URL}/delete-transaction/${transactionToDelete.value.transaction_id}`, {
      withCredentials: true
    });

    successMessage.value = 'Transazione eliminata con successo';
    closeDeleteDialog();
    await fetchTransactions();
  } catch (error) {
    console.error('Errore eliminazione transazione:', error);
    errorMessage.value = 'Errore durante l\'eliminazione della transazione';
  } finally {
    deletingTransaction.value = false;
  }
}

function scheduleRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }

  refreshInterval.value = setInterval(() => {
    void fetchTransactions();
  }, 30000);
}

onMounted(async () => {
  await fetchTransactions();
  scheduleRefresh();

  socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true
  });

  socket.on('connect', () => {
    void fetchTransactions();
  });

  socket.on('reconnect', () => {
    void fetchTransactions();
  });

  socket.on('transaction-updated', () => {
    void fetchTransactions();
  });
});

onBeforeUnmount(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }
});
</script>

<template>
  <div class="min-h-[calc(100vh-7rem)] bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section class="rounded-3xl border-2 border-slate-200/70 bg-white/85 px-6 py-8 text-center backdrop-blur-sm sm:px-10">
        <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Bilancio
        </span>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl" :class="balance >= 0 ? 'text-emerald-700' : 'text-red-700'">
          {{ formatCurrency(balance) }}
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          {{ latestUpdateLabel }}
        </p>
      </section>

      <section class="rounded-3xl border-2 border-slate-200/70 bg-white/85 p-6 backdrop-blur-sm sm:p-8">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-semibold text-slate-900 sm:text-2xl">Registra nuova spesa</h2>
          <span class="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">OUT</span>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div class="md:col-span-3">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Importo</label>
            <input
              v-model.number="expenseForm.amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div class="md:col-span-5">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descrizione</label>
            <input
              v-model="expenseForm.description"
              type="text"
              placeholder="es. Acquisto materiali"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div class="md:col-span-4">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Allega scontrino</label>
            <label class="flex h-[42px] w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 transition-colors hover:bg-slate-100">
              <span class="flex-shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">Scegli file</span>
              <span class="truncate">{{ expenseForm.receiptName || 'Nessun file selezionato' }}</span>
              <input type="file" accept="image/*,.pdf" @change="handleReceiptChange" class="sr-only" />
            </label>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div class="text-sm text-slate-500">
            <span v-if="expenseForm.receiptName">File selezionato: {{ expenseForm.receiptName }}</span>
          </div>

          <Button
            label="Registra spesa"
            icon="pi pi-plus"
            class="bg-slate-900 hover:bg-slate-950 text-white px-5 py-2.5 rounded-xl font-semibold"
            :loading="submitting"
            @click="submitExpense"
          />
        </div>

        <p v-if="errorMessage" class="mt-3 text-sm font-medium text-red-600">{{ errorMessage }}</p>
        <p v-if="successMessage" class="mt-3 text-sm font-medium text-emerald-700">{{ successMessage }}</p>
      </section>

      <section class="rounded-3xl border-2 border-slate-200/70 bg-white/85 p-6 backdrop-blur-sm sm:p-8">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-slate-900 sm:text-2xl">Transazioni</h2>
          <Button
            label="Aggiorna"
            icon="pi pi-refresh"
            text
            class="text-slate-600"
            :loading="loading"
            @click="fetchTransactions"
          />
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="w-full min-w-190 text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descrizione</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Importo</th>
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Allegato</th>
                <th v-if="isAdmin" class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Azioni</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              <tr v-for="transaction in transactions" :key="transaction.transaction_id" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-4 py-3 text-slate-600">{{ formatDate(transaction.date) }}</td>
                <td class="px-4 py-3 font-medium text-slate-800">{{ transaction.description || '-' }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                    :class="transaction.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                  >
                    {{ transaction.type }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-semibold" :class="transaction.type === 'IN' ? 'text-emerald-700' : 'text-red-700'">
                  {{ transaction.type === 'IN' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                </td>
                <td class="px-4 py-3">
                  <a
                    v-if="transaction.receipt_data"
                    :href="transaction.receipt_data"
                    :download="transaction.receipt_name || `scontrino_${transaction.transaction_id}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <i class="pi pi-paperclip"></i>
                    Apri
                  </a>
                  <span v-else class="text-xs text-slate-400">-</span>
                </td>
                <td v-if="isAdmin" class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <Button
                      icon="pi pi-pencil"
                      size="small"
                      text
                      rounded
                      class="text-slate-600"
                      @click="openEditDialog(transaction)"
                    />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      text
                      rounded
                      class="text-red-600"
                      @click="openDeleteDialog(transaction)"
                    />
                  </div>
                </td>
              </tr>
              <tr v-if="!loading && transactions.length === 0">
                <td :colspan="isAdmin ? 6 : 5" class="px-4 py-8 text-center text-sm text-slate-500">
                  Nessuna transazione presente
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        v-model:visible="showEditDialog"
        modal
        header="Modifica transazione"
        :draggable="false"
        class="dialog w-[92vw] max-w-2xl"
        :pt="{ closeButton: { class: 'focus:outline-none focus:shadow-none focus:ring-0', style: 'outline:none;box-shadow:none' } }"
      >
        <div class="grid grid-cols-1 gap-5 p-2 md:grid-cols-12">
          <div class="md:col-span-4">
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Importo</label>
            <input
              v-model.number="editForm.amount"
              type="number"
              min="0"
              step="0.01"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div class="md:col-span-3">
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</label>
            <select
              v-model="editForm.type"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="IN">Entrata (IN)</option>
              <option value="OUT">Uscita (OUT)</option>
            </select>
          </div>

          <div class="md:col-span-5">
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descrizione</label>
            <input
              v-model="editForm.description"
              type="text"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div class="md:col-span-12">
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sostituisci allegato</label>
            <label class="flex h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 transition-colors hover:bg-slate-100">
              <span class="flex-shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">Scegli file</span>
              <span class="truncate">{{ editForm.receiptName || 'Nessun file selezionato' }}</span>
              <input type="file" accept="image/*,.pdf" @change="handleEditReceiptChange" class="sr-only" />
            </label>
          </div>

          <div v-if="editOriginalHasReceipt" class="md:col-span-12">
            <label class="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-slate-100">
              <input v-model="editForm.removeReceipt" type="checkbox" class="h-4 w-4 rounded accent-slate-800" />
              Rimuovi allegato attuale
            </label>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <Button
              label="Annulla"
              severity="secondary"
              outlined
              class="rounded-full border-slate-300 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-400"
              @click="closeEditDialog"
            />
            <Button
              label="Salva modifiche"
              icon="pi pi-check"
              class="rounded-full bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-900"
              :loading="submittingEdit"
              @click="submitEditTransaction"
            />
          </div>
        </template>
      </Dialog>

      <Dialog
        v-model:visible="showDeleteDialog"
        modal
        header="Elimina transazione"
        :draggable="false"
        class="dialog w-[92vw] max-w-lg"
        :pt="{ closeButton: { class: 'focus:outline-none focus:shadow-none focus:ring-0', style: 'outline:none;box-shadow:none' } }"
      >
        <div class="p-2">
          <div class="mb-4 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3">
            <i class="pi pi-exclamation-triangle text-lg text-red-600"></i>
            <p class="text-sm font-medium text-red-700">Questa operazione non può essere annullata.</p>
          </div>
          <p class="text-sm text-slate-700">
            Sei sicuro di voler eliminare la transazione
            <span class="font-semibold text-slate-900">{{ transactionToDelete?.description || 'senza descrizione' }}</span>?
          </p>
        </div>
        <template #footer>
          <div class="flex justify-end gap-3">
            <Button
              label="Annulla"
              severity="secondary"
              outlined
              class="rounded-full border-slate-300 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-400"
              @click="closeDeleteDialog"
            />
            <Button
              label="Elimina definitivamente"
              icon="pi pi-trash"
              class="rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700"
              :loading="deletingTransaction"
              @click="confirmDeleteTransaction"
            />
          </div>
        </template>
      </Dialog>
    </div>
  </div>
</template>