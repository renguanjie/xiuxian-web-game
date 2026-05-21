"""游戏评论 Pydantic 模型"""
from pydantic import BaseModel, Field
from datetime import datetime


class ReviewCreate(BaseModel):
    """创建评论请求"""
    content: str = Field(..., min_length=1, max_length=500, description="评论内容")
    rating: int = Field(5, ge=1, le=5, description="评分 1-5")


class ReviewOut(BaseModel):
    """评论输出"""
    id: int
    content: str
    rating: int
    user: dict
    created_at: datetime

    class Config:
        from_attributes = True
