#!/bin/bash
# 修仙游戏平台 - 环境初始化
# 用法: chmod +x setup.sh && ./setup.sh
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== 修仙游戏平台 - 环境初始化 ==="

# 1. 初始化数据库
echo ""
echo "[1/4] 初始化数据库..."
if [ -f "init.sql" ]; then
    if grep -q "neon.tech" .env 2>/dev/null; then
        echo "检测到 Neon PostgreSQL 配置，跳过本地建库 (Neon 自动建库)"
    else
        PGPASSWORD="${DB_PASSWORD:-xiuxian}" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME:-xiuxian_games}'" | grep -q 1 || \
        PGPASSWORD="${DB_PASSWORD:-xiuxian}" createdb -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" "${DB_NAME:-xiuxian_games}" 2>/dev/null || {
            echo "PostgreSQL 未运行或连接失败"
            echo "请确保 PostgreSQL 已启动，或检查 .env 中 DATABASE_URL"
            exit 1
        }
    fi
fi

# 2. 执行建表脚本
echo "[2/4] 执行建表脚本..."
if [ -f "init.sql" ]; then
    python rebuild_db.py
fi
echo "数据库初始化完成"

# 3. 安装后端依赖
echo ""
echo "[3/4] 安装后端依赖..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet
echo "后端依赖安装完成"

# 4. 安装前端依赖
echo ""
echo "[4/4] 安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "前端依赖安装完成"
cd "$PROJECT_DIR"

echo ""
echo "=== 环境初始化完成 ==="
echo ""
echo "启动方式:"
echo "  同时启动: python dev.py"
echo "  仅后端:   python dev.py backend"
echo "  仅前端:   python dev.py frontend"
echo ""
echo "访问地址:"
echo "  前端: http://localhost:5103"
echo "  API:  http://localhost:8000"
echo "  文档: http://localhost:8000/api/docs"
