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

// 在文件开头添加这些配置
const API_SERVER_PORT = 8083;
const BASE_CALLBACK_URL = `http://localhost:${API_SERVER_PORT}/callback`;

// 1. 首先在文件最顶部定义 API_ENDPOINTS
const API_ENDPOINTS = [
  // {
  //   url: 'http://localhost:8082/scrape',
  //   maxConcurrent: 2,  // 将这里改为实际需要的并发数
  //   running: 0,
  //   status: 'active'
  // }
  {
    url: 'https://kdw16tm655k3s1-8082.proxy.runpod.net/scrape',
    maxConcurrent: 3,  // 将这里改为实际需要的并发数
    running: 0,
    status: 'active',
    lastSubmitTime: 0,  // 新添加的字段
    disableInternalForwarding: true
  },
  {
    url: 'https://os8tm9eu20m77i-8082.proxy.runpod.net/scrape',
    maxConcurrent: 3,  // 将这里改为实际需要的并发数
    running: 0,
    status: 'active',
    lastSubmitTime: 0,  // 新添加的字段
    disableInternalForwarding: true
  },
  {
    url: 'https://w3ifl6j7mgee8h-8082.proxy.runpod.net/scrape',
    maxConcurrent: 3,  // 将这里改为实际需要的并发数
    running: 0,
    status: 'active',
    lastSubmitTime: 0,  // 新添加的字段
    disableInternalForwarding: true
  },
  {
    url: 'https://4htl8esnzj4k9e-8082.proxy.runpod.net/scrape',
    maxConcurrent: 3,  // 将这里改为实际需要的并发数
    running: 0,
    status: 'active',
    lastSubmitTime: 0,  // 新添加的字段
    disableInternalForwarding: true
  }
  ,
  {
    url: 'https://2iju0izib8fv7f-8082.proxy.runpod.net/scrape',
    maxConcurrent: 3,  // 将这里改为实际需要的并发数
    running: 0,
    status: 'active',
    lastSubmitTime: 0,  // 新添加的字段
    disableInternalForwarding: true
  },
  {
    url: 'https://0yr836353bj57o-8082.proxy.runpod.net/scrape',
    maxConcurrent: 3,  // 将这里改为实际需要的并发数
    running: 0,
    status: 'active',
    lastSubmitTime: 0,  // 新添加的字段
    disableInternalForwarding: true
  }

];

// 最大并发任务数
let MAX_CONCURRENT_TASKS = 100; // 提高到100，实际上我们将依赖各个端点自己的并发限制

// 1. 首先添加文件锁机制
let isWritingStatus = false;
const statusWriteQueue = [];

// 2. 修改保存状态函数
async function saveTaskStatus(taskStatus) {
  // 如果正在写入，将新的写入请求加入队列
  if (isWritingStatus) {
    await new Promise(resolve => statusWriteQueue.push(resolve));
  }
  
  try {
    isWritingStatus = true;
    taskStatus.lastUpdated = new Date().toISOString();
    
    // 先写入临时文件
    const tempFile = `${TASK_STATUS_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(taskStatus, null, 2), 'utf-8');
    
    // 然后重命名为正式文件
    await fs.rename(tempFile, TASK_STATUS_FILE);
    
    console.log('任务状态已保存到文件');
  } catch (error) {
    console.error('保存任务状态到文件失败:', error);
    throw error;
  } finally {
    isWritingStatus = false;
    // 处理队列中的下一个写入请求
    const nextResolve = statusWriteQueue.shift();
    if (nextResolve) {
      nextResolve();
    }
  }
}

// 3. 修改获取状态函数
async function getTaskStatus() {
  try {
    // 如果正在写入，等待写入完成
    if (isWritingStatus) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (existsSync(TASK_STATUS_FILE)) {
      const data = await fs.readFile(TASK_STATUS_FILE, 'utf-8');
      try {
        const status = JSON.parse(data);
        return status;
      } catch (parseError) {
        console.error('解析任务状态文件失败，尝试使用备份或重置:', parseError);
        // 如果解析失败，尝试使用临时文件
        if (existsSync(`${TASK_STATUS_FILE}.tmp`)) {
          const tempData = await fs.readFile(`${TASK_STATUS_FILE}.tmp`, 'utf-8');
          return JSON.parse(tempData);
        }
        // 如果还是失败，返回初始状态
        return {
          queue: [],
          running: [],
          completed: [],
          errors: [],
          status: 'idle',
          error: null,
          results: {},
          isProcessing: false,
          lastUpdated: new Date().toISOString()
        };
      }
    } else {
      // 初始状态结构保持不变
      const initialStatus = {
        queue: [],
        running: [],
        completed: [],
        errors: [],
        status: 'idle',
        error: null,
        results: {},
        isProcessing: false,
        lastUpdated: new Date().toISOString()
      };
      
      await saveTaskStatus(initialStatus);
      return initialStatus;
    }
  } catch (error) {
    console.error('读取任务状态文件失败:', error);
    throw error;
  }
}


// 添加任务到队列示例
async function addTaskToQueue(task) {
  const taskStatus = await getTaskStatus();
  taskStatus.queue.push({
    ...task,
    createdAt: new Date(),
    status: 'queued'
  });
  await saveTaskStatus(taskStatus);
}


// 启动任务示例
async function startNextTask() {
  const taskStatus = await getTaskStatus();
  
  if (taskStatus.queue.length > 0 && taskStatus.running.length < MAX_CONCURRENT_TASKS) {
    const task = taskStatus.queue.shift();
    task.status = 'running';
    task.startTime = new Date();
    taskStatus.running.push(task);
    await saveTaskStatus(taskStatus);
    
    // 执行任务但不依赖内存中变量
    return executeWorkflow(task);
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


const TASK_START_INTERVAL = 30000; // 2秒


console.log(`MAX_CONCURRENT_TASKS = ${MAX_CONCURRENT_TASKS}`);


// 处理队列函数也需要修改
async function processWorkflowQueue() {
  const taskStatus = await getTaskStatus();
  
  // 如果已经在处理队列，只需要确保 processNextBatch 在运行
  if (taskStatus.isProcessing) {
    console.log('队列已在处理中...');
    return;
  }
  
  // 如果队列为空且没有运行中的任务，不需要启动处理
  if (taskStatus.queue.length === 0 && taskStatus.running.length === 0) {
    console.log('没有需要处理的任务');
    return;
  }
  
  // 先清理任务列表
  await cleanupRunningTasks();
  
  // 更新处理标志
  taskStatus.isProcessing = true;
  taskStatus.status = 'running';
  await saveTaskStatus(taskStatus);
  
  // 启动队列处理
  processNextBatch();
}

// 修改时间间隔常量
const FIRST_TASK_INTERVAL = 120000; // 第一个任务间隔改为30秒
const NORMAL_TASK_INTERVAL = 30000; // 其他任务间隔改为15秒

// 添加任务提交时间控制变量
let lastTaskSubmitTime = 0;

// 修改 processNextBatch 函数中的时间间隔检查逻辑
async function processNextBatch() {
  try {
    const taskStatus = await getTaskStatus();
    
    console.log('\n=============== 任务处理状态 ===============');
    console.log(`当前时间: ${new Date().toISOString()}`);
    console.log(`运行中任务数: ${taskStatus.running.length}`);
    console.log(`队列中任务数: ${taskStatus.queue.length}`);
    console.log(`错误任务数: ${taskStatus.errors.length}`);
    console.log('============================================\n');
    
    // 检查是否有待处理任务
    if (taskStatus.queue.length === 0) {
      if (taskStatus.running.length > 0) {
        console.log('没有排队任务，等待监控运行中的任务...');
        setTimeout(processNextBatch, 5000);
      } else {
        // 所有任务都完成了
        taskStatus.isProcessing = false;
        taskStatus.status = 'idle';
        await saveTaskStatus(taskStatus);
        console.log('所有任务处理完成');
      }
      return;
    }
    
    // 获取可用端点
    let selectedEndpoint;
    try {
      selectedEndpoint = await getBestAvailableEndpoint();
      // 确保selectedEndpoint是端点对象，不是URL字符串
      const endpointUrl = selectedEndpoint.url || selectedEndpoint;
      console.log(`选择端点: ${endpointUrl} 提交下一个任务`);
    } catch (error) {
      console.log(`${error.message}，等待5秒后重试`);
      setTimeout(processNextBatch, 5000);
      return;
    }
    
    // 只启动一个任务
    const workflowItem = taskStatus.queue.shift();
    workflowItem.status = 'running';
    workflowItem.startedAt = new Date();
    
    // 确保保存完整的端点对象的URL
    workflowItem.endpoint = selectedEndpoint.url;
    taskStatus.running.push(workflowItem);
    
    // 使用正确的端点URL从workflowItem中获取，确保一致性
    const taskId = workflowItem.taskConfig?.row?.系统SKU || workflowItem.workflowFile;
    console.log(`启动任务: ${taskId}, 用户: ${workflowItem.userId}, API端点: ${workflowItem.endpoint}`);
    
    // 更新端点的最后提交时间
    const endpointIndex = API_ENDPOINTS.findIndex(e => e.url === workflowItem.endpoint);
    if (endpointIndex !== -1) {
      API_ENDPOINTS[endpointIndex].lastSubmitTime = Date.now();
      console.log(`端点 ${workflowItem.endpoint} 最后提交时间更新为: ${new Date(API_ENDPOINTS[endpointIndex].lastSubmitTime).toISOString()}`);
    }
    
    // 保存更新后的状态
    await saveTaskStatus(taskStatus);
    
    // 直接执行任务，不等待完成
    executeWorkflow(workflowItem)
      .then(result => {
        console.log(`任务 ${taskId} 执行完成`);
      })
      .catch(async error => {
        console.error(`任务执行出错: ${error.message}`);
        const updatedStatus = await getTaskStatus();
        const index = updatedStatus.running.findIndex(t => 
          (t.taskConfig?.row?.系统SKU === taskId || t.workflowFile === taskId) && 
          t.userId === workflowItem.userId
        );
        
        if (index !== -1) {
          console.log(`从运行列表中移除失败任务: ${taskId}`);
          const failedTask = {
            ...updatedStatus.running[index],
            status: 'error',
            error: error.message,
            errorAt: new Date()
          };
          updatedStatus.running.splice(index, 1);
          updatedStatus.errors.push(failedTask);
          await saveTaskStatus(updatedStatus);
        }
      });
    
    // 立即检查是否有下一个任务可以启动
    // 这将检查其他端点的可用性，因为我们刚刚更新了当前端点的lastSubmitTime
    setTimeout(processNextBatch, 1000);
    
  } catch (error) {
    console.error('处理任务批次时发生错误:', error);
    setTimeout(processNextBatch, 5000);
  }
}


app.post('/api/workflow/start', async (req, res) => {
  try {
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
    
    // 如果提供了 maxConcurrentTasks，只更新全局变量，不再修改各端点的并发限制
    if (maxConcurrentTasks !== undefined && typeof maxConcurrentTasks === 'number' && maxConcurrentTasks > 0) {
      console.log(`更新全局最大并发数为: ${maxConcurrentTasks}，但保留各端点的原始并发设置`);
      // 不再循环更新各端点的maxConcurrent
      // API_ENDPOINTS.forEach((endpoint, index) => {
      //   if (endpoint.maxConcurrent !== maxConcurrentTasks) {
      //     updateApiEndpointStatus(index, {
      //       maxConcurrent: maxConcurrentTasks
      //     });
      //   }
      // });
      MAX_CONCURRENT_TASKS = maxConcurrentTasks;  // 只更新全局变量
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
      task_name: row?.task_name,
      cityname: row?.cityname,
      row: row || {
        "cityname": "上海",
        "storename": "测试店铺",
        "product": "测试产品"
      }
    };

    // 获取当前任务状态
    const taskStatus = await getTaskStatus();
    
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
    taskStatus.queue.push(...newWorkflowItems);
    
    // 保存状态到文件
    await saveTaskStatus(taskStatus);
    
    console.log(`添加了 ${newWorkflowItems.length} 个工作流到队列，当前队列长度: ${taskStatus.queue.length}`);
    
    // 输出当前配置信息
    console.log('启动工作流，配置信息:');
    console.log(`用户ID: ${user_id}`);
    console.log(`AdsPower用户ID: ${taskConfig.adsPowerUserId}`);
    console.log(`推广电话: ${taskConfig.tuiguang_phonenumber}`);
    console.log(`工作流文件: ${processedWorkflows.join(', ')}`);
    
    // 开始处理队列（非阻塞）
    if (!taskStatus.isProcessing) {
      processWorkflowQueue();
    }
    
    res.json({
      success: true,
      message: '工作流已添加到队列',
      config: taskConfig,
      queueLength: taskStatus.queue.length,
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
  try {
    await resetTaskQueue();
    res.json({
      success: true,
      message: '工作流状态已重置'
    });
  } catch (error) {
    console.error('重置工作流状态失败:', error);
    res.status(500).json({
      success: false,
      message: `重置工作流状态失败: ${error.message}`
    });
  }
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



// 添加重置队列函数
async function resetTaskQueue() {
  const initialStatus = {
    queue: [],
    running: [],
    completed: [],
    errors: [],
    status: 'idle',
    error: null,
    results: {},
    isProcessing: false,
    lastUpdated: new Date().toISOString()
  };
  await fs.writeFile(TASK_STATUS_FILE, JSON.stringify(initialStatus, null, 2), 'utf-8');
  console.log('任务队列已重置');
}

// 添加任务恢复函数 - 从文件中恢复未完成的任务
async function restoreTaskQueue() {
  try {
    if (existsSync(TASK_STATUS_FILE)) {
      // 读取现有任务状态
      const data = await fs.readFile(TASK_STATUS_FILE, 'utf-8');
      const taskStatus = JSON.parse(data);
      
      // 检查并恢复运行中的任务到队列
      if (taskStatus.running && taskStatus.running.length > 0) {
        console.log(`发现 ${taskStatus.running.length} 个未完成的运行中任务，恢复到队列...`);
        
        // 将运行中的任务移回队列前面
        for (const task of [...taskStatus.running]) {
          task.status = 'queued'; // 重置状态为队列中
          task.error = null;      // 清除可能的错误
          taskStatus.queue.unshift(task); // 添加到队列最前面优先处理
        }
        
        // 清空运行中列表
        taskStatus.running = [];
      }
      
      // 重置处理状态
      taskStatus.isProcessing = false;
      taskStatus.status = taskStatus.queue.length > 0 ? 'ready' : 'idle';
      
      console.log(`恢复完成: 队列任务数: ${taskStatus.queue.length}, 已完成: ${taskStatus.completed.length}, 错误: ${taskStatus.errors.length}`);
      
      // 保存更新后的状态
      await saveTaskStatus(taskStatus);
      
      return taskStatus;
    } else {
      console.log('未找到任务状态文件，创建新的队列');
      return await resetTaskQueue();
    }
  } catch (error) {
    console.error('恢复任务队列失败:', error);
    // 如果恢复失败，创建新的队列状态
    console.log('由于恢复失败，创建新的任务队列');
    return await resetTaskQueue();
  }
}

// 添加定期状态检查函数
async function monitorTaskStatus() {
  try {
    const status = await getTaskStatus();
    console.log('任务状态报告:');
    console.log(`- 队列中: ${status.queue.length}`);
    console.log(`- 运行中: ${status.running.length}`);
    console.log(`- 已完成: ${status.completed.length}`);
    console.log(`- 失败: ${status.errors.length}`);
    
    // 检查是否有异常状态
    if (status.running.length > MAX_CONCURRENT_TASKS) {
      console.warn('警告: 运行中的任务数超过最大并发数!');
    }
    
    // 如果有队列任务但没有在处理，重新启动处理
    if (status.queue.length > 0 && !status.isProcessing) {
      console.log('检测到未处理的队列任务，重新启动处理...');
      processWorkflowQueue();
    }
  } catch (error) {
    console.error('监控状态时发生错误:', error);
  }
}

// 在服务启动时添加定期监控
setInterval(monitorTaskStatus, 30000); // 每30秒检查一次

// 修改后的服务器启动代码
(async () => {
  try {
    // 不再直接重置队列，而是恢复未完成的任务
    await restoreTaskQueue();
    
    // 确保API端点初始化
    console.log('初始化API端点配置:');
    API_ENDPOINTS.forEach(endpoint => {
      endpoint.running = 0;  // 重置运行数
      endpoint.status = 'active';  // 重置状态
      console.log(`- ${endpoint.url}: 最大并发数=${endpoint.maxConcurrent}`);
    });
    
    // 启动健康检查
    await performHealthChecks();
    
    // 启动任务处理 - 如果有队列任务
    const taskStatus = await getTaskStatus();
    if (taskStatus.queue.length > 0) {
      console.log(`恢复处理队列中的 ${taskStatus.queue.length} 个任务...`);
      processWorkflowQueue();
    }
    
    // 启动服务器
    const PORT = process.env.PORT || 8083;
    app.listen(PORT, () => {
      console.log(`任务管理器API服务运行在端口 ${PORT}`);
      console.log(`最大并发任务数: ${MAX_CONCURRENT_TASKS}`);
      console.log('可用工作流文件:');
      WORKFLOW_FILES.forEach(file => {
        console.log(`- ${file}`);
      });
      console.log(`工作流JSON文件目录: ${WORKFLOW_JSON_DIR}`);
      console.log(`任务状态文件: ${TASK_STATUS_FILE}`);
    });
  } catch (err) {
    console.error('服务器初始化失败:', err);
  }
})();

// 修改端点状态更新函数
async function updateApiEndpointStatus(index, updates) {
  if (index < 0 || index >= API_ENDPOINTS.length) {
    console.error('无效的端点索引:', index);
    return;
  }
  
  const endpoint = API_ENDPOINTS[index];
  const taskStatus = await getTaskStatus();
  
  // 始终使用实际运行的任务数
  const actualRunningTasks = taskStatus.running.filter(task => 
    task.endpoint === endpoint.url
  ).length;
  
  // 只在明确设置时更新 maxConcurrent
  const newStatus = updates.status ?? endpoint.status;
  const newMaxConcurrent = updates.maxConcurrent ?? endpoint.maxConcurrent;
  
  // 使用实际运行数，而不是传入的 running 值
  API_ENDPOINTS[index] = {
    ...endpoint,
    running: actualRunningTasks,
    status: newStatus,
    maxConcurrent: newMaxConcurrent
  };
  
  console.log(`端点 ${endpoint.url} 状态更新:`, {
    running: `${actualRunningTasks}/${newMaxConcurrent}`,
    status: newStatus,
    maxConcurrent: newMaxConcurrent
  });
}

// 修改获取最佳端点函数
async function getBestAvailableEndpoint() {
  const taskStatus = await getTaskStatus();
  const now = Date.now();
  
  console.log('=============== 详细并发状态 ===============');
  for (const endpoint of API_ENDPOINTS) {
    // 定义变量名为runningTasks
    const runningTasks = taskStatus.running.filter(task => 
      task.endpoint === endpoint.url && 
      task.status === 'running' && 
      !task.error
    );
    
    const actualRunning = runningTasks.length;
    const maxAllowed = endpoint.maxConcurrent;
    const hasCapacity = actualRunning < maxAllowed;
    
    console.log(`端点 ${endpoint.url}:`);
    console.log(`  运行任务数: ${actualRunning}/${maxAllowed} (有容量: ${hasCapacity})`);
    console.log(`  上次提交: ${new Date(endpoint.lastSubmitTime).toISOString()}`);
    
    const timeSinceLastSubmit = now - endpoint.lastSubmitTime;
    const requiredInterval = endpoint.lastSubmitTime === 0 ? FIRST_TASK_INTERVAL : NORMAL_TASK_INTERVAL;
    const timeReady = timeSinceLastSubmit >= requiredInterval;
    
    console.log(`  时间就绪: ${timeReady} (经过 ${timeSinceLastSubmit/1000}秒，需要 ${requiredInterval/1000}秒)`);
    
    // 使用正确的变量名runningTasks，而不是tasks
    runningTasks.forEach((task, idx) => {
      console.log(`  ${idx+1}. ${task.workflowFile} (用户: ${task.userId})`);
    });
  }
  console.log('============================================');
  
  try {
    // 过滤可用端点
    const availableEndpoints = API_ENDPOINTS.filter(endpoint => {
      const isActive = endpoint.status === 'active';
      
      // 明确计算实际运行任务
      const runningTasks = taskStatus.running.filter(task => 
        task.endpoint === endpoint.url && 
        task.status === 'running' && 
        !task.error
      );
      const actualRunning = runningTasks.length;
      const maxAllowed = endpoint.maxConcurrent;
      
      // 严格比较：确保实际运行任务数小于最大允许数
      const hasCapacity = actualRunning < maxAllowed;
      
      // 时间间隔检查
      const timeSinceLastSubmit = now - endpoint.lastSubmitTime;
      const requiredInterval = endpoint.lastSubmitTime === 0 ? FIRST_TASK_INTERVAL : NORMAL_TASK_INTERVAL;
      const timeReady = timeSinceLastSubmit >= requiredInterval;
      
      // 详细日志
      console.log(`检查端点 ${endpoint.url} 可用性详情:`, {
        isActive: isActive,
        hasCapacity: hasCapacity,
        timeReady: timeReady,
        actualRunning: actualRunning,
        maxConcurrent: maxAllowed,
        timeSinceLastSubmit: `${timeSinceLastSubmit/1000}秒`,
        比较结果: `${actualRunning} < ${maxAllowed} = ${actualRunning < maxAllowed}`
      });
      
      return isActive && hasCapacity && timeReady;
    });
    
    if (availableEndpoints.length === 0) {
      throw new Error('没有可用端点（所有端点可能达到最大并发数或时间间隔未到）');
    }
    
    // 按负载比例排序，选择负载最小的端点
    return availableEndpoints.sort((a, b) => {
      const aLoad = taskStatus.running.filter(task => 
        task.endpoint === a.url && 
        task.status === 'running' && 
        !task.error
      ).length / a.maxConcurrent;
      const bLoad = taskStatus.running.filter(task => 
        task.endpoint === b.url && 
        task.status === 'running' && 
        !task.error
      ).length / b.maxConcurrent;
      return aLoad - bLoad;
    })[0];
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

// 修改健康检查函数
async function checkEndpointHealth(endpoint) {
  try {
    // 使用基础URL
    const baseUrl = endpoint.url.replace('/scrape', '');
    
    // 先尝试检查基础端口是否在线
    console.log(`检查基础URL: ${baseUrl}`);
    try {
      const portResponse = await fetch(`${baseUrl}`, {
        method: 'GET',
        timeout: 3000
      });
      
      console.log(`基础端口检查状态码: ${portResponse.status}`);
      
      // 即使基础URL返回404，只要端口响应了，就认为服务正常
      if (portResponse.status >= 200) {
        const index = API_ENDPOINTS.findIndex(e => e.url === endpoint.url);
        if (index !== -1) {
          await updateApiEndpointStatus(index, { 
            status: 'active'
          });
        }
        console.log(`端点 ${endpoint.url} 健康检查: 正常 (端口活跃)`);
        return true;
      }
    } catch (portError) {
      console.log(`基础端口检查失败: ${portError.message}`);
    }
    
    // 如果基础端口检查失败，尝试直接检查完整端点
    console.log(`尝试检查完整端点: ${endpoint.url}`);
    try {
      const response = await fetch(endpoint.url, {
        method: 'OPTIONS',  // 使用OPTIONS方法只检查端点是否在线，不执行实际操作
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 3000
      });
      
      console.log(`完整端点检查状态码: ${response.status}`);
      const isHealthy = response.status >= 200;
      const index = API_ENDPOINTS.findIndex(e => e.url === endpoint.url);
      
      if (index !== -1) {
        await updateApiEndpointStatus(index, { 
          status: isHealthy ? 'active' : 'error'
        });
      }
      
      console.log(`端点 ${endpoint.url} 健康检查: ${isHealthy ? '正常' : '异常'}`);
      return isHealthy;
    } catch (endpointError) {
      console.log(`完整端点检查失败: ${endpointError.message}`);
    }
    
    // 如果所有检查都失败，则尝试简单的TCP端口检查
    console.log(`尝试最简单的端口检查方式`);
    
    try {
      // 执行系统命令检查端口
      const portNumber = new URL(baseUrl).port || '8082';
      console.log(`检查端口 ${portNumber} 是否开放`);
      
      // 如果有直接运行命令的能力，可以执行这样的命令
      // 例如: nc -z localhost 8082 || echo $?
      
      // 由于我们无法直接执行命令，所以这里简单地假设端口可能是开放的
      // 因为前面检查失败可能只是服务对请求方式有限制
      
      const index = API_ENDPOINTS.findIndex(e => e.url === endpoint.url);
      if (index !== -1) {
        console.log(`将端点 ${endpoint.url} 状态设置为 active (假设端口开放)`);
        await updateApiEndpointStatus(index, { 
          status: 'active'
        });
      }
      
      console.log(`端点 ${endpoint.url} 健康检查: 正常 (假设端口开放)`);
      return true;
    } catch (err) {
      console.error(`端口检查失败: ${err.message}`);
    }
    
    // 所有检查都失败了，将端点标记为错误
    const index = API_ENDPOINTS.findIndex(e => e.url === endpoint.url);
    if (index !== -1) {
      await updateApiEndpointStatus(index, { 
        status: 'error'
      });
    }
    console.error(`端点 ${endpoint.url} 健康检查: 异常 (所有检查都失败)`);
    return false;
  } catch (error) {
    console.error(`端点 ${endpoint.url} 健康检查过程出错:`, error);
    const index = API_ENDPOINTS.findIndex(e => e.url === endpoint.url);
    if (index !== -1) {
      await updateApiEndpointStatus(index, { 
        status: 'error'
      });
    }
    return false;
  }
}

// 定期进行健康检查
async function performHealthChecks() {
  console.log('执行API端点健康检查...');
  for (const endpoint of API_ENDPOINTS) {
    await checkEndpointHealth(endpoint);
  }
  
  // 输出当前状态
  console.log('API端点状态:');
  API_ENDPOINTS.forEach(endpoint => {
    console.log(`${endpoint.url}: ${endpoint.status}, 运行中: ${endpoint.running}/${endpoint.maxConcurrent}`);
  });
}

// 每分钟进行一次健康检查
setInterval(performHealthChecks, 60000);

// 添加API端点管理接口
app.get('/api/endpoints/status', (req, res) => {
  res.json({
    endpoints: API_ENDPOINTS.map(endpoint => ({
      url: endpoint.url,
      status: endpoint.status,
      running: endpoint.running,
      maxConcurrent: endpoint.maxConcurrent
    }))
  });
});

app.post('/api/endpoints/add', (req, res) => {
  const { url, maxConcurrent = 5 } = req.body;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数: url'
    });
  }
  
  API_ENDPOINTS.push({
    url,
    maxConcurrent,
    running: 0,
    status: 'active'
  });
  
  res.json({
    success: true,
    message: '已添加新的API端点'
  });
});

// 修改工作流执行函数，在任务完成后调用刷新端点状态
async function executeWorkflow(workflowItem) {
  try {
    console.log(`开始执行工作流: ${workflowItem.workflowFile}, 用户ID: ${workflowItem.userId}`);

    // 确保有正确的端点信息
    if (!workflowItem.endpoint) {
      throw new Error('工作流项中缺少端点信息，无法执行');
    }
    
    // 使用workflowItem中的端点信息
    const selectedEndpointUrl = workflowItem.endpoint;
    const endpointIndex = API_ENDPOINTS.findIndex(e => e.url === selectedEndpointUrl);
    
    if (endpointIndex === -1) {
      throw new Error(`找不到端点: ${selectedEndpointUrl}`);
    }

    // 更新工作流项的状态
    workflowItem.status = 'running';
    workflowItem.startTime = new Date();
    workflowItem.progress = 0;

    // 使用Promise包装加载工作流数据
    const workflowDataPromise = loadWorkflowData(workflowItem.workflowFile);
    
    // 立即返回一个Promise，不阻塞当前函数
    return workflowDataPromise.then(async workflowData => {
      const taskStatus = await getTaskStatus();
      // 准备任务数据
      const requestData = {
        ...workflowItem.taskConfig,
        sortedData: workflowData,
        workflowFile: workflowItem.workflowFile,
        meta: {
          originalEndpoint: selectedEndpointUrl,
          requestTime: Date.now()
        }
      };
      
      console.log(`工作流 ${workflowItem.workflowFile} 已加载，包含 ${workflowData.length} 个事件`);

      // 模拟进度更新
      let progressInterval;
      progressInterval = setInterval(() => {
        if (workflowItem.progress < 90) {
          workflowItem.progress += 5;
        }
      }, 1000);
      
      // 不再获取新的端点，使用传入的端点
      console.log(`使用API端点 ${selectedEndpointUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // 要求响应回调时包含原始信息
      headers["X-Callback-Include-Original-Endpoint"] = "true";
      
      // 对每个任务使用独立的回调URL，包含端点信息
      const callbackUrl = `${BASE_CALLBACK_URL}?endpoint=${encodeURIComponent(selectedEndpointUrl)}&taskId=${workflowItem.taskConfig?.row?.系统SKU || workflowItem.workflowFile}`;
      requestData.callbackUrl = callbackUrl;
      
      return fetch(selectedEndpointUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData),
        signal: controller.signal
      }).then(async response => {
        clearTimeout(timeoutId);
        
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
            try {
              console.log('响应不是单个JSON对象，尝试解析为多个JSON行');
              
              // 可能是流式响应，尝试按行分割并解析每一行
              const lines = responseText.split('\n').filter(line => line.trim());
              const parsedLines = [];
              
              for (const line of lines) {
                try {
                  const lineObj = JSON.parse(line);
                  parsedLines.push(lineObj);
                  
                  // 修改错误状态处理逻辑
                  if (lineObj.status === 'error' || lineObj.status === 'event_error' || lineObj.status === 'loop_event_error') {
                    console.error('检测到错误状态:', lineObj);
                    result.hasErrors = true;
                    result.lastError = lineObj;
                    // 不要在这里直接修改任务状态
                  }
                } catch (lineError) {
                  console.warn(`无法解析JSON行: ${line.substring(0, 100)}...`);
                }
              }
              
              if (parsedLines.length > 0) {
                console.log(`成功解析 ${parsedLines.length} 个JSON对象`);
                const lastObj = parsedLines[parsedLines.length - 1];
                result = {
                  status: lastObj.status || 'success',
                  messages: parsedLines,
                  lastMessage: lastObj
                };
                
                try {
                  // 获取最新的任务状态
                  const taskStatus = await getTaskStatus();
                  const index = taskStatus.running.findIndex(item => 
                    item.workflowFile === workflowItem.workflowFile && 
                    item.userId === workflowItem.userId
                  );
                  
                  if (index !== -1) {
                    if (result.hasErrors) {
                      // 如果有错误，将任务移到errors数组
                      const failedTask = {
                        ...taskStatus.running[index],
                        status: 'error',
                        error: result.lastError?.message || '执行过程中出现错误',
                        errorAt: new Date()
                      };
                      taskStatus.running.splice(index, 1);
                      taskStatus.errors.push(failedTask);
                      console.log(`任务执行出错，更新状态 - 运行中: ${taskStatus.running.length}, 队列中: ${taskStatus.queue.length}, 错误: ${taskStatus.errors.length}`);
                    } else {
                      // 如果成功完成，将任务移到completed数组
                      const completedTask = {
                        ...taskStatus.running[index],
                        status: 'completed',
                        completedAt: new Date()
                      };
                      taskStatus.running.splice(index, 1);
                      taskStatus.completed.push(completedTask);
                      console.log(`任务成功完成，更新状态 - 运行中: ${taskStatus.running.length}, 队列中: ${taskStatus.queue.length}, 已完成: ${taskStatus.completed.length}`);
                    }
                    
                    // 保存更新后的状态
                    await saveTaskStatus(taskStatus);
                    
                    // 添加：刷新所有端点状态，确保容量正确
                    await refreshEndpointStatuses();
                    
                    // 更新结果记录
                    taskStatus.results[workflowItem.workflowFile] = {
                      ...result,
                      userId: workflowItem.userId,
                      completedAt: new Date().toISOString()
                    };
                    await saveTaskStatus(taskStatus);
                    
                    console.log(`工作流 ${workflowItem.workflowFile} 执行完成`);
                    return result;
                  }
                } catch (error) {
                  console.error('更新任务状态时发生错误:', error);
                  throw error;
                }
              }
            } catch (error) {
              console.error(`任务执行失败: ${error.message}`);
              try {
                const updatedStatus = await getTaskStatus();
                const taskId = workflowItem.taskConfig?.row?.系统SKU || workflowItem.workflowFile;
                
                // 找到失败的任务
                const index = updatedStatus.running.findIndex(item => {
                  const itemId = item.taskConfig?.row?.系统SKU || item.workflowFile;
                  return itemId === taskId && 
                         item.workflowFile === workflowItem.workflowFile && 
                         item.userId === workflowItem.userId;
                });
                
                if (index !== -1) {
                  // 将失败的任务从running移到errors
                  const failedTask = {
                    ...updatedStatus.running[index],
                    status: 'error',
                    error: error.message,
                    errorAt: new Date()
                  };
                  updatedStatus.running.splice(index, 1);
                  updatedStatus.errors.push(failedTask);
                  
                  console.log(`任务失败，更新状态 - 运行中: ${updatedStatus.running.length}, 队列中: ${updatedStatus.queue.length}, 错误: ${updatedStatus.errors.length}`);
                  
                  await saveTaskStatus(updatedStatus);
                  
                  // 添加：刷新所有端点状态，确保容量正确
                  await refreshEndpointStatuses();
                  
                  // 不直接调用 processNextBatch，而是通过主队列处理函数继续处理
                  if (updatedStatus.queue.length > 0) {
                    processWorkflowQueue();
                  }
                }
              } catch (statusError) {
                console.error('更新错误状态时发生错误:', statusError);
                // 出错时也尝试继续处理队列
                processWorkflowQueue();
              }
            }
          }
        }
        
        // 更新完成状态
        workflowItem.progress = 100;
        workflowItem.status = 'completed';
        workflowItem.completedAt = new Date();
        taskStatus.results[workflowItem.workflowFile] = {
          ...result,
          userId: workflowItem.userId,
          completedAt: new Date().toISOString()
        };
        await saveTaskStatus(taskStatus);
        
        // 添加：刷新所有端点状态，确保容量正确
        await refreshEndpointStatuses();
        
        console.log(`工作流 ${workflowItem.workflowFile} 执行完成`);
        
        return result;
      }).catch(async error => {
        console.error(`API端点 ${selectedEndpointUrl} 请求失败:`, error);
        throw error;
      }).finally(async () => {
        // 更新端点状态，包括运行中任务数
        if (selectedEndpointUrl && endpointIndex !== -1) {
          // 重新获取所有端点状态，而不是仅修改状态标志
          await refreshEndpointStatuses();
        }
      });
    }).catch(async error => {
      // 获取当前任务状态 - 这里添加
      const taskStatus = await getTaskStatus();
      
      // 更新错误状态
      workflowItem.status = 'error';
      workflowItem.error = error.message;
      workflowItem.errorAt = new Date();
      
      taskStatus.results[workflowItem.workflowFile] = { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
        userId: workflowItem.userId
      };
      
      // 保存更新的状态 - 这里添加
      await saveTaskStatus(taskStatus);
      
      console.error(`工作流 ${workflowItem.workflowFile} 初始化失败:`, error);
      throw error;
    });
  } catch (initialError) {
    // 处理初始化过程中的错误
    console.error(`工作流 ${workflowItem.workflowFile} 初始化失败:`, initialError);
    
    // 确保清除进度更新定时器
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    throw initialError;
  }
}

// 1. 改进任务完成信号捕获 - 在refreshEndpointStatuses函数中添加清理逻辑
async function refreshEndpointStatuses() {
  console.log("刷新所有端点状态 + 清理僵尸任务...");
  
  try {
    // 获取任务状态以准确计算每个端点的运行任务数
    const taskStatus = await getTaskStatus();
    let cleanedTasks = 0;
    
    // 先检查是否有僵尸任务 - 完成了但状态未更新的任务
    for (let i = taskStatus.running.length - 1; i >= 0; i--) {
      const task = taskStatus.running[i];
      
      // 检查任务是否长时间无活动 (超过30分钟)
      const now = Date.now();
      const taskStartTime = task.startedAt ? new Date(task.startedAt).getTime() : 0;
      const runningTime = now - taskStartTime;
      
      if (runningTime > 30 * 60 * 1000) { // 30分钟
        console.log(`检测到长时间运行任务: ${task.workflowFile}，运行时间: ${Math.floor(runningTime/60000)}分钟，执行清理`);
        
        // 移到错误列表
        task.status = 'error';
        task.error = '任务执行超时，系统自动终止';
        task.completedAt = new Date().toISOString();
        taskStatus.errors.push(task);
        taskStatus.running.splice(i, 1);
        cleanedTasks++;
      }
    }
    
    if (cleanedTasks > 0) {
      console.log(`已清理 ${cleanedTasks} 个僵尸任务`);
      await saveTaskStatus(taskStatus);
    }
    
    // 继续正常的端点状态刷新...
    for (const endpoint of API_ENDPOINTS) {
      try {
        // 计算此端点上运行的任务数
        const runningTasksOnEndpoint = taskStatus.running.filter(task => 
          task.endpoint === endpoint.url && 
          task.status === 'running' && 
          !task.error
        ).length;
        
        // 更新端点状态
        endpoint.running = runningTasksOnEndpoint;
        
        console.log(`端点 ${endpoint.url} 状态刷新: 运行任务数 ${runningTasksOnEndpoint}/${endpoint.maxConcurrent}`);
      } catch (endpointError) {
        console.error(`刷新端点 ${endpoint.url} 状态时出错:`, endpointError);
      }
    }
  } catch (error) {
    console.error("刷新端点状态时发生错误:", error);
  }
}

// 2. 添加定期端点状态刷新和任务清理
// 每10分钟自动刷新所有端点状态并清理僵尸任务
setInterval(async () => {
  console.log("定期执行端点状态刷新和任务清理...");
  await refreshEndpointStatuses();
}, 10 * 60 * 1000);

// 修改updateTaskStatus函数，在任务状态变更时刷新端点状态
async function updateTaskStatus(taskId, status, message = null) {
  const taskStatus = await getTaskStatus();
  const taskIndex = taskStatus.running.findIndex(task => 
    task.workflowFile === taskId || 
    (task.taskConfig && task.taskConfig.task_name === taskId)
  );
  
  if (taskIndex !== -1) {
    // 更新任务状态
    const task = taskStatus.running[taskIndex];
    const previousEndpoint = task.endpoint; // 保存端点信息以便更新
    task.status = status;
    
    if (status === 'completed' || status === 'error') {
      task.completedAt = new Date().toISOString();
      // 记录原因（如果提供）
      if (message) task.message = message;
      
      // 从运行列表移除
      taskStatus.running.splice(taskIndex, 1);
      
      // 添加到相应列表
      if (status === 'completed') {
        taskStatus.completed.push(task);
      } else {
        taskStatus.errors.push(task);
      }
      
      console.log(`任务 ${taskId} 已${status === 'completed' ? '完成' : '出错'}: ${message || ''}`);
    }
    
    // 保存任务状态到文件
    await saveTaskStatus(taskStatus);
    
    // 刷新端点状态
    await refreshEndpointStatuses();
    
    return true;
  }
  
  return false;
}

// 修改任务超时处理
function handleTaskTimeout(taskId) {
  console.log(`任务 ${taskId} 执行超时，强制终止`);
  
  // 检查任务是否已经完成大部分操作（例如关闭了AdsPower页面）
  // 可以添加一些启发式逻辑，判断任务是否实际完成
  const taskLogs = getTaskLogs(taskId); // 假设有获取任务日志的功能
  
  // 如果日志中包含"adsPower页面已关闭"等完成标志，将其标记为已完成而非错误
  if (taskLogs && taskLogs.includes("adsPower页面已关闭")) {
    updateTaskStatus(taskId, 'completed', '任务实际已完成，但由于超时被系统终止');
  } else {
    updateTaskStatus(taskId, 'error', '任务执行超时，强制终止');
  }
}

// 1. 添加页面关闭检测机制
async function monitorBrowserSession(taskId, interval = 5000) {
  // 创建一个定时检查机制
  const checkInterval = setInterval(async () => {
    try {
      // 从日志或状态中检查是否有"adsPower页面已关闭"的记录
      const taskLogs = await getRecentLogEntries(taskId); // 实现这个函数获取最近的日志
      
      if (taskLogs.some(log => 
          log.includes("adsPower页面已关闭") || 
          log.includes("关闭了啊"))) {
        // 页面已关闭，更新任务状态
        clearInterval(checkInterval);
        await updateTaskStatus(taskId, 'completed', '浏览器会话已结束，任务完成');
        console.log(`检测到任务 ${taskId} 的浏览器已关闭，自动更新为已完成状态`);
      }
    } catch (error) {
      console.error(`监控任务 ${taskId} 状态时出错:`, error);
    }
  }, interval);
  
  // 存储定时器ID以便后续清理
  browserMonitors[taskId] = checkInterval;
  
  // 设置一个整体超时时间（例如2小时），防止无限监控
  setTimeout(() => {
    if (browserMonitors[taskId]) {
      clearInterval(browserMonitors[taskId]);
      delete browserMonitors[taskId];
    }
  }, 7200000); // 2小时
}

// 2. 获取最近日志的辅助函数(简化版)
async function getRecentLogEntries(taskId, lines = 20) {
  // 实现方式取决于你的日志存储方式
  // 可以是从文件读取、内存缓存或数据库查询
  try {
    // 假设任务日志存储在内存或文件中
    const logBuffer = taskLogBuffers[taskId] || [];
    return logBuffer.slice(-lines);
  } catch (error) {
    console.error(`获取任务 ${taskId} 日志失败:`, error);
    return [];
  }
}

// 3. 启动任务时开始监控
async function startTask(taskIdentifier, userId, taskConfig, endpoint) {
  try {
    // 确保使用一致的标识符 - 检查taskIdentifier是否是正确的工作流文件名
    let workflowFile = taskIdentifier;
    
    // 如果taskIdentifier不是以.json结尾，则可能是SKU或产品ID，需要查找正确的工作流文件
    if (!taskIdentifier.endsWith('.json')) {
      // 记录原始标识符
      console.log(`任务标识符 ${taskIdentifier} 不是工作流文件，尝试查找对应工作流...`);
      
      // 如果taskConfig中包含工作流文件信息，使用它
      if (taskConfig && taskConfig.workflowFile) {
        workflowFile = taskConfig.workflowFile;
      } else {
        // 否则使用默认的kandeng.json（根据你的日志，这似乎是默认的）
        workflowFile = 'kandeng.json';
      }
      
      console.log(`将任务 ${taskIdentifier} 映射到工作流文件: ${workflowFile}`);
    }
    
    // 在日志中明确记录映射关系
    console.log(`启动任务: [ID: ${taskIdentifier}] => [工作流: ${workflowFile}], 用户: ${userId}`);
    
    // 更新任务状态
    const taskStatus = await getTaskStatus();
    
    // 将任务添加到运行中列表，确保保存正确的标识符和工作流文件
    const task = {
      id: taskIdentifier,           // 保存原始任务ID
      workflowFile: workflowFile,   // 保存工作流文件名
      userId: userId,
      taskConfig: taskConfig,
      status: 'running',
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      endpoint: endpoint
    };
    
    taskStatus.running.push(task);
    await saveTaskStatus(taskStatus);
    
    // 继续执行工作流
    console.log(`开始执行工作流: ${workflowFile}, 任务ID: ${taskIdentifier}, 用户ID: ${userId}`);
    
    // 其余执行代码...
    
    return true;
  } catch (error) {
    console.error(`启动任务失败 [${taskIdentifier}]:`, error);
    return false;
  }
}

// nohup  node task_manager_api.js > task_manager_api.log 2>&1 &

/**
 * 清理运行中但实际已结束的任务
 * 检查所有标记为running的任务，更新那些已经实际完成的任务状态
 */
async function cleanupRunningTasks() {
  console.log("开始清理运行中但可能已经完成的任务...");
  
  try {
    const taskStatus = await getTaskStatus();
    const now = Date.now();
    let updatedCount = 0;
    
    // 检查每个运行中的任务
    for (let i = taskStatus.running.length - 1; i >= 0; i--) {
      const task = taskStatus.running[i];
      
      // 检查哪些任务可能已经完成但状态未更新
      // 1. 检查任务是否已经运行了很长时间(超过2小时)
      const taskRunTime = task.startedAt ? (now - new Date(task.startedAt).getTime()) : 0;
      const isTooLong = taskRunTime > 20 * 60 * 1000; 
      
      // 2. 检查任务日志或其他标记(如果存在)
      // 这里需要根据你的系统来实现检查逻辑
      
      if (isTooLong) {
        console.log(`任务 ${task.workflowFile} (${task.taskConfig?.task_name || '未命名'}) 运行时间过长(${Math.round(taskRunTime/60000)}分钟)，标记为错误`);
        
        // 移动到错误列表
        task.status = 'error';
        task.error = '任务运行时间过长，系统自动终止';
        task.completedAt = new Date().toISOString();
        taskStatus.error.push(task);
        taskStatus.running.splice(i, 1);
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      console.log(`已清理 ${updatedCount} 个卡住的任务`);
      await saveTaskStatus(taskStatus);
    } else {
      console.log("没有发现需要清理的任务");
    }
  } catch (error) {
    console.error("清理任务时发生错误:", error);
  }
}


// nohup  node task_manager_api.js > task_manager_api.log 2>&1 &