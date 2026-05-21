"""密码工具 - Bcrypt 哈希与验证"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """对密码进行 Bcrypt 哈希 (cost=12)"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码是否匹配哈希"""
    return pwd_context.verify(plain_password, hashed_password)
