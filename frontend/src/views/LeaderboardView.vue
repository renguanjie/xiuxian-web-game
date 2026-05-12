<!-- 排行榜页面 -->
<template>
  <div>
    <!-- 返回按钮 -->
    <div class="mb-4">
      <el-button text @click="goBack" class="!text-text-secondary hover:!text-text-primary transition-colors">
        ← 返回游戏
      </el-button>
    </div>

    <h1 class="text-2xl font-bold mb-6">
      <span class="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent">
        {{ leaderboardData?.game?.name || '排行榜' }}
      </span>
    </h1>

    <!-- 周期筛选 -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <el-button
        v-for="p in periods"
        :key="p.value"
        :type="selectedPeriod === p.value ? 'primary' : ''"
        size="small"
        @click="changePeriod(p.value)"
      >
        {{ p.label }}
      </el-button>
    </div>

    <div v-if="loading" class="text-center py-16 animate-fade-in">
      <svg class="animate-spin mx-auto h-8 w-8 text-primary-500 mb-4" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <div class="text-text-secondary">加载中...</div>
    </div>

    <div v-else-if="error" class="text-center py-16 text-red-400">
      {{ error }}
    </div>

    <template v-else-if="leaderboardData">
      <!-- 桌面端表格布局 -->
      <div class="hidden md:block bg-bg-secondary rounded-game overflow-hidden animate-fade-in">
        <div class="grid grid-cols-12 gap-4 px-4 py-3 bg-bg-tertiary text-text-secondary text-sm font-medium">
          <div class="col-span-1">排名</div>
          <div class="col-span-4">玩家</div>
          <div class="col-span-3 text-right">最高分</div>
          <div class="col-span-2 text-right">游玩次数</div>
          <div class="col-span-2 text-right">最后游玩</div>
        </div>

        <div
          v-for="entry in leaderboardData.leaderboard"
          :key="entry.user.id"
          class="grid grid-cols-12 gap-4 px-4 py-3 border-t border-white/5 hover:bg-bg-tertiary/50 transition-colors"
        >
          <div class="col-span-1 flex items-center">
            <RankBadge :rank="entry.rank" />
          </div>
          <div class="col-span-4 flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-sm">
              {{ entry.user.username.charAt(0).toUpperCase() }}
            </span>
            <span class="text-text-primary">{{ entry.user.username }}</span>
          </div>
          <div class="col-span-3 text-right font-mono text-primary-400">
            {{ entry.best_score.toLocaleString() }}
          </div>
          <div class="col-span-2 text-right text-text-secondary">
            {{ entry.play_count }}
          </div>
          <div class="col-span-2 text-right text-text-muted text-sm">
            {{ formatDate(entry.last_played) }}
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="leaderboardData.leaderboard.length === 0" class="py-16 text-center text-text-muted">
          暂无排行数据
        </div>
      </div>

      <!-- 移动端卡片布局 -->
      <div class="md:hidden space-y-3 animate-slide-up">
        <div
          v-for="entry in leaderboardData.leaderboard"
          :key="entry.user.id"
          class="bg-bg-secondary rounded-game p-4 border border-white/5"
        >
          <div class="flex items-center gap-3 mb-3">
            <RankBadge :rank="entry.rank" />
            <span class="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-base flex-shrink-0">
              {{ entry.user.username.charAt(0).toUpperCase() }}
            </span>
            <div>
              <div class="text-text-primary font-medium">{{ entry.user.username }}</div>
              <div class="text-text-muted text-xs">{{ formatDate(entry.last_played) }}</div>
            </div>
          </div>
          <div class="flex justify-between text-sm">
            <div>
              <span class="text-text-muted text-xs">最高分</span>
              <div class="font-mono text-primary-400 font-semibold">{{ entry.best_score.toLocaleString() }}</div>
            </div>
            <div class="text-right">
              <span class="text-text-muted text-xs">游玩次数</span>
              <div class="text-text-primary font-semibold">{{ entry.play_count }}</div>
            </div>
          </div>
        </div>

        <div v-if="leaderboardData.leaderboard.length === 0" class="py-16 text-center text-text-muted">
          暂无排行数据
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="flex justify-center mt-6">
        <el-pagination
          :current-page="currentPage"
          :page-size="perPage"
          :total="total"
          layout="prev, pager, next"
          @current-change="changePage"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { leaderboardsApi } from '@/api/leaderboards'
import RankBadge from '@/components/leaderboard/RankBadge.vue'

const route = useRoute()
const router = useRouter()
const leaderboardData = ref<{
  game: { id: number; name: string; slug: string }
  period: string
  leaderboard: Array<{
    rank: number
    user: { id: number; username: string; avatar?: string }
    best_score: number
    play_count: number
    last_played?: string
  }>
  total: number
} | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const currentPage = ref(1)
const perPage = 20
const total = ref(0)

const periods = [
  { label: '今日', value: 'day' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '全部', value: 'all' },
]
const selectedPeriod = ref('all')

const totalPages = ref(0)

async function fetchLeaderboard() {
  loading.value = true
  error.value = null
  try {
    const gameId = parseInt(route.params.gameId as string)
    if (isNaN(gameId)) {
      error.value = '无效的游戏 ID'
      return
    }
    const res: any = await leaderboardsApi.getGame(gameId, {
      period: selectedPeriod.value,
      page: currentPage.value,
      per_page: perPage,
    })
    leaderboardData.value = res.data
    total.value = res.data?.total || 0
    totalPages.value = Math.ceil(total.value / perPage)
  } catch {
    leaderboardData.value = null
    error.value = '加载排行榜失败'
  } finally {
    loading.value = false
  }
}

function changePeriod(period: string) {
  selectedPeriod.value = period
  currentPage.value = 1
  fetchLeaderboard()
}

function changePage(page: number) {
  currentPage.value = page
  fetchLeaderboard()
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN')
}

function goBack() {
  const game = leaderboardData.value?.game
  if (game?.slug) {
    router.push(`/game/${game.slug}`)
  } else {
    router.push('/games')
  }
}

onMounted(fetchLeaderboard)
</script>
