"""记录 & 排行榜 Pydantic 模型"""
import json
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

# metadata 最大 4KB
METADATA_MAX_BYTES = 4096


class RecordSubmit(BaseModel):
    """提交游戏记录请求"""
    game_id: int
    score: int = Field(..., ge=0, le=999999999)
    duration: int = Field(..., ge=0, le=86400, description="游玩时长(秒)")
    metadata: dict = Field(default_factory=dict)

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, v: dict) -> dict:
        if len(json.dumps(v, ensure_ascii=False)) > METADATA_MAX_BYTES:
            raise ValueError(f"metadata 不能超过 {METADATA_MAX_BYTES} 字节")
        return v


class RecordSubmitResponse(BaseModel):
    """提交记录响应"""
    record_id: int
    score: int
    is_new_record: bool = False
    rank: Optional[int] = None


class LeaderboardEntry(BaseModel):
    """排行榜条目"""
    rank: int
    user: dict
    best_score: int
    play_count: int
    last_played: Optional[datetime] = None


class LeaderboardOut(BaseModel):
    """排行榜输出"""
    game: dict
    period: str = "all"
    leaderboard: List[LeaderboardEntry]
