// 工作流自动化API服务

import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 任务状态文件路径
const TASK_STATUS_FILE = path.join(__dirname, 'task_status.json');

// 创建Express应用
const app = express();

// 添加CORS中间件，允许跨域请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // 允许所有来源的请求
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// 工作流文件列表
const WORKFLOW_FILES = [
  'test_meituan.json',
  'test_jingdong_1.json',
  'test_jingdong_2.json',
  'test_jingdong_3.json',
  'test_jingdong_4.json'
];

// 工作流JSON文件目录
const WORKFLOW_JSON_DIR = path.join(__dirname, 'workflow_json');

// 最大并发任务数
let MAX_CONCURRENT_TASKS = 1;

// 保存工作流的状态
let workflowStatus = {
  queue: [],          // 待处理工作流队列
  running: [],        // 正在运行的工作流
  completed: [],      // 已完成的工作流
  errors: [],         // 执行出错的工作流
  status: 'idle',     // 状态: idle, running, completed, error
  error: null,        // 错误信息
  results: {},        // 每个工作流的执行结果
  isProcessing: false, // 是否正在处理队列
  lastUpdated: new Date().toISOString() // 最后更新时间
};

// 从JSON文件加载任务状态
async function loadTaskStatusFromFile() {
  try {
    if (existsSync(TASK_STATUS_FILE)) {
      const data = await fs.readFile(TASK_STATUS_FILE, 'utf-8');
      const savedStatus = JSON.parse(data);
      
      // 恢复日期对象
      savedStatus.queue.forEach(item => {
        if (item.createdAt) item.createdAt = new Date(item.createdAt);
      });
      
      savedStatus.running.forEach(item => {
        if (item.createdAt) item.createdAt = new Date(item.createdAt);
        if (item.startTime) item.startTime = new Date(item.startTime);
      });
      
      savedStatus.completed.forEach(item => {
        if (item.createdAt) item.createdAt = new Date(item.createdAt);
        if (item.startTime) item.startTime = new Date(item.startTime);
        if (item.completedAt) item.completedAt = new Date(item.completedAt);
      });
      
      savedStatus.errors.forEach(item => {
        if (item.createdAt) item.createdAt = new Date(item.createdAt);
        if (item.startTime) item.startTime = new Date(item.startTime);
        if (item.errorAt) item.errorAt = new Date(item.errorAt);
      });
      
      workflowStatus = savedStatus;
      console.log(`已从文件加载任务状态，共有 ${workflowStatus.queue.length} 个待处理任务，${workflowStatus.running.length} 个运行中任务，${workflowStatus.completed.length} 个已完成任务，${workflowStatus.errors.length} 个失败任务`);
      
      // 如果有运行中的任务，将其状态重置为队列中
      if (workflowStatus.running.length > 0) {
        console.log('检测到未完成的运行中任务，将其重置为队列状态');
        workflowStatus.running.forEach(item => {
          item.status = 'queued';
          item.progress = 0;
          delete item.startTime;
        });
        
        workflowStatus.queue.push(...workflowStatus.running);
        workflowStatus.running = [];
        workflowStatus.status = 'idle';
        workflowStatus.isProcessing = false;
        
        // 保存更新后的状态
        await saveTaskStatusToFile();
      }
      
      // 检查isProcessing状态，如果为true但没有运行中的任务，则重置为false
      if (workflowStatus.isProcessing === true && workflowStatus.running.length === 0) {
        console.log('检测到isProcessing为true但没有运行中的任务，重置为false');
        workflowStatus.isProcessing = false;
        workflowStatus.status = workflowStatus.queue.length > 0 ? 'idle' : workflowStatus.status;
        
        // 保存更新后的状态
        await saveTaskStatusToFile();
      }
    } else {
      console.log('任务状态文件不存在，使用默认空状态');
      await saveTaskStatusToFile(); // 创建初始文件
    }
  } catch (error) {
    console.error('加载任务状态文件失败:', error);
    // 出错时使用默认空状态
  }
}

// 保存任务状态到JSON文件
async function saveTaskStatusToFile() {
  try {
    workflowStatus.lastUpdated = new Date().toISOString();
    await fs.writeFile(TASK_STATUS_FILE, JSON.stringify(workflowStatus, null, 2), 'utf-8');
    console.log('任务状态已保存到文件');
  } catch (error) {
    console.error('保存任务状态到文件失败:', error);
  }
}
// 从文件加载工作流数据
async function loadWorkflowData(filename) {
  try {
    // 首先尝试从workflow_json目录加载
    const jsonDirPath = path.join(WORKFLOW_JSON_DIR, filename);
    const defaultPath = path.join(__dirname, filename);
    
    // 检查文件是否存在于workflow_json目录
    let filePath;
    if (existsSync(jsonDirPath)) {
      filePath = jsonDirPath;
      console.log(`从workflow_json目录加载工作流文件: ${filename}`);
    } else {
      filePath = defaultPath;
      console.log(`从默认目录加载工作流文件: ${filename}`);
    }
    
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`加载工作流数据文件失败 ${filename}:`, error.message);
    throw new Error(`无法加载工作流文件 ${filename}: ${error.message}`);
  }
}

// 执行单个工作流
async function executeWorkflow(workflowItem) {
  // 定义进度更新定时器变量
  let progressInterval;
  const { workflowFile, userId, taskConfig } = workflowItem;
  
  try {
    console.log(`开始执行工作流: ${workflowFile}, 用户ID: ${userId}`);

    // 更新工作流项的状态
    workflowItem.status = 'running';
    workflowItem.startTime = new Date();
    workflowItem.progress = 0;

    // 加载工作流数据
    const workflowData = await loadWorkflowData(workflowFile);
    
    // 准备任务数据
    const requestData = {
      ...taskConfig,
      sortedData: workflowData,
      workflowFile
    };
    
    console.log(`工作流 ${workflowFile} 已加载，包含 ${workflowData.length} 个事件`);

    // 模拟进度更新
    progressInterval = setInterval(() => {
      if (workflowItem.progress < 90) {
        workflowItem.progress += 5;
      }
    }, 1000);

    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时
    
    try {
      // 发送请求到自动化服务
      const response = await fetch('http://localhost:8082/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // 清除超时
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
      }
      
      // 获取原始响应文本
      const responseText = await response.text();
      console.log(`收到服务器响应，长度: ${responseText.length} 字节`);
      
      // 处理流式响应 - 可能包含多个JSON对象，每行一个
      let result = { status: 'success', messages: [] };
      
      if (responseText.trim()) {
        try {
          // 尝试解析整个响应为单个JSON对象
          result = JSON.parse(responseText);
          console.log('成功解析响应为单个JSON对象');
        } catch (singleJsonError) {
          console.log('响应不是单个JSON对象，尝试解析为多个JSON行');
          
          // 可能是流式响应，尝试按行分割并解析每一行
          const lines = responseText.split('\n').filter(line => line.trim());
          const parsedLines = [];
          
          for (const line of lines) {
            try {
              const lineObj = JSON.parse(line);
              parsedLines.push(lineObj);
              
              // 如果有错误状态，记录下来
              if (lineObj.status === 'error' || lineObj.status === 'event_error' || lineObj.status === 'loop_event_error') {
                console.error('检测到错误状态:', lineObj);
                result.hasErrors = true;
                result.lastError = lineObj;
              }
            } catch (lineError) {
              console.warn(`无法解析JSON行: ${line.substring(0, 100)}...`);
            }
          }
          
          if (parsedLines.length > 0) {
            console.log(`成功解析 ${parsedLines.length} 个JSON对象`);
            // 使用最后一个状态作为结果
            const lastObj = parsedLines[parsedLines.length - 1];
            result = {
              status: lastObj.status || 'success',
              messages: parsedLines,
              lastMessage: lastObj
            };
          } else {
            throw new Error(`无法解析任何响应行为JSON: ${responseText.substring(0, 200)}...`);
          }
        }
      }
      
      // 更新完成状态
      workflowItem.progress = 100;
      workflowItem.status = 'completed';
      workflowItem.completedAt = new Date();
      workflowStatus.results[workflowFile] = {
        ...result,
        userId,
        completedAt: new Date().toISOString()
      };
      
      console.log(`工作流 ${workflowFile} 执行完成`);
      
      return result;
    } catch (fetchError) {
      // 处理fetch特定错误
      if (fetchError.name === 'AbortError') {
        throw new Error('请求超时，执行时间超过5分钟');
      } else {
        throw fetchError; // 重新抛出其他错误
      }
    }
  } catch (error) {
    // 更新错误状态
    workflowItem.status = 'error';
    workflowItem.error = error.message;
    workflowItem.errorAt = new Date();
    
    workflowStatus.results[workflowFile] = { 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString(),
      userId
    };
    
    console.error(`工作流 ${workflowFile} 执行失败:`, error);
    throw error; // 向上抛出错误，让调用者决定如何处理
  } finally {
    // 确保清除进度更新定时器
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  }
}

// 处理工作流队列 - 支持并发执行
async function processWorkflowQueue() {
  // 如果已经在处理队列或队列为空，则直接返回
  if (workflowStatus.isProcessing || workflowStatus.queue.length === 0) {
    return;
  }
  
  // 保存当前状态到文件
  await saveTaskStatusToFile();

  console.log(`开始处理工作流队列，队列长度: ${workflowStatus.queue.length}`);
  workflowStatus.isProcessing = true;
  workflowStatus.status = 'running';

  try {
    // 持续处理队列，直到队列为空
    while (workflowStatus.queue.length > 0 || workflowStatus.running.length > 0) {
      // 如果当前运行的任务数小于最大并发数，且队列中还有任务，则启动新任务
      while (workflowStatus.running.length < MAX_CONCURRENT_TASKS && workflowStatus.queue.length > 0) {
        const workflowItem = workflowStatus.queue.shift();
        workflowStatus.running.push(workflowItem);
        
        // 异步执行工作流，不等待完成
        executeWorkflow(workflowItem)
          .then(() => {
            // 执行成功，将工作流从running移动到completed
            const index = workflowStatus.running.findIndex(item => 
              item.workflowFile === workflowItem.workflowFile && item.userId === workflowItem.userId);
            
            if (index !== -1) {
              workflowStatus.running.splice(index, 1);
              workflowStatus.completed.push(workflowItem);
              // 保存状态到文件
              saveTaskStatusToFile();
            }
            
            console.log(`工作流 ${workflowItem.workflowFile} 成功完成，当前运行中: ${workflowStatus.running.length}, 队列中: ${workflowStatus.queue.length}`);
          })
          .catch(error => {
            // 执行失败，将工作流从running移动到errors
            const index = workflowStatus.running.findIndex(item => 
              item.workflowFile === workflowItem.workflowFile && item.userId === workflowItem.userId);
            
            if (index !== -1) {
              workflowStatus.running.splice(index, 1);
              workflowStatus.errors.push(workflowItem);
              // 保存状态到文件
              saveTaskStatusToFile();
            }
            
            console.error(`工作流 ${workflowItem.workflowFile} 执行失败: ${error.message}`);
          });
      }
      
      // 等待一小段时间后再检查状态
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 所有工作流完成
    workflowStatus.status = 'completed';
    console.log('所有工作流执行完毕');
  } catch (error) {
    console.error('工作流队列处理致命错误:', error);
    workflowStatus.status = 'error';
    workflowStatus.error = `队列处理错误: ${error.message}`;
  } finally {
    workflowStatus.isProcessing = false;
    console.log('工作流队列处理完成，isProcessing设置为false');
  }
}

// API端点: 启动工作流
app.post('/api/workflow/start', async (req, res) => {
  try {
    // 获取请求中的参数
    const { 
      user_id, 
      adsPowerUserId, 
      tuiguang_phonenumber, 
      workflowFiles,
      row,
      maxConcurrentTasks
    } = req.body;
    
    // 验证必要参数
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: user_id'
      });
    }
    
    // 如果提供了maxConcurrentTasks参数，则更新最大并发任务数
    if (maxConcurrentTasks !== undefined && typeof maxConcurrentTasks === 'number' && maxConcurrentTasks > 0) {
      console.log(`更新最大并发任务数: ${MAX_CONCURRENT_TASKS} -> ${maxConcurrentTasks}`);
      MAX_CONCURRENT_TASKS = maxConcurrentTasks;
    }
    
    // 确定要处理的工作流文件列表
    const workflowsToProcess = Array.isArray(workflowFiles) && workflowFiles.length > 0 
      ? [...workflowFiles] 
      : [...WORKFLOW_FILES];
      
    // 将文件名转换为正确的路径格式
    const processedWorkflows = workflowsToProcess.map(file => {
      // 如果文件名已经包含.json扩展名，则直接使用
      if (file.endsWith('.json')) {
        return file;
      }
      // 否则添加.json扩展名
      return `${file}.json`;
    });
    
    // 创建任务配置
    const taskConfig = {
      user_id,
      adsPowerUserId: adsPowerUserId || 'kn8o287',
      tuiguang_phonenumber: tuiguang_phonenumber || '1234567890',
      task_name:row.task_name,
      cityname:row.cityname,
      row: row || {
        "cityname": "上海",
        "storename": "测试店铺",
        "product": "测试产品"
      }
    };

    
    // 将每个工作流文件转换为工作流项
    const newWorkflowItems = processedWorkflows.map(file => ({
      workflowFile: file,
      userId: user_id,
      taskConfig,
      status: 'queued',
      progress: 0,
      createdAt: new Date()
    }));
    
    // 添加到队列
    workflowStatus.queue.push(...newWorkflowItems);
    
    // 保存状态到文件
    await saveTaskStatusToFile();
    
    console.log(`添加了 ${newWorkflowItems.length} 个工作流到队列，当前队列长度: ${workflowStatus.queue.length}`);
    
    // 输出当前配置信息
    console.log('启动工作流，配置信息:');
    console.log(`用户ID: ${user_id}`);
    console.log(`AdsPower用户ID: ${taskConfig.adsPowerUserId}`);
    console.log(`推广电话: ${taskConfig.tuiguang_phonenumber}`);
    console.log(`工作流文件: ${processedWorkflows.join(', ')}`);
    
    // 开始处理队列（非阻塞）
    if (!workflowStatus.isProcessing) {
      processWorkflowQueue();
    }
    
    res.json({
      success: true,
      message: '工作流已添加到队列',
      config: taskConfig,
      queueLength: workflowStatus.queue.length,
      workflowFiles: processedWorkflows,
      maxConcurrentTasks: MAX_CONCURRENT_TASKS
    });
  } catch (error) {
    console.error('启动工作流队列失败:', error);
    res.status(500).json({
      success: false,
      message: `启动工作流队列失败: ${error.message}`
    });
  }
});

// API端点: 获取当前状态
app.get('/api/workflow/status', (req, res) => {
  // 从查询参数获取用户ID
  const userId = req.query.userId;
  
  // 如果没有提供用户ID，返回所有工作流状态
  if (!userId) {
    const totalWorkflows = workflowStatus.completed.length + workflowStatus.queue.length + 
                          workflowStatus.running.length + workflowStatus.errors.length;
    
    const completedWorkflows = workflowStatus.completed.length;
    
    const totalProgress = totalWorkflows > 0 
      ? Math.round((completedWorkflows / totalWorkflows) * 100)
      : 0;
    
    return res.json({
      queue: workflowStatus.queue,
      running: workflowStatus.running,
      completed: workflowStatus.completed,
      errors: workflowStatus.errors,
      status: workflowStatus.status,
      error: workflowStatus.error,
      totalProgress,
      totalWorkflows,
      completedWorkflows,
      runningWorkflows: workflowStatus.running.length,
      queuedWorkflows: workflowStatus.queue.length,
      failedWorkflows: workflowStatus.errors.length
    });
  }
  
  // 根据用户ID筛选工作流
  const userCompleted = workflowStatus.completed.filter(workflow => workflow.userId === userId);
  const userQueue = workflowStatus.queue.filter(workflow => workflow.userId === userId);
  const userRunning = workflowStatus.running.filter(workflow => workflow.userId === userId);
  const userErrors = workflowStatus.errors.filter(workflow => workflow.userId === userId);
  
  // 计算用户特定的总体进度
  const userTotalWorkflows = userCompleted.length + userQueue.length + userRunning.length + userErrors.length;
  const userTotalProgress = userTotalWorkflows > 0 
    ? Math.round((userCompleted.length / userTotalWorkflows) * 100)
    : 0;
  
  res.json({
    queue: userQueue,
    running: userRunning,
    completed: userCompleted,
    errors: userErrors,
    totalProgress: userTotalProgress,
    totalWorkflows: userTotalWorkflows,
    completedWorkflows: userCompleted.length,
    runningWorkflows: userRunning.length,
    queuedWorkflows: userQueue.length,
    failedWorkflows: userErrors.length
  });
});

// API端点: 重置状态
app.post('/api/workflow/reset', async (req, res) => {
  // 重置状态
  workflowStatus.queue = [];
  workflowStatus.running = [];
  workflowStatus.completed = [];
  workflowStatus.errors = [];
  workflowStatus.status = 'idle';
  workflowStatus.error = null;
  workflowStatus.results = {};
  workflowStatus.isProcessing = false;
  
  // 保存重置后的状态到文件
  await saveTaskStatusToFile();
  
  res.json({
    success: true,
    message: '工作流状态已重置'
  });
});

// API端点: 获取特定工作流的结果
app.get('/api/workflow/result/:filename', (req, res) => {
  const { filename } = req.params;
  
  if (!workflowStatus.results[filename]) {
    return res.status(404).json({
      success: false,
      message: `找不到工作流 ${filename} 的结果`
    });
  }
  
  res.json({
    success: true,
    filename,
    result: workflowStatus.results[filename]
  });
});

// API端点: 修改最大并发任务数
app.post('/api/workflow/concurrency', async (req, res) => {
  const { maxConcurrentTasks } = req.body;
  
  if (!maxConcurrentTasks || typeof maxConcurrentTasks !== 'number' || maxConcurrentTasks <= 0) {
    return res.status(400).json({
      success: false,
      message: '无效的最大并发任务数，必须是大于0的整数'
    });
  }
  
  // 更新最大并发任务数
  MAX_CONCURRENT_TASKS = maxConcurrentTasks;
  
  // 保存状态到文件
  await saveTaskStatusToFile();
  
  res.json({
    success: true,
    message: `最大并发任务数已更新为 ${MAX_CONCURRENT_TASKS}`
  });
});

// API端点: 获取队列统计信息
app.get('/api/workflow/stats', (req, res) => {
  const stats = {
    total: workflowStatus.completed.length + workflowStatus.queue.length + 
           workflowStatus.running.length + workflowStatus.errors.length,
    queued: workflowStatus.queue.length,
    running: workflowStatus.running.length,
    completed: workflowStatus.completed.length,
    failed: workflowStatus.errors.length,
    status: workflowStatus.status,
    maxConcurrentTasks: MAX_CONCURRENT_TASKS,
    isProcessing: workflowStatus.isProcessing
  };
  
  // 计算平均执行时间（仅针对已完成的任务）
  if (workflowStatus.completed.length > 0) {
    const executionTimes = workflowStatus.completed
      .filter(item => item.startTime && item.completedAt)
      .map(item => new Date(item.completedAt) - new Date(item.startTime));
    
    if (executionTimes.length > 0) {
      stats.averageExecutionTimeMs = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
      stats.averageExecutionTimeSec = Math.round(stats.averageExecutionTimeMs / 1000);
    }
  }
  
  res.json(stats);
});

// 启动服务器
const PORT = 8083;

// 启动前加载任务状态
loadTaskStatusFromFile().then(() => {
  // 如果有队列中的任务，自动开始处理
  if (workflowStatus.queue.length > 0) {
    console.log(`服务启动时发现 ${workflowStatus.queue.length} 个待处理任务，开始处理队列`);
    processWorkflowQueue();
  }
});

app.listen(PORT, () => {
  console.log(`工作流API服务已启动，监听端口 ${PORT}`);
  console.log(`最大并发任务数: ${MAX_CONCURRENT_TASKS}`);
  console.log('可用的API端点:');
  console.log('- POST /api/workflow/start         启动工作流');
  console.log('- GET  /api/workflow/status        获取当前状态');
  console.log('- POST /api/workflow/reset         重置状态');
  console.log('- GET  /api/workflow/result/:filename 获取特定工作流的结果');
  console.log('- POST /api/workflow/concurrency   修改最大并发任务数');
  console.log('- GET  /api/workflow/stats         获取队列统计信息');
  console.log(`- 任务状态文件: ${TASK_STATUS_FILE}`);
});

// nohup  node task_manger_api.js > task_manger_api.log 2>&1 &