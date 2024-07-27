
// import { OutputFactory } from './outputHandler.js';
// const outputHandler = OutputFactory.createOutputHandler("online");
// const cookies='123'
// await outputHandler.handle(JSON.stringify(cookies, null, 2), 'login');

import { inserttask, findTaskList } from "./notes.js";

const TaskList = await findTaskList("大众点评数据获取_北京_体适能关建词");
TaskList.sort((a, b) => b.id - a.id);
const latestTask = TaskList[0];
// console.log('TaskList', TaskList)
console.log('latestTask', latestTask.task_cookies)
console.log('latestTask_task_name', latestTask.task_name)