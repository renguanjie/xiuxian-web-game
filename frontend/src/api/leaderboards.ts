/** 排行榜 API */
import apiClient from './client'

export const leaderboardsApi = {
  getGame: (gameId: number, params?: { period?: string; page?: number; per_page?: number }) =>
    apiClient.get(`/leaderboards/${gameId}`, { params }),
}
