#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 正在启动 DataView 项目 ===${NC}"

# 捕获退出信号 (Ctrl+C)，确保子进程被关闭
cleanup() {
    echo -e "\n${BLUE}正在停止服务...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

# 启动后端
echo -e "${GREEN}1. 启动 Backend (Flask)...${NC}"
(cd backend && python3 app.py) &
BACKEND_PID=$!

# 等待几秒确保后端初始化
sleep 2

# 启动前端
echo -e "${GREEN}2. 启动 Frontend (Vite)...${NC}"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo -e "${BLUE}服务已启动! 按 Ctrl+C 停止所有服务。${NC}"

# 等待子进程
wait
