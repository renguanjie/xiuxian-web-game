"""配置管理 - 使用 pydantic-settings 加载环境变量"""
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""

    # 应用
    APP_NAME: str = "修仙游戏平台"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-to-a-long-random-string"

    # 数据库
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "xiuxian_games"
    DATABASE_URL: Optional[str] = None

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    JWT_ALGORITHM: str = "HS256"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5103", "http://localhost:3000"]

    model_config = {
        "env_file": str(Path(__file__).resolve().parent.parent / ".env"),
        "env_file_encoding": "utf-8",
    }

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        if not self.DEBUG and self.SECRET_KEY == "change-me-to-a-long-random-string":
            raise ValueError(
                "SECRET_KEY 必须设置为一个安全的随机字符串。"
                "请使用 python -c 'import secrets; print(secrets.token_urlsafe(32))' 生成。"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
