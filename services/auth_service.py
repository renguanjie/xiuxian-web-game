"""认证业务逻辑"""
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.user import User
from models.role import Role
from utils.password import hash_password, verify_password
from utils.jwt import create_access_token, create_refresh_token, decode_token


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, username: str, email: str, password: str, ip_address: str) -> dict:
        """用户注册"""
        existing = await self.db.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="用户名已存在")

        existing = await self.db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="邮箱已被注册")

        role_result = await self.db.execute(select(Role).where(Role.name == "player"))
        role = role_result.scalar_one_or_none()
        if not role:
            raise HTTPException(status_code=500, detail="系统角色配置异常，请联系管理员")

        last_login = datetime.utcnow()
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role_id=role.id,
            last_login=last_login,
            last_login_ip=ip_address,
        )
        self.db.add(user)
        await self.db.flush()

        tokens = self._generate_tokens(user)
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": role.name if role else "player",
            },
            **tokens,
        }

    async def login(self, username: str, password: str, ip_address: str) -> dict:
        """用户登录 (支持 username 或 email)"""
        stmt = select(User).where(
            (User.username == username) | (User.email == username)
        )
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="用户名或密码错误")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="账号已封禁")

        user.last_login = datetime.utcnow()
        user.last_login_ip = ip_address
        await self.db.flush()

        tokens = self._generate_tokens(user)
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "avatar": user.avatar,
                "role": user.role.name if user.role else "player",
            },
            **tokens,
        }

    async def refresh(self, refresh_token: str, ip_address: str) -> dict:
        """刷新访问令牌"""
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="无效的刷新令牌")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="令牌数据无效")

        result = await self.db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="用户不存在或已封禁")

        tokens = self._generate_tokens(user)
        return {
            "user": {
                "id": user.id,
                "username": user.username,
                "avatar": user.avatar,
                "role": user.role.name if user.role else "player",
            },
            **tokens,
        }

    def _generate_tokens(self, user: User) -> dict:
        """为用户生成 JWT 令牌对"""
        access_token = create_access_token({"sub": str(user.id), "role": user.role.name if user.role else "player"})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }
