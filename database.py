"""数据库连接 - SQLAlchemy Async Engine (PostgreSQL)"""
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from config import settings


def build_connect_config(raw_url: str, db_ssl: bool):
    """把通用 PostgreSQL URL 转换成 asyncpg 可接受的 URL 和连接参数"""
    url = make_url(raw_url)
    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+asyncpg")
    query = dict(url.query)
    sslmode = query.pop("sslmode", None)
    ssl = query.pop("ssl", None)

    connect_args = {}
    if db_ssl or sslmode in {"require", "verify-ca", "verify-full"} or ssl in {"true", "1", "require"}:
        connect_args["ssl"] = "require"

    return url.set(query=query), connect_args


# 异步引擎
database_url, connect_args = build_connect_config(settings.async_database_url, settings.DB_SSL)

engine = create_async_engine(
    database_url,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args=connect_args,
)

# 异步会话工厂
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# 模型基类
class Base(DeclarativeBase):
    pass


async def init_db():
    """初始化数据库 (创建所有表)"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """依赖注入: 获取数据库会话"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
