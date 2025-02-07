import { getOnlineOutputHandler } from './outputHandler.js';
import fs from 'fs';
import xlsx from 'xlsx'; // 引入xlsx库
import { taskExecutor } from './taskExecutor.js';
import { eventHandler } from './eventHandler.js';
import { handler_run_test, handler_login} from '../handler.js';

// 在需要的地方（比如 OutputTask 类的 execute 方法中）
//taskExecutor_code,eventHandler_code从当前路径中读取
// //抖音的数据获取
// const taskExecutor_code = fs.readFileSync('./taskExecutor_3.js', 'utf8');
// const eventHandler_code = fs.readFileSync('./eventHandler_3.js', 'utf8');
// const onlineOutputHandler = getOnlineOutputHandler();
// await onlineOutputHandler.handle(taskExecutor_code, eventHandler_code, 'output_runcode', 'douyin');



//获取执行代码
// await taskExecutor('douyin');
// await eventHandler('douyin');

//OZON的店铺数据获取
// const taskExecutor_code = fs.readFileSync('./taskExecutor_4.js', 'utf8');
// const eventHandler_code = fs.readFileSync('./eventHandler_4.js', 'utf8');
// const onlineOutputHandler = getOnlineOutputHandler();
// await onlineOutputHandler.handle(taskExecutor_code, eventHandler_code, 'output_runcode', 'OZON');

//亚马逊店铺数据获取
// const taskExecutor_code = fs.readFileSync('./taskExecutor_5.js', 'utf8');
// const eventHandler_code = fs.readFileSync('./eventHandler_5.js', 'utf8');
// const onlineOutputHandler = getOnlineOutputHandler();
// await onlineOutputHandler.handle(taskExecutor_code, eventHandler_code, 'output_runcode', 'AMA');

// // //批量刊登任务
// const taskExecutor_code = fs.readFileSync('./taskExecutor_2.js', 'utf8');
// const eventHandler_code = fs.readFileSync('./eventHandler_2.js', 'utf8');
// const onlineOutputHandler = getOnlineOutputHandler();
// await onlineOutputHandler.handle(taskExecutor_code, eventHandler_code, 'output_runcode', 'kandeng_004');


// // // //大众点评获取数据
// const taskExecutor_code = fs.readFileSync('./taskExecutor_8.js', 'utf8');
// const eventHandler_code = fs.readFileSync('./eventHandler_8.js', 'utf8');
// const onlineOutputHandler = getOnlineOutputHandler();
// await onlineOutputHandler.handle(taskExecutor_code, eventHandler_code, 'output_runcode', 'dianping');


//OZON的关键词 SKU数据获取
// const taskExecutor_code = fs.readFileSync('./taskExecutor_6.js', 'utf8');
// const eventHandler_code = fs.readFileSync('./eventHandler_6.js', 'utf8');
// const onlineOutputHandler = getOnlineOutputHandler();
// await onlineOutputHandler.handle(taskExecutor_code, eventHandler_code, 'output_runcode', 'OZON_keyword_sku');

//chatgpt+runway 实现图片生成视频
// const taskExecutor_code = fs.readFileSync('./taskExecutor_7.js', 'utf8');
// const eventHandler_code = fs.readFileSync('./eventHandler_7.js', 'utf8');
// const onlineOutputHandler = getOnlineOutputHandler();
// await onlineOutputHandler.handle(taskExecutor_code, eventHandler_code, 'output_runcode', 'runway');

//OZON 的 SKU 数据获取
// const taskExecutor_code = fs.readFileSync('./taskExecutor_9.js', 'utf8');
// const eventHandler_code = fs.readFileSync('./eventHandler_9.js', 'utf8');
// const onlineOutputHandler = getOnlineOutputHandler();
// await onlineOutputHandler.handle(taskExecutor_code, eventHandler_code, 'output_runcode', 'OZON_SKU');


// await taskExecutor('douyin');
// await eventHandler('douyin');

// const params = {
//     sortedData: JSON.parse(fs.readFileSync('./douyin.json', 'utf8')),
//     row: {/* 您的行数据 */ },
//     task_name: 'douyin'
// };

// await handler_run_test(params);


// const req = {
//     body: {
//         url: "https://seller.ozon.ru/app/analytics/what-to-sell/ozon-bestsellers",
//         task_name: 'OZON_SKU'
//     }
// };

// // 调用 handler_login 函数
// await handler_login(req);





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

// // 读取Excel文件
const workbook = xlsx.readFile('./测试数据/大众点评_北京律师.xlsx'); // 假设输入文件名为input_data.xlsx
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// 将Excel数据转换为JSON格式
const data = xlsx.utils.sheet_to_json(worksheet);
const totalRows = data.length;

// 添加进度显示函数
function showProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    console.log(`处理进度: ${percentage}% (${current}/${total})`);
}

// 创建单行数据处理函数
async function processRow(row, index) {
    const req = {
        body: {
            keywords: row.name,
            cityname: row.description.split('_')[0]
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

    showProgress(index + 1, totalRows);
    return row;
}

// 使用并发处理数据，每次处理5条
const batchSize = 10;
for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await Promise.all(batch.map((row, index) => 
        processRow(row, i + index)
    ));
}

// 将更新后的数据写入新的Excel文件
const newWorksheet = xlsx.utils.json_to_sheet(data);
const newWorkbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Results');
xlsx.writeFile(newWorkbook, './测试数据/大众点评_北京律师_output.xlsx'); // 假设输出文件名为output_data.xlsx