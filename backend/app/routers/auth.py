"""认证路由 - 注册、登录、刷新令牌"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.schemas.common import ApiResponse, ErrorCodes
from app.services.auth_service import AuthService
from app.rate_limit import limiter

router = APIRouter()


@router.post("/register", response_model=ApiResponse[TokenResponse], status_code=201)
@limiter.limit("5/minute")
async def register(
    request: Request,
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """用户注册"""
    service = AuthService(db)
    result = await service.register(
        username=req.username,
        email=req.email,
        password=req.password,
        ip_address=request.client.host,
    )
    return ApiResponse(data=result, message="注册成功")


@router.post("/login", response_model=ApiResponse[TokenResponse])
@limiter.limit("10/minute")
async def login(
    request: Request,
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """用户登录 (支持 username 或 email)"""
    service = AuthService(db)
    result = await service.login(
        username=req.username,
        password=req.password,
        ip_address=request.client.host,
    )
    return ApiResponse(data=result)


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    req: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """刷新访问令牌"""
    service = AuthService(db)
    result = await service.refresh(
        refresh_token=req.refresh_token,
        ip_address=request.client.host,
    )
    return ApiResponse(data=result)
