"""用户路由 - 个人信息获取/更新"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserPublic, UserUpdate
from app.schemas.common import ApiResponse
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=ApiResponse[UserPublic])
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户信息"""
    service = UserService(db)
    user_data = await service.get_user_profile(current_user)
    return ApiResponse(data=user_data)


@router.patch("/me", response_model=ApiResponse[UserPublic])
async def update_me(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新个人信息"""
    service = UserService(db)
    updated = await service.update_profile(current_user, req)
    return ApiResponse(data=updated, message="个人信息已更新")
