"""成就模型"""
from sqlalchemy import Column, Integer, String, JSON, Float, TIMESTAMP, Index, ForeignKey, func

from database import Base


class Achievement(Base):
    """成就定义"""
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(64), unique=True, nullable=False, comment="成就代码")
    name = Column(String(128), nullable=False, comment="成就名称")
    description = Column(String(256), nullable=False, comment="成就描述")
    icon = Column(String(512), nullable=False, comment="图标")
    category = Column(String(32), nullable=False, default="general", comment="分类")
    requirement = Column(JSON, nullable=False, comment="解锁条件")
    points = Column(Integer, nullable=False, default=0, comment="成就积分")
    rarity = Column(String(16), nullable=False, default="common")
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    __table_args__ = (
        Index("idx_achievement_category", "category"),
        Index("idx_achievement_rarity", "rarity"),
        Index("idx_achievement_active", "is_active"),
    )


class AchievementUnlocked(Base):
    """用户已解锁成就"""
    __tablename__ = "achievements_unlocked"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    progress = Column(Float, nullable=False, default=100.0, comment="完成百分比")

    __table_args__ = (
        Index("uk_achievement_unlock_user_achievement", "user_id", "achievement_id", unique=True),
        Index("idx_achievement_unlock_user", "user_id"),
    )
