import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/games',
    },
    {
      path: '/games',
      name: 'GamesList',
      component: () => import('@/views/GamesListView.vue'),
    },
    {
      path: '/game/:slug',
      name: 'GamePlay',
      component: () => import('@/views/GamePlayView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/games',
    },
  ],
})

export default router
