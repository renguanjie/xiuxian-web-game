"""记录业务逻辑"""
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from models.user import User
from models.game import Game
from models.record import GameRecord, UserStats
from schemas.record import RecordSubmitResponse


class RecordService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def submit(
        self, user: User, game_id: int, score: int, duration: int,
        metadata: dict, ip_address: str, user_agent: str,
    ) -> RecordSubmitResponse:
        """提交游戏记录并更新统计"""
        # 验证游戏存在
        result = await self.db.execute(select(Game).where(Game.id == game_id))
        game = result.scalar_one_or_none()
        if not game:
            raise HTTPException(status_code=404, detail="游戏不存在")

        # 检查是否刷新个人纪录
        existing_result = await self.db.execute(
            select(func.max(GameRecord.score)).where(
                GameRecord.user_id == user.id,
                GameRecord.game_id == game_id,
            )
        )
        best_score = existing_result.scalar() or 0
        is_new_record = score > best_score

        # 创建记录
        record = GameRecord(
            user_id=user.id,
            game_id=game_id,
            score=score,
            duration=duration,
            extra_data=metadata,
            is_new_record=1 if is_new_record else 0,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(record)
        await self.db.flush()

        # 更新游戏统计
        await self.db.execute(
            update(Game).where(Game.id == game_id).values(
                play_count=Game.play_count + 1,
                max_score=func.greatest(Game.max_score, score),
            )
        )

        # 更新用户统计 (直接修改 ORM 实例, 避免 raw UPDATE 导致属性过期)
        stats = await self._get_or_create_stats(user.id)
        stats.total_games += 1
        stats.total_duration += duration
        stats.last_played = datetime.utcnow()
        if score > stats.best_score:
            stats.best_score = score

        # 获取当前排名
        rank_result = await self.db.execute(
            select(func.count()).where(
                GameRecord.game_id == game_id,
                GameRecord.score > score,
            )
        )
        rank = rank_result.scalar() + 1

        return RecordSubmitResponse(
            record_id=record.id,
            score=score,
            is_new_record=is_new_record,
            rank=rank,
        )

    async def _get_or_create_stats(self, user_id: int) -> UserStats:
        """获取或创建用户统计"""
        result = await self.db.execute(select(UserStats).where(UserStats.user_id == user_id))
        stats = result.scalar_one_or_none()
        if not stats:
            stats = UserStats(user_id=user_id)
            self.db.add(stats)
            await self.db.flush()
        return stats
