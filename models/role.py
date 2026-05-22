"""用户角色模型"""
from sqlalchemy import Column, Integer, String, JSON, TIMESTAMP, Index, func
from sqlalchemy.orm import relationship

from database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(32), unique=True, nullable=False, comment="角色名")
    display_name = Column(String(64), nullable=False, comment="显示名称")
    description = Column(String(256), default="", comment="角色描述")
    permissions = Column(JSON, default=list, comment="权限列表")
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="role")

    __table_args__ = (Index("idx_role_name", "name"),)
