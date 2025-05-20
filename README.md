# SmartRPA Background Service

## 项目简介

SmartRPA Background Service 是一个强大的网页自动化和数据采集平台，能够在多个电商网站和平台上执行自动化任务，包括数据爬取、信息提取和自动化操作。

详细项目说明请参见 [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)。

## 安装与设置

### 前置条件
- Node.js v14+
- npm 或 pnpm
- Docker (可选，用于容器化部署)

### 安装依赖
```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

### 配置
1. 创建并设置环境变量文件
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，设置必要的配置参数
```
# 服务器配置
PORT=8082

# AWS 配置 (用于S3存储)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-2
S3_BUCKET_NAME=your_bucket_name

# 其他配置
ENVIRONMENT=local  # 或 cloud
```

## 运行服务

### 开发模式
```bash
node server.js
```

### 后台运行
```bash
nohup node server.js > server.log 2>&1 &
```

### Docker 部署
```bash
# 构建镜像
docker build -t smartrpa-background .

# 运行容器
docker run -p 8082:8082 -d smartrpa-background
```

## API 使用说明

### 提交任务 (异步处理)
```
POST /scrape
Content-Type: application/json

{
  "taskId": "task123",
  "taskName": "ozon_data_collection",
  "sortedData": [...],
  "row": {...}
}
```

### 提交任务 (同步处理)
```
POST /scrape_dengdai
Content-Type: application/json

{
  "taskId": "task123",
  "taskName": "ozon_data_collection",
  "sortedData": [...],
  "row": {...}
}
```

### 查询任务状态
```
GET /task-status?id=task123
```

### 心跳检测
```
GET /heartbeat?id=task123
```

### 取消任务
```
POST /cancel-task
Content-Type: application/json

{
  "taskId": "task123"
}
```

## 任务管理工作流

任务管理API服务运行在独立的端口（默认8083）:

```bash
# 启动任务管理API
node task_manager_api.js
```

通过此API可以管理工作流定义和任务执行。

## 监控与维护

- 使用 `monitor.sh` 脚本监控服务状态
- 日志文件位于 `server.log`
- 定期检查 `/tasks` 端点了解当前运行和已完成任务

## 系统要求

- CPU: 2核或以上
- 内存: 最低4GB，推荐8GB以上
- 存储: 最低10GB可用空间
- 网络: 稳定的互联网连接

## 许可证

私有软件，未经许可不得使用、复制或分发。