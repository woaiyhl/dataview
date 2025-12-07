# Time Series Data Visualization (时序数据可视化)

这是一个基于 **Flask + React** 的前后端分离项目，用于上传 CSV 格式的时序数据文件，并进行交互式图表展示。

## 技术栈 (Tech Stack)

- **Frontend**: React 18, Vite, Ant Design (UI), ECharts (图表), Axios
- **Backend**: Python 3, Flask, Pandas (数据处理), SQLAlchemy (SQLite)
- **Database**: SQLite (本地文件数据库，无需额外安装)

## 项目结构 (Structure)

```
dataview/
├── backend/
│   ├── app.py              # Flask 核心应用与接口
│   ├── dataview.db         # SQLite 数据库 (自动生成)
│   └── requirements.txt    # Python 依赖
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # 主应用组件
│   │   └── main.jsx        # 入口文件
│   ├── package.json        # Node 依赖
│   └── vite.config.js      # Vite 配置 (含代理)
└── README.md
```

## 核心功能

1. **文件上传**: 支持 CSV 文件上传，自动解析时间列。
2. **交互图表**: 支持折线图展示，具备缩放(Zoom)、平移、导出图片功能。
3. **时间筛选**: 可选择特定时间范围进行数据回放。
4. **基础统计**: 自动计算各指标的最小值、最大值、平均值。

## 运行步骤 (Local Run)

### 1. 启动后端 (Backend)

需要 Python 3.8+ 环境。

```bash
cd backend
# (可选) 创建虚拟环境
# python -m venv venv
# source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务 (默认端口 5000)
python app.py
```

### 2. 启动前端 (Frontend)

需要 Node.js 16+ 环境。

```bash
cd frontend
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3. 访问应用

打开浏览器访问终端显示的地址 (通常为 `http://localhost:5173`)。

## 测试数据示例 (sample.csv)

请准备一个 CSV 文件，第一列建议为时间，后续列为数值。例如：

```csv
timestamp,temperature,humidity
2023-01-01 10:00:00,25.5,60
2023-01-01 10:05:00,26.1,58
2023-01-01 10:10:00,25.8,59
...
```

## 常见问题

- **上传失败?** 请检查 CSV 文件是否有表头，且第一列或包含 'date'/'time' 的列为时间格式。
- **端口占用?** 如果 5000 端口被占用，请修改 `backend/app.py` 中的 `port=5000`。
