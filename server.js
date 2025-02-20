// server.js
import express from 'express';
import cors from 'cors';
import { handler_login, handler_run} from './handler.js';
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
const markTaskEnd = (taskId) => {
    if (!taskId) return;
    runningTasks.delete(taskId);
};

const app = express();
app.use(cors());
// 增加 JSON 请求体大小限制到 50MB
app.use(express.json({limit: '50mb'}));
// 增加 URL-encoded 请求体大小限制
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.use(express.json());
app.post('/login', handler_login);
// app.post('/scrape', handler_run);

app.post('/scrape', async (req, res) => {
    const taskId = req.headers['x-task-id'];
    try {
        // 1. 检查任务是否已在执行
        if (isTaskRunning(taskId)) {
            return res.status(409).json({ error: 'Task already running' });
        }

        // 2. 设置更长的超时时间
        req.setTimeout(3600000); // 1小时
        res.setTimeout(3600000); // 1小时

        // 3. 标记任务开始并执行
        markTaskStart(taskId);
        await handler_run(req, res);

        // 4. 任务完成后再发送响应
        if (!res.headersSent) {
            res.status(200).json({ status: 'success' });
        }
    } catch (error) {
        // 5. 错误处理
        console.error('Task execution failed:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Task execution failed',
                message: error.message 
            });
        }
    } finally {
        // 6. 确保任务状态被清理
        markTaskEnd(taskId);
    }
});




// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });


const PORT = 8082;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//https://ngrok.com/download
// ngrok http 8082
// ngrok http 8188 --region ap
// ngrok tcp 3389 --region ap


// nohup  node server.js > server.log 2>&1 &