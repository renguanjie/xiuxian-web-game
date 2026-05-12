<!-- 游戏页面 - iframe 嵌入 -->
<template>
  <div>
    <div v-if="loading" class="text-center py-16 animate-fade-in">
      <svg class="animate-spin mx-auto h-10 w-10 text-primary-500 mb-4" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <div class="text-text-secondary">加载中...</div>
    </div>

    <template v-else-if="game">
      <!-- 标题行 -->
      <div class="flex items-start justify-between mb-4">
        <h1 class="text-2xl font-bold">{{ game.name }}</h1>
        <!-- 收藏按钮 -->
        <button
          v-if="authStore.isAuthenticated"
          class="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors text-sm"
          :class="isFavorited ? 'bg-primary-500/20 text-primary-400' : 'bg-bg-secondary text-text-muted hover:text-primary-400'"
          @click="toggleFavorite"
        >
          <svg class="w-5 h-5" :fill="isFavorited ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          {{ isFavorited ? '已收藏' : '收藏' }}
        </button>
      </div>

      <!-- 游戏播放器 -->
      <GamePlayer :path="game.path" :game-id="game.id" />

      <!-- 游戏统计卡片 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div class="bg-bg-secondary rounded-game p-3 text-center">
          <div class="text-2xl text-primary-400">👁</div>
          <div class="text-sm text-text-secondary mt-1">{{ game.play_count }} 次游玩</div>
        </div>
        <div class="bg-bg-secondary rounded-game p-3 text-center">
          <div class="text-2xl text-accent-500">🏆</div>
          <div class="text-sm text-text-secondary mt-1">最高分 {{ game.max_score }}</div>
        </div>
        <div class="bg-bg-secondary rounded-game p-3 text-center">
          <div class="text-2xl text-yellow-400">⭐</div>
          <div class="text-sm text-text-secondary mt-1">评分 {{ game.avg_score.toFixed(1) }}</div>
        </div>
        <div class="bg-bg-secondary rounded-game p-3 text-center">
          <div class="text-2xl text-neon-cyan">📌</div>
          <div class="text-sm text-text-secondary mt-1">版本 {{ game.version }}</div>
        </div>
      </div>

      <!-- 游戏描述 -->
      <div class="mt-6 bg-bg-secondary rounded-game p-6 animate-slide-up">
        <h2 class="text-lg font-semibold mb-2">游戏描述</h2>
        <p class="text-text-secondary leading-relaxed">{{ game.description }}</p>
      </div>

      <!-- 操作说明 -->
      <el-collapse class="mt-4 animate-slide-up">
        <el-collapse-item title="操作说明" name="controls">
          <div class="text-text-secondary space-y-1 text-sm">
            <p>🖱️ 鼠标移动：控制角色方向</p>
            <p>🖱️ 左键 / 空格：攻击 / 确认</p>
            <p>⌨️ ESC：暂停游戏</p>
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- 玩家评论 -->
      <ReviewList :game-id="game.id" />

      <!-- 推荐游戏 -->
      <div v-if="recommendedGames.length > 0" class="mt-8 animate-slide-up">
        <h2 class="text-lg font-semibold mb-4">推荐游戏</h2>
        <GameGrid>
          <GameCard v-for="g in recommendedGames" :key="g.id" :game="g" />
        </GameGrid>
      </div>
    </template>

    <div v-else class="text-center py-16 text-text-muted animate-fade-in">
      游戏不存在
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gamesApi } from '@/api/games'
import { useAuthStore } from '@/stores/auth'
import GamePlayer from '@/components/game/GamePlayer.vue'
import ReviewList from '@/components/game/ReviewList.vue'
import GameCard from '@/components/game/GameCard.vue'
import GameGrid from '@/components/game/GameGrid.vue'
import type { Game } from '@/types'

const route = useRoute()
const game = ref<(Game & { description: string }) | null>(null)
const loading = ref(true)
const authStore = useAuthStore()
const recommendedGames = ref<Game[]>([])

// 收藏状态（本地存储）
const favoritesKey = 'game_favorites'
const isFavorited = ref(false)

function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(favoritesKey) || '[]')
  } catch {
    return []
  }
}

function setFavorites(favs: string[]) {
  localStorage.setItem(favoritesKey, JSON.stringify(favs))
}

function toggleFavorite() {
  if (!authStore.isAuthenticated) return
  const slug = game.value?.slug
  if (!slug) return
  const favs = getFavorites()
  const idx = favs.indexOf(slug)
  if (idx >= 0) {
    favs.splice(idx, 1)
    isFavorited.value = false
  } else {
    favs.push(slug)
    isFavorited.value = true
  }
  setFavorites(favs)
}

onMounted(async () => {
  try {
    const slug = route.params.slug as string
    const res: any = await gamesApi.getDetail(slug)
    const currentGame = res.data as Game & { description: string }
    game.value = currentGame
    // 检查收藏状态
    if (authStore.isAuthenticated) {
      isFavorited.value = getFavorites().includes(slug)
    }
    // 加载同分类推荐
    try {
      const catRes: any = await gamesApi.list({ category: currentGame.category })
      recommendedGames.value = (catRes.data || []).filter((g: Game) => g.id !== currentGame.id)
    } catch {
      recommendedGames.value = []
    }
  } catch {
    game.value = null
  } finally {
    loading.value = false
  }
})

watch(() => authStore.isAuthenticated, (val) => {
  if (val && game.value?.slug) {
    isFavorited.value = getFavorites().includes(game.value.slug)
  } else {
    isFavorited.value = false
  }
})
</script>
