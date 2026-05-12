"""游戏业务逻辑"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.game import Game
from app.schemas.game import GameOut, GameDetail


class GameService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _base_query(self, category: Optional[str] = None):
        """构建基础查询条件"""
        query = select(Game).where(Game.status == "active")
        if category:
            query = query.where(Game.category == category)
        return query

    async def list_games(self, category: Optional[str] = None, page: int = 1, per_page: int = 20):
        """获取游戏列表 (仅 active 状态)"""
        # 获取总数 (直接 count, 避免 subquery)
        count_stmt = select(func.count(Game.id)).where(Game.status == "active")
        if category:
            count_stmt = count_stmt.where(Game.category == category)
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # 分页查询
        query = self._base_query(category).order_by(Game.sort_order.desc(), Game.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        games = result.scalars().all()

        game_list = [
            GameOut(
                id=g.id, name=g.name, slug=g.slug, thumbnail=g.thumbnail,
                category=g.category, tags=g.tags or [],
                play_count=g.play_count, avg_score=float(g.avg_score), status=g.status,
                description=g.description,
            )
            for g in games
        ]
        return game_list, total

    async def get_by_slug(self, slug: str) -> Optional[GameDetail]:
        """通过 slug 获取游戏详情"""
        result = await self.db.execute(select(Game).where(Game.slug == slug))
        game = result.scalar_one_or_none()
        if not game:
            return None
        return GameDetail(
            id=game.id, name=game.name, slug=game.slug, thumbnail=game.thumbnail,
            category=game.category, tags=game.tags or [],
            play_count=game.play_count, avg_score=float(game.avg_score), status=game.status,
            description=game.description, banner=game.banner, path=game.path,
            version=game.version, max_score=game.max_score, created_at=game.created_at,
        )
