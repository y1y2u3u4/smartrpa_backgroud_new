// modules/outputHandler.js
// import { tasks } from "../types/music";
import pkg from 'exceljs';
const { Workbook } = pkg;
import { inserttask, findTaskList } from "./notes.js";
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
    async handle(data, type, task_name) {
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
        inserttask(task)
            .then(isSuccess => {
                if (isSuccess) {
                    console.log("保存成功", task);
                } else {
                    console.log("保存失败", task);
                }
            })
            .catch(error => {
                console.error("保存出错", error);
            });

    } else if (type === 'output') {
            const jsonData = JSON.stringify(data, null, 2);
            console.log('task_name', task_name)
            const TaskList = await findTaskList(task_name);
            TaskList.sort((a, b) => b.id - a.id);
            const latestTask = TaskList[0];
            // console.log('TaskList', TaskList)
            // console.log('latestTask', latestTask)

            const task = {
                // user_email: userEmail.toString(),
                user_email: 'test',
                description: 'test',
                task_name: latestTask.task_name,
                task_url: 'test',
                task_cookies: latestTask.task_cookies,
                run_code: 'test',
                run_sop: 'test',
                run_output: jsonData,
                log_detail: 'test',
                created_at: new Date().toISOString(),
                status: 1,
            };
            inserttask(task)
                .then(isSuccess => {
                    if (isSuccess) {
                        console.log("保存成功", task);
                    } else {
                        console.log("保存失败", task);
                    }
                })
                .catch(error => {
                    console.error("保存出错", error);
                });

    } else {
        console.log('type error');
    }
}}

export class ExcelOutputHandler extends OutputHandler {
    handle(data) {
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');
        worksheet.addRows(data);
        workbook.xlsx.writeFile('output.xlsx');
    }
}

export class OutputFactory {
    static createOutputHandler(format) {
        switch (format) {
            case 'json':
                return new JsonOutputHandler();
            case 'excel':
                return new ExcelOutputHandler();
            case 'online':
                return new onlineOutputHandler();
            default:
                throw new Error(`Unsupported output format: ${format}`);
        }
    }
}

