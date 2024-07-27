// handler.js
import { loadConfig } from './modules/configManager.js';
import { launchBrowser, setupPage } from './modules/puppeteerManager.js';
import { matchAndReplace, DataProcessor } from './modules/dataProcessor.js';
import { OutputFactory } from './modules/outputHandler.js';
import { handleEvent } from './modules/eventHandler_1.js';
import { inserttask, findTaskList } from "./modules/notes.js";
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
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
        page.waitForSelector('.userinfo-container', { timeout: 10 * 60 * 1000 })
    ]);

    console.log('登录成功.');
    // 登录成功后，保存登录状态
    // 获取cookies
    const cookies = await page.cookies();
    // 保存cookies到文件
    const outputHandler = OutputFactory.createOutputHandler(config.outputFormat);
    await outputHandler.handle(JSON.stringify(cookies, null, 2), 'login', task_name);

    console.log('保存成功.');

    await new Promise(resolve => setTimeout(resolve, 2000));
    await browser.close(); // 关闭浏览器
    res.json({ message: 'cookies save successfully' });

}

export async function handler_run(req, res) {
    const environment = process.env.ENVIRONMENT;
    let config;
    if (environment === 'cloud') {
        config = loadConfig('config/config.json');
    } else {
        config = loadConfig('config/config_off.json');
    }
    //基础任务josn文件
    // console.log('req', req)
    const sortedData = req.body.sortedData;
    // const handleEventScript = req.body.handleEventScript;
    //变量配置match文件
    const row = req.body.row;
    const task_name = req.body.task_name;
    console.log('task_name_0:', task_name);
    const TaskList = await findTaskList(task_name);
    TaskList.sort((a, b) => b.id - a.id);
    const latestTask = TaskList[0];
    const jsonString = JSON.parse(latestTask.task_cookies);
    const cookies = JSON.parse(jsonString);
    
    console.log('cookies', cookies)

    // const cookiesPath = path.join(process.cwd(), 'cookies.json');
    // const cookiesString = fs.readFileSync(cookiesPath, 'utf8');
    // const cookies = JSON.parse(cookiesString);

    const browser = await launchBrowser(config.puppeteerConfig);
    let page = await setupPage(browser, cookies);


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
    // const handleEvent = new Function('return ' + handleEventScript)();
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


    // const outputHandler = OutputFactory.createOutputHandler(config.outputFormat);
    // outputHandler.handle(monitorResults);

    res.writeHead(200, {
        'Content-Type': 'application/json',
    });
    res.write(JSON.stringify({ wsEndpoint: browser.wsEndpoint(), monitorResults }));
    res.end();

    await browser.close();
}



export async function getData_baidu(req, res) {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { keywords, cityname } = req.body;

    if (!keywords) {
        res.status(400).json({ error: 'Keywords are required' });
        return;
    }
    
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
                res.status(200).json(result);
            } else {
                res.status(404).json({ error: 'No POIs found' });
            }
        } else {
            const errorText = await response.text();
            res.status(response.status).json({ error: errorText });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};



export async function getData_tengxun(req, res) {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const { keywords, cityname } = req.body;

    if (!keywords) {
        res.status(400).json({ error: 'Keywords are required' });
        return;
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
                res.status(200).json(result);
            } else {
                res.status(404).json({ error: 'No POIs found' });
            }
        } else {
            const errorText = await response.text();
            res.status(response.status).json({ error: errorText });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};