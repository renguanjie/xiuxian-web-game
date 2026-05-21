"""清空并重建数据库表"""
import asyncio

from sqlalchemy import text
from database import engine


async def rebuild():
    """Drop all tables and recreate"""
    async with engine.begin() as conn:
        # First drop all indexes that might linger
        indexes = [
            "idx_category", "idx_rarity", "idx_active",
            "idx_slug", "idx_status", "idx_sort", "idx_play_count",
            "idx_email", "idx_role", "idx_username",
            "idx_gr_user_game", "idx_gr_game_score", "idx_gr_played_at", "idx_gr_user_recent",
            "idx_grv_game_created", "idx_grv_user_game",
            "idx_user_active", "idx_expires",
            "idx_name",
            "uk_user_achievement",
            "idx_user",
        ]
        for idx in indexes:
            await conn.execute(text(f"DROP INDEX IF EXISTS {idx}"))
        print("All indexes dropped")

        # Drop all tables
        tables = [
            "achievements_unlocked", "game_reviews", "game_records",
            "user_stats", "refresh_tokens", "achievements",
            "users", "games", "roles",
        ]
        for table in tables:
            await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
        print("All tables dropped")

    from database import Base
    from models import role, user, game, record, achievement, refresh_token, review  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("All tables created")


if __name__ == "__main__":
    asyncio.run(rebuild())
