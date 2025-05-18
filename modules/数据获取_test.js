import { findTaskList_taskname, findTaskList_taskname_limit,findTaskList_taskname_test_shop_name,findTaskList_taskname_test } from "./notes.js";
import fs from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync'; // 修改这里，使用 import 语法

console.log('开始获取数据...');
const startTime = Date.now();

// const TaskList = await findTaskList_taskname_test_shop_name('W-FacilityX');
const TaskList = await findTaskList_taskname_test();

const endTime = Date.now();
const timeElapsed = (endTime - startTime) / 1000; // 转换为秒

const expandedData = [];
if (!TaskList || TaskList.length === 0) {
  console.log('TaskList 为空，没有找到任何任务数据');
  process.exit(0);
}

console.log(`成功获取到 ${TaskList.length} 条任务数据`);
console.log(`数据获取耗时: ${timeElapsed.toFixed(2)} 秒`);
console.log(`平均每条数据获取时间: ${(timeElapsed / TaskList.length).toFixed(3)} 秒`);
