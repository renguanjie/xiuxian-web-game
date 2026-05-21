# 修仙游戏平台 (Xiuxian Games Platform)

修仙主题 HTML5 游戏平台 MVP

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus + Tailwind CSS + Pinia + Vue Router
- **后端**: FastAPI + SQLAlchemy 2.0 (Async) + Pydantic v2
- **数据库**: PostgreSQL (asyncpg 驱动)

## 游戏列表

| 游戏 | 目录 | 分类 |
|------|------|------|
| 修仙幸存者 | `cultivation-survivors/` | survival |
| 修仙塔防 | `cultivation-tower-defense/` | tower-defense |
| 修仙贪吃蛇 | `cultivation-snake/` | snake |
| 仙剑射击 | `xianjian-shooter/` | shooter |

## 快速开始

### 1. 环境要求

- Python 3.9+
- Node.js 16+
- PostgreSQL

### 2. 初始化

```bash
# 一键初始化（创建数据库、安装依赖、初始化种子数据）
./setup.sh
```

### 3. 启动

```bash
# 同时启动前后端
python dev.py

# 仅启动后端
python dev.py backend

# 仅启动前端
python dev.py frontend
```

### 4. 访问

- 前端: http://localhost:5103
- API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 项目结构

```
PythonWebGameProject/
├── main.py                     # FastAPI 应用入口
├── dev.py                      # 开发启动脚本 (并发前后端)
├── config.py                   # 配置 (从 .env 加载)
├── database.py                 # 数据库连接 (asyncpg)
├── dependencies.py             # 依赖注入
├── rate_limit.py               # 速率限制
├── seed.py                     # 种子数据脚本
├── rebuild_db.py               # 重建数据库脚本
├── init.sql                    # 数据库初始化 SQL
├── requirements.txt            # Python 依赖
├── models/                     # SQLAlchemy 模型定义
├── routers/                    # API 路由 (auth, games, users, records, leaderboards, reviews)
├── services/                   # 业务逻辑
├── schemas/                    # Pydantic 请求/响应模型
├── utils/                      # 工具函数 (jwt, password, token_hash)
├── middleware/                 # 中间件 (安全、限流)
├── exceptions/                 # 异常处理
├── alembic/                    # 数据库迁移
├── frontend/                   # Vue 3 前端
│   ├── src/
│   │   ├── api/                # Axios 实例与 API 调用
│   │   ├── components/
│   │   │   ├── game/           # 游戏卡片、网格、播放器
│   │   │   ├── layout/         # 头部、底部布局
│   │   │   └── common/         # 全局组件 (AuthModal 等)
│   │   ├── stores/             # Pinia 状态管理 (auth, games, modal)
│   │   ├── router/             # Vue Router + 导航守卫
│   │   └── views/              # 页面 (登录、注册、游戏大厅、游戏详情、排行榜)
│   └── vite.config.ts          # Vite 配置 (含 /api 和 /games 代理)
├── games/                      # HTML5 游戏静态文件
│   ├── cultivation-snake/
│   ├── cultivation-survivors/
│   ├── cultivation-tower-defense/
│   └── xianjian-shooter/
├── .env                        # 环境变量
└── setup.sh                    # 一键初始化脚本
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql+asyncpg://...` |
| `SECRET_KEY` | JWT 签名密钥 | 开发环境默认值 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 访问令牌过期时间 | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 刷新令牌过期时间 | `30` |
| `DEBUG` | 调试模式 | `false` |

## 数据库

使用 PostgreSQL 异步连接 (asyncpg + SQLAlchemy 2.0 async)。

连接池配置: `pool_size=10, max_overflow=20, pool_recycle=3600, pool_pre_ping=True`

### Neon Serverless PostgreSQL

如果使用 Neon，注意：
- 使用直连端点（非 `-pooler` 端点）避免预编译语句缓存问题
- `pool_pre_ping=True` 已配置以处理空闲连接断开

### 初始化表结构

```bash
# 方式一：运行 init.sql
psql $DATABASE_URL -f init.sql

# 方式二：使用 SQLAlchemy create_all
python rebuild_db.py
```

## 注意事项

- 密码要求：至少 8 位，同时包含字母和数字
- 开发模式下游戏文件由 FastAPI `StaticFiles` 静态服务
- 生产环境需 `vite build` 后由 Nginx 代理 `/api` 和 `/games` 路径
