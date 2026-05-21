"""速率限制配置 - 支持反向代理 X-Forwarded-For"""
from slowapi import Limiter


def get_real_ip(request):
    """获取真实客户端 IP，优先使用 X-Forwarded-For"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host


limiter = Limiter(key_func=get_real_ip)
