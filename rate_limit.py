"""速率限制配置 - 支持可信反向代理 X-Forwarded-For"""
from ipaddress import ip_address, ip_network

from slowapi import Limiter

from config import settings


def _is_trusted_proxy(host: str | None) -> bool:
    if not host:
        return False
    try:
        client_ip = ip_address(host)
    except ValueError:
        return False

    for proxy in settings.TRUSTED_PROXY_IPS:
        try:
            if client_ip in ip_network(proxy, strict=False):
                return True
        except ValueError:
            continue
    return False


def get_real_ip(request):
    """获取真实客户端 IP，仅信任来自可信代理的转发头"""
    client_host = request.client.host if request.client else None
    if _is_trusted_proxy(client_host):
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
    return client_host or "unknown"


limiter = Limiter(key_func=get_real_ip)
