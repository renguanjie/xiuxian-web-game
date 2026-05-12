# 修仙游戏平台 (Xiuxian Games Platform)

修仙主题 HTML5 游戏平台 MVP

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus + Tailwind CSS + Pinia + Vue Router
- **后端**: FastAPI + SQLAlchemy 2.0 (Async) + Pydantic v2
- **数据库**: MySQL 8.0

## 游戏列表

| 游戏 | 目录 | 分类 |
|------|------|------|
| 修仙幸存者 | `cultivation-survivors/` | survival |
| 修仙塔防 | `cultivation-tower-defense/` | tower-defense |
| 修仙贪吃蛇 | `cultivation-snake/` | snake |
| 仙剑射击 | `xianjian-shooter/` | shooter |

## 快速开始

### 方式一：Docker 部署（推荐生产环境）

详见 [DEPLOY.md](DEPLOY.md)

```bash
cp .env.example .env
# 编辑 .env 修改 SECRET_KEY
docker compose up -d --build
docker compose exec backend python seed.py
```

### 方式二：本地开发

### 1. 环境要求

- Python 3.9+
- Node.js 16+
- MySQL 8.0

### 2. 初始化

```bash
# 一键初始化（创建数据库、安装依赖、初始化种子数据）
./setup.sh
```

### 3. 启动后端

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8100
```

### 4. 启动前端

```bash
cd frontend
npm run dev
```

### 5. 访问

- 前端: http://localhost:5103
- API: http://localhost:8100
- API 文档: http://localhost:8100/api/docs

## 项目结构

```
PythonWebGameProject/
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── models/             # SQLAlchemy 模型定义
│   │   ├── routers/            # API 路由 (auth, games, users, records, leaderboards)
│   │   ├── services/           # 业务逻辑
│   │   ├── schemas/            # Pydantic 请求/响应模型
│   │   ├── utils/              # 工具函数 (jwt, password)
│   │   ├── database.py         # 数据库连接与初始化
│   │   ├── config.py           # 配置 (从 .env 加载)
│   │   ├── main.py             # FastAPI 应用入口
│   │   └── exceptions/         # 全局异常处理
│   ├── seed.py                 # 种子数据脚本
│   ├── init.sql                # 数据库初始化 SQL
│   └── requirements.txt
├── frontend/                   # Vue 3 前端
│   ├── src/
│   │   ├── api/                # Axios 实例与 API 调用
│   │   ├── components/
│   │   │   ├── game/           # 游戏卡片、网格、播放器
│   │   │   └── layout/         # 头部、底部布局
│   │   ├── stores/             # Pinia 状态管理 (auth, games)
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
| `SECRET_KEY` | JWT 签名密钥 | 开发环境默认值 |
| `DB_HOST` / `DB_PORT` | MySQL 地址 | `localhost:3306` |
| `DB_USER` / `DB_PASSWORD` | MySQL 账号密码 | `root` / `root` |
| `DB_NAME` | 数据库名 | `xiuxian_games` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 访问令牌过期时间 | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 刷新令牌过期时间 | `30` |

## 注意事项

- 密码要求：至少 8 位，同时包含字母和数字
- 开发模式下游戏文件由 FastAPI `StaticFiles` 静态服务
- 生产环境需 `vite build` 后由 Nginx 代理 `/api` 和 `/games` 路径
