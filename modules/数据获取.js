import { findTaskList_taskname, findTaskList_taskname_limit } from "./notes.js";
import fs from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync'; // 修改这里，使用 import 语法
// const TaskList = await findTaskList_taskname('OZON');
// const expandedData = [];

// TaskList.forEach((task, index) => {
//   try {
//     const outputData = JSON.parse(task.run_output);
//     if (Array.isArray(outputData)) {
//       outputData.forEach(sku => {
//         if (task.description !== '') {
//           expandedData.push({
//             ...sku,
//             original_index: index,
//             task_name: task.task_name,
//             description: task.description,
//             user_email: task.user_email
//           });
//         }
//       });
//     }
//   } catch (error) {
//     console.error(`解析第 ${index} 条数据时出错:`, error);
//   }
// });

// // // 将结果保存为CSV

// const headers = Object.keys(expandedData[0]).join(',');
// const csvContent = [
//   headers,
//   ...expandedData.map(row =>
//     Object.values(row).map(value =>
//       `"${String(value).replace(/"/g, '""')}"`
//     ).join(',')
//   )
// ].join('\n');

// fs.writeFileSync('../测试数据/expanded_OZON_05.csv', csvContent);
// console.log(`处理完成，共导出 ${expandedData.length} 条记录`);


// 定义处理范围和批次大小
// const startIndex = 0;
// const endIndex = 1000;
// const batchSize = 500;

// // 循环处理每个批次
// for (let currentStart = startIndex; currentStart < endIndex; currentStart += batchSize) {
//   const currentEnd = Math.min(currentStart + batchSize, endIndex);
//   console.log(`正在处理范围: ${currentStart} - ${currentEnd}`);

//   const TaskList = await findTaskList_taskname_limit('OZON_SKU_001', currentStart, currentEnd);
//   const expandedData = [];

//   TaskList.forEach((task, index) => {
//     try {
//       const outputData = JSON.parse(task.run_output);
//       if (Array.isArray(outputData)) {
//         outputData.forEach(sku => {
//           expandedData.push({
//             imageUrl: sku.imageUrl || 'N/A',
//             title: sku.title || 'N/A',
//             productUrl: sku.productUrl || 'N/A',
//             brand: sku.brand || 'N/A',
//             category1: sku.category1 || 'N/A',
//             category3: sku.category3 || 'N/A',
//             orderAmount: sku.orderAmount || 'N/A',
//             salesDynamics: sku.salesDynamics || 'N/A',
//             orderedQuantity: sku.orderedQuantity || 'N/A',
//             averagePrice: sku.averagePrice || 'N/A',
//             missedSales: sku.missedSales || 'N/A',
//             subscriptionShare: sku.subscriptionShare || 'N/A',
//             availability: sku.availability || 'N/A',
//             dailyAverageSales: sku.dailyAverageSales || 'N/A',
//             searchViews: sku.searchViews || 'N/A',
//             cardViews: sku.cardViews || 'N/A',
//             searchAddToCart: sku.searchAddToCart || 'N/A',
//             cardAddToCart: sku.cardAddToCart || 'N/A',
//             adCostShare: sku.adCostShare || 'N/A',
//             listingDate: sku.listingDate || 'N/A',
//             original_index: index + currentStart,
//             task_name: task.task_name,
//             description: task.description,
//             user_email: task.user_email
//           });
//         });
//       }
//     } catch (error) {
//       console.error(`解析第 ${index + currentStart} 条数据时出错:`, error);
//     }
//   });

//   // 为每个批次创建单独的文件
//   const headers = Object.keys(expandedData[0]).join(',');
//   const csvContent = [
//     headers,
//     ...expandedData.map(row =>
//       Object.values(row).map(value =>
//         `"${String(value).replace(/"/g, '""')}"`
//       ).join(',')
//     )
//   ].join('\n');

//   fs.writeFileSync(`../测试数据/expanded_OZON_SKU_quan_${currentStart}_${currentEnd}.csv`, csvContent);
//   console.log(`批次处理完成，范围 ${currentStart}-${currentEnd}，共导出 ${expandedData.length} 条记录`);
// }

// console.log('所有批次处理完成');




const processAllBatchFiles = () => {
  const baseDir = '../测试数据/';
  const filePattern = /expanded_OZON_SKU_quan_\d+_\d+\.csv/;

  const batchFiles = fs.readdirSync(baseDir)
    .filter(file => filePattern.test(file));

  console.log(`找到 ${batchFiles.length} 个批次文件`);

  let headers;
  let descriptionIndex;
  let imageUrlIndex;  // 将索引变量移到外部作用域
  const uniqueMap = new Map();

  // 处理每个批次文件
  batchFiles.forEach(file => {
    const csvData = fs.readFileSync(baseDir + file, 'utf8');
    const lines = csvData.split('\n');

    // 从第一个文件获取表头和索引位置
    if (!headers) {
      headers = lines[0].split(',');
      descriptionIndex = headers.findIndex(h => h.trim() === 'productUrl');
      imageUrlIndex = headers.findIndex(h => h.trim() === 'imageUrl');

      if (descriptionIndex === -1 || imageUrlIndex === -1) {
        throw new Error('未找到必要的列名: productUrl 或 imageUrl');
      }
    }

    // 处理数据行
    lines.slice(1).forEach(line => {
      const fields = line.split(',');
      const description = fields[descriptionIndex];
      const imageUrl = fields[imageUrlIndex]?.replace(/"/g, '') || 'N/A';

      if (!uniqueMap.has(description)) {
        uniqueMap.set(description, line);
      } else {
        const existingImageUrl = uniqueMap.get(description).split(',')[imageUrlIndex]?.replace(/"/g, '') || 'N/A';
        if (imageUrl !== 'N/A' && existingImageUrl === 'N/A') {
          uniqueMap.set(description, line);
        }
      }
    });
  });

  // 生成最终的CSV数据
  const uniqueData = [
    headers.join(','),
    ...Array.from(uniqueMap.values())
      .filter(line => {
        const fields = line.split(',');
        const imageUrl = fields[imageUrlIndex]?.replace(/"/g, '') || 'N/A';
        return imageUrl !== 'N/A';
      })
  ].join('\n');

  // 保存合并后的结果
  fs.writeFileSync('../测试数据/merged_unique_OZON_SKU_quan_03.csv', uniqueData);
  console.log(`处理完成，共导出 ${uniqueMap.size} 条去重记录`);
};

processAllBatchFiles();


// import fs from 'fs';
// import path from 'path';

// const dirPath = '/Users/xyx/Downloads/RUNWAY-1030-Photo';
// const files = fs.readdirSync(dirPath);

// files.forEach((file, index) => {
//   const filePath = path.join(dirPath, file);
//   const fileExt = path.extname(file);
//   const newFileName = `${index + 1}${fileExt}`;
//   const newFilePath = path.join(dirPath, newFileName);
//   fs.renameSync(filePath, newFilePath);
// });

