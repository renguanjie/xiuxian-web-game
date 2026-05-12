/** Pinia 游戏列表状态管理 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gamesApi } from '@/api/games'
import type { Game } from '@/types'

export const useGamesStore = defineStore('games', () => {
  const games = ref<Game[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchGames(category?: string) {
    loading.value = true
    error.value = null
    try {
      const res = await gamesApi.list({ category })
      games.value = res.data
    } catch (e: any) {
      error.value = e.message || '加载游戏列表失败'
      games.value = []
    } finally {
      loading.value = false
    }
  }

  return { games, loading, error, fetchGames }
})
