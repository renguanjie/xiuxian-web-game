"""配置管理 - 使用 pydantic-settings 加载环境变量"""
from pathlib import Path
import secrets
import warnings

from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List, Optional
from functools import lru_cache


DEFAULT_SECRET_KEY = "change-me-to-a-long-random-string"


class Settings(BaseSettings):
    """应用配置"""

    # 应用
    APP_NAME: str = "修仙游戏平台"
    DEBUG: bool = False
    SECRET_KEY: str = DEFAULT_SECRET_KEY

    # 数据库
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "xiuxian_games"
    DATABASE_URL: Optional[str] = None
    DB_SSL: bool = False
    INIT_DB_ON_STARTUP: bool = False

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

    # 反向代理。只有来自这些代理的 X-Forwarded-For / X-Real-IP 才会被信任
    TRUSTED_PROXY_IPS: List[str] = ["127.0.0.1", "::1"]

    model_config = {
        "env_file": str(Path(__file__).resolve().parent / ".env"),
        "env_file_encoding": "utf-8",
    }

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        if self.SECRET_KEY == DEFAULT_SECRET_KEY:
            self.SECRET_KEY = secrets.token_urlsafe(32)
            if not self.DEBUG:
                warnings.warn(
                    "SECRET_KEY 未设置，已生成临时运行时密钥。"
                    "生产环境请在部署平台环境变量中设置稳定的 SECRET_KEY，"
                    "否则服务重启后旧 JWT 会失效。",
                    RuntimeWarning,
                    stacklevel=2,
                )
        elif len(self.SECRET_KEY) < 32:
            raise ValueError(
                "SECRET_KEY 长度不能少于 32 个字符。"
                "请使用 python -c 'import secrets; print(secrets.token_urlsafe(32))' 生成。"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
