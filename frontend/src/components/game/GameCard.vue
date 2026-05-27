<!-- 游戏卡片组件 -->
<template>
  <RouterLink
    :to="`/game/${game.slug}`"
    class="game-card block bg-bg-secondary rounded-game overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1 group"
  >
    <!-- 缩略图 -->
    <div class="aspect-video relative overflow-hidden">
      <img
        :src="game.thumbnail"
        :alt="game.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      <!-- 分类标签 -->
      <span class="absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full bg-primary-500/80 text-white">
        {{ categoryLabel }}
      </span>
    </div>

    <!-- 信息 -->
    <div class="p-3">
      <h3 class="text-base font-semibold text-text-primary truncate">{{ game.name }}</h3>
      <p class="text-xs text-text-secondary mt-1 truncate">{{ game.description }}</p>
      <div class="flex items-center gap-2 mt-2 text-xs text-text-muted">
        <span v-for="tag in game.tags.slice(0, 2)" :key="tag" class="px-1.5 py-0.5 bg-bg-tertiary rounded">
          {{ tag }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import type { Game } from '@/types'
import { CATEGORY_LABELS } from '@/types'

const props = defineProps<{ game: Game }>()

const categoryLabel = CATEGORY_LABELS[props.game.category] || props.game.category
</script>

<style scoped>
.game-card:hover {
  box-shadow: var(--glow-primary);
}
</style>
