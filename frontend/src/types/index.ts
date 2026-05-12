/** 通用 TypeScript 类型 */

export interface Game {
  id: number
  name: string
  slug: string
  description?: string
  thumbnail: string
  banner?: string
  path: string
  category: string
  tags: string[]
  play_count: number
  avg_score: number
  max_score: number
  version: string
  status: string
}

/** 游戏分类标签映射 */
export const CATEGORY_LABELS: Record<string, string> = {
  survival: '幸存者',
  'tower-defense': '塔防',
  snake: '贪吃蛇',
  shooter: '射击',
}
