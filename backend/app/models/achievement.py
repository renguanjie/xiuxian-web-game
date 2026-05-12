"""成就模型"""
from sqlalchemy import Column, Integer, String, JSON, SmallInteger, TIMESTAMP, Index, ForeignKey, DECIMAL, Enum
from sqlalchemy.orm import relationship

from app.database import Base


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
    rarity = Column(Enum("common", "uncommon", "rare", "epic", "legendary"), nullable=False, default="common")
    is_active = Column(SmallInteger, nullable=False, default=1)
    created_at = Column(TIMESTAMP, nullable=False, server_default="CURRENT_TIMESTAMP")

    __table_args__ = (
        Index("idx_category", "category"),
        Index("idx_rarity", "rarity"),
        Index("idx_active", "is_active"),
    )


class AchievementUnlocked(Base):
    """用户已解锁成就"""
    __tablename__ = "achievements_unlocked"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(TIMESTAMP, nullable=False, server_default="CURRENT_TIMESTAMP")
    progress = Column(DECIMAL(5, 2), nullable=False, default=100.00, comment="完成百分比")

    __table_args__ = (
        Index("uk_user_achievement", "user_id", "achievement_id", unique=True),
        Index("idx_user", "user_id"),
    )
