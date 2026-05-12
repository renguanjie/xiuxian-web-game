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
      <el-button
        :type="selectedCategory === '' ? 'primary' : ''"
        size="small"
        @click="selectedCategory = ''"
      >
        全部
      </el-button>
      <el-button
        v-for="cat in categories"
        :key="cat.value"
        :type="selectedCategory === cat.value ? 'primary' : ''"
        size="small"
        @click="selectedCategory = cat.value"
      >
        {{ cat.label }}
      </el-button>
    </div>

    <!-- 加载中骨架屏 -->
    <div v-if="gamesStore.loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="i in 8" :key="i" class="bg-bg-secondary rounded-game overflow-hidden shadow-card animate-fade-in">
        <div class="aspect-video bg-bg-tertiary animate-shimmer" style="background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-elevated) 50%, var(--bg-tertiary) 75%); background-size: 200% 100%;" />
        <div class="p-3 space-y-2">
          <div class="h-4 bg-bg-tertiary rounded animate-shimmer w-3/4" style="background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-elevated) 50%, var(--bg-tertiary) 75%); background-size: 200% 100%;" />
          <div class="h-3 bg-bg-tertiary rounded animate-shimmer w-full" style="background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-elevated) 50%, var(--bg-tertiary) 75%); background-size: 200% 100%;" />
          <div class="flex gap-3">
            <div class="h-3 bg-bg-tertiary rounded animate-shimmer w-16" style="background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-elevated) 50%, var(--bg-tertiary) 75%); background-size: 200% 100%;" />
            <div class="h-3 bg-bg-tertiary rounded animate-shimmer w-8" style="background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-elevated) 50%, var(--bg-tertiary) 75%); background-size: 200% 100%;" />
          </div>
        </div>
      </div>
    </div>

    <!-- 游戏列表 -->
    <GameGrid v-else>
      <GameCard v-for="game in gamesStore.games" :key="game.id" :game="game" />
    </GameGrid>

    <!-- 空状态 -->
    <div v-if="!gamesStore.loading && gamesStore.games.length === 0" class="text-center py-16 text-text-muted">
      {{ gamesStore.error || '暂无游戏' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGamesStore } from '@/stores/games'
import { CATEGORY_LABELS } from '@/types'
import GameCard from '@/components/game/GameCard.vue'
import GameGrid from '@/components/game/GameGrid.vue'

const gamesStore = useGamesStore()
const selectedCategory = ref('')

const categories = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ label: label, value }))

onMounted(() => {
  gamesStore.fetchGames()
})

watch(selectedCategory, (cat) => {
  gamesStore.fetchGames(cat || undefined)
})
</script>
