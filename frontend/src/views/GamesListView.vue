<!-- 游戏大厅页面 -->
<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">
      <span class="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
        游戏大厅
      </span>
    </h1>

    <!-- 分类筛选 -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button
        type="button"
        class="px-3 py-1.5 text-sm rounded-game transition-colors"
        :class="selectedCategory === '' ? 'bg-primary-500 text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'"
        @click="selectedCategory = ''"
      >
        全部
      </button>
      <button
        v-for="cat in categories"
        :key="cat.value"
        type="button"
        class="px-3 py-1.5 text-sm rounded-game transition-colors"
        :class="selectedCategory === cat.value ? 'bg-primary-500 text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'"
        @click="selectedCategory = cat.value"
      >
        {{ cat.label }}
      </button>
    </div>

    <GameGrid>
      <GameCard v-for="game in games" :key="game.id" :game="game" />
    </GameGrid>

    <div v-if="games.length === 0" class="text-center py-16 text-text-muted">
      当前分类暂无游戏
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { listGames } from '@/data/games'
import { CATEGORY_LABELS } from '@/types'
import GameCard from '@/components/game/GameCard.vue'
import GameGrid from '@/components/game/GameGrid.vue'

const selectedCategory = ref('')
const categories = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ label: label, value }))
const games = computed(() => listGames(selectedCategory.value || undefined))
</script>
