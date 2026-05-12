"""游戏路由 - 列表与详情"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.database import get_db
from app.schemas.game import GameOut, GameDetail
from app.schemas.common import ApiResponse, PageMeta
from app.services.game_service import GameService

router = APIRouter()


@router.get("", response_model=ApiResponse[List[GameOut]])
async def list_games(
    category: Optional[str] = Query(None, description="按分类筛选"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取游戏列表 (分页/筛选)"""
    service = GameService(db)
    games, total = await service.list_games(category=category, page=page, per_page=per_page)
    pages = (total + per_page - 1) // per_page if total else 0
    return ApiResponse(
        data=games,
        meta=PageMeta(page=page, per_page=per_page, total=total, pages=pages).model_dump(),
    )


@router.get("/{slug}", response_model=ApiResponse[GameDetail])
async def get_game(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """获取游戏详情"""
    service = GameService(db)
    game = await service.get_by_slug(slug)
    if not game:
        raise HTTPException(status_code=404, detail="游戏不存在")
    return ApiResponse(data=game)
