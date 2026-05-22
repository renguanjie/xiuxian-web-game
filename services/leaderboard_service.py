"""排行榜业务逻辑"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models.game import Game
from models.record import GameRecord
from models.user import User
from schemas.record import LeaderboardEntry


# 周期对应的时间窗口，避免使用数据库方言敏感的 INTERVAL 语法
PERIOD_DELTAS = {
    "day": timedelta(days=1),
    "week": timedelta(days=7),
    "month": timedelta(days=30),
    "all": None,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


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

        period_delta = PERIOD_DELTAS.get(period, PERIOD_DELTAS["all"])
        conditions = [
            GameRecord.game_id == game_id,
            User.is_active == 1,
        ]
        if period_delta is not None:
            conditions.append(GameRecord.played_at >= _utcnow() - period_delta)

        best_scores = (
            select(
                User.id.label("user_id"),
                User.username,
                User.avatar,
                func.max(GameRecord.score).label("best_score"),
                func.count(GameRecord.id).label("play_count"),
                func.max(GameRecord.played_at).label("last_played"),
            )
            .join(User, GameRecord.user_id == User.id)
            .where(*conditions)
            .group_by(User.id, User.username, User.avatar)
            .subquery()
        )

        ranked_scores = (
            select(
                best_scores.c.user_id,
                best_scores.c.username,
                best_scores.c.avatar,
                best_scores.c.best_score,
                best_scores.c.play_count,
                best_scores.c.last_played,
                func.rank().over(order_by=best_scores.c.best_score.desc()).label("rank"),
            )
            .subquery()
        )

        query = (
            select(ranked_scores)
            .order_by(ranked_scores.c.best_score.desc(), ranked_scores.c.user_id.asc())
            .limit(per_page)
            .offset((page - 1) * per_page)
        )

        result = await self.db.execute(query)
        rows = result.mappings().all()

        # 获取总用户数 (用于分页)
        count_query = select(func.count()).select_from(best_scores)
        count_result = await self.db.execute(count_query)
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
