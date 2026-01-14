#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 正在启动 DataView 项目 ===${NC}"

BACKEND_HOST=${BACKEND_HOST:-127.0.0.1}
BACKEND_PORT=${BACKEND_PORT:-5001}
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}"

PYTHON_BIN=""
if [ -x "./backend/.venv/bin/python" ]; then
  PYTHON_BIN="./backend/.venv/bin/python"
elif [ -x "./backend/venv/bin/python" ]; then
  PYTHON_BIN="./backend/venv/bin/python"
elif [ -x "./.venv/bin/python" ]; then
  PYTHON_BIN="./.venv/bin/python"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
else
  echo -e "${BLUE}未找到可用的 Python 解释器${NC}"
  exit 1
fi

# 捕获退出信号 (Ctrl+C)，确保子进程被关闭
cleanup() {
    echo -e "\n${BLUE}正在停止服务...${NC}"
    if [ -n "${BACKEND_PID}" ]; then
      kill "${BACKEND_PID}" 2>/dev/null
    fi
    if [ -n "${FRONTEND_PID}" ]; then
      kill "${FRONTEND_PID}" 2>/dev/null
    fi
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# 启动后端（使用与手动相同的 python，避免环境不一致）
echo -e "${GREEN}1. 启动 Backend (Flask)...${NC}"
(cd backend && FLASK_PORT="${BACKEND_PORT}" FLASK_DEBUG=0 "${PYTHON_BIN}" run.py) &
BACKEND_PID=$!

# 等待后端端口就绪，最多 15 秒
echo -e "${BLUE}等待 Backend 就绪...${NC}"
backend_ready=0
for i in {1..30}; do
  if "${PYTHON_BIN}" - <<PY >/dev/null 2>&1
import socket
s = socket.socket()
s.settimeout(0.5)
try:
    s.connect(("${BACKEND_HOST}", int("${BACKEND_PORT}")))
    raise SystemExit(0)
except Exception:
    raise SystemExit(1)
finally:
    s.close()
PY
  then
    backend_ready=1
    echo -e "${GREEN}Backend 已就绪: ${BACKEND_URL}${NC}"
    break
  fi
  sleep 0.5
done

if [ "${backend_ready}" -ne 1 ]; then
  echo -e "${BLUE}Backend 启动超时，请检查依赖或端口占用：${BACKEND_URL}${NC}"
  cleanup
fi

# 启动前端
echo -e "${GREEN}2. 启动 Frontend (Vite)...${NC}"
(cd frontend && VITE_BACKEND_URL="${BACKEND_URL}" npm run dev) &
FRONTEND_PID=$!

echo -e "${BLUE}服务已启动! 按 Ctrl+C 停止所有服务。${NC}"

# 等待子进程
wait
