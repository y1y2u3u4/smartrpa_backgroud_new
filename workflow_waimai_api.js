// 工作流自动化API服务

import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// 保存工作流的状态
const workflowStatus = {
  currentWorkflow: null,
  queue: [],          // 待处理工作流队列
  completed: [],      // 已完成的工作流
  inProgress: false,  // 是否有工作流正在进行
  currentProgress: 0, // 当前工作流进度 (0-100)
  status: 'idle',     // 状态: idle, running, completed, error
  error: null,        // 错误信息
  startTime: null,    // 当前工作流开始时间
  endTime: null,      // 当前工作流结束时间
  results: {},        // 每个工作流的执行结果
  errors: []          // 错误记录
};

// 任务基础配置
const taskConfigs = {
  'meituan': {
    name: '美团外卖自动化任务',
    data: {
      user_id: '用户-i6rdm9',
      tuiguang_phonenumber: '1234567890',
      task_name: 'waimai_meituan',
      adsPowerUserId: 'knibk1h',
      BASE_URL: 'https://waimaie.meituan.com/',
      row: {
        "cityname": "上海",
        "storename": "测试店铺",
        "product": "测试产品"
      }
    }
  },
  'jingdong': {
    name: '京东外卖自动化任务',
    data: {
      user_id: 'f7e2ab3b-de08-41ee-82ad-d23d1a337936',
      tuiguang_phonenumber: '1234567890',
      task_name: 'waimai_jingdong',
      adsPowerUserId: 'knibk1h',
      BASE_URL: 'https://store.jddj.com/',
      row: {
        "cityname": "上海",
        "storename": "测试店铺",
        "product": "测试产品"
      }
    }
  }
};

// 从文件加载工作流数据
async function loadWorkflowData(filename) {
  try {
    const filePath = path.join(__dirname, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`加载工作流数据文件失败 ${filename}:`, error.message);
    throw new Error(`无法加载工作流文件 ${filename}: ${error.message}`);
  }
}

// 执行单个工作流
async function executeWorkflow(workflowFile) {
  // 定义进度更新定时器变量
  let progressInterval;
  
  try {
    // 更新状态
    workflowStatus.currentWorkflow = workflowFile;
    workflowStatus.status = 'running';
    workflowStatus.currentProgress = 0;
    workflowStatus.startTime = new Date();
    workflowStatus.error = null;

    console.log(`开始执行工作流: ${workflowFile}`);

    // 根据文件名确定是美团还是京东任务
    const taskType = workflowFile.includes('meituan') ? 'meituan' : 'jingdong';
    const taskConfig = {...taskConfigs[taskType].data};

    // 加载工作流数据
    const workflowData = await loadWorkflowData(workflowFile);
    
    // 准备任务数据
    taskConfig.sortedData = workflowData;
    
    console.log(`工作流 ${workflowFile} 已加载，包含 ${workflowData.length} 个事件`);
    console.log(`使用任务类型: ${taskType}`);

    // 模拟进度更新
    progressInterval = setInterval(() => {
      if (workflowStatus.currentProgress < 90) {
        workflowStatus.currentProgress += 5;
      }
    }, 1000);

    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000000); // 5分钟超时
    
    try {
      // 发送请求到自动化服务
      // 添加workflowFile到请求数据中
      const requestData = {
        ...taskConfig,
        workflowFile: workflowFile
      };
      
      const response = await fetch('http://localhost:8082/scrape_base', {
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
      
      const result = await response.json();
      
      // 更新完成状态
      workflowStatus.currentProgress = 100;
      workflowStatus.completed.push(workflowFile);
      workflowStatus.results[workflowFile] = result;
      workflowStatus.endTime = new Date();
      
      console.log(`工作流 ${workflowFile} 执行完成`);
      console.log(`结果: ${JSON.stringify(result, null, 2)}`);
      
      return result;
    } catch (fetchError) {
      // 处理fetch特定错误
      if (fetchError.name === 'AbortError') {
        throw new Error('请求超时，执行时间超过50分钟');
      } else {
        throw fetchError; // 重新抛出其他错误
      }
    }
  } catch (error) {
    // 更新错误状态
    workflowStatus.status = 'error';
    workflowStatus.error = error.message;
    workflowStatus.endTime = new Date();
    console.error(`工作流 ${workflowFile} 执行失败:`, error);
    throw error; // 向上抛出错误，让调用者决定如何处理
  } finally {
    // 确保清除进度更新定时器
    if (progressInterval) {
      clearInterval(progressInterval);
    }
  }
}

// 处理工作流队列
async function processWorkflowQueue() {
  if (workflowStatus.inProgress || workflowStatus.queue.length === 0) {
    return;
  }

  workflowStatus.inProgress = true;
  workflowStatus.status = 'running';

  try {
    while (workflowStatus.queue.length > 0) {
      const workflowItem = workflowStatus.queue.shift();
      const workflowFile = workflowItem.workflowFile;
      const userId = workflowItem.userId;
      
      // 更新当前正在处理的工作流信息
      workflowStatus.currentWorkflow = workflowItem;
      
      console.log(`开始执行工作流: ${workflowFile}，用户ID: ${userId}`);
      
      try {
        // 确定工作流类型并设置配置
        const taskType = workflowFile.includes('jingdong') ? 'jingdong' : 'meituan';
        const taskConfig = {
          ...taskConfigs[taskType].data,
          user_id: userId,
          workflowFile
        };
        
        // 尝试执行当前工作流
        await executeWorkflow(workflowFile, taskConfig);
        
        // 记录完成状态
        workflowStatus.completed.push({
          ...workflowItem,
          completedAt: new Date()
        });
        
        console.log(`工作流 ${workflowFile} 成功执行完成，继续处理下一个工作流`);
      } catch (workflowError) {
        // 单个工作流执行失败，记录错误但继续执行下一个
        console.error(`工作流 ${workflowFile} 执行失败: ${workflowError.message}`);
        
        // 记录错误信息
        workflowStatus.errors.push({
          ...workflowItem,
          errorAt: new Date(),
          error: workflowError.message
        });
        
        workflowStatus.results[workflowFile] = { 
          success: false, 
          error: workflowError.message,
          timestamp: new Date().toISOString(),
          userId
        };
        // 不抛出错误，而是继续下一个工作流
      }
    }
    
    // 所有工作流完成
    workflowStatus.status = 'completed';
    workflowStatus.currentWorkflow = null;
    console.log('所有工作流执行完毕');
  } catch (error) {
    console.error('工作流队列处理致命错误:', error);
    workflowStatus.status = 'error';
    workflowStatus.error = `队列处理错误: ${error.message}`;
  } finally {
    workflowStatus.inProgress = false;
    console.log('工作流队列处理完成，inProgress设置为false');
  }
}

// API端点: 启动所有工作流
app.post('/api/workflow/start', async (req, res) => {
  try {
    // 获取请求中的用户ID和其他参数
    const { user_id, adsPowerUserId, tuiguang_phonenumber, workflowFiles } = req.body;
    
    // 验证必要参数
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: user_id'
      });
    }
    
    // 如果已经在运行，返回状态
    if (workflowStatus.inProgress) {
      return res.status(409).json({
        success: false,
        message: '工作流队列已在运行中',
        status: workflowStatus
      });
    }
    
    // 更新任务配置中的用户ID和其他参数
    taskConfigs.meituan.data.user_id = user_id;
    taskConfigs.jingdong.data.user_id = user_id;
    
    // 更新其他可选参数
    if (adsPowerUserId) {
      taskConfigs.meituan.data.adsPowerUserId = adsPowerUserId;
      taskConfigs.jingdong.data.adsPowerUserId = adsPowerUserId;
    }
    
    if (tuiguang_phonenumber) {
      taskConfigs.meituan.data.tuiguang_phonenumber = tuiguang_phonenumber;
      taskConfigs.jingdong.data.tuiguang_phonenumber = tuiguang_phonenumber;
    }
    
    // 重置状态
    // 如果提供了自定义工作流文件列表，则使用它，否则使用默认列表
    const workflowsToProcess = Array.isArray(workflowFiles) && workflowFiles.length > 0 
      ? [...workflowFiles] 
      : [...WORKFLOW_FILES];
      
    // 将每个工作流文件名转换为包含用户ID的对象
    workflowStatus.queue = workflowsToProcess.map(file => ({
      workflowFile: file,
      userId: user_id,
      createdAt: new Date()
    }));
      
    workflowStatus.completed = [];
    workflowStatus.currentWorkflow = null;
    workflowStatus.currentProgress = 0;
    workflowStatus.status = 'idle';
    workflowStatus.error = null;
    workflowStatus.results = {};
    
    // 输出当前配置信息
    console.log('启动工作流，配置信息:');
    console.log(`用户ID: ${user_id}`);
    console.log(`AdsPower用户ID: ${adsPowerUserId || taskConfigs.meituan.data.adsPowerUserId}`);
    console.log(`推广电话: ${tuiguang_phonenumber || taskConfigs.meituan.data.tuiguang_phonenumber}`);
    console.log(`工作流文件: ${workflowStatus.queue.map(item => item.workflowFile).join(', ')}`);
    
    // 开始处理队列（非阻塞）
    processWorkflowQueue();
    
    res.json({
      success: true,
      message: '工作流队列已启动',
      config: {
        user_id,
        adsPowerUserId: adsPowerUserId || taskConfigs.meituan.data.adsPowerUserId,
        tuiguang_phonenumber: tuiguang_phonenumber || taskConfigs.meituan.data.tuiguang_phonenumber
      },
      queueLength: workflowStatus.queue.length,
      workflowFiles: workflowStatus.queue.map(item => item.workflowFile)
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
    const totalWorkflows = workflowStatus.completed.length + workflowStatus.queue.length;
    const totalProgress = totalWorkflows > 0 
      ? Math.round((workflowStatus.completed.length / totalWorkflows) * 100)
      : 0;
    
    return res.json({
      ...workflowStatus,
      remainingWorkflows: workflowStatus.queue,
      totalProgress,
      totalWorkflows
    });
  }
  
  // 根据用户ID筛选工作流
  const userCompleted = workflowStatus.completed.filter(workflow => workflow.userId === userId);
  const userQueue = workflowStatus.queue.filter(workflow => workflow.userId === userId);
  const userRunning = workflowStatus.currentWorkflow && workflowStatus.currentWorkflow.userId === userId 
    ? [workflowStatus.currentWorkflow] 
    : [];
  const userErrors = workflowStatus.errors ? workflowStatus.errors.filter(workflow => workflow.userId === userId) : [];
  
  // 计算用户特定的总体进度
  const userTotalWorkflows = userCompleted.length + userQueue.length;
  const userTotalProgress = userTotalWorkflows > 0 
    ? Math.round((userCompleted.length / userTotalWorkflows) * 100)
    : 0;
  
  res.json({
    completed: userCompleted,
    queue: userQueue,
    running: userRunning,
    errors: userErrors,
    remainingWorkflows: userQueue,
    totalProgress: userTotalProgress,
    totalWorkflows: userTotalWorkflows
  });
});

// API端点: 重置状态
app.post('/api/workflow/reset', (req, res) => {
  // 重置状态
  workflowStatus.queue = [];
  workflowStatus.completed = [];
  workflowStatus.currentWorkflow = null;
  workflowStatus.inProgress = false;
  workflowStatus.currentProgress = 0;
  workflowStatus.status = 'idle';
  workflowStatus.error = null;
  workflowStatus.startTime = null;
  workflowStatus.endTime = null;
  workflowStatus.results = {};
  
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

// 启动服务器
const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`工作流API服务已启动，监听端口 ${PORT}`);
  console.log('可用的API端点:');
  console.log('- POST /api/workflow/start     启动所有工作流');
  console.log('- GET  /api/workflow/status    获取当前状态');
  console.log('- POST /api/workflow/reset     重置状态');
  console.log('- GET  /api/workflow/result/:filename 获取特定工作流的结果');
});
