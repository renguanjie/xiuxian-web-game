"""数据库连接 - SQLAlchemy Async Engine"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# 异步引擎
engine = create_async_engine(
    settings.async_database_url,
    echo=False,  # 始终关闭 SQL 日志，防止敏感数据泄露
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True,
)

# 异步会话工厂
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# 模型基类
class Base(DeclarativeBase):
    pass


# 需要 ON UPDATE CURRENT_TIMESTAMP 的表
_ON_UPDATE_TABLES = ["users", "games", "roles", "user_stats", "game_reviews"]


async def init_db():
    """初始化数据库 (创建所有表)"""
    async with engine.begin() as conn:
        # 先创建 game_reviews 表 (需要 UNSIGNED 类型，SQLAlchemy Integer 不兼容)
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS game_reviews (
                id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id     INT UNSIGNED NOT NULL,
                game_id     INT UNSIGNED NOT NULL,
                content     TEXT NOT NULL COMMENT '评论内容',
                rating      TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '评分 1-5',
                created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_review_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                INDEX idx_game_created (game_id, created_at),
                INDEX idx_user_game (user_id, game_id)
            ) ENGINE=InnoDB COMMENT='游戏评论'
        """))

        await conn.run_sync(Base.metadata.create_all)

        # MySQL TIMESTAMP 默认不会自动 ON UPDATE，需要手动添加
        for table in _ON_UPDATE_TABLES:
            await conn.execute(text(
                f"ALTER TABLE `{table}` MODIFY updated_at TIMESTAMP "
                "NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
            ))


async def get_db() -> AsyncSession:
    """依赖注入: 获取数据库会话"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
