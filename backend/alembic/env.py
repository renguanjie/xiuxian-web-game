"""Alembic 环境配置 - 异步模式"""
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from alembic import context

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.config import settings
from app.database import Base, engine

# 导入所有模型以确保 metadata 包含所有表
from app.models import role, user, game, record, achievement  # noqa: F401

config = context.config

if config.config_ini_section is not None:
    # 覆盖 alembic.ini 中的 sqlalchemy.url，统一从 .env 读取
    config.set_main_option("sqlalchemy.url", settings.async_database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式迁移"""
    url = settings.async_database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """异步模式迁移"""
    # 复用主应用的引擎配置，确保与 .env 一致
    connectable = engine
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)


def run_migrations_online() -> None:
    """在线模式迁移"""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
