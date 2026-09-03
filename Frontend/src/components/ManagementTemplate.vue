<script setup>
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

const props = defineProps({
  entityName: { type: String, required: true }, // es. "Bar", "Articolo", "Categoria"
  createIcon: { type: String, required: true },

  title: { type: String, default: null }, // default: "Gestione {entityName}"
  subtitle: { type: String, default: '' },
  formSubtitle: { type: String, default: null }, // default: generato da entityName + isEditing

  items: { type: Array, default: undefined }, // items da mostrare nella tabella, undefined = "in caricamento"

  dialogWidthClass: { type: String, default: 'md:w-[520px]' },
  deleteTitle: { type: String, default: 'Conferma Eliminazione' },
});

const emit = defineEmits(['new', 'submit', 'cancel-form', 'confirm-delete', 'cancel-delete']);

// Apertura/chiusura dei due dialog e stato "sto modificando?" vivono qui dentro: la view
// non tiene più i propri ref per questo, chiama solo openEdit()/openDelete() (via template ref)
// per aprirli e closeForm()/closeDelete() quando la sua chiamata API va a buon fine.
const isEditing = ref(false);
const showFormDialog = ref(false);
const showDeleteDialog = ref(false);

const loading = computed(() => props.items === undefined);

const lowerName = computed(() => props.entityName.toLowerCase());

const title = computed(() => props.title ?? `Gestione ${props.entityName}`);
const newLabel = computed(() => `Nuovo ${props.entityName}`);
const formIcon = computed(() => (isEditing.value ? 'pi pi-pencil' : props.createIcon));
const formTitle = computed(() => (isEditing.value ? `Modifica ${props.entityName}` : `Nuovo ${props.entityName}`));
const formSubtitle = computed(() => props.formSubtitle ?? (isEditing.value
  ? `Aggiorna le informazioni del ${lowerName.value}`
  : `Compila i campi per aggiungere un ${lowerName.value}`));
const submitLabel = computed(() => (isEditing.value ? 'Salva Modifiche' : `Crea ${props.entityName}`));
const submitIcon = computed(() => (isEditing.value ? 'pi pi-check' : 'pi pi-plus'));
const deleteConfirmLabel = computed(() => `Elimina ${lowerName.value}`);

function openNew() {
  isEditing.value = false;
  showFormDialog.value = true;
  emit('new');
}

function closeForm() {
  showFormDialog.value = false;
  emit('cancel-form');
}

function closeDelete() {
  showDeleteDialog.value = false;
  emit('cancel-delete');
}

defineExpose({
  openEdit: () => { isEditing.value = true; showFormDialog.value = true; },
  openDelete: () => { showDeleteDialog.value = true; },
  closeForm,
  closeDelete,
});

// Stile Tailwind per intestazione/righe della tabella, passato via pt invece di CSS globale.
const tablePt = {
  column: {
    headerCell: { class: 'bg-slate-50 border-slate-200 text-slate-700 font-semibold p-4' },
    bodyCell: { class: 'border-slate-200 p-4 text-slate-600' },
  },
  bodyRow: { class: 'hover:bg-slate-100' },
};

const formDialogPt = {
  root: { class: 'rounded-3xl shadow-2xl overflow-hidden border-none bg-white gap-0 max-h-[90vh]' },
  header: { class: 'p-10 pb-8 border-b border-slate-100 bg-white shrink-0' },
  content: { class: 'overflow-y-auto flex-1 min-h-0' },
  mask: { class: 'backdrop-blur-md bg-slate-900/35' },
};

const deleteDialogPt = {
  root: { class: 'rounded-3xl shadow-2xl overflow-hidden border-none bg-white' },
  header: { style: 'display:none' },
  content: { class: 'p-10 overflow-hidden' },
  mask: { class: 'backdrop-blur-md bg-slate-900/35' },
};
</script>

<template>
  <div class="m-4 flex flex-col bg-slate-50 rounded-3xl border-2 border-slate-200">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 px-8 py-6 top-0 z-40 rounded-t-3xl overflow-hidden">
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <div>
          <h1 class="text-4xl font-bold text-slate-800">{{ title }}</h1>
          <p v-if="subtitle" class="text-slate-600 mt-1">{{ subtitle }}</p>
        </div>
        <Button
          :label="newLabel"
          icon="pi pi-plus"
          class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold"
          @click="openNew"
        />
      </div>
    </div>

    <!-- Content Area -->
    <div class="px-8 py-8">
      <div class="max-w-7xl mx-auto">
        <div v-if="$slots.toolbar" class="mb-4 flex flex-wrap items-center gap-3">
          <slot name="toolbar" />
        </div>

        <div class="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
          <DataTable :value="items ?? []" :loading="loading" tableStyle="min-width: 100%" :pt="tablePt">
            <slot name="columns" />
          </DataTable>
        </div>
      </div>
    </div>

    <!-- Form Dialog -->
    <Dialog
      v-model:visible="showFormDialog"
      :modal="true"
      :closable="false"
      :class="['w-full', dialogWidthClass]"
      :pt="formDialogPt"
    >
      <template #header>
        <div class="flex w-full items-start justify-between gap-4">
          <div class="flex min-w-0 flex-1 items-start gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-800">
              <i :class="formIcon" class="text-white"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900">{{ formTitle }}</h2>
              <p class="mt-1 text-xs text-slate-400">{{ formSubtitle }}</p>
            </div>
          </div>
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            @click="closeForm"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
      </template>

      <form @submit.prevent="emit('submit')" class="flex flex-col gap-4 p-10">
        <slot name="form" :is-editing="isEditing" />

        <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 md:flex-row md:justify-end">
          <Button label="Annulla" text @click="closeForm" class="w-full! md:w-auto! text-slate-500! font-semibold! rounded-lg! px-5! py-2.5! hover:bg-slate-100!" />
          <Button :label="submitLabel" :icon="submitIcon" type="submit" class="w-full! md:w-auto! bg-slate-800! text-white! font-semibold! rounded-lg! px-5! py-2.5! shadow-md! hover:bg-slate-900!" />
        </div>
      </form>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      :modal="true"
      :closable="false"
      class="w-full md:w-[420px]"
      :pt="deleteDialogPt"
    >
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="flex flex-col gap-2">
          <h3 class="text-lg font-bold text-slate-900">{{ deleteTitle }}</h3>
          <slot name="delete-message" />
        </div>
        <div class="flex w-full flex-col-reverse gap-3 border-t border-slate-100 pt-4 md:flex-row md:justify-center">
          <Button label="Annulla" text @click="closeDelete" class="w-full! md:w-auto! text-slate-500! font-semibold! rounded-lg! px-5! py-2.5! hover:bg-slate-100!" />
          <Button :label="deleteConfirmLabel" icon="pi pi-trash" @click="emit('confirm-delete')" class="w-full! md:w-auto! bg-red-600! text-white! font-semibold! rounded-lg! px-5! py-2.5! shadow-md! hover:bg-red-700!" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
