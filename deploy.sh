#!/bin/bash

# 定义颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== 开始部署 DataView ===${NC}"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "Docker 未运行，请先启动 Docker"
    exit 1
fi

echo -e "${GREEN}停止旧容器...${NC}"
docker compose down

echo -e "${GREEN}构建并启动新容器...${NC}"
# --build 确保重新构建镜像
docker compose up -d --build

echo -e "${GREEN}清理未使用的镜像...${NC}"
docker image prune -f

echo -e "${BLUE}=== 部署完成 ===${NC}"
echo -e "请检查服务状态: docker compose ps"
