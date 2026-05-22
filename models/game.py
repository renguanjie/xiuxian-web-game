"""游戏模型"""
from sqlalchemy import Column, Integer, String, Text, JSON, Float, TIMESTAMP, Index, func
from database import Base


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False, comment="游戏名称")
    slug = Column(String(64), unique=True, nullable=False, comment="URL友好标识")
    description = Column(Text, nullable=False, comment="游戏描述")
    thumbnail = Column(String(512), nullable=False, comment="缩略图URL")
    banner = Column(String(512), nullable=True, comment="横幅图URL")
    path = Column(String(512), nullable=False, comment="游戏入口路径")
    category = Column(String(32), nullable=False, default="survival", comment="分类")
    tags = Column(JSON, nullable=False, default=list, comment="标签列表")
    status = Column(String(16), nullable=False, default="active", comment="状态")
    sort_order = Column(Integer, nullable=False, default=0, comment="排序权重")
    play_count = Column(Integer, nullable=False, default=0, comment="总游玩次数")
    avg_score = Column(Float, nullable=False, default=0.0, comment="平均分数")
    max_score = Column(Integer, nullable=False, default=0, comment="最高分")
    version = Column(String(16), nullable=False, default="1.0.0", comment="版本号")
    config = Column(JSON, nullable=False, default=dict, comment="游戏配置")
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_game_slug", "slug"),
        Index("idx_game_category", "category"),
        Index("idx_game_status", "status"),
        Index("idx_game_sort_order", "sort_order"),
        Index("idx_game_play_count", "play_count"),
    )
