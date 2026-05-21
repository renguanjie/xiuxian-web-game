"""游戏评论路由"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.review import ReviewCreate, ReviewOut
from schemas.common import ApiResponse, PageMeta
from services.review_service import ReviewService

router = APIRouter()


@router.post("", response_model=ApiResponse[ReviewOut])
async def create_review(
    req: ReviewCreate,
    game_id: int = Query(..., description="游戏ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发表游戏评论 (需要登录)"""
    service = ReviewService(db)
    review = await service.create_review(
        user_id=current_user.id,
        game_id=game_id,
        content=req.content,
        rating=req.rating,
    )
    return ApiResponse(
        data=ReviewOut(
            id=review.id,
            content=review.content,
            rating=review.rating,
            user={"id": current_user.id, "username": current_user.username, "avatar": current_user.avatar},
            created_at=review.created_at,
        ),
        message="评论成功",
    )


@router.get("", response_model=ApiResponse[list[ReviewOut]])
async def list_reviews(
    game_id: int = Query(..., description="游戏ID"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取游戏评论列表"""
    service = ReviewService(db)
    reviews, total = await service.list_reviews(game_id, page, per_page)
    pages = (total + per_page - 1) // per_page if total else 0
    return ApiResponse(
        data=[
            ReviewOut(
                id=r.id,
                content=r.content,
                rating=r.rating,
                user={"id": r.user.id, "username": r.user.username, "avatar": r.user.avatar},
                created_at=r.created_at,
            )
            for r in reviews
        ],
        meta=PageMeta(page=page, per_page=per_page, total=total, pages=pages).model_dump(),
    )
