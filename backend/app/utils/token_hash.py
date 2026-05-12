"""Token 哈希工具"""
import hashlib


def hash_token(token: str) -> str:
    """对 token 进行 SHA-256 哈希，用于安全存储"""
    return hashlib.sha256(token.encode()).hexdigest()
