<script setup>

</script>

<template>
    <div class="routes-h">
        <div>
            <router-link to="/orders">
                <h1>Nuovo ordine</h1>
            </router-link>
        </div>
        <div>
            <router-link to="/history">
                <h1>Storico</h1>
            </router-link>
        </div>
    </div> 
</template>

<style scoped>
.routes-h {
    display: flex;
    gap: 20px;
}
</style>