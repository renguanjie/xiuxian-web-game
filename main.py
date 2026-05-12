#!/usr/bin/env python3
"""修仙游戏平台 - 开发启动脚本"""
import subprocess
import sys
import os

def start_backend():
    """启动 FastAPI 后端"""
    os.chdir("backend")
    print("Starting backend on http://localhost:8000")
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "app.main:app", "--reload", "--port", "8000"
    ])

def start_frontend():
    """启动 Vite 前端"""
    os.chdir("frontend")
    print("Starting frontend on http://localhost:5173")
    subprocess.run(["npm", "run", "dev"])

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "frontend":
        start_frontend()
    else:
        start_backend()
