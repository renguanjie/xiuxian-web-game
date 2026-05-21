"""认证相关 Pydantic 模型"""
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
import re


class RegisterRequest(BaseModel):
    """注册请求"""
    username: str = Field(..., min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9_\u4e00-\u9fff]+$', v):
            raise ValueError("用户名只能包含字母、数字、下划线和中文")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v) and not re.search(r'[a-z]', v):
            raise ValueError("密码必须包含字母")
        if not re.search(r'[0-9]', v):
            raise ValueError("密码必须包含数字")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("两次密码输入不一致")
        return self


class LoginRequest(BaseModel):
    """登录请求 (支持 username 或 email)"""
    username: str = Field(..., min_length=1, max_length=128)
    password: str


class TokenResponse(BaseModel):
    """令牌响应"""
    user: dict
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    """刷新令牌请求"""
    refresh_token: str
