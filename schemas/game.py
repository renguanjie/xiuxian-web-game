"""游戏相关 Pydantic 模型"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GameOut(BaseModel):
    """游戏列表输出"""
    id: int
    name: str
    slug: str
    thumbnail: str
    category: str
    tags: List[str] = []
    play_count: int = 0
    avg_score: float = 0.0
    status: str = "active"
    description: Optional[str] = None


class GameDetail(GameOut):
    """游戏详情输出"""
    description: str
    banner: Optional[str] = None
    path: str
    version: str = "1.0.0"
    max_score: int = 0
    created_at: Optional[datetime] = None
