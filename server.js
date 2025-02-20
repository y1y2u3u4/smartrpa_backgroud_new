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
app.post('/scrape', handler_run);






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