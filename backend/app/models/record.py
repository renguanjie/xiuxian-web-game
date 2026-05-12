"""用户统计 & 游戏记录模型"""
from sqlalchemy import Column, Integer, BigInteger, SmallInteger, String, JSON, TIMESTAMP, Index, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class UserStats(Base):
    """用户游戏统计 (物化统计)"""
    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_games = Column(Integer, nullable=False, default=0)
    total_duration = Column(Integer, nullable=False, default=0)
    best_score = Column(BigInteger, nullable=False, default=0)
    favorite_game_id = Column(Integer, ForeignKey("games.id", ondelete="SET NULL"), nullable=True)
    current_streak = Column(Integer, nullable=False, default=0)
    longest_streak = Column(Integer, nullable=False, default=0)
    last_played = Column(TIMESTAMP, nullable=True)
    updated_at = Column(TIMESTAMP, nullable=False, server_default="CURRENT_TIMESTAMP")

    user = relationship("User", back_populates="stats")


class GameRecord(Base):
    """游戏游玩记录"""
    __tablename__ = "game_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    score = Column(BigInteger, nullable=False, default=0)
    duration = Column(Integer, nullable=False, default=0)
    extra_data = Column("metadata", JSON, nullable=False, default=dict)
    is_new_record = Column(SmallInteger, nullable=False, default=0)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    played_at = Column(TIMESTAMP, nullable=False, server_default="CURRENT_TIMESTAMP")

    __table_args__ = (
        Index("idx_user_game", "user_id", "game_id"),
        Index("idx_game_score", "game_id", "score"),
        Index("idx_played_at", "played_at"),
        Index("idx_user_recent", "user_id", "played_at"),
    )
