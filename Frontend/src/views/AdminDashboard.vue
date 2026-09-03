<script setup>
</script>

<template>
    <!-- ░░ PAGE BACKGROUND ░░ -->
    <div class="relative isolate h-[calc(100vh-7rem)] overflow-hidden px-4 py-8 sm:px-6 lg:px-10">

        <div class="mx-auto flex h-full w-full max-w-6xl flex-col gap-8">

            <!-- ░░ HERO HEADER CARD ░░ -->
            <div class="rounded-3xl border-2 border-slate-200/60 bg-white/80 px-8 py-8 backdrop-blur-sm sm:px-10 sm:py-10">
                <span class="inline-block rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
                    Admin Dashboard
                </span>
                <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    Seleziona una sezione
                </h1>
                <p class="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
                    Gestione rapida di utenti, bar e articoli, con accesso diretto alle funzioni amministrative.
                </p>
            </div>

            <!-- ░░ ACTION CARDS GRID ░░ -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">

                <!-- Gestisci Utenti -->
                <router-link
                    :to="{ name: 'users-management' }"
                    class="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200/60 bg-white/80 p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 sm:p-6 no-underline"
                >
                    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14">
                        <i class="pi pi-users text-xl"></i>
                    </span>
                    <div>
                        <p class="text-base font-semibold text-slate-900 sm:text-lg">Gestisci Utenti</p>
                        <p class="mt-1 text-xs text-slate-500 leading-snug sm:text-sm">Visualizza e crea utenti</p>
                    </div>
                </router-link>

                <!-- Gestione Categorie -->
                <router-link
                    :to="{ name: 'categories-management' }"
                    class="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200/60 bg-white/80 p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 sm:p-6 no-underline"
                >
                    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14">
                        <i class="pi pi-tags text-xl"></i>
                    </span>
                    <div>
                        <p class="text-base font-semibold text-slate-900 sm:text-lg">Gestione Categorie</p>
                        <p class="mt-1 text-xs text-slate-500 leading-snug sm:text-sm">Crea e modifica le categorie</p>
                    </div>
                </router-link>

                <!-- Gestisci Bar -->
                <router-link
                    :to="{ name: 'bars-management' }"
                    class="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-slate-200/60 bg-white/80 p-5 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 sm:p-6 no-underline"
                >
                    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14">
                        <i class="pi pi-building text-xl"></i>
                    </span>
                    <div>
                        <p class="text-base font-semibold text-slate-900 sm:text-lg">Gestisci Bar</p>
                        <p class="mt-1 text-xs text-slate-500 leading-snug sm:text-sm">Visualizza e crea bar</p>
                    </div>
                </router-link>


                <!-- Gestione Articoli -->
                <router-link
                    :to="{ name: 'items-management' }"
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

                <!-- Planning Inventario -->
                <router-link
                    :to="{ name: 'inventory-planning' }"
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
            </div>


        </div>
    </div>
</template>
