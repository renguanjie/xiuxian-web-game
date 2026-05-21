"""刷新令牌模型"""
from sqlalchemy import Column, Integer, BigInteger, String, TIMESTAMP, Index, ForeignKey, func
from sqlalchemy.orm import relationship

from database import Base


class RefreshToken(Base):
    """刷新令牌"""
    __tablename__ = "refresh_tokens"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(128), unique=True, nullable=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    is_revoked = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    user = relationship("User", lazy="selectin")

    __table_args__ = (
        Index("idx_user_active", "user_id", "is_revoked"),
        Index("idx_expires", "expires_at"),
    )
