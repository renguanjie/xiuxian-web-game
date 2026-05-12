<!-- 顶栏导航 -->
<template>
  <header class="sticky top-0 z-50 bg-bg-secondary/95 backdrop-blur border-b border-white/10">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
      <!-- Logo -->
      <RouterLink to="/games" class="flex items-center gap-2 text-xl font-bold">
        <span class="text-primary-500">⚡</span>
        <span class="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent hidden sm:inline">
          修仙游戏平台
        </span>
        <span class="bg-gradient-to-r from-primary-400 to-accent-500 bg-clip-text text-transparent sm:hidden">
          修仙
        </span>
      </RouterLink>

      <!-- Nav Links (desktop) -->
      <nav class="hidden md:flex items-center gap-6">
        <RouterLink
          to="/games"
          class="text-text-secondary hover:text-text-primary transition-colors"
          :class="{ '!text-text-primary': route.path.startsWith('/games') }"
        >
          游戏大厅
        </RouterLink>
      </nav>

      <!-- User Menu + Mobile Menu -->
      <div class="flex items-center gap-3">
        <template v-if="authStore.isAuthenticated">
          <el-dropdown trigger="click" class="hidden sm:block">
            <span class="text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              {{ authStore.user?.username }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span class="text-sm text-text-secondary sm:hidden">{{ authStore.user?.username }}</span>
          <el-button size="small" type="info" @click="handleLogout" class="hidden sm:inline-flex">退出</el-button>
        </template>
        <template v-else>
          <el-button size="small" type="primary" @click="openAuthModal('login')" class="hidden sm:inline-flex">登录</el-button>
          <el-button size="small" @click="openAuthModal('register')" class="hidden sm:inline-flex">注册</el-button>
        </template>

        <!-- Mobile menu button -->
        <el-button text class="md:hidden !text-text-secondary" @click="mobileMenuOpen = !mobileMenuOpen">
          <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </el-button>
      </div>
    </div>

    <!-- Mobile Menu Dropdown -->
    <div v-if="mobileMenuOpen" class="md:hidden border-t border-white/10 bg-bg-secondary/95 backdrop-blur animate-slide-up">
      <nav class="px-4 py-3 space-y-2">
        <RouterLink
          to="/games"
          class="block px-3 py-2 rounded-game text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          @click="mobileMenuOpen = false"
        >
          游戏大厅
        </RouterLink>
        <template v-if="authStore.isAuthenticated">
          <div class="px-3 py-2 text-sm text-text-muted">当前用户: {{ authStore.user?.username }}</div>
          <button class="w-full text-left px-3 py-2 rounded-game text-red-400 hover:bg-bg-tertiary transition-colors" @click="handleLogout(); mobileMenuOpen = false">
            退出登录
          </button>
        </template>
        <template v-else>
          <button class="w-full text-left px-3 py-2 rounded-game text-primary-400 hover:bg-bg-tertiary transition-colors" @click="openAuthModal('login'); mobileMenuOpen = false">
            登录
          </button>
          <button class="w-full text-left px-3 py-2 rounded-game text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors" @click="openAuthModal('register'); mobileMenuOpen = false">
            注册
          </button>
        </template>
      </nav>
    </div>

    <!-- 全局认证弹窗 -->
    <AuthModal />
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { openAuthModal } from '@/stores/modal'
import { useRouter } from 'vue-router'
import AuthModal from '@/components/common/AuthModal.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const mobileMenuOpen = ref(false)

function handleLogout() {
  authStore.logout()
  router.push('/games')
}
</script>
