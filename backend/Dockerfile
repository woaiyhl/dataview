# 使用官方 Python 运行时作为父镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（如果需要编译某些 Python 库）
# RUN apt-get update && apt-get install -y gcc

# 复制依赖文件
COPY requirements.txt .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p uploads temp_chunks

# 暴露端口
EXPOSE 5000

# 启动命令
# 使用 Gunicorn 启动 Flask 应用
# 优化：在共享服务器上，将 workers 减少为 2 以节省内存
CMD ["gunicorn", "--workers=2", "--bind=0.0.0.0:5000", "--timeout=300", "app:app"]
