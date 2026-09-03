<script setup>
import Workstation from '@/components/Workstation.vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
</script>

<template>
  <div>
    <Workstation :category="userStore.user?.categories || []" />
  </div>
</template>
