import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listGames } from '@/data/games'
import type { Game } from '@/types'

export const useGamesStore = defineStore('games', () => {
  const games = ref<Game[]>(listGames())

  function filterGames(category?: string) {
    games.value = listGames(category)
  }

  return { games, filterGames }
})
