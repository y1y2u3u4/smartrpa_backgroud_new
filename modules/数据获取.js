import { findTaskList_taskname, findTaskList_taskname_limit } from "./notes.js";
import fs from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync'; // 修改这里，使用 import 语法
// const TaskList = await findTaskList_taskname('OZON_001');
// const TaskList = await findTaskList_taskname_limit('OZON_001', 200, 300);
// const expandedData = [];
// if (!TaskList || TaskList.length === 0) {
//   console.log('TaskList 为空，没有找到任何任务数据');
//   process.exit(0);
// }

// console.log(`成功获取到 ${TaskList.length} 条任务数据`);

// TaskList.forEach((task, index) => {
//   try {
//     // 添加日期过滤
//     const taskDate = new Date(task.created_at);
//     const filterDate = new Date('2024-09-07T03:00:00');

//     if (taskDate > filterDate) {
//       const outputData = JSON.parse(task.run_output);
//       if (Array.isArray(outputData)) {
//         outputData.forEach(sku => {
//           expandedData.push({
//             ...sku,
//             original_index: index,
//             task_name: task.task_name,
//             description: task.description,
//             user_email: task.user_email,
//             task_id: task.id
//           });
//         });
//       }
//     }
//   } catch (error) {
//     console.error(`解析第 ${index} 条数据时出错:`, error);
//   }
// });

// // // 将结果保存为CSV
// // 添加数据检查
// if (expandedData.length === 0) {
//   console.log('没有找到任何数据');
//   process.exit(0);
// }
// const validData = expandedData.filter(item => item !== null && item !== undefined);
// if (validData.length === 0) {
//   console.log('处理后的数据为空');
//   process.exit(0);
// }


// const headers = Object.keys(expandedData[0]).join(',');
// const csvContent = [
//   headers,
//   ...expandedData.map(row =>
//     Object.values(row).map(value =>
//       `"${String(value).replace(/"/g, '""')}"`
//     ).join(',')
//   )
// ].join('\n');

// fs.writeFileSync('../测试数据/expanded_OZON_quan_1124_07.csv', csvContent);
// console.log(`处理完成，共导出 ${expandedData.length} 条记录`);





// 合并CSV文件的函数
const mergeCSVFiles = () => {
    const baseDir = '../测试数据/';
    // 匹配文件名模式 expanded_OZON_quan_1124_01.csv 到 expanded_OZON_quan_1124_04.csv
    const filePattern = /expanded_OZON_quan_1124_0[1-7]\.csv/;

    // 获取所有匹配的文件
    const files = fs.readdirSync(baseDir)
        .filter(file => filePattern.test(file))
        .sort(); // 确保文件按顺序处理

    console.log(`找到 ${files.length} 个文件需要合并`);

    let allData = [];
    let headers = null;

    // 处理每个文件
    files.forEach((file, index) => {
        console.log(`正在处理文件 ${file}`);
        const filePath = baseDir + file;

        try {
            const csvData = fs.readFileSync(filePath, 'utf8');
            const rows = csvData.split('\n').filter(row => row.trim() !== '');

            // 处理第一个文件的表头
            if (index === 0) {
                headers = rows[0];
                allData.push(headers);
            }

            // 添加数据行（跳过表头）
            const dataRows = rows.slice(1);
            allData = allData.concat(dataRows);

            console.log(`文件 ${file} 处理完成，添加了 ${dataRows.length} 行数据`);
        } catch (error) {
            console.error(`处理文件 ${file} 时出错:`, error);
        }
    });

    if (allData.length <= 1) {
        console.error('没有找到有效数据');
        return;
    }

    // 保存合并后的文件
    const outputPath = baseDir + 'merged_OZON_quan_1124_all.csv';
    fs.writeFileSync(outputPath, allData.join('\n'));
    console.log(`\n合并完成:`);
    console.log(`- 总行数: ${allData.length}`);
    console.log(`- 数据行数: ${allData.length - 1}`);
    console.log(`- 保存路径: ${outputPath}`);
};

// 执行合并
// mergeCSVFiles();






// const csvData = fs.readFileSync('../测试数据/merged_OZON_quan_1124_all.csv', 'utf8');
// const rows = csvData.split('\n');
// const headers = rows[0];
// const dataRows = rows.slice(1);

// // 解析CSV行的函数
// function parseCSVLine(line) {
//   const regex = /"([^"]*)"|([^,]+)/g;
//   const result = [];
//   let match;
//   while ((match = regex.exec(line))) {
//     result.push(match[1] || match[2]);
//   }
//   return result;
// }

// // 使用Map存储去重后的数据，key为ID
// const uniqueRows = new Map();
// const shopStats = new Map(); // 用于存储店铺统计信息
// let totalRows = 0;

// dataRows.forEach((row, index) => {
//   if (!row || row.startsWith('Примечание')) return;

//   try {
//     const columns = parseCSVLine(row);
//     if (!columns || columns.length < 2) return;

//     const fullId = columns[1];
//     const shopName = columns[15]; // 获取店铺名称
//     if (fullId && typeof fullId === 'string') {
//       const idParts = fullId.split('-');

//       const shortId = idParts[idParts.length - 1];

//       totalRows++;

//       // 使用shortId作为去重键
//       if (!uniqueRows.has(shortId)) {
//         uniqueRows.set(shortId, row);

//         // 统计店铺数据
//         if (!shopStats.has(shopName)) {
//           shopStats.set(shopName, {
//             totalProducts: 1,
//             ratedProducts: 0
//           });
//         } else {
//           shopStats.get(shopName).totalProducts++;
//         }

//         // 统计有评分的产品
//         const rating = parseFloat(columns[7]);
//         if (!isNaN(rating) && rating > 0) {
//           shopStats.get(shopName).ratedProducts++;
//         }
//       }
//     }
//   } catch (error) {
//     console.error(`处理第 ${index + 1} 行时出错:`, error);
//   }
// });

// // 转换店铺统计数据为CSV格式
// const shopStatsHeaders = ['店铺名称', '商品总数', '有评分商品数'];
// const shopStatsCsv = [
//   shopStatsHeaders.join(','),
//   ...Array.from(shopStats.entries()).map(([shop, stats]) => 
//     `"${shop}",${stats.totalProducts},${stats.ratedProducts}`
//   )
// ].join('\n');

// // 保存店铺统计数据
// const shopStatsPath = '../测试数据/shop_statistics.csv';
// fs.writeFileSync(shopStatsPath, shopStatsCsv);

// // 保存去重后的原始数据
// const uniqueContent = Array.from(uniqueRows.values()).join('\n');
// const outputPath = '../测试数据/expanded_OZON_quan_1124_unique_by_id.csv';
// fs.writeFileSync(outputPath, headers + '\n' + uniqueContent);

// // 输出统计信息
// console.log('\n=== 去重统计 ===');
// console.log('原始数据行数:', totalRows);
// console.log('去重后数据行数:', uniqueRows.size);
// console.log('店铺总数:', shopStats.size);
// // 统计去重后有评分的商品数
// let ratedProductsCount = 0;
// for (const row of uniqueRows.values()) {
//     const columns = parseCSVLine(row);
//     const rating = parseFloat(columns[7]);
//     if (!isNaN(rating) && rating > 0) {
//         ratedProductsCount++;
//     }
// }
// console.log('去重后有评分商品数:', ratedProductsCount);

// console.log('去重后的数据已保存到:', outputPath);
// console.log('店铺统计数据已保存到:', shopStatsPath);

// // 存储有评分的商品
// const ratedRows = new Map();
// for (const [shortId, row] of uniqueRows.entries()) {
//     const columns = parseCSVLine(row);
//     const rating = parseFloat(columns[7]);
//     const fullId = columns[1];

//     try {
//         // 提取最后一个连字符后的数字，添加错误处理
//         const lastPart = fullId.split('-').pop() || '';
//         const matches = lastPart.match(/\d+/);
//         const numericId = matches ? matches[0] : fullId; // 如果没有匹配到数字，使用完整ID

//         if (!isNaN(rating) && rating > 0) {
//             // 在原始行末尾添加数字ID
//             ratedRows.set(numericId, row + ',' + `"${numericId}"`);
//         }
//     } catch (error) {
//         console.error(`处理ID时出错: ${fullId}`, error);
//         if (!isNaN(rating) && rating > 0) {
//             ratedRows.set(shortId, row + ',' + `"${shortId}"`);
//         }
//     }
// }

// // 保存有评分的商品数据
// const ratedContent = Array.from(ratedRows.values()).join('\n');
// const ratedOutputPath = '../测试数据/expanded_OZON_quan_1124_rated_products.csv';
// // 添加新的列名到表头
// const newHeaders = headers + ',numeric_id';
// fs.writeFileSync(ratedOutputPath, newHeaders + '\n' + ratedContent);
// console.log('有评分商品数据已保存到:', ratedOutputPath);

// // 定义处理范围和批次大小
// const startIndex = 25000;
// const endIndex = 62000;
// const batchSize = 10000;

// // 循环处理每个批次
// for (let currentStart = startIndex; currentStart < endIndex; currentStart += batchSize) {
//   const currentEnd = Math.min(currentStart + batchSize, endIndex);
//   console.log(`正在处理范围: ${currentStart} - ${currentEnd}`);

//   const TaskList = await findTaskList_taskname_limit('OZON_SKU_003', currentStart, currentEnd);
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


// TaskList.forEach((task, index) => {
//   try {
//     // 添加日期过滤
//     const taskDate = new Date(task.created_at);
//     const filterDate = new Date('2024-11-07T03:00:00');

//     if (taskDate > filterDate) {
//       const outputData = JSON.parse(task.run_output);
//       if (Array.isArray(outputData)) {
//         outputData.forEach(sku => {
//           expandedData.push({
//             ...sku,
//             original_index: index,
//             task_name: task.task_name,
//             description: task.description,
//             user_email: task.user_email,
//             task_id: task.id
//           });
//         });
//       }
//     }
//   } catch (error) {
//     console.error(`解析第 ${index} 条数据时出错:`, error);
//   }
// });

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

//   fs.writeFileSync(`../测试数据/expanded_OZON_SKU_quan_05_${currentStart}_${currentEnd}.csv`, csvContent);
//   console.log(`批次处理完成，范围 ${currentStart}-${currentEnd}，共导出 ${expandedData.length} 条记录`);
// }

// console.log('所有批次处理完成');

// const processAllBatchFiles = () => {
//   const baseDir = '../测试数据/';
//   const filePattern = /expanded_OZON_SKU_quan_05_\d+_\d+\.csv/;

//   const batchFiles = fs.readdirSync(baseDir)
//     .filter(file => filePattern.test(file));

//   console.log(`找到 ${batchFiles.length} 个批次文件`);

//   let headers;
//   let descriptionIndex;
//   let imageUrlIndex;  // 将索引变量移到外部作用域
//   const uniqueMap = new Map();

//   // 处理每个批次文件
//   batchFiles.forEach(file => {
//     const csvData = fs.readFileSync(baseDir + file, 'utf8');
//     const lines = csvData.split('\n');

//     // 从第一个文件获取表头和索引位置
//     if (!headers) {
//       headers = lines[0].split(',');
//       descriptionIndex = headers.findIndex(h => h.trim() === 'productUrl');
//       imageUrlIndex = headers.findIndex(h => h.trim() === 'imageUrl');

//       if (descriptionIndex === -1 || imageUrlIndex === -1) {
//         throw new Error('未找到必要的列名: productUrl 或 imageUrl');
//       }
//     }

//     // 处理数据行
//     lines.slice(1).forEach(line => {
//       const fields = line.split(',');
//       const description = fields[descriptionIndex];
//       const imageUrl = fields[imageUrlIndex]?.replace(/"/g, '') || 'N/A';

//       if (!uniqueMap.has(description)) {
//         uniqueMap.set(description, line);
//       } else {
//         const existingImageUrl = uniqueMap.get(description).split(',')[imageUrlIndex]?.replace(/"/g, '') || 'N/A';
//         if (imageUrl !== 'N/A' && existingImageUrl === 'N/A') {
//           uniqueMap.set(description, line);
//         }
//       }
//     });
//   });

//   // 生成最终的CSV数据
//   const uniqueData = [
//     headers.join(','),
//     ...Array.from(uniqueMap.values())
//       .filter(line => {
//         const fields = line.split(',');
//         const imageUrl = fields[imageUrlIndex]?.replace(/"/g, '') || 'N/A';
//         return imageUrl !== 'N/A';
//       })
//   ].join('\n');

//   // 保存合并后的结果
//   fs.writeFileSync('../测试数据/merged_unique_OZON_SKU_quan_05.csv', uniqueData);
//   console.log(`处理完成，共导出 ${uniqueMap.size} 条去重记录`);
// };

// processAllBatchFiles();



// ... existing code ...
// const TaskList = await findTaskList_taskname('OZON_SKU_002');

// // 创建一个Set用于存储唯一的description
// const uniqueDescriptions = new Set();

// // 直接从task中提取description
// TaskList.forEach(task => {
//   if (task.description) {
//     uniqueDescriptions.add(task.description);
//   }
// });

// // 转换Set为数组
// const descriptionsArray = Array.from(uniqueDescriptions).map(desc => ({
//   description: desc
// }));

// // 创建工作簿和工作表
// const workbook = XLSX.utils.book_new();
// const worksheet = XLSX.utils.json_to_sheet(descriptionsArray);

// // 将工作表添加到工作簿
// XLSX.utils.book_append_sheet(workbook, worksheet, 'Descriptions');

// // 保存Excel文件
// const outputPath = '../测试数据/unique_descriptions.xlsx';
// XLSX.writeFile(workbook, outputPath);

// console.log(`处理完成，共导出 ${uniqueDescriptions.size} 条唯一描述到: ${outputPath}`);

















const TaskList = await findTaskList_taskname('OZON_SKU_004');
// const TaskList = await findTaskList_taskname_limit('OZON_SKU_004', 0, 24000);
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
        const filterDate = new Date('2024-11-07T03:00:00');

        if (taskDate > filterDate) {
            const outputData = JSON.parse(task.run_output);
            if (Array.isArray(outputData) && outputData.length > 0) {
                outputData.forEach(item => {
                    // 创建新的数据对象，包含维度和体积信息
                    const processedData = {
                        length: item.dimensions?.length || 0,
                        width: item.dimensions?.width || 0,
                        height: item.dimensions?.height || 0,
                        volume: item.volume || 0,
                        title: item.title || 'N/A',
                        price: item.price || 'N/A',
                        imageUrl: item.imageUrl || 'N/A',
                        // 添加其他任务相关信息
                        original_index: index,
                        task_name: task.task_name,
                        description: task.description,
                        user_email: task.user_email,
                        task_id: task.id,
                        created_at: task.created_at
                    };
                    expandedData.push(processedData);
                });
            }
        }
    } catch (error) {
        console.error(`解析第 ${index} 条数据时出错:`, error);
        console.error('错误详情:', error.message);
        console.error('任务数据:', task.run_output);
    }
});

// 添加数据检查
if (expandedData.length === 0) {
    console.log('没有找到任何数据');
    process.exit(0);
}

// 按照task_id倒序排序并限制数据量为2.4万条
const processedData = expandedData
    .sort((a, b) => b.task_id - a.task_id)
    .slice(0, 24000);

const validData = processedData.filter(item => 
    item !== null && 
    item !== undefined && 
    (item.length > 0 || item.width > 0 || item.height > 0 || item.volume > 0)
);

if (validData.length === 0) {
    console.log('处理后的数据为空');
    process.exit(0);
}

// 生成CSV文件
const headers = Object.keys(validData[0]).join(',');
const csvContent = [
    headers,
    ...validData.map(row =>
        Object.values(row).map(value =>
            `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
    )
].join('\n');

fs.writeFileSync('../测试数据/expanded_OZON_SKU_004_dimensions_01.csv', csvContent);
console.log(`处理完成，共导出 ${validData.length} 条记录`);

// 输出统计信息
console.log('\n=== 数据统计 ===');
console.log('总任务数:', TaskList.length);
console.log('有效数据条数:', validData.length);
console.log('无效数据条数:', expandedData.length - validData.length);
