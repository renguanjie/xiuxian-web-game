<!-- 游戏播放器 - iframe 嵌入 + 全屏模式 -->
<template>
  <div class="game-player">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between mb-4">
      <a class="text-text-secondary hover:text-text-primary transition-colors cursor-pointer" @click="goBack">
        ← 返回大厅
      </a>
      <div class="flex items-center gap-2">
        <RouterLink :to="`/leaderboard/${gameId}`" class="text-text-secondary hover:text-text-primary text-sm">
          🏆 排行榜
        </RouterLink>
        <el-button size="small" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <!-- 游戏 iframe -->
    <div ref="playerContainer" class="relative bg-bg-secondary rounded-game overflow-hidden" tabindex="0">
      <iframe
        :src="gameUrl"
        sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
        allow="fullscreen; gamepad; autoplay"
        referrerpolicy="no-referrer"
        class="w-full"
        :style="{ aspectRatio: '16/9' }"
        @load="onIframeLoad"
        @error="onIframeError"
      />
      <!-- 加载遮罩 -->
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-bg-secondary/80">
        <div class="text-text-secondary">加载中...</div>
      </div>
      <!-- 加载失败 -->
      <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-bg-secondary/80">
        <div class="text-center">
          <div class="text-red-400 mb-2">游戏加载失败</div>
          <el-button size="small" @click="retry">重试</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useFullscreen } from '@vueuse/core'

const router = useRouter()
const props = defineProps<{
  path: string
  gameId: number
}>()

const playerContainer = ref<HTMLElement | null>(null)
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(playerContainer)
const loading = ref(true)
const error = ref(false)

const gameUrl = computed(() => {
  return `/games/${props.path}`
})

function onIframeLoad() {
  loading.value = false
  error.value = false
}

function onIframeError() {
  loading.value = false
  error.value = true
}

function retry() {
  error.value = false
  loading.value = true
}

function goBack() {
  router.push('/games')
}

// 拦截方向键、空格等，防止页面滚动（仅在游戏页面内生效）
const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' ', 'Home', 'End', 'PageUp', 'PageDown'])

function stopPropagation(event: KeyboardEvent) {
  if (scrollKeys.has(event.key)) {
    event.preventDefault()
    event.stopPropagation()
  }
}

// 在 window 层级拦截滚动键，防止 iframe 冒泡
onMounted(() => {
  window.addEventListener('keydown', stopPropagation, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', stopPropagation, true)
})
</script>
