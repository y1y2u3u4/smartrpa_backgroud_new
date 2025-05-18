import { findTaskList_taskname_limit_llm, findTaskList_taskname_limit } from "./notes.js";
import fs from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

const TaskList = await findTaskList_taskname_limit_llm('ozon_description_001', 150000, 30000);

if (!TaskList || TaskList.length === 0) {
  console.log('TaskList 为空，没有找到任何任务数据');
  process.exit(0);
}

console.log(`成功获取到 ${TaskList.length} 条任务数据`);

// 确保目录存在
const outputDir = './测试数据';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const headers = Object.keys(TaskList[0]).join(',');
const csvContent = [
  headers,
  ...TaskList.map(row =>
    Object.values(row).map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(',')
  )
].join('\n');

fs.writeFileSync('./测试数据/OZON_description_006.csv', '\ufeff' + csvContent, { encoding: 'utf8' });
console.log(`处理完成，共导出 ${TaskList.length} 条记录`);
