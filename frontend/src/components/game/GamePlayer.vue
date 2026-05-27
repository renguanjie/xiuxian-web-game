<!-- 游戏播放器 - iframe 嵌入 + 全屏模式 + 移动端适配 -->
<template>
  <div class="game-player">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between mb-3 sm:mb-4 px-1 sm:px-0">
      <a class="text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-sm sm:text-base" @click="goBack">
        ← 返回大厅
      </a>
      <button type="button" class="px-3 py-1.5 text-sm rounded-game bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors" @click="toggleFullscreen">
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </button>
    </div>

    <!-- 竖屏旋转提示 -->
    <div v-if="isPortrait && !hintDismissed" class="landscape-hint" @click="dismissHint">
      <div class="hint-content">
        <svg class="rotate-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 4v6h6M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
        </svg>
        <span>旋转设备横屏以获得最佳体验</span>
        <span class="dismiss-text">点击关闭</span>
      </div>
    </div>

    <!-- 游戏 iframe -->
    <div ref="playerContainer" class="relative bg-bg-secondary rounded-game overflow-hidden touch-none" tabindex="0">
      <iframe
        :src="gameUrl"
        sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
        allow="fullscreen; gamepad; autoplay"
        referrerpolicy="no-referrer"
        class="w-full game-iframe"
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
          <button type="button" class="px-3 py-1.5 text-sm rounded-game bg-primary-500 text-white" @click="retry">
            重试
          </button>
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
}>()

const playerContainer = ref<HTMLElement | null>(null)
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(playerContainer)
const loading = ref(true)
const error = ref(false)
const isPortrait = ref(false)
const hintDismissed = ref(false)

const gameUrl = computed(() => {
  return `/games/${props.path}`
})

function updateOrientation() {
  isPortrait.value = window.matchMedia('(orientation: portrait)').matches
  if (!isPortrait.value) hintDismissed.value = false
}

function dismissHint() {
  hintDismissed.value = true
}

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
  updateOrientation()
  const mql = window.matchMedia('(orientation: portrait)')
  mql.addEventListener('change', updateOrientation)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', stopPropagation, true)
  const mql = window.matchMedia('(orientation: portrait)')
  mql.removeEventListener('change', updateOrientation)
})
</script>

<style scoped>
.game-player {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.touch-none {
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.game-iframe {
  aspect-ratio: 9/16;
  object-fit: contain;
}

@media (orientation: landscape) {
  .game-iframe {
    aspect-ratio: 16/9;
  }
}

.landscape-hint {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(10, 10, 18, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  cursor: pointer;
  animation: hint-fade-in 0.3s ease-out;
}

@keyframes hint-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.hint-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #f0f0f5;
  font-size: 16px;
}

.dismiss-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.rotate-icon {
  width: 64px;
  height: 64px;
  color: #ff6b00;
  animation: rotate-hint 2s ease-in-out infinite;
}

@keyframes rotate-hint {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-90deg); }
  50% { transform: rotate(-90deg); }
  75% { transform: rotate(0deg); }
}
</style>
