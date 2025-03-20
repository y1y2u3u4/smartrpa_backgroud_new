// server.js
import express from 'express';
import cors from 'cors';
import { handler_login, handler_run_base, handler_run_internal } from './handler.js';
import axios from 'axios'; // 用于 HTTP 请求

// 添加全局任务跟踪映射
const runningTasks = new Map(); // 存储正在运行的任务
const completedTasks = new Map(); // 存储已完成的任务

// 检查任务是否在运行
const isTaskRunning = (taskId) => {
    if (!taskId) return false;
    return runningTasks.has(taskId);
};

// 标记任务开始
const markTaskStart = (taskId) => {
    if (!taskId) return;
    console.log(`标记任务开始: ${taskId}`);
    runningTasks.set(taskId, {
        startTime: new Date(),
        status: 'running',
        progress: 0
    });
};

// 标记任务结束
const markTaskEnd = (taskId, result = null) => {
    if (!taskId) return;
    console.log(`标记任务结束: ${taskId}`);
    runningTasks.delete(taskId);
    
    // 如果提供了结果，保存到结果Map
    if (result) {
        completedTasks.set(taskId, {
            completedAt: new Date(),
            result: result,
            status: result.status || 'completed'
        });
        
        // 设置结果过期时间（例如24小时后自动清理）
        setTimeout(() => {
            completedTasks.delete(taskId);
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

/**
 * 处理任务的函数
 * @param {Object} taskData - 任务数据
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} - 任务处理结果
 */
async function processTask(taskData, taskId) {
    console.log(`开始处理任务: ${taskId}`);
    
    try {
        // 更新任务状态为处理中
        if (runningTasks.has(taskId)) {
            const taskInfo = runningTasks.get(taskId);
            taskInfo.status = 'processing';
            taskInfo.progress = 10; // 初始进度
            runningTasks.set(taskId, taskInfo);
        }
        
        // 调用handler_run_internal函数处理任务
        const result = await handler_run_internal(taskData, taskId);
        
        console.log(`任务 ${taskId} 处理完成`);
        return result;
    } catch (error) {
        console.error(`处理任务 ${taskId} 时出错:`, error);
        throw error; // 重新抛出错误，让调用者处理
    }
}



// 修改/scrape路由，使用改进的markTaskStart和markTaskEnd函数
app.post('/scrape', async (req, res) => {
    try {
        // 确保 taskId 为字符串格式
        let taskId = req.body.taskId || req.body.taskConfig?.row?.系统SKU;
        if (!taskId) {
            return res.status(400).json({
                status: 'error',
                message: '缺少任务ID'
            });
        }
        
        // 统一转换为字符串格式
        taskId = String(taskId);
        
        console.log('收到任务提交请求:', {
            taskId,
            taskIdType: typeof taskId,
            originalTaskId: req.body.taskId,
            configSKU: req.body.taskConfig?.row?.系统SKU
        });

        // 保存任务信息到 runningTasks
        runningTasks.set(taskId, {
            startTime: new Date().toISOString(),
            progress: 0,
            status: 'running'
        });

        console.log(`任务 ${taskId} 已添加到运行队列，当前运行任务数: ${runningTasks.size}`);

        // 标记任务开始
        markTaskStart(taskId);
        
        // 返回接受状态
        res.status(202).json({
            status: 'accepted',
            taskId: taskId,
            message: '任务已接受，开始处理'
        });
        
        // 在后台处理任务
        processTask(req.body, taskId)
            .then(result => {
                // 任务完成，标记结束
                markTaskEnd(taskId, result);
            })
            .catch(error => {
                // 任务出错，标记结束并记录错误
                markTaskEnd(taskId, {
                    status: 'error',
                    error: error.message
                });
            });
    } catch (error) {
        console.error('处理请求时出错:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});


async function processTask_dengdai(taskData, taskId) {
    console.log(`开始处理任务: ${taskId}`);
    
    try {
        // 更新任务状态为处理中
        if (runningTasks.has(taskId)) {
            const taskInfo = runningTasks.get(taskId);
            taskInfo.status = 'processing';
            taskInfo.progress = 10; // 初始进度
            runningTasks.set(taskId, taskInfo);
        }
        
        // 调用handler_run_internal函数处理任务
        const result = await handler_run_internal(taskData, taskId);
        
        console.log(`任务 ${taskId} 处理完成`);
        return result;
    } catch (error) {
        console.error(`处理任务 ${taskId} 时出错:`, error);
        throw error; // 重新抛出错误，让调用者处理
    }
}


app.post('/scrape_dengdai', async (req, res) => {
    try {
        // 确保 taskId 为字符串格式
        let taskId = req.body.taskId || req.body.taskConfig?.row?.系统SKU;
        if (!taskId) {
            return res.status(400).json({
                status: 'error',
                message: '缺少任务ID'
            });
        }
        
        // 统一转换为字符串格式
        taskId = String(taskId);
        
        console.log('收到任务提交请求:', {
            taskId,
            taskIdType: typeof taskId,
            originalTaskId: req.body.taskId,
            configSKU: req.body.taskConfig?.row?.系统SKU
        });

        // 保存任务信息到 runningTasks
        runningTasks.set(taskId, {
            startTime: new Date().toISOString(),
            progress: 0,
            status: 'running'
        });

        console.log(`任务 ${taskId} 已添加到运行队列，当前运行任务数: ${runningTasks.size}`);

        // 标记任务开始
        markTaskStart(taskId);
        
 
        try {
            // 等待任务处理完成
            console.log(`开始执行任务 ${taskId}，将等待其完成...`);
            const result = await processTask_dengdai(req.body, taskId);
            
            // 任务完成，标记结束
            markTaskEnd(taskId, result);
            console.log(`任务 ${taskId} 成功完成，准备发送响应`);
            
            // 发送成功响应
            res.status(200).json({
                status: result.status || 'success',
                taskId: taskId,
                message: '任务已完成',
                result: result,
                timestamp: new Date().toISOString()
            });
        } catch (taskError) {
            // 任务出错，标记结束并记录错误
            const errorResult = {
                status: 'error',
                error: taskError.message
            };
            markTaskEnd(taskId, errorResult);
            console.error(`任务 ${taskId} 执行失败:`, taskError.message);
            
            // 发送错误响应
            res.status(500).json({
                status: 'error',
                taskId: taskId,
                message: '任务执行失败',
                error: taskError.message,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('处理请求时出错:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});



app.post('/scrape_base', handler_run_base);

// 添加任务状态检查API
app.get('/task-status', (req, res) => {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({
            status: 'error',
            message: '缺少任务ID参数'
        });
    }
    
    // 与心跳检测相同的逻辑
    if (runningTasks.has(id)) {
        const taskInfo = runningTasks.get(id);
        return res.json({
            status: 'running',
            taskId: id,
            progress: taskInfo.progress,
            startedAt: taskInfo.startTime,
            timestamp: new Date().toISOString()
        });
    }
    
    if (completedTasks.has(id)) {
        const taskInfo = completedTasks.get(id);
        return res.json({
            status: taskInfo.error ? 'error' : 'completed',
            taskId: id,
            completedAt: taskInfo.completedAt,
            error: taskInfo.error,
            timestamp: new Date().toISOString()
        });
    }
    
    return res.json({
        status: 'not_found',
        taskId: id,
        timestamp: new Date().toISOString()
    });
});

// 改进心跳检测API
app.get('/heartbeat', (req, res) => {
    let { id } = req.query;
    
    if (!id) {
        console.log('心跳检测请求缺少ID参数');
        return res.status(400).json({
            status: 'error',
            message: '缺少任务ID参数'
        });
    }

    // 统一转换为字符串格式
    id = String(id);
    
    console.log(`收到任务 ${id} 的心跳检测请求，ID类型: ${typeof id}`);
    console.log(`当前运行中任务数: ${runningTasks.size}`);
    console.log(`当前完成任务数: ${completedTasks.size}`);
    
    // 打印当前运行中的所有任务ID，方便调试
    console.log('运行中的任务列表:', Array.from(runningTasks.keys()));
    
    // 检查任务是否在运行
    if (runningTasks.has(id)) {
        const taskInfo = runningTasks.get(id);
        console.log(`任务 ${id} 正在运行，进度: ${taskInfo.progress}`);
        return res.json({
            status: 'running',
            taskId: id,
            progress: taskInfo.progress,
            startedAt: taskInfo.startTime,
            timestamp: new Date().toISOString()
        });
    }
    
    // 如果任务已完成
    if (completedTasks.has(id)) {
        const taskInfo = completedTasks.get(id);
        console.log(`任务 ${id} 已完成，状态: ${taskInfo.error ? 'error' : 'completed'}`);
        return res.json({
            status: taskInfo.error ? 'error' : 'completed',
            taskId: id,
            completedAt: taskInfo.completedAt,
            error: taskInfo.error,
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`找不到任务 ${id} 的信息`);
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
    
    const completedTasksList = Array.from(completedTasks.entries()).map(([id, result]) => ({
        taskId: id,
        status: 'completed',
        completedAt: result.completedAt
    }));
    
    return res.json({
        running: runningTasksList,
        completed: completedTasksList
    });
});

// 添加任务进度更新函数
function updateTaskProgress(taskId, progress, status = 'running') {
    if (!taskId || !runningTasks.has(taskId)) return false;
    
    const taskInfo = runningTasks.get(taskId);
    taskInfo.progress = progress;
    taskInfo.status = status;
    runningTasks.set(taskId, taskInfo);
    
    console.log(`更新任务 ${taskId} 进度: ${progress}%, 状态: ${status}`);
    return true;
}

// 添加任务进度更新API
app.post('/task-progress', (req, res) => {
    const { taskId, progress, status } = req.body;
    
    if (!taskId) {
        return res.status(400).json({
            status: 'error',
            message: '缺少任务ID参数'
        });
    }
    
    const updated = updateTaskProgress(taskId, progress, status);
    
    if (updated) {
        return res.json({
            status: 'success',
            message: '任务进度已更新'
        });
    } else {
        return res.status(404).json({
            status: 'error',
            message: '找不到指定的任务'
        });
    }
});

// 添加任务取消API
app.post('/cancel-task', (req, res) => {
    const { taskId } = req.body;
    
    if (!taskId) {
        return res.status(400).json({
            status: 'error',
            message: '缺少任务ID参数'
        });
    }
    
    if (runningTasks.has(taskId)) {
        // 标记任务为取消状态
        const taskInfo = runningTasks.get(taskId);
        taskInfo.status = 'cancelling';
        runningTasks.set(taskId, taskInfo);
        
        // 实际取消任务的逻辑需要在processTask中实现
        // 这里只是标记状态，实际取消需要在处理过程中检查
        
        return res.json({
            status: 'success',
            message: '任务取消请求已发送'
        });
    } else {
        return res.status(404).json({
            status: 'error',
            message: '找不到指定的任务'
        });
    }
});

// 定期清理长时间运行的任务
setInterval(() => {
    const now = Date.now();
    const MAX_RUNNING_TIME = 30 * 60 * 1000; // 30分钟
    
    for (const [taskId, taskInfo] of runningTasks.entries()) {
        const startTime = taskInfo.startTime instanceof Date ? taskInfo.startTime.getTime() : taskInfo.startTime;
        const runningTime = now - startTime;
        
        if (runningTime > MAX_RUNNING_TIME) {
            console.log(`任务 ${taskId} 运行时间过长 (${Math.round(runningTime/60000)}分钟)，自动标记为超时`);
            
            // 将任务从运行中移到完成（错误状态）
            completedTasks.set(taskId, {
                completedAt: new Date(),
                status: 'error',
                error: '任务执行超时，系统自动终止'
            });
            
            runningTasks.delete(taskId);
        }
    }
}, 5 * 60 * 1000); // 每5分钟检查一次

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

// 2. 改进心跳检测API，添加更多日志
app.get('/heartbeat', (req, res) => {
    const { id } = req.query;
    
    if (!id) {
        console.log('心跳检测请求缺少ID参数');
        return res.status(400).json({
            status: 'error',
            message: '缺少任务ID参数'
        });
    }
    
    console.log(`收到任务 ${id} 的心跳检测请求`);
    console.log(`当前运行中任务数: ${runningTasks.size}`);
    console.log(`当前完成任务数: ${completedTasks.size}`);
    
    // 检查任务是否在运行
    if (runningTasks.has(id)) {
        const taskInfo = runningTasks.get(id);
        console.log(`任务 ${id} 正在运行，进度: ${taskInfo.progress}`);
        return res.json({
            status: 'running',
            taskId: id,
            progress: taskInfo.progress,
            startedAt: taskInfo.startTime,
            timestamp: new Date().toISOString()
        });
    }
    
    // 如果任务已完成
    if (completedTasks.has(id)) {
        const taskInfo = completedTasks.get(id);
        console.log(`任务 ${id} 已完成，状态: ${taskInfo.error ? 'error' : 'completed'}`);
        return res.json({
            status: taskInfo.error ? 'error' : 'completed',
            taskId: id,
            completedAt: taskInfo.completedAt,
            error: taskInfo.error,
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`找不到任务 ${id} 的信息`);
    return res.json({
        status: 'not_found',
        taskId: id,
        timestamp: new Date().toISOString()
    });
});

// 3. 在任务完成时确保正确更新状态
async function updateTaskStatus(taskId, status, error = null) {
    console.log(`更新任务 ${taskId} 状态为 ${status}`);
    
    if (status === 'completed' || status === 'error') {
        const taskInfo = runningTasks.get(taskId);
        if (taskInfo) {
            completedTasks.set(taskId, {
                ...taskInfo,
                completedAt: new Date().toISOString(),
                error: error
            });
            runningTasks.delete(taskId);
            console.log(`任务 ${taskId} 已移至完成队列`);
        }
    } else if (status === 'running') {
        if (!runningTasks.has(taskId)) {
            runningTasks.set(taskId, {
                startTime: new Date().toISOString(),
                progress: 0,
                status: 'running'
            });
            console.log(`任务 ${taskId} 已添加到运行队列`);
        }
    }
}