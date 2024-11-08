// modules/taskExecutor.js
import { loadConfig } from './configManager.js';
import { OutputFactory } from './outputHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';  // 使用 fs 的 promise 版本
import { inserttask, findTaskList, findTaskruncode } from "./notes.js";
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取项目根目录（假设 modules 文件夹在项目根目录下）
const rootDir = path.resolve(__dirname, '..');

async function getTaskExecutorCodeWithCache(task_name) {
    // let taskExecutorCode = cache.get(`taskExecutorcode_${task_name}`);
    let taskExecutorCode = null
    if (!taskExecutorCode) {
        console.log(`从数据库中加载 ${task_name} 代码`);
        const TaskList = await findTaskruncode(task_name);
        TaskList.sort((a, b) => b.id - a.id);
        const filteredTasks = TaskList.filter(task => task.run_code !== 'test');
        const latestTask = filteredTasks.length > 0 ? filteredTasks.sort((a, b) => b.id - a.id)[0] : filteredTasks;
        taskExecutorCode = latestTask.run_code;
        cache.set(`taskExecutorcode_${task_name}`, taskExecutorCode);
    } else {
        console.log(`从缓存中加载 ${task_name} 代码`);
    }
    // console.log('taskExecutorCode:', taskExecutorCode);
    return taskExecutorCode;
}


async function createNewJsFile(filePath, codeString) {
    try {
        // 创建新文件
        await fs.writeFile(filePath, codeString, 'utf8');
        console.log(`新文件创建成功，代码已保存: ${filePath}`);
    } catch (error) {
        console.error('创建新文件时出错:', error);
    }
}

export async function taskExecutor(task_name) {
    try {
        // 从缓存或数据库加载 taskExecutor 的代码
        
        const filePath = path.join(rootDir, 'modules', `taskExecutor_${task_name}.js`);
        
        try {
            // 检查文件是否存在
            await fs.access(filePath);
            console.log(`文件 ${filePath} 已存在，不进行更新和替换`);
        } catch (error) {
            // 文件不存在，创建新文件
            const taskExecutorCode = await getTaskExecutorCodeWithCache(task_name);
            await createNewJsFile(filePath, taskExecutorCode);
            console.log('文件创建成功，代码已保存');
        }
        //读取下taskExecutor_douyin.js
        // const taskExecutorCode_check = await fs.readFile(`./modules/taskExecutor_${task_name}.js`, 'utf8');
        // console.log('taskExecutorCode_check:', taskExecutorCode_check);

    } catch (error) {
        console.error('An error occurred in handler_run:', error);
    }
}

