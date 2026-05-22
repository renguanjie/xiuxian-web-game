"""通用 API 响应与分页模型"""
from typing import Generic, TypeVar, Optional
from pydantic import BaseModel


T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应格式"""
    code: int = 0
    message: str = "success"
    data: Optional[T] = None
    meta: Optional[dict] = None


class PageMeta(BaseModel):
    """分页元数据"""
    page: int = 1
    per_page: int = 20
    total: int = 0
    pages: int = 0


class ErrorResponse(BaseModel):
    """错误响应格式"""
    code: int
    message: str
    details: Optional[dict] = None


class ErrorCodes:
    """错误码常量"""
    SUCCESS = 0
    BAD_REQUEST = 4000
    USERNAME_EXISTS = 4001
    EMAIL_EXISTS = 4002
    WEAK_PASSWORD = 4003
    PASSWORD_MISMATCH = 4004
    UNAUTHORIZED = 4010
    TOKEN_EXPIRED = 4011
    TOKEN_INVALID = 4012
    ACCOUNT_BANNED = 4013
    FORBIDDEN = 4030
    NOT_FOUND = 4040
    CONFLICT = 4090
    RATE_LIMITED = 4290
    SERVER_ERROR = 5000
