"""用户业务逻辑"""
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.user import UserPublic, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_profile(self, user: User) -> UserPublic:
        """获取用户公开信息"""
        return UserPublic(
            id=user.id,
            username=user.username,
            email=user.email,
            avatar=user.avatar,
            bio=user.bio,
            role=user.role.name if user.role else "player",
            created_at=user.created_at,
        )

    async def update_profile(self, user: User, data: UserUpdate) -> UserPublic:
        """更新用户资料"""
        if data.bio is not None:
            user.bio = data.bio
        if data.avatar is not None:
            user.avatar = data.avatar
        await self.db.flush()
        return await self.get_user_profile(user)
