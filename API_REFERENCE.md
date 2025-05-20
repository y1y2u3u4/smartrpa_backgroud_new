# SmartRPA Background Service API参考

本文档详细描述SmartRPA Background Service提供的API接口。

## 基础信息

- **基础URL**: `http://[host]:[port]`
- **默认端口**: 8082
- **数据格式**: JSON
- **认证方式**: 无（内部服务使用）

## API端点

### 任务执行API

#### 1. 提交任务（异步执行）

提交自动化任务并立即返回，任务在后台执行。

**请求**:
```
POST /scrape
Content-Type: application/json

{
  "taskId": "task123",            // 任务唯一标识符
  "task_name": "OZON_data",       // 任务类型名称
  "sortedData": [...],            // 任务操作数据数组
  "row": {                        // 任务参数
    "keyword": "smartphone",
    "浏览器id": "browser001"
  },
  "BASE_URL": "https://example.com",  // 目标网站URL
  "adsPowerId": "10.128.0.3"      // AdsPower服务器ID（可选）
}
```

**响应**:
```json
{
  "status": "accepted",
  "taskId": "task123",
  "message": "任务已接受，开始处理"
}
```

**状态码**:
- `202 Accepted`: 任务已接受并开始处理
- `400 Bad Request`: 请求参数错误
- `500 Internal Server Error`: 服务器处理请求时出错

#### 2. 提交任务（同步执行）

提交自动化任务并等待完成，适用于需要立即获取结果的场景。

**请求**:
```
POST /scrape_dengdai
Content-Type: application/json

{
  // 同上述 /scrape 接口参数
}
```

**响应**:
```json
{
  "status": "success",
  "taskId": "task123",
  "message": "任务已完成",
  "result": {
    // 任务执行结果，因任务不同而异
  },
  "timestamp": "2023-05-10T12:34:56.789Z"
}
```

**状态码**:
- `200 OK`: 任务执行成功
- `400 Bad Request`: 请求参数错误
- `500 Internal Server Error`: 任务执行出错

#### 3. 基础任务执行

执行基础任务，不包含复杂的浏览器操作。

**请求**:
```
POST /scrape_base
Content-Type: application/json

{
  // 任务参数
}
```

### 任务状态API

#### 4. 任务状态查询

查询特定任务的执行状态。

**请求**:
```
GET /task-status?id=task123
```

**响应**:
```json
{
  "status": "running",
  "taskId": "task123",
  "progress": 45,
  "startedAt": "2023-05-10T12:30:00.000Z",
  "timestamp": "2023-05-10T12:34:56.789Z"
}
```

可能的状态值:
- `running`: 任务正在执行
- `completed`: 任务已完成
- `error`: 任务执行出错
- `not_found`: 未找到指定任务

#### 5. 心跳检测

与任务状态查询类似，但提供更详细的日志记录，用于客户端检测任务是否活跃。

**请求**:
```
GET /heartbeat?id=task123
```

**响应**:
```json
{
  "status": "running",
  "taskId": "task123",
  "progress": 45,
  "startedAt": "2023-05-10T12:30:00.000Z",
  "timestamp": "2023-05-10T12:34:56.789Z"
}
```

#### 6. 任务列表查询

获取所有运行中和已完成的任务列表。

**请求**:
```
GET /tasks
```

**响应**:
```json
{
  "running": [
    {
      "taskId": "task123",
      "status": "running",
      "startTime": "2023-05-10T12:30:00.000Z",
      "runningTime": 300000
    }
  ],
  "completed": [
    {
      "taskId": "task122",
      "status": "completed",
      "completedAt": "2023-05-10T12:25:00.000Z"
    }
  ]
}
```

### 任务控制API

#### 7. 更新任务进度

更新任务的进度和状态信息。

**请求**:
```
POST /task-progress
Content-Type: application/json

{
  "taskId": "task123",
  "progress": 65,
  "status": "running"
}
```

**响应**:
```json
{
  "status": "success",
  "message": "任务进度已更新"
}
```

**状态码**:
- `200 OK`: 进度更新成功
- `400 Bad Request`: 请求参数错误
- `404 Not Found`: 未找到指定任务

#### 8. 取消任务

请求取消正在执行的任务。

**请求**:
```
POST /cancel-task
Content-Type: application/json

{
  "taskId": "task123"
}
```

**响应**:
```json
{
  "status": "success",
  "message": "任务取消请求已发送"
}
```

**状态码**:
- `200 OK`: 取消请求已成功发送
- `400 Bad Request`: 请求参数错误
- `404 Not Found`: 未找到指定任务

### 认证API

#### 9. 登录接口

执行自动登录并保存cookies。

**请求**:
```
POST /login
Content-Type: application/json

{
  "url": "https://example.com/login",
  "task_name": "OZON_login",
  "successSelectors": ["#user-avatar", ".login-success"]
}
```

**响应**:
```json
{
  "status": "success",
  "message": "登录成功，cookies已保存"
}
```

## 任务管理API服务

任务管理API在单独的端口（默认8083）运行，提供以下功能：

1. 工作流定义和管理
2. 任务队列操作
3. 分布式任务调度
4. 端点健康检查

详细API参考请查阅任务管理API服务文档。

## 错误码和处理

常见错误响应：

```json
{
  "status": "error",
  "message": "错误描述",
  "error": "详细错误信息"
}
```

常见错误类型：
- 参数错误：请求参数不完整或格式不正确
- 任务不存在：指定的taskId找不到
- 执行超时：任务执行时间超过限制
- 浏览器错误：浏览器启动或操作过程中发生错误
- 网络错误：与目标站点连接失败
- 内部错误：服务器内部处理错误

## 请求限制

- 请求体大小限制：50MB
- 并发任务数：根据服务器配置，默认无硬性限制
- 任务执行时长：默认30分钟，超时自动终止