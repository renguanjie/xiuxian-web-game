"""修仙游戏平台 - FastAPI 应用入口"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path
import os

from slowapi.errors import RateLimitExceeded

from config import settings
from database import engine, init_db
from exceptions.handlers import register_exception_handlers
from middleware.security import SecurityHeadersMiddleware
from rate_limit import limiter


# 游戏静态文件目录
GAMES_DIR = os.path.join(os.path.dirname(__file__), "games")

# 允许的静态文件扩展名
ALLOWED_STATIC_EXTENSIONS = {
    ".html", ".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg",
    ".woff", ".woff2", ".ico", ".json", ".wasm", ".webp", ".mp3", ".ogg",
}


class SecureStaticFiles(StaticFiles):
    """只允许提供特定扩展名的静态文件"""

    async def get_response(self, path: str, scope):
        if path and Path(path).suffix.lower() not in ALLOWED_STATIC_EXTENSIONS:
            return JSONResponse(status_code=403, content={"detail": "文件类型不允许"})
        return await super().get_response(path, scope)


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"code": 429, "message": "请求过于频繁，请稍后再试"},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    if settings.INIT_DB_ON_STARTUP:
        await init_db()
    yield
    await engine.dispose()


app = FastAPI(
    title="修仙游戏平台 API",
    description="修仙主题 HTML5 游戏平台后端 API",
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# 安全响应头中间件 (必须在 CORS 之前)
app.add_middleware(SecurityHeadersMiddleware)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# 速率限制
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)

# 全局异常处理
register_exception_handlers(app)

# 路由注册 (Phase 1)
from routers import auth, users, games, records, leaderboards, reviews  # noqa: E402

app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/v1/users", tags=["用户"])
app.include_router(games.router, prefix="/api/v1/games", tags=["游戏"])
app.include_router(records.router, prefix="/api/v1/records", tags=["记录"])
app.include_router(leaderboards.router, prefix="/api/v1/leaderboards", tags=["排行榜"])
app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["评论"])

# 静态文件服务 - 游戏 (仅限安全的扩展名)
if os.path.isdir(GAMES_DIR):
    app.mount("/static/games", SecureStaticFiles(directory=GAMES_DIR), name="games")


@app.get("/api/health", tags=["健康检查"])
async def health_check():
    return {"status": "ok", "service": settings.APP_NAME}
