// handler.js
import { loadConfig } from './modules/configManager.js';
import { launchBrowser, setupPage, launchBrowser_adsPower, setupPage_adsPower, closeBrowser_adsPower, launchBrowser_adsPower_lianjie, launchBrowser_adsPower_lianjie_local,launchBrowser_adsPower_lianjie_linux,launchBrowser_adsPower_lianjie_local_api,launchBrowser_adsPower_lianjie_linux_api, closePage_adsPower, launchBrowser_adsPower_bendi } from './modules/puppeteerManager.js';
import { matchAndReplace, DataProcessor } from './modules/dataProcessor.js';
import { OutputFactory } from './modules/outputHandler.js';
// import { handleEvent } from './modules/eventHandler_3.js';
import { inserttask, findTaskList, findTaskcookies } from "./modules/notes.js";
import puppeteer from 'puppeteer';
import path from 'path';
import { taskExecutor } from './modules/taskExecutor.js';
import { eventHandler } from './modules/eventHandler.js';
import fs from 'fs/promises';


async function importHandleEvent(task_name) {
    console.log('importTasks called with:', task_name);
    console.log('Type of task_name:', typeof task_name);
    console.log('task_name stringified:', JSON.stringify(task_name));
    const { handleEvent } = await import(`./modules/eventHandler_${task_name}.js`);

    const handleEventCode_check = await fs.readFile(`./modules/eventHandler_${task_name}.js`, 'utf8');
    console.log('handleEventCode_check:', handleEventCode_check);

    return handleEvent;
}

export async function handler_login(req, res) {
    const environment = process.env.ENVIRONMENT;
    let config;
    if (environment === 'cloud') {
        config = loadConfig('config/config.json');
    } else {
        config = loadConfig('config/config_off.json');
    }
    const url = req.body.url;
    const task_name = req.body.task_name;

    const browser = await launchBrowser(config.puppeteerConfig);
    let page = await setupPage(browser, config.cookies);
    await page.setDefaultNavigationTimeout(180000); // 设置超时时间为 60 秒
    await page.goto(url);


    await Promise.race([
        page.waitForSelector('div.user-container', { timeout: 10 * 60 * 1000 }),
        page.waitForSelector('.userinfo-container .username', { timeout: 10 * 60 * 1000 }),
        page.waitForSelector('.userinfo-container', { timeout: 10 * 60 * 1000 }),
        page.waitForSelector('div#header-avatar.dropdown-wrapper--1F0hA.avatar-wrapper--10nXI', { timeout: 10 * 60 * 1000 })
    ]);

    console.log('登录成功.');
    // 登录成功后，保存登录状态
    // 获取cookies
    const cookies = await page.cookies();
    // 保存cookies到文件
    const outputHandler = OutputFactory.createOutputHandler(config.outputFormat);
    await outputHandler.handle(JSON.stringify(cookies, null, 2), 'login', task_name);

    console.log('保存成功.');

    await new Promise(resolve => setTimeout(resolve, 200000));
    await browser.close(); // 关闭浏览器
    res.json({ message: 'cookies save successfully' });

}




// export async function handler_run(req, res) {
    
//     const environment = process.env.ENVIRONMENT;
//     let config;
//     if (environment === 'cloud') {
//         config = loadConfig('config/config.json');
//     } else {
//         config = loadConfig('config/config_off.json');
//     }
//     const sortedData = req.body.sortedData;
//     //变量配置match文件
//     // const row = req.body.row;
//     console.log('req.body.row:', req.body.row);
//     const rows = Array.isArray(req.body.row) ? req.body.row : [req.body.row];
//     const task_name = req.body.task_name;
//     const leixing = req.body.leixing;
//     const adsPowerUserId = req.body.adsPowerUserId || 'kn8o287';
//     const BASE_URL = req.body.BASE_URL;
//     const adsPowerId = req.body.adsPowerId || '10.128.0.3';


//     //获取执行代码
//     await taskExecutor(task_name);
//     await eventHandler(task_name);

//     const handleEvent = await importHandleEvent(task_name);
//     // console.log('handleEvent_final:', handleEvent);
//     // const task_name = 'douyin';
//     console.log('task_name_0:', task_name);
//     console.log('leixing:', leixing);
//     // const TaskList = await findTaskcookies(task_name);
//     // TaskList.sort((a, b) => b.id - a.id);
//     // const latestTask = TaskList.length > 0 ? TaskList[0] : null;
//     let cookies = [];
//     const cookieFilePath = path.join(process.cwd(), `cookie_${task_name}.json`);
//     try {
//         // 尝试读取 cookie 文件
//         const cookieFileContent = await fs.readFile(cookieFilePath, 'utf-8');
//         cookies = JSON.parse(cookieFileContent);
//         // console.log(`成功从文件读取 cookies: ${cookieFilePath}`);
//     } catch (error) {
//         if (error.code === 'ENOENT') {
//             console.log(`Cookie 文件不存在: ${cookieFilePath}，将从数据库获取`);
//             // 如果文件不存在，使用原有的查询逻辑
//             const TaskList = await findTaskcookies(task_name);
//             TaskList.sort((a, b) => b.id - a.id);
//             const latestTask = TaskList.length > 0 ? TaskList[0] : null;

//             if (latestTask && latestTask.cookies) {
//                 try {
//                     const jsonString = JSON.parse(latestTask.cookies);
//                     cookies = JSON.parse(jsonString);
//                 } catch (parseError) {
//                     console.error('解析 task_cookies 失败:', parseError);
//                     cookies = []; // 如果解析失败，设置为空数组
//                 }
//             } else {
//                 cookies = []; // 如果没有找到 cookie，设置为空数组
//             }

//             // 无论是否找到 cookie，都将当前的 cookies 保存到文件
//             await fs.writeFile(cookieFilePath, JSON.stringify(cookies, null, 2));
//             console.log(`Cookies 已保存到文件: ${cookieFilePath}`);
//         } else {
//             console.error('读取 cookie 文件时发生错误:', error);
//             cookies = []; // 如果发生其他错误，也设置为空数组
//         }
//     }

//     // console.log('cookies', cookies);
//     let browser, page;
//     if (leixing == 'RPA') {        
//         // 本地浏览器
//         browser = await launchBrowser(config.puppeteerConfig);
//         page = await setupPage(browser, cookies);
//     } else {
//         // adsPower浏览器
//         if (environment === 'cloud') {
//             browser = await launchBrowser_adsPower_lianjie(adsPowerUserId, adsPowerId);
//         } else {
//             browser = await launchBrowser_adsPower_lianjie_local(adsPowerUserId,BASE_URL);
//             // browser = await launchBrowser_adsPower_lianjie_local(adsPowerUserId, adsPowerId);
//         }
//         page = await setupPage_adsPower(browser, cookies);
//     }


//     const monitorResults = {
//         clicks: [],
//         navigations: [],
//         inputs: [],
//         scrolls: [],
//         keydowns: [],
//     };

//     const dataProcessor = new DataProcessor(monitorResults);
//     dataProcessor.addMonitor(page);
//     console.log('rowscheck:', rows);
    
//     const sortedData_new = matchAndReplace(sortedData, rows[0])
//     let cityname = rows[0].cityname;
//     console.log('cityname:', cityname);
//     console.log('task_name:', task_name);
//     console.log('sortedData_new:', sortedData_new);
//     for (const [index, event] of sortedData_new.entries()) {
//         if (event.type !== 'loop_new') {
//             try {
//                 const { type, time } = event;
//                 console.log('正在处理事件:', event);
//                 await new Promise(resolve => setTimeout(resolve, 2000));

//                 await page.bringToFront();
//                 // 如果是循环事件，先处理 loopEvents
//                 if (type === 'loop' && event.loopEvents) {
//                     console.log('处理循环事件的 loopEvents');
//                     event.loopEvents = matchAndReplace(event.loopEvents, rows[0]);
//                     console.log('处理后的 loopEvents:', event.loopEvents);
//                 }
//                 page = await handleEvent(event, page, browser, index, sortedData_new, task_name, cityname);

//                 const currentTime = new Date(time).getTime();
//                 const nextTime = sortedData_new[index + 1]
//                     ? new Date(sortedData_new[index + 1].time).getTime()
//                     : currentTime;
//                 const waitTime = Math.max(2000, Math.min(nextTime - currentTime, 120000));
//                 await new Promise(resolve => setTimeout(resolve, waitTime));
//             } catch (error) {
//                 console.error(`处理非循环事件 ${index} 时出错:`, error);
//             }
//         }
//     }


//     // 然后处理循环事件
//     for (const [index, event] of sortedData.entries()) {
//         if (event.type === 'loop_new') {
//             for (const row of rows) {
//                 try {
//                     console.log('处理循环事件，数据行:', row);
//                     let cityname = row.cityname;
//                     console.log('cityname:', cityname);
//                     await new Promise(resolve => setTimeout(resolve, 2000));
//                     const loopEvents_new = matchAndReplace(event.loopEvents, row)
//                     for (const loopEvent of loopEvents_new) {
//                         try {
//                             console.log('执行循环子事件:', loopEvent);
//                             const { type, time } = loopEvent;
//                             await page.bringToFront();
//                             page = await handleEvent(loopEvent, page, browser, index, sortedData, task_name, cityname);
//                             const currentTime = new Date(time).getTime();
//                             const nextTime = loopEvent[index + 1]
//                                 ? new Date(loopEvent[index + 1].time).getTime()
//                                 : currentTime;
//                             const waitTime = Math.max(2000, Math.min(nextTime - currentTime, 120000));
//                             await new Promise(resolve => setTimeout(resolve, waitTime));
//                         } catch (error) {
//                             console.error(`处理循环子事件时出错:`, error);
//                         }
//                     }

//                 } catch (error) {
//                     console.error(`处理行 ${JSON.stringify(row)} 的循环事件时出错:`, error);
//                 }
//             }
//         }
//     }



//     res.writeHead(200, {
//         'Content-Type': 'application/json',
//     });
//     res.write(JSON.stringify({ wsEndpoint: browser.wsEndpoint(), monitorResults }));
//     res.end();


//     // await new Promise(resolve => setTimeout(resolve, 200000));
//     // await browser.close();
//     // 循环结束后关闭页面
//     // await closePage_adsPower(page);
//     // console.log('页面已关闭');

//     if (leixing == 'RPA') {
//         // 本地浏览器
//         await browser.close();
//     } else {
//         if (page && !page.isClosed()) {
//             await page.close();
//             console.log('adsPower页面已关闭');
//         }
//         // await page.close()
//     }
   
//     // await browser.close();
//     // await closeBrowser_adsPower(browser, config_adsPower);
//     // console.log('浏览器关闭');
// }


export async function handler_run(req, res) {
    let browser, page;
    try {
        // 1. 设置更长的超时时间
        req.setTimeout(3600000); // 1小时
        res.setTimeout(3600000); // 1小时

        const environment = process.env.ENVIRONMENT;
        let config;
        if (environment === 'cloud') {
            config = loadConfig('config/config.json');
        } else {
            config = loadConfig('config/config_off.json');
        }

        // 2. 参数验证
        if (!req.body || !req.body.sortedData) {
            throw new Error('Missing required parameters');
        }

        const sortedData = req.body.sortedData;
        console.log('req.body.row:', req.body.row);
        const rows = Array.isArray(req.body.row) ? req.body.row : [req.body.row];
        const task_name = req.body.task_name;
        const leixing = req.body.leixing;
        const adsPowerUserId = req.body.adsPowerUserId || 'kn8o287';
        const BASE_URL = req.body.BASE_URL;
        const adsPowerId = req.body.adsPowerId || '10.128.0.3';

        // 3. 获取执行代码
        await taskExecutor(task_name);
        await eventHandler(task_name);
        const handleEvent = await importHandleEvent(task_name);

        console.log('task_name_0:', task_name);
        console.log('leixing:', leixing);

        // 4. Cookie 处理
        let cookies = [];
        const cookieFilePath = path.join(process.cwd(), `cookie_${task_name}.json`);
        try {
            const cookieFileContent = await fs.readFile(cookieFilePath, 'utf-8');
            cookies = JSON.parse(cookieFileContent);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Cookie 文件不存在: ${cookieFilePath}，将从数据库获取`);
                const TaskList = await findTaskcookies(task_name);
                TaskList.sort((a, b) => b.id - a.id);
                const latestTask = TaskList.length > 0 ? TaskList[0] : null;

                if (latestTask && latestTask.cookies) {
                    try {
                        const jsonString = JSON.parse(latestTask.cookies);
                        cookies = JSON.parse(jsonString);
                    } catch (parseError) {
                        console.error('解析 task_cookies 失败:', parseError);
                        cookies = [];
                    }
                }
                await fs.writeFile(cookieFilePath, JSON.stringify(cookies, null, 2));
                console.log(`Cookies 已保存到文件: ${cookieFilePath}`);
            } else {
                console.error('读取 cookie 文件时发生错误:', error);
                cookies = [];
            }
        }

        // 5. 浏览器初始化
        try {
            if (leixing == 'RPA') {
                browser = await launchBrowser(config.puppeteerConfig);
                page = await setupPage(browser, cookies);
            } else {
                if (environment === 'cloud') {
                    browser = await launchBrowser_adsPower_lianjie(adsPowerUserId, adsPowerId);
                } else {
                    browser = await launchBrowser_adsPower_lianjie_local_api(adsPowerUserId, BASE_URL);
                }
                page = await setupPage_adsPower(browser, cookies);
            }
        } catch (error) {
            throw new Error(`浏览器初始化失败: ${error.message}`);
        }

        // 6. 监控设置
        const monitorResults = {
            clicks: [],
            navigations: [],
            inputs: [],
            scrolls: [],
            keydowns: [],
        };
        const dataProcessor = new DataProcessor(monitorResults);
        dataProcessor.addMonitor(page);

        // 7. 处理事件
        console.log('rowscheck:', rows);
        const sortedData_new = matchAndReplace(sortedData, rows[0]);
        let cityname = rows[0].cityname;
        console.log('cityname:', cityname);
        console.log('task_name:', task_name);
        console.log('sortedData_new:', sortedData_new);

        // 处理非循环事件
        for (const [index, event] of sortedData_new.entries()) {
            if (event.type !== 'loop_new') {
                try {
                    const { type, time } = event;
                    console.log('正在处理事件:', event);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await page.bringToFront();

                    if (type === 'loop' && event.loopEvents) {
                        event.loopEvents = matchAndReplace(event.loopEvents, rows[0]);
                    }
                    page = await handleEvent(event, page, browser, index, sortedData_new, task_name, cityname);

                    const currentTime = new Date(time).getTime();
                    const nextTime = sortedData_new[index + 1]
                        ? new Date(sortedData_new[index + 1].time).getTime()
                        : currentTime;
                    const waitTime = Math.max(2000, Math.min(nextTime - currentTime, 120000));
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } catch (error) {
                    console.error(`处理非循环事件 ${index} 时出错:`, error);
                    throw error; // 向上抛出错误以触发清理
                }
            }
        }

        // 处理循环事件
        for (const [index, event] of sortedData.entries()) {
            if (event.type === 'loop_new') {
                for (const row of rows) {
                    try {
                        console.log('处理循环事件，数据行:', row);
                        let cityname = row.cityname;
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const loopEvents_new = matchAndReplace(event.loopEvents, row);

                        for (const loopEvent of loopEvents_new) {
                            try {
                                console.log('执行循环子事件:', loopEvent);
                                const { type, time } = loopEvent;
                                await page.bringToFront();
                                page = await handleEvent(loopEvent, page, browser, index, sortedData, task_name, cityname);

                                const currentTime = new Date(time).getTime();
                                const nextTime = loopEvent[index + 1]
                                    ? new Date(loopEvent[index + 1].time).getTime()
                                    : currentTime;
                                const waitTime = Math.max(2000, Math.min(nextTime - currentTime, 120000));
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                            } catch (error) {
                                console.error(`处理循环子事件时出错:`, error);
                                throw error; // 向上抛出错误以触发清理
                            }
                        }
                    } catch (error) {
                        console.error(`处理行 ${JSON.stringify(row)} 的循环事件时出错:`, error);
                        throw error; // 向上抛出错误以触发清理
                    }
                }
            }
        }

        // 8. 成功完成，返回结果
        if (!res.headersSent) {
            res.status(200).json({
                status: 'success',
                wsEndpoint: browser.wsEndpoint(),
                monitorResults
            });
        }

    } catch (error) {
        // 9. 错误处理
        console.error('任务执行失败:', error);
        if (!res.headersSent) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    } finally {
        // 10. 资源清理
        try {
            if (leixing == 'RPA') {
                if (browser) await browser.close();
            } else {
                if (page && !page.isClosed()) {
                    await page.close();
                    console.log('adsPower页面已关闭');
                }
            }
        } catch (cleanupError) {
            console.error('清理资源时出错:', cleanupError);
        }
    }
}





export async function handler_run_test(params) {

    const environment = process.env.ENVIRONMENT;
    let config;
    if (environment === 'cloud') {
        config = loadConfig('config/config.json');
    } else {
        config = loadConfig('config/config_off.json');
    }
    const sortedData = params.sortedData;
    const row = params.row;
    const task_name = params.task_name;
    
    const handleEvent = await importHandleEvent(task_name);
    // const task_name = 'douyin';
    console.log('task_name_0:', task_name);
    const TaskList = await findTaskList(task_name);
    TaskList.sort((a, b) => b.id - a.id);
    const latestTask = TaskList[0];
    const jsonString = latestTask ? JSON.parse(latestTask.task_cookies) : "";
    const cookies = latestTask ? JSON.parse(jsonString) : [];

    // console.log('cookies', cookies)


    // const browser = await launchBrowser(config.puppeteerConfig);
    // let page = await setupPage(browser, cookies);
    const config_adsPower = {
        adsPowerUserId: 'kn8o287', // 替换为您的AdsPower用户ID
        adsPowerId: '35.225.115.200', // 替换为您的AdsPower用户ID
        // ... 其他配置项 ...
    };
    const browser = await launchBrowser_adsPower(config_adsPower);
    let page = await setupPage_adsPower(browser, cookies);


    const sortedData_new = matchAndReplace(sortedData, row);
    console.log('sortedData_new_run:', sortedData_new);

    const monitorResults = {
        clicks: [],
        navigations: [],
        inputs: [],
        scrolls: [],
        keydowns: [],
    };

    const dataProcessor = new DataProcessor(monitorResults);
    dataProcessor.addMonitor(page);
    let cityname = row.cityname
    console.log('cityname_0:', cityname);

    // 获取定义的 handleEvent 函数
    for (const [index, event] of sortedData_new.entries()) {
        const { type, time } = event;
        console.log('event:', event);
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('event:', event);
        page = await handleEvent(event, page, browser, index, sortedData_new, task_name, cityname);
        const currentTime = new Date(time).getTime();
        const nextTime = sortedData[sortedData.indexOf(event) + 1] ? new Date(sortedData[sortedData.indexOf(event) + 1].time).getTime() : currentTime;
        const waitTime = Math.min(nextTime - currentTime, 2000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    await new Promise(resolve => setTimeout(resolve, 200000));
    // await browser.close();
    await closeBrowser_adsPower(browser, config_adsPower.adsPowerUserId);
}

