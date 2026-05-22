"""游戏评论模型"""
from sqlalchemy import Column, Integer, BigInteger, String, Text, TIMESTAMP, Index, ForeignKey, func
from sqlalchemy.orm import relationship

from database import Base


class GameReview(Base):
    """游戏评论"""
    __tablename__ = "game_reviews"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False, comment="评论内容")
    rating = Column(Integer, nullable=False, default=5, comment="评分 1-5")
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("idx_game_review_game_created", "game_id", "created_at"),
        Index("idx_game_review_user_game", "user_id", "game_id"),
    )
