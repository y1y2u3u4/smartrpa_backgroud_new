///大众点评获取商户名称+调用 api 实现电话查询流程by最细颗粒度
import { ClickTask, InputTask, OutputTask, KeydownTask, NavigationTask, ScrollTask } from './taskExecutor_dianping.js';

function getRandomInterval(min = 2000, max = 8000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class LoopTask {
    constructor(loopEvents, loopCount, outputData) {
        this.loopEvents = loopEvents;
        this.outputData = outputData; 
        // this.i = i;  // 添加这一行
    }

    async execute(page, browser, index, sortedData_new, task_name, cityname, handleEvent) {
        try {
            // 确保页面完全加载
            await page.goto(page.url(), { waitUntil: 'load', timeout: 60000 });
            console.log('Page loaded.');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 获取总页数
            await page.waitForSelector('.page a');
            const totalPageNumber = await page.evaluate(() => {
                let pageLinks = document.querySelectorAll('.page a');
                return pageLinks.length > 0 ? parseInt(pageLinks[pageLinks.length - 2].innerText) : 1;
            });

            console.log('Total page number:', totalPageNumber);
            
            // 直接进行页数循环
            for (let i = 0; i < totalPageNumber; i++) {
                // 检查是否有未找到商户的提示
                const notFoundElement = await page.$('.not-found-pic');
                if (notFoundElement) {
                    console.log('未找到相关商户，尝试导航到下一页');
                    let currentUrl = page.url();
                    let urlParts = currentUrl.split('/');
                    let lastPart = urlParts[urlParts.length - 1];
                    let newPageNumber = parseInt(lastPart) + 1;
                    urlParts[urlParts.length - 1] = newPageNumber.toString();
                    let newUrl = urlParts.join('/');
                    await page.goto(newUrl, { waitUntil: 'networkidle0' });
                    console.log(`已导航到新的 URL: ${newUrl}`);
                    continue;
                }

                // 执行循环事件
                const loopEvents = this.loopEvents || [];
                for (const loopEvent of loopEvents) {
                    try {
                        console.log(`Executing loop event:`, loopEvent);
                        await Promise.race([
                            handleEvent(loopEvent, page, browser, index, sortedData_new, task_name, cityname).then(newPage => {
                                page = newPage;
                            }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('超时10秒')), 10000))
                        ]);
                    } catch (error) {
                        console.log('操作超时10秒或发生错误，继续下一个事件:', error.message);
                        continue;
                    }
                }

                // 随机等待时间
                const randomInterval = getRandomInterval();
                console.log(`Waiting for ${randomInterval} milliseconds before next loop iteration`);
                await new Promise(resolve => setTimeout(resolve, randomInterval));
            }

        } catch (error) {
            console.error('执行过程中发生错误:', error);
            throw error;
        }
    }
}

export async function handleEvent(event, page, browser, index, sortedData_new, task_name, cityname) {
    let task;
    console.log('task_name_1:', task_name);
    console.log('cityname_1:', cityname);
    switch (event.type) {
        case 'click':
            task = new ClickTask(event.element, index, browser);
            break;
        case 'input':
            task = new InputTask(event.element, event.value, sortedData_new);
            break;
        case 'output':
            console.log('task_name_1.2:', task_name);
            console.log('cityname_1.2:', cityname);
            task = new OutputTask(event.element, event.value, sortedData_new,task_name, cityname);
            break;
        case 'loop':
            console.log('task_name_1.3:', task_name);
            console.log('cityname_1.3:', cityname);
            const outputTask = new OutputTask({ leixing: '自定义0' }, event.value, sortedData_new, task_name, cityname);
            await outputTask.execute(page);
            const outputData = outputTask.data;  // 直接访问 data 属性
            console.log('outputData:', outputData);
            task = new LoopTask(event.loopEvents, event.loopCount, outputData);  // 传递输出数据给 LoopTask
            console.log('task_name_1.4:', task_name);
            console.log('cityname_1.4:', cityname);
            await task.execute(page, browser, index, sortedData_new, task_name,cityname,handleEvent);
            return; // LoopTask already handles the execution of nested events
        case 'scroll':
            task = new ScrollTask(event.distance, event.direction);
            break;
        case 'navigation':
            task = new NavigationTask(event.url);
            break;
        case 'keydown':
            task = new KeydownTask(event.key);
            break;
        default:
            throw new Error(`Unsupported event type: ${event.type}`);
    }

    // Execute the task and check for a new page context
    const newPage = await task.execute(page);
    console.log('newPage URL:', newPage.url());
    console.log('page URL:', page.url());
    if (newPage !== page) {
        console.log('替换 page:');
        page = newPage;
    }

    // If newPage is null, keep the current page context
    return page;
}