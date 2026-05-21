#!/usr/bin/env python3
"""修仙游戏平台 - 开发启动脚本

用法:
    python main.py              同时启动前端和后端
    python main.py backend      仅启动后端
    python main.py frontend     仅启动前端
"""
import subprocess
import sys
import os
import signal

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))


def start_backend():
    """启动 FastAPI 后端"""
    os.chdir(os.path.join(PROJECT_DIR, "backend"))
    print("[Backend] Starting on http://localhost:8000")
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "main:app", "--reload", "--port", "8000"
    ])


def start_frontend():
    """启动 Vite 前端"""
    os.chdir(os.path.join(PROJECT_DIR, "frontend"))
    print("[Frontend] Starting on http://localhost:5173")
    subprocess.run(["npm", "run", "dev"])


def start_both():
    """同时启动前端和后端"""
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=os.path.join(PROJECT_DIR, "backend")
    )
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.path.join(PROJECT_DIR, "frontend")
    )

    def shutdown(_signum, _frame):
        print("\n[Main] Shutting down...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("[Main] Backend:  http://localhost:8000")
    print("[Main] Frontend: http://localhost:5173")
    print("[Main] API Docs: http://localhost:8000/api/docs")
    print("[Main] Press Ctrl+C to stop\n")

    backend_proc.wait()
    frontend_proc.wait()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "backend":
            start_backend()
        elif cmd == "frontend":
            start_frontend()
        else:
            print(f"Unknown command: {cmd}")
            print("Usage: python main.py [backend|frontend]")
            sys.exit(1)
    else:
        start_both()
