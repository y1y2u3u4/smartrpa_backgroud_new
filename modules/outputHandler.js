// modules/outputHandler.js
// import { tasks } from "../types/music";
import pkg from 'exceljs';
// const { Workbook } = pkg;
import { inserttask, findTaskList, inserttask_runcode, inserttask_cookie } from "./notes.js";
import fs from 'fs';

export class OutputHandler {
    handle(data) {
        throw new Error("Method 'handle()' must be implemented.");
    }
}

export class JsonOutputHandler extends OutputHandler {
    handle(data) {
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync('output.json', jsonData);
    }
}




export class onlineOutputHandler extends OutputHandler {
    // constructor() {
    //     super();
    //     // 使用环境变量来指定输出目录
    //     this.outputDir = process.env.OUTPUT_DIR || '/app/output';
    //     // 确保输出目录存在
    //     if (!fs.existsSync(this.outputDir)) {
    //         fs.mkdirSync(this.outputDir, { recursive: true });
    //     }
    // }
    convertJsonToCsv(jsonData) {
        const items = JSON.parse(jsonData);
        const header = Object.keys(items[0]).join(',');
        const rows = items.map(item => Object.values(item).map(value => `"${value}"`).join(','));
        return [header, ...rows].join('\n');
    }
    async handle(data, type, task_name, cityname) {
        const maxRetries = 10;
        const retryDelay = 5000; // 1秒

        const retryOperation = async (operation) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await operation();
                } catch (error) {
                    if (attempt === maxRetries) {
                        throw error;
                    }
                    console.log(`尝试 ${attempt} 失败，${retryDelay / 1000} 秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        };

        if (type === 'login') {
        const jsonData = JSON.stringify(data, null, 2);
        const task = {
            // user_email: userEmail.toString(),
            user_email: 'test',
            task_name: task_name,
            cookies: jsonData,
            created_at: new Date().toISOString(),
        };
            await retryOperation(() => inserttask_cookie(task));

    } else if (type === 'output') {
            let jsonData;
            try {
                jsonData = JSON.stringify(data, null, 2);
            } catch (error) {
                console.error('无法转换为 JSON 对象，将使用字符串存储:', error);
                jsonData = String(data);  // 直接转换为字符串
            }
            console.log('task_name', task_name);
            // const TaskList = await retryOperation(() => findTaskList(task_name));
            // TaskList.sort((a, b) => b.id - a.id);
            // const latestTask = TaskList[0];
            const task = {
                // user_email: userEmail.toString(),
                user_email: 'test',
                description: cityname,
                task_name: task_name,
                task_url: 'test',
                task_cookies: [],
                run_code: 'test',
                run_sop: 'test',
                run_output: jsonData,
                log_detail: 'test',
                created_at: new Date().toISOString(),
                status: 1,
            };
            await retryOperation(() => inserttask(task));

        } else if (type === 'output_csv') {
            const jsonData = JSON.stringify(data, null, 2);
            console.log('task_name', task_name);
            const task = {
                user_email: 'test',
                description: cityname,
                task_name: task_name,
                task_url: 'test',
                task_cookies: [],
                run_code: 'test',
                run_sop: 'test',
                run_output: jsonData,
                log_detail: 'test',
                created_at: new Date().toISOString(),
                status: 1,
            };
            const csvData = this.convertJsonToCsv(task);
            const fileName = `${task_name}_${cityname}.csv`;
            const filePath = path.join(this.outputDir, fileName);

            try {
                fs.writeFileSync(filePath, csvData);
                console.log(`CSV 文件已保存: ${filePath}`);
            } catch (error) {
                console.error(`保存 CSV 文件时出错: ${error.message}`);
            }
        } 
    else {
        console.log('type error');
    }
}}

// export class ExcelOutputHandler extends OutputHandler {
//     handle(data) {
//         const workbook = new Workbook();
//         const worksheet = workbook.addWorksheet('Sheet1');
//         worksheet.addRows(data);
//         workbook.xlsx.writeFile('output.xlsx');
//     }
// }





export class onlineOutputHandler_runcode extends OutputHandler {
    async handle(taskExecutor_code,eventHandler_code, type, task_name) {
        const maxRetries = 3;
        const retryDelay = 1000; // 1秒

        const retryOperation = async (operation) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await operation();
                } catch (error) {
                    if (attempt === maxRetries) {
                        throw error;
                    }
                    console.log(`尝试 ${attempt} 失败，${retryDelay / 1000} 秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        };

        if (type === 'login') {
            const jsonData = JSON.stringify(data, null, 2);
            const task = {
                // user_email: userEmail.toString(),
                user_email: 'test',
                description: 'test',
                task_name: task_name,
                task_url: 'test',
                task_cookies: jsonData,
                run_code: 'test',
                run_sop: 'test',
                run_output: 'test',
                log_detail: 'test',
                created_at: new Date().toISOString(),
                status: 1,
            };
            await retryOperation(() => inserttask(task));

        } else if (type === 'output_runcode') {
            
            console.log('task_name', task_name)
            // const TaskList = await retryOperation(() => findTaskList(task_name));
            // TaskList.sort((a, b) => b.id - a.id);
            // const latestTask = TaskList[0];
            const task = {
                // user_email: userEmail.toString(),
                user_email: 'test',
                task_name: task_name,
                run_code: taskExecutor_code,
                run_sop: eventHandler_code,
                created_at: new Date().toISOString(),
                status: 1,
            };
            await retryOperation(() => inserttask_runcode(task));

        }
        else {
            console.log('type error');
        }
    }
}


export class OutputFactory {
    static createOutputHandler(format) {
        switch (format) {
            case 'json':
                return new JsonOutputHandler();
            // case 'excel':
            //     return new ExcelOutputHandler();
            case 'online':
                return new onlineOutputHandler();
            case 'online_runcode':
                return new onlineOutputHandler_runcode();
            default:
                throw new Error(`Unsupported output format: ${format}`);
        }
    }
}



export function getOnlineOutputHandler() {
    return OutputFactory.createOutputHandler('online_runcode');
}
