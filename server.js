// server.js
import express from 'express';
import cors from 'cors';
import { handler_login, handler_run, handler_run_base} from './handler.js';
import axios from 'axios'; // 用于 HTTP 请求
// 存储运行中的任务
const runningTasks = new Map();

// 检查任务是否在运行
const isTaskRunning = (taskId) => {
    if (!taskId) return false;
    return runningTasks.has(taskId);
};

// 标记任务开始
const markTaskStart = (taskId) => {
    if (!taskId) return;
    runningTasks.set(taskId, Date.now());
};

// 标记任务结束
const markTaskEnd = (taskId, result = null) => {
    if (!taskId) return;
    runningTasks.delete(taskId);
    
    // 如果提供了结果，保存到结果Map
    if (result) {
        taskResults.set(taskId, {
            ...result,
            completedAt: new Date().toISOString()
        });
        
        // 设置结果过期时间（例如24小时后自动清理）
        setTimeout(() => {
            taskResults.delete(taskId);
        }, 24 * 60 * 60 * 1000);
    }
};

const app = express();
app.use(cors());
// 增加 JSON 请求体大小限制到 50MB
app.use(express.json({limit: '50mb'}));
// 增加 URL-encoded 请求体大小限制
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(express.json());

/**
 * 登录接口 - 用于自动登录并保存cookies
 * 请求参数:
 * - url: 登录页面URL
 * - task_name: 任务名称，用于保存cookies
 * - successSelectors: [可选] 自定义登录成功的CSS选择器数组，例如 ["#user-avatar", ".login-success"]
 *   若不提供，将使用默认选择器判断登录状态
 */
app.post('/login', handler_login);
app.post('/scrape', handler_run);
app.post('/scrape_base', handler_run_base);

// 添加任务状态查询API
app.get('/task-status', (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({
      status: 'error',
      message: '缺少任务ID参数'
    });
  }
  
  // 检查任务是否在运行
  if (isTaskRunning(id)) {
    // 获取任务运行时间
    const startTime = runningTasks.get(id);
    const runningTime = Date.now() - startTime;
    
    return res.json({
      status: 'running',
      taskId: id,
      startTime,
      runningTimeMs: runningTime,
      runningTimeMin: Math.floor(runningTime / 60000)
    });
  }
  
  // 如果任务不在运行中，可能已完成或未启动
  if (taskResults && taskResults.has(id)) {
    const result = taskResults.get(id);
    return res.json({
      status: 'completed',
      taskId: id,
      result,
      completedAt: result.completedAt || new Date().toISOString()
    });
  }
  
  // 如果找不到任务，返回not_found状态
  return res.json({
    status: 'not_found',
    taskId: id,
    message: '找不到该任务，可能已完成但结果已清理，或者任务ID无效'
  });
});

// 添加任务心跳检测API
app.get('/heartbeat', (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({
      status: 'error',
      message: '缺少任务ID参数'
    });
  }
  
  // 检查任务是否在运行
  if (isTaskRunning(id)) {
    // 可以在这里添加更多任务状态信息
    return res.json({
      status: 'running',
      taskId: id,
      timestamp: new Date().toISOString()
    });
  }
  
  // 如果任务不在运行中但有结果，返回completed
  if (taskResults && taskResults.has(id)) {
    return res.json({
      status: 'completed',
      taskId: id,
      timestamp: new Date().toISOString()
    });
  }
  
  // 如果找不到任务，返回not_found
  return res.json({
    status: 'not_found',
    taskId: id,
    timestamp: new Date().toISOString()
  });
});

// 添加任务结果存储
const taskResults = new Map();

const PORT = 8082;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


//https://ngrok.com/download
// ngrok http 8082
// ngrok http 8188 --region ap
// ngrok tcp 3389 --region ap


// nohup  node server.js > server.log 2>&1 &
// nohup  node workflow_waimai_api.js > workflow_waimai_api.log 2>&1 &

// https://test1-container-001-506455378112.us-central1.run.app/novnc/vnc_session.html?port=6082&password=4c0e65e97298d181