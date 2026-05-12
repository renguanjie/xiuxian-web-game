#!/bin/bash
# 修仙游戏平台 - 环境初始化脚本
# 用法: chmod +x setup.sh && ./setup.sh
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "🔧 修仙游戏平台 - 环境初始化"
echo "============================"

# 1. 创建数据库
echo ""
echo "📦 [1/5] 创建数据库..."
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS xiuxian_games DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;" 2>/dev/null || {
    echo "❌ MySQL 未运行或密码错误"
    echo "   请确保 MySQL 已启动，密码为 root"
    exit 1
}

# 2. 执行建表脚本
echo "📦 [2/5] 执行建表脚本..."
mysql -u root -proot xiuxian_games < backend/init.sql
echo "   ✅ 数据库初始化完成"

# 3. 安装后端依赖
echo ""
echo "🐍 [3/5] 安装后端依赖..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt --quiet
echo "   ✅ 后端依赖安装完成"
cd ..

# 4. 安装前端依赖
echo ""
echo "📦 [4/5] 安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "   ✅ 前端依赖安装完成"
cd ..

# 5. 运行种子数据
echo ""
echo "🌱 [5/5] 初始化种子数据..."
cd backend
source venv/bin/activate
python seed.py
echo "   ✅ 种子数据完成"
cd ..

echo ""
echo "============================"
echo "✅ 环境初始化完成！"
echo ""
echo "启动方式："
echo "  后端: cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "  前端: cd frontend && npm run dev"
echo ""
echo "访问地址："
echo "  前端: http://localhost:5173"
echo "  API:  http://localhost:8000"
echo "  文档: http://localhost:8000/api/docs"
