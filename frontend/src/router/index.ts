/** 路由定义 + 懒加载 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/games',
  },
  {
    path: '/login',
    redirect: '/games',
  },
  {
    path: '/register',
    redirect: '/games',
  },
  {
    path: '/games',
    name: 'GamesList',
    component: () => import('@/views/GamesListView.vue'),
    meta: { guest: true },
  },
  {
    path: '/game/:slug',
    name: 'GamePlay',
    component: () => import('@/views/GamePlayView.vue'),
    meta: { guest: true },
  },
  {
    path: '/leaderboard/:gameId',
    name: 'Leaderboard',
    component: () => import('@/views/LeaderboardView.vue'),
    meta: { guest: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = !to.meta.guest

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'GamesList', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
