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
      <p class="text-xs text-text-secondary mt-1 truncate">{{ game.description || '' }}</p>
      <div class="flex items-center gap-3 mt-2 text-xs text-text-muted">
        <span>👁 {{ formatCount(game.play_count) }} 次游玩</span>
        <span>⭐ {{ game.avg_score.toFixed(0) }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import type { Game } from '@/types'
import { CATEGORY_LABELS } from '@/types'

const props = defineProps<{ game: Game }>()

const categoryLabel = CATEGORY_LABELS[props.game.category] || props.game.category

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}
</script>

<style scoped>
.game-card:hover {
  box-shadow: var(--glow-primary);
}
</style>
