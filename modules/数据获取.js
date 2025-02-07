import { findTaskList_taskname, findTaskList_taskname_limit } from "./notes.js";
import fs from 'fs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

// const batchSize = 100; // 每批处理100条数据
// const startOffset = 0;
// const endOffset = 500;

// async function processBatch(offset) {
//     console.log(`开始处理第 ${offset} 到 ${offset + batchSize} 条数据`);
//     const TaskList = await findTaskList_taskname_limit('OZON_002', offset, offset + batchSize);
    
//     if (!TaskList || TaskList.length === 0) {
//         console.log(`批次 ${offset} 没有数据`);
//         return;
//     }

//     console.log(`成功获取到 ${TaskList.length} 条任务数据`);
//     const expandedData = [];

//     TaskList.forEach((task, index) => {
//         try {
//             const taskDate = new Date(task.created_at);
//             const filterDate = new Date('2024-09-07T03:00:00');

//             if (taskDate > filterDate) {
//                 const outputData = JSON.parse(task.run_output);
//                 if (Array.isArray(outputData)) {
//                     outputData.forEach(sku => {
//                         expandedData.push({
//                             ...sku,
//                             original_index: index,
//                             task_name: task.task_name,
//                             description: task.description,
//                             user_email: task.user_email,
//                             task_id: task.id
//                         });
//                     });
//                 }
//             }
//         } catch (error) {
//             console.error(`解析第 ${index} 条数据时出错:`, error);
//         }
//     });

//     if (expandedData.length === 0) {
//         console.log(`批次 ${offset} 没有有效数据`);
//         return;
//     }

//     const validData = expandedData.filter(item => item !== null && item !== undefined);
//     if (validData.length === 0) {
//         console.log(`批次 ${offset} 处理后的数据为空`);
//         return;
//     }

//     const headers = Object.keys(expandedData[0]).join(',');
//     const csvContent = [
//         headers,
//         ...expandedData.map(row =>
//             Object.values(row).map(value =>
//                 `"${String(value).replace(/"/g, '""')}"`
//             ).join(',')
//         )
//     ].join('\n');

//     const batchNumber = Math.floor(offset / batchSize) + 1;
//     const fileName = `./测试数据/expanded_OZON_quan_${batchNumber}.csv`;
//     fs.writeFileSync(fileName, csvContent);
//     console.log(`批次 ${offset} 处理完成，共导出 ${expandedData.length} 条记录到文件 ${fileName}`);
// }

// // 创建测试数据目录（如果不存在）
// if (!fs.existsSync('./测试数据')) {
//     fs.mkdirSync('./测试数据');
// }

// // 主程序
// async function main() {
//     for (let offset = startOffset; offset < endOffset; offset += batchSize) {
//         try {
//             await processBatch(offset);
//             // 添加短暂延迟，避免请求过于频繁
//             await new Promise(resolve => setTimeout(resolve, 1000));
//         } catch (error) {
//             console.error(`处理批次 ${offset} 时出错:`, error);
//         }
//     }
//     console.log('所有批次处理完成');
// }

// main().catch(error => {
//     console.error('程序执行出错:', error);
// });




// 合并CSV文件的函数
const mergeCSVFiles = () => {
    const baseDir = './测试数据/';
    // 匹配文件名模式 expanded_OZON_quan_1124_01.csv 到 expanded_OZON_quan_1124_04.csv
    const filePattern = /expanded_OZON_quan_[1-4]\.csv/;

    // 获取所有匹配的文件
    const files = fs.readdirSync(baseDir)
        .filter(file => filePattern.test(file))
        .sort(); // 确保文件按顺序处理

    console.log(`找到 ${files.length} 个文件需要合并`);

    let allData = [];
    let validRatingData = []; // 存储有效评分的数据
    let headers = null;
    let ratingColumnIndex = -1; // 用于存储rating列的索引
    
    // 评分统计对象
    let ratingStats = {
        totalCount: 0,        // 总数据量
        ratedCount: 0,        // 有评分数据量
        validRatingCount: 0,  // 有效评分数量（可以转换为数字的评分）
        totalRating: 0,       // 评分总和
        ratingDistribution: { // 评分分布
            '1-2': 0,
            '2-3': 0,
            '3-4': 0,
            '4-5': 0,
            '5': 0
        }
    };

    // 解析CSV行的函数
    const parseCSVLine = (line) => {
        const regex = /"([^"]*)"|([^,]+)/g;
        const result = [];
        let match;
        while ((match = regex.exec(line))) {
            result.push(match[1] || match[2]);
        }
        return result;
    };

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
                validRatingData.push(headers);
                
                // 找到rating列的索引
                const headerColumns = parseCSVLine(headers);
                ratingColumnIndex = headerColumns.findIndex(col => col.trim().toLowerCase() === 'rating');
                
                if (ratingColumnIndex === -1) {
                    throw new Error('未找到rating列');
                }
            }

            // 添加数据行（跳过表头）
            const dataRows = rows.slice(1);
            allData = allData.concat(dataRows);

            // 筛选有效评分的数据并统计
            if (ratingColumnIndex !== -1) {
                dataRows.forEach(row => {
                    const columns = parseCSVLine(row);
                    if (!columns || columns.length <= ratingColumnIndex) return;

                    const ratingStr = (columns[ratingColumnIndex] || '').trim();
                    ratingStats.totalCount++;

                    // 检查是否为有效评分
                    const rating = parseFloat(ratingStr);
                    if (!isNaN(rating) && rating > 0 && ratingStr !== '未找到评分') {
                        ratingStats.ratedCount++;
                        ratingStats.validRatingCount++;
                        ratingStats.totalRating += rating;
                        validRatingData.push(row);
                        
                        // 统计评分分布
                        if (rating <= 2) ratingStats.ratingDistribution['1-2']++;
                        else if (rating <= 3) ratingStats.ratingDistribution['2-3']++;
                        else if (rating <= 4) ratingStats.ratingDistribution['3-4']++;
                        else if (rating < 5) ratingStats.ratingDistribution['4-5']++;
                        else ratingStats.ratingDistribution['5']++;
                    }
                });
            }

            console.log(`文件 ${file} 处理完成，添加了 ${dataRows.length} 行数据`);
        } catch (error) {
            console.error(`处理文件 ${file} 时出错:`, error);
        }
    });

    if (allData.length <= 1) {
        console.error('没有找到有效数据');
        return;
    }

    // 保存合并后的所有数据文件
    const outputPath = baseDir + 'merged_OZON_quan_all.csv';
    fs.writeFileSync(outputPath, allData.join('\n'), 'utf8');
    
    // 保存有效评分的数据文件
    const validRatedOutputPath = baseDir + 'merged_OZON_quan_valid_rated.csv';
    fs.writeFileSync(validRatedOutputPath, validRatingData.join('\n'), 'utf8');

    // 计算平均评分
    const avgRating = ratingStats.validRatingCount > 0 ? Number((ratingStats.totalRating / ratingStats.validRatingCount).toFixed(2)) : 0;

    console.log(`\n合并完成:`);
    console.log(`- 总行数: ${allData.length}`);
    console.log(`- 数据行数: ${allData.length - 1}`);
    console.log(`- 有效评分数据行数: ${ratingStats.validRatingCount}`);
    console.log(`- 有效评分占比: ${((ratingStats.validRatingCount / ratingStats.totalCount) * 100).toFixed(2)}%`);
    console.log(`- 平均评分: ${avgRating}`);
    console.log('\n评分分布:');
    console.log(`- 1-2分: ${ratingStats.ratingDistribution['1-2']} 个`);
    console.log(`- 2-3分: ${ratingStats.ratingDistribution['2-3']} 个`);
    console.log(`- 3-4分: ${ratingStats.ratingDistribution['3-4']} 个`);
    console.log(`- 4-5分: ${ratingStats.ratingDistribution['4-5']} 个`);
    console.log(`- 5分: ${ratingStats.ratingDistribution['5']} 个`);
    console.log(`\n- 全部数据保存路径: ${outputPath}`);
    console.log(`- 有效评分数据保存路径: ${validRatedOutputPath}`);
};

// 执行合并
mergeCSVFiles();
