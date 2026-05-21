"""JWT 工具 - 生成与验证"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from config import settings

ALGORITHM = settings.JWT_ALGORITHM
SECRET_KEY = settings.SECRET_KEY
ACCESS_EXPIRE = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
REFRESH_EXPIRE = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """生成 Access Token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or ACCESS_EXPIRE)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """生成 Refresh Token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + REFRESH_EXPIRE
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """解码 JWT Token，失败返回 None"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
