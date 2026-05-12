/** 游戏评论 API */
import apiClient from './client'

interface ReviewData {
  content: string
  rating: number
}

export interface Review {
  id: number
  content: string
  rating: number
  user: { id: number; username: string; avatar?: string }
  created_at: string
}

export const reviewsApi = {
  create: (gameId: number, data: ReviewData) =>
    apiClient.post<Review>('/reviews', data, { params: { game_id: gameId } }),
  list: (gameId: number, page = 1, perPage = 20) =>
    apiClient.get<{ data: Review[]; meta: any }>('/reviews', { params: { game_id: gameId, page, per_page: perPage } }),
}
