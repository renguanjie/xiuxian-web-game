"""排行榜业务逻辑"""
from typing import Optional
from fastapi import HTTPException
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.game import Game
from app.schemas.record import LeaderboardOut, LeaderboardEntry


# 周期对应的 SQL 时间过滤
PERIOD_FILTERS = {
    "day": "AND gr.played_at >= NOW() - INTERVAL 1 DAY",
    "week": "AND gr.played_at >= NOW() - INTERVAL 7 DAY",
    "month": "AND gr.played_at >= NOW() - INTERVAL 30 DAY",
    "all": "",
}


class LeaderboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_game_leaderboard(self, game_id: int, period: str = "all", page: int = 1, per_page: int = 20) -> dict:
        """获取单游戏排行榜 (每个用户取最高分)"""
        # 获取游戏信息
        result = await self.db.execute(select(Game).where(Game.id == game_id))
        game = result.scalar_one_or_none()
        if not game:
            raise HTTPException(status_code=404, detail="游戏不存在")

        period_sql = PERIOD_FILTERS.get(period, PERIOD_FILTERS["all"])

        query = text(f"""
            SELECT
                u.id AS user_id,
                u.username,
                u.avatar,
                MAX(gr.score) AS best_score,
                COUNT(gr.id) AS play_count,
                MAX(gr.played_at) AS last_played,
                RANK() OVER (ORDER BY MAX(gr.score) DESC) AS `rank`
            FROM game_records gr
            JOIN users u ON gr.user_id = u.id
            WHERE gr.game_id = :game_id AND u.is_active = 1
            {period_sql}
            GROUP BY u.id, u.username, u.avatar
            ORDER BY best_score DESC
            LIMIT :limit OFFSET :offset
        """)

        result = await self.db.execute(
            query,
            {"game_id": game_id, "limit": per_page, "offset": (page - 1) * per_page},
        )
        rows = result.mappings().all()

        # 获取总用户数 (用于分页)
        count_query = text(f"""
            SELECT COUNT(DISTINCT u.id) AS total
            FROM game_records gr
            JOIN users u ON gr.user_id = u.id
            WHERE gr.game_id = :game_id AND u.is_active = 1
            {period_sql}
        """)
        count_result = await self.db.execute(count_query, {"game_id": game_id})
        total = count_result.scalar() or 0

        entries = [
            LeaderboardEntry(
                rank=row["rank"],
                user={"id": row["user_id"], "username": row["username"], "avatar": row["avatar"]},
                best_score=row["best_score"],
                play_count=row["play_count"],
                last_played=row["last_played"],
            )
            for row in rows
        ]

        return {
            "game": {"id": game.id, "name": game.name, "slug": game.slug},
            "period": period,
            "leaderboard": entries,
            "total": total,
        }
