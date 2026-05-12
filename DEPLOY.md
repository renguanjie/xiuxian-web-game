# Docker 部署文档

## 架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Nginx     │────▶│  FastAPI     │────▶│   MySQL     │
│   (前端)    │     │  (后端 :8100)│     │   (:3306)   │
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
├── backend/
│   ├── Dockerfile              # 后端镜像
│   ├── requirements.txt
│   └── app/
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
# 编辑 .env，修改数据库密码和 SECRET_KEY
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
- API: http://localhost/api/v1
- API 文档: http://localhost/api/docs

## 配置文件说明

### Docker Compose 服务列表

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| mysql | mysql:8.0 | 3306 (仅内网) | 数据库 |
| backend | 本地构建 | 8100 (仅内网) | FastAPI 后端 |
| frontend | nginx:alpine | 80 | Nginx 静态服务 + 反向代理 |

### Nginx 代理规则

| 路径 | 转发目标 | 说明 |
|------|----------|------|
| `/` | 前端静态文件 | Vue SPA |
| `/api/*` | http://backend:8100 | API 请求 |
| `/games/*` | http://backend:8100 | 游戏静态文件 |
| `/api/docs` | http://backend:8100 | Swagger 文档 |

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | `xiuxian_root_2024` |
| `MYSQL_DATABASE` | 数据库名 | `xiuxian_games` |
| `DB_PASSWORD` | 后端数据库密码 | 同 `MYSQL_ROOT_PASSWORD` |
| `SECRET_KEY` | JWT 签名密钥 | **必须修改** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 访问令牌过期时间 | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 刷新令牌过期时间 | `30` |

## 生产环境注意事项

### 安全加固

1. **修改所有默认密码** - 数据库密码、SECRET_KEY
2. **启用 HTTPS** - 使用 Let's Encrypt 或商业证书
3. **配置防火墙** - 仅开放 80/443 端口
4. **设置 Nginx 速率限制** - 防止 DDoS
5. **定期备份数据库** - 使用 `docker compose exec mysql mysqldump`

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
docker compose logs -f mysql
```

## 常见问题

### Q: 后端启动失败
```bash
docker compose logs backend
# 检查数据库连接和 SECRET_KEY
```

### Q: 前端页面空白
```bash
docker compose logs frontend
# 检查 Nginx 配置和后端连接
```

### Q: 数据库连接失败
```bash
docker compose exec mysql mysql -u root -p
# 检查数据库是否创建，用户权限是否正确
```

### Q: 如何更新代码
```bash
git pull
docker compose up -d --build backend
```

### Q: 如何备份数据库
```bash
docker compose exec mysql mysqldump -u root -p xiuxian_games > backup_$(date +%Y%m%d).sql
```

### Q: 如何恢复数据库
```bash
docker compose exec -T mysql mysql -u root -p xiuxian_games < backup_20260512.sql
```
