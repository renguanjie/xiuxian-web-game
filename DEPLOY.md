# Docker 部署文档

## 架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Nginx     │────▶│  FastAPI     │────▶│ PostgreSQL  │
│   (前端)    │     │  (后端 :8000)│     │   (Neon)    │
│   (:80)     │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
     │                      │
     │ 代理 /api/* ─────────┘
     │ 代理 /games/* ───────┘
```

## 目录结构

```
PythonWebGameProject/
├── docker-compose.yml          # Docker Compose 配置
├── nginx.conf                  # Nginx 配置
├── Dockerfile                  # 后端镜像
├── requirements.txt            # Python 依赖
├── main.py                     # FastAPI 应用入口
├── models/                     # SQLAlchemy 模型
├── routers/                    # API 路由
├── services/                   # 业务逻辑
├── schemas/                    # Pydantic 模型
├── utils/                      # 工具函数
├── alembic/                    # 数据库迁移
├── frontend/
│   ├── Dockerfile              # 前端构建镜像
│   └── src/
├── games/                      # 游戏静态文件
└── .env.example                # 环境变量模板
```

## 快速部署

### 1. 准备环境变量

```bash
cp .env.example .env
# 编辑 .env，修改 DATABASE_URL 和 SECRET_KEY
```

### 2. 生成 SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. 一键部署

```bash
docker compose up -d --build
```

### 4. 初始化数据库

```bash
docker compose exec backend python seed.py
```

### 5. 访问

- 前端: http://localhost
- API: http://localhost/api
- API 文档: http://localhost/docs

## 配置文件说明

### Docker Compose 服务列表

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| backend | 本地构建 | 8000 (仅内网) | FastAPI 后端 |
| frontend | nginx:alpine | 80 | Nginx 静态服务 + 反向代理 |

> 数据库使用 Neon Serverless PostgreSQL（外部服务），无需本地数据库容器。

### Nginx 代理规则

| 路径 | 转发目标 | 说明 |
|------|----------|------|
| `/` | 前端静态文件 | Vue SPA |
| `/api/*` | http://backend:8000 | API 请求 |
| `/games/*` | http://backend:8000 | 游戏静态文件 |
| `/docs` | http://backend:8000 | Swagger 文档 |

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | **必须配置** |
| `DB_SSL` | 是否为 asyncpg 连接启用 SSL | 生产建议 `true` |
| `INIT_DB_ON_STARTUP` | 应用启动时是否自动创建表 | Vercel 建议 `false` |
| `SECRET_KEY` | JWT 签名密钥 | **必须修改** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 访问令牌过期时间 | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 刷新令牌过期时间 | `30` |
| `TRUSTED_PROXY_IPS` | 可信反向代理 IP/CIDR 列表 | Docker 默认信任 bridge 网段 |
| `DEBUG` | 调试模式 | `false` |

### Vercel 环境变量

Vercel 不会读取本地 `.env` 文件。请在 Vercel Project Settings → Environment Variables 中至少配置：

```bash
SECRET_KEY=<python -c "import secrets; print(secrets.token_urlsafe(32))" 生成的值>
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<dbname>?sslmode=require
DB_SSL=true
INIT_DB_ON_STARTUP=false
```

如果日志里的 `config.py` 行号仍显示 `settings = get_settings()` 在 59 行附近，说明 Vercel 部署的不是当前 `origin/main`。请在 Vercel Deployments 中选择最新提交重新部署，或执行一次清缓存重新部署。

## 数据库

### Neon Serverless PostgreSQL

本项目默认使用 [Neon](https://neon.tech/) Serverless PostgreSQL。

连接字符串格式:
```
postgresql+asyncpg://<user>:<password>@<host>.neon.tech/<dbname>?sslmode=require
```

**注意事项:**
- 使用直连端点（非 `-pooler` 端点），避免预编译语句缓存导致索引误报
- 设置 `DB_SSL=true`；如果连接字符串保留 `sslmode=require`，程序会转换为 asyncpg 支持的 SSL 参数
- `pool_pre_ping=True` 已配置以处理空闲连接断开
- 本地开发时可使用任意 PostgreSQL 实例，修改 `.env` 中的 `DATABASE_URL` 即可

### 本地 PostgreSQL

```bash
# 启动本地 PostgreSQL
docker run -d --name postgres -e POSTGRES_PASSWORD=xiuxian -p 5432:5432 postgres:16

# 创建数据库
docker exec postgres psql -U postgres -c "CREATE DATABASE xiuxian_games;"

# 更新 .env
DATABASE_URL="postgresql+asyncpg://postgres:xiuxian@localhost:5432/xiuxian_games"
DB_SSL=false
```

## 生产环境注意事项

### 安全加固

1. **修改所有默认凭证** - SECRET_KEY、数据库密码
2. **启用 HTTPS** - 使用 Let's Encrypt 或商业证书
3. **配置防火墙** - 仅开放 80/443 端口
4. **设置 Nginx 速率限制** - 防止 DDoS
5. **定期备份数据库** - 使用 `pg_dump` 或 Neon 内置备份

### 性能优化

1. **Nginx 开启 Gzip**
2. **静态文件缓存** - `Cache-Control: public, max-age=31536000`
3. **数据库连接池** - 默认 `pool_size=10, max_overflow=20`
4. **启用 Nginx HTTP/2**
5. **配置 Redis 缓存**（可选）

### 日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看单个服务日志
docker compose logs -f backend
docker compose logs -f frontend
```

## 常见问题

### Q: 后端启动失败
```bash
docker compose logs backend
# 检查 DATABASE_URL 和 SECRET_KEY
```

### Q: 前端页面空白
```bash
docker compose logs frontend
# 检查 Nginx 配置和后端连接
```

### Q: 数据库连接失败
```bash
# 检查 .env 中 DATABASE_URL 是否正确
# 确认网络连接和 SSL 配置
```

### Q: 如何更新代码
```bash
git pull
docker compose up -d --build backend
```

### Q: 如何备份数据库 (Neon)
Neon 支持时间旅行恢复，也可手动导出:
```bash
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql
```

### Q: 如何恢复数据库
```bash
psql "$DATABASE_URL" < backup_20260521.sql
```
