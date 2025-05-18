import fs from 'fs';
import csv from 'csv-parser';  // 添加csv-parser导入
import xlsx from 'xlsx'; // 引入xlsx库


// 单独调用下 api 实现电话获取
export async function getData_baidu(req) {
    const { keywords, cityname } = req.body;


    console.log('keywords_baidu:', keywords);
    console.log('cityname_baidu:', cityname);
    const url = `https://api.map.baidu.com/place/v2/search?query=${encodeURIComponent(keywords)}&region=${cityname}&output=json&ak=QRFsivgdY5p9EduvsIlCmxKdxJ7fgvUl`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const firstPoi = data.results[0];
                const result = {
                    name: firstPoi.name,
                    address: firstPoi.address,
                    phone: firstPoi.telephone
                };
                return result;
            } else {
                return null;
            }
        } else {
            const errorText = await response.text();
            return null;
        }
    } catch (e) {
        return null;
    }
};

export async function getData_tengxun(req) {

    const { keywords, cityname } = req.body;

    if (!keywords) {
        return null;
    }
    console.log('keywords_tengxun:', keywords);
    console.log('cityname_tengxun:', cityname);
    const url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keywords)}&boundary=region(${cityname})&key=I4XBZ-RVBC4-UQBUI-FSKQD-SAJ36-HYFVS`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // console.log('response:', response);
        if (response.ok) {
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                const firstPoi = data.data[0];
                const result = {
                    name: firstPoi.title,
                    address: firstPoi.address,
                    phone: firstPoi.tel
                };
                return result;
            } else {
                return null;
            }
        } else {
            const errorText = await response.text();
            return null;
        }
    } catch (e) {
        return null;
    }
};

// 读取CSV文件并筛选数据
async function readAndFilterData() {
    return new Promise((resolve, reject) => {
        const results = [];
        let rowCount = 0;
        let filteredCount = 0;
        
        fs.createReadStream('/Users/zhanggongqing/Downloads/dt_test/测试数据/merged_dianping_all.csv')
            .pipe(csv())
            .on('data', (row) => {
                rowCount++;
                // 打印前几行数据，查看数据结构
                if (rowCount <= 3) {
                    console.log('示例数据行:', row);
                }
                
                // 检查star_rating字段
                console.log(`第 ${rowCount} 行的 star_rating:`, row.star_rating);
                
                // 转换star_rating为数字并筛选
                const starRating = parseFloat(row.star_rating);
                if (!isNaN(starRating)) {
                    console.log(`转换后的评分: ${starRating}`);
                }
                
                if (!isNaN(starRating) && starRating > 3.9) {
                    filteredCount++;
                    results.push(row);
                }
            })
            .on('end', () => {
                console.log('CSV文件读取统计:');
                console.log(`- 总行数: ${rowCount}`);
                console.log(`- 符合条件的行数: ${filteredCount}`);
                console.log(`- 评分大于3.9的数据比例: ${((filteredCount/rowCount)*100).toFixed(2)}%`);
                
                if (results.length > 0) {
                    console.log('第一条符合条件的数据示例:', results[0]);
                }
                
                resolve(results);
            })
            .on('error', (error) => {
                console.error('读取CSV文件时发生错误:', error);
                console.error('错误详情:', {
                    message: error.message,
                    stack: error.stack
                });
                reject(error);
            });
    });
}

// 添加进度显示函数
function showProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    console.log(`处理进度: ${percentage}% (${current}/${total})`);
}

// 创建单行数据处理函数
async function processRow(row, index, total) {
    // 从description中提取城市名（下划线前的部分）
    const cityname = row.description ? row.description.split('_')[0] : '';
    
    const req = {
        body: {
            keywords: row.name,
            cityname: cityname  // 使用提取出的城市名
        }
    };

    // 并发请求百度和腾讯API
    const [result_baidu, result_tengxun] = await Promise.all([
        getData_baidu(req),
        getData_tengxun(req)
    ]);

    // 更新行数据
    row.baidu_name = result_baidu?.name || '未找到';
    row.baidu_address = result_baidu?.address || '未提供';
    row.baidu_phone = result_baidu?.phone || '未提供';
    
    row.tengxun_name = result_tengxun?.name || '未找到';
    row.tengxun_address = result_tengxun?.address || '未提供';
    row.tengxun_phone = result_tengxun?.phone || '未提供';

    showProgress(index + 1, total);
    return row;
}

// 主处理流程
async function main() {
    try {
        // 读取并筛选数据
        const data = await readAndFilterData();
        const totalRows = data.length;
        console.log(`开始处理 ${totalRows} 条数据`);

        // 使用并发处理数据，每次处理10条
        const batchSize = 10;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            await Promise.all(batch.map((row, index) => 
                processRow(row, i + index, totalRows)
            ));
        }

        // 将更新后的数据写入新的Excel文件
        const newWorksheet = xlsx.utils.json_to_sheet(data);
        const newWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Results');
        xlsx.writeFile(newWorkbook, './测试数据/大众点评_output_filtered_1.xlsx');
        
        console.log('数据处理完成，已写入文件');
    } catch (error) {
        console.error('处理过程中发生错误:', error);
        if (error.stack) {
            console.error('错误堆栈:', error.stack);
        }
    }
}

// 执行主流程
main().catch(error => {
    console.error('程序执行失败:', error);
});