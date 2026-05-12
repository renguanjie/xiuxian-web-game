"""排行榜路由 - 单游戏排行榜"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.record import LeaderboardOut
from app.schemas.common import ApiResponse, PageMeta
from app.services.leaderboard_service import LeaderboardService

router = APIRouter()


@router.get("/{game_id}", response_model=ApiResponse[LeaderboardOut])
async def get_leaderboard(
    game_id: int,
    period: str = Query("all", pattern="^(all|day|week|month)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取单游戏排行榜"""
    service = LeaderboardService(db)
    result = await service.get_game_leaderboard(game_id, period=period, page=page, per_page=per_page)
    pages = (result["total"] + per_page - 1) // per_page if result["total"] else 0
    return ApiResponse(
        data=result,
        meta=PageMeta(page=page, per_page=per_page, total=result["total"], pages=pages).model_dump(),
    )
