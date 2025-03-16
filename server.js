// server.js
import express from 'express';
import cors from 'cors';
import { handler_login, handler_run_base } from './handler.js';
import axios from 'axios'; // 用于 HTTP 请求

// 存储运行中的任务
const runningTasks = new Map();

// 存储任务结果
const taskResults = new Map();

// 检查任务是否在运行
const isTaskRunning = (taskId) => {
    if (!taskId) return false;
    return runningTasks.has(taskId);
};

// 标记任务开始
const markTaskStart = (taskId) => {
    if (!taskId) return;
    console.log(`标记任务开始: ${taskId}`);
    runningTasks.set(taskId, Date.now());
};

// 标记任务结束
const markTaskEnd = (taskId, result = null) => {
    if (!taskId) return;
    console.log(`标记任务结束: ${taskId}`);
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

// 修改/scrape路由，添加任务状态管理
app.post('/scrape', (req, res) => {
    // 获取任务ID
    const taskId = req.body.taskId || 
                  req.body.workflowFile || 
                  (req.body.taskConfig?.row?.系统SKU) || 
                  `task_${Date.now()}`;
    
    console.log(`接收到任务: ${taskId}`);
    
    // 标记任务开始
    markTaskStart(taskId);
    
    // 立即返回确认信息
    res.status(200).json({
        status: 'accepted',
        taskId: taskId,
        message: '任务已接受，开始处理',
        timestamp: new Date().toISOString()
    });
    
    // 定义一个内部处理函数
    const processTask = async () => {
        try {
            // 导入handler_run函数（避免循环引用）
            const { handler_run_internal } = await import('./handler.js');
            
            // 在后台处理任务
            const result = await handler_run_internal(req.body, taskId);
            
            console.log(`任务 ${taskId} 完成`);
            // 保存结果并标记任务结束
            markTaskEnd(taskId, result);
        } catch (error) {
            console.error(`任务 ${taskId} 执行出错:`, error);
            // 标记任务结束，但不保存结果
            markTaskEnd(taskId, {
                status: 'error',
                message: error.message,
                errorAt: new Date().toISOString()
            });
        }
    };
    
    // 启动异步处理
    processTask();
});

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
    
    // 使用isTaskRunning函数检查任务状态
    const isRunning = isTaskRunning(id);
    
    // 检查是否有任务结果
    const result = taskResults.get(id);
    
    if (isRunning) {
        // 任务正在运行
        return res.json({
            status: 'running',
            taskId: id,
            startTime: runningTasks.get(id),
            runningTime: Date.now() - runningTasks.get(id) // 运行时间（毫秒）
        });
    } else if (result) {
        // 任务已完成，有结果
        return res.json({
            status: 'completed',
            taskId: id,
            result: result,
            completedAt: result.completedAt
        });
    } else {
        // 任务不存在或已结束但没有结果
        return res.json({
            status: 'not_found',
            taskId: id,
            message: '任务不存在或已结束'
        });
    }
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

// 添加任务列表查询API
app.get('/tasks', (req, res) => {
    const runningTasksList = Array.from(runningTasks.entries()).map(([id, startTime]) => ({
        taskId: id,
        status: 'running',
        startTime: startTime,
        runningTime: Date.now() - startTime
    }));
    
    const completedTasksList = Array.from(taskResults.entries()).map(([id, result]) => ({
        taskId: id,
        status: 'completed',
        completedAt: result.completedAt
    }));
    
    return res.json({
        running: runningTasksList,
        completed: completedTasksList
    });
});

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