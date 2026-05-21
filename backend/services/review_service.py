"""游戏评论业务逻辑"""
import re
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.review import GameReview

# 简单 HTML 标签正则，用于检测和 stripping
_HTML_RE = re.compile(r'<[^>]+>')


def strip_html(text: str) -> str:
    """移除 HTML 标签，防止 XSS"""
    return _HTML_RE.sub('', text)


class ReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_review(self, user_id: int, game_id: int, content: str, rating: int) -> GameReview:
        """创建游戏评论，同一用户对同一游戏只能评论一次"""
        # 检查是否已评论
        existing = await self.db.execute(
            select(GameReview).where(
                GameReview.user_id == user_id,
                GameReview.game_id == game_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="您已经评论过该游戏")

        # 移除 HTML 标签
        content = strip_html(content)

        review = GameReview(
            user_id=user_id,
            game_id=game_id,
            content=content,
            rating=rating,
        )
        self.db.add(review)
        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def list_reviews(self, game_id: int, page: int = 1, per_page: int = 20):
        """获取游戏评论列表 (分页)"""
        # 统计总数
        count_stmt = select(func.count(GameReview.id)).where(GameReview.game_id == game_id)
        result = await self.db.execute(count_stmt)
        total = result.scalar_one()

        # 分页查询
        stmt = (
            select(GameReview)
            .where(GameReview.game_id == game_id)
            .order_by(GameReview.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        result = await self.db.execute(stmt)
        reviews = result.scalars().all()

        return reviews, total
