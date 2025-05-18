import { findTaskList_taskname, findTaskList_taskname_limit } from "./notes.js";
import fs from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync'; // 修改这里，使用 import 语法
// const TaskList = await findTaskList_taskname('xiaohongshu');
// const TaskList = await findTaskList_taskname('xiaohongshuxiangqing');
const TaskList = await findTaskList_taskname('OZON_keyword_sku');

const expandedData = [];
if (!TaskList || TaskList.length === 0) {
  console.log('TaskList 为空，没有找到任何任务数据');
  process.exit(0);
}

console.log(`成功获取到 ${TaskList.length} 条任务数据`);

TaskList.forEach((task, index) => {
  try {
    // 添加日期过滤
    const taskDate = new Date(task.created_at);
    const filterDate = new Date('2024-09-07T03:00:00');

    if (taskDate > filterDate) {
      const outputData = JSON.parse(task.run_output);
      // 检查outputData是否为数组，如果不是则将其转换为数组
      const dataArray = Array.isArray(outputData) ? outputData : [outputData];
      
      dataArray.forEach(item => {
        expandedData.push({
          link: item.link || '',
          id: item.id || '',
          title: item.title || '',
          imageUrl: item.imageUrl || '',
          imageUrlHigh: item.imageUrlHigh || '',
          currentPrice: item.currentPrice || '',
          oldPrice: item.oldPrice || '',
          discount: item.discount || '',
          rating: item.rating || '',
          reviewCount: item.reviewCount || '',
          stockLeft: item.stockLeft || '',
          deliveryDate: item.deliveryDate || '',
          crawlTime: item.crawlTime || '',
          searchKeyword: item.searchKeyword || '',
          // 任务相关信息
          original_index: index,
          task_name: task.task_name,
          description: task.description,
          user_email: task.user_email,
          task_id: task.id,
          created_at: task.created_at
        });
      });
    }
  } catch (error) {
    console.error(`解析第 ${index} 条数据时出错:`, error);
    console.error('错误详情:', error.message);
    console.error('任务数据:', task.run_output);
  }
});

// 按照created_at时间正序排序
expandedData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

// // 清空数组，保留7000之后的数据
// expandedData.splice(0, 7000);

// // 将结果保存为CSV
// 添加数据检查
if (expandedData.length === 0) {
  console.log('没有找到任何数据');
  process.exit(0);
}
const validData = expandedData.filter(item => item !== null && item !== undefined);
if (validData.length === 0) {
  console.log('处理后的数据为空');
  process.exit(0);
}

// 确保目录存在
const outputDir = './测试数据';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const headers = Object.keys(expandedData[0]).join(',');
const csvContent = [
  headers,
  ...expandedData.map(row =>
    Object.values(row).map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(',')
  )
].join('\n');

fs.writeFileSync('./测试数据/OZON_keyword_sku_1224.csv', '\ufeff' + csvContent, { encoding: 'utf8' });
console.log(`处理完成，共导出 ${expandedData.length} 条记录`);
