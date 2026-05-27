<template>
  <header class="sticky top-0 z-50 bg-bg-secondary/95 backdrop-blur border-b border-white/10">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
      <RouterLink to="/games" class="flex items-center gap-2 text-xl font-bold">
        <span class="text-primary-500">⚡</span>
        <span class="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
          修仙游戏平台
        </span>
      </RouterLink>

      <RouterLink
        to="/games"
        class="text-text-secondary hover:text-text-primary transition-colors"
        :class="{ '!text-text-primary': route.path === '/games' }"
      >
        游戏大厅
      </RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
