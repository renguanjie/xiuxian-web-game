<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <main class="flex-1 container mx-auto px-4 py-6 max-w-7xl">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
</script>
