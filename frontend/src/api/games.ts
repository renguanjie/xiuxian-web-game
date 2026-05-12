/** 游戏 API */
import apiClient from './client'

export const gamesApi = {
  list: (params?: { category?: string }) => apiClient.get('/games', { params }),
  getDetail: (slug: string) => apiClient.get(`/games/${slug}`),
}
