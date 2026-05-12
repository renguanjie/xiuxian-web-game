"""用户相关 Pydantic 模型"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class UserPublic(BaseModel):
    """公开用户信息"""
    id: int
    username: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    role: Optional[str] = None
    created_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    """更新个人信息"""
    bio: Optional[str] = Field(None, max_length=512)
    avatar: Optional[str] = Field(None, max_length=512)

    @field_validator("avatar")
    @classmethod
    def validate_avatar_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith(("http://", "https://", "/")):
            raise ValueError("头像 URL 必须以 http://、https:// 或 / 开头")
        return v
