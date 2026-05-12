"""用户模型"""
from sqlalchemy import Column, Integer, String, SmallInteger, TIMESTAMP, Index, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(32), unique=True, nullable=False, comment="用户名")
    email = Column(String(128), unique=True, nullable=False, comment="邮箱")
    password_hash = Column(String(255), nullable=False, comment="bcrypt 哈希")
    role_id = Column(Integer, ForeignKey("roles.id", onupdate="CASCADE"), nullable=False, default=3, comment="角色ID")
    avatar = Column(String(512), nullable=True, comment="头像URL")
    bio = Column(String(512), default="", comment="个人简介")
    is_active = Column(SmallInteger, nullable=False, default=1, comment="是否激活")
    last_login = Column(TIMESTAMP, nullable=True, comment="最后登录时间")
    last_login_ip = Column(String(45), nullable=True, comment="最后登录IP")
    email_verified = Column(SmallInteger, nullable=False, default=0, comment="邮箱验证")
    verification_token = Column(String(128), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default="CURRENT_TIMESTAMP")
    updated_at = Column(TIMESTAMP, nullable=False, server_default="CURRENT_TIMESTAMP")

    role = relationship("Role", back_populates="users", lazy="selectin")
    stats = relationship("UserStats", back_populates="user", uselist=False, lazy="selectin")

    __table_args__ = (
        Index("idx_email", "email"),
        Index("idx_role", "role_id"),
        Index("idx_active", "is_active"),
        Index("idx_username", "username"),
    )
