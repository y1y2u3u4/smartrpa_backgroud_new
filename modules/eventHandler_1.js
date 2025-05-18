
///大众点评获取商户名称+调用 api 实现电话查询流程
import { ClickTask, InputTask, OutputTask, KeydownTask, NavigationTask, ScrollTask } from './taskExecutor_1.js';

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

        const data = this.outputData || []; 
        for (let text of data) {
            // if (text === '西城区') {
            //     continue;
            // }
            console.log('Processing text:', text);

            try {
                // 确保页面完全加载
                await page.goto(page.url(), { waitUntil: 'load', timeout: 60000 });
                console.log('Page loaded.');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 查找元素并捕获错误
                const foundLink_0 = await page.evaluate((text) => {
                    try {
                        let xpath = `//a/span[text()='行政区'] | //a[text()='行政区']`;
                        let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        let linkElement = xpathResult.singleNodeValue;
                        return linkElement !== null; // 返回是否找到链接
                    } catch (error) {
                        console.error('Error in evaluate for finding link:', error);
                        return false;
                    }
                }, text);
                if (foundLink_0) {
                    console.log('Link found for text:', text);

                    // 点击链接并等待导航完成，最多等待3秒钟
                    await Promise.race([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }),
                        page.evaluate((text) => {
                            let xpath = `//a/span[text()='行政区'] | //a[text()='行政区']`;
                            let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                            let linkElement = xpathResult.singleNodeValue;
                            if (linkElement) {
                                linkElement.click();
                            }
                        }, text),
                        new Promise(resolve => setTimeout(resolve, 3000))
                    ]);

                    console.log('Navigation completed or timeout for text:', text);

                    // 获取总页数

                } else {
                    console.log(`没有找到文本为 "${text}" 的链接`);
                }
                // 等待一定时间确保页面渲染完成
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 查找元素并捕获错误
                const foundLink = await page.evaluate((text) => {
                    try {
                        let xpath = `//a/span[text()='${text}'] | //a[text()='${text}']`;
                        let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        let linkElement = xpathResult.singleNodeValue;
                        return linkElement !== null; // 返回是否找到链接
                    } catch (error) {
                        console.error('Error in evaluate for finding link:', error);
                        return false;
                    }
                }, text);
                
                console.log('page URL_check1:', page.url());
                if (foundLink) {
                    console.log('Link found for text:', text);
                    // 监听 'targetcreated' 事件
                    // 点击链接并等待导航完成，最多等待3秒钟
                    await Promise.race([
                        page.waitForNavigation({ waitUntil: 'networkidle0' }),
                        page.evaluate((text) => {
                            let xpath = `//a/span[text()='${text}'] | //a[text()='${text}']`;
                            let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                            let linkElement = xpathResult.singleNodeValue;
                            if (linkElement) {
                                linkElement.click();
                            }
                        }, text),
                        new Promise(resolve => setTimeout(resolve, 5000))
                    ]);

                    console.log('Navigation completed or timeout for text:', text);

                    const loopEvents = this.loopEvents || [];
                    console.log('task_name_1.1:', task_name);
                    console.log('cityname_1.1:', cityname);
                    page = await handleEvent(loopEvents[0], page, browser, index, sortedData_new, task_name, cityname);
                    await page.waitForSelector('.page a');
                    const totalPageNumber = await page.evaluate(() => {
                        let pageLinks = document.querySelectorAll('.page a');
                        return pageLinks.length > 0 ? parseInt(pageLinks[pageLinks.length - 2].innerText) : 1;
                    });

                    console.log('Total page number:', totalPageNumber);
                    // 获取总页数

                    // const loopCount = totalPageNumber || 1;
                    
                    // const date = new Date();
                    // const dateString = date.toISOString().replace(/:/g, '-'); // 将时间中的冒号替换为短横线，因为冒号在文件名中是非法的
                    // const filename = `output_${dateString}.xlsx`;

                    for (let i = 0; i < totalPageNumber; i++) {

                        const notFoundElement = await page.$('.not-found-pic');
                        if (notFoundElement) {
                            console.log('未找到相关商户，尝试导航到下一页');

                            // 获取当前 URL
                            let currentUrl = page.url();

                            // 解析 URL 并增加页码
                            let urlParts = currentUrl.split('/');
                            let lastPart = urlParts[urlParts.length - 1];
                            let newPageNumber = parseInt(lastPart) + 1;
                            urlParts[urlParts.length - 1] = newPageNumber.toString();
                            let newUrl = urlParts.join('/');

                            // 导航到新的 URL
                            await page.goto(newUrl, { waitUntil: 'networkidle0' });
                            console.log(`已导航到新的 URL: ${newUrl}`);

                            // 跳过当前循环的剩余部分
                            continue;
                        }


                        for (const loopEvent of loopEvents) {
                            try {
                                console.log(`Executing loop event:`, loopEvent);
                                page = await handleEvent(loopEvent, page, browser, index, sortedData_new, task_name, cityname);
                            } catch (error) {
                                console.error(`An error occurred in the loop:`, error);
                            }
                        }

                        // const allHeaders = new Set();
                        // function collectHeaders(data, prefix = '') {
                        //     Object.keys(data).forEach(key => {
                        //         const fullKey = prefix ? `${prefix}_${key}` : key;
                        //         if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
                        //             collectHeaders(data[key], fullKey);
                        //         } else {
                        //             allHeaders.add(fullKey);
                        //         }
                        //     });
                        // }


                        // // 遍历每个对象，收集所有可能的列名称
                        // data.forEach(dataArray => {
                        //     dataArray.forEach(data => {
                        //         collectHeaders(data);
                        //     });
                        // });

                        // // 将所有列名称转换为数组
                        // const allHeadersArray = Array.from(allHeaders);

                        // // 创建一个新的工作簿和工作表
                        // const workbook = new Workbook();
                        // const worksheet = workbook.addWorksheet('Sheet1');

                        // // 添加标题行
                        // worksheet.addRow(allHeadersArray);


                        // // 增加随机时间间隔

                        // // 遍历每个对象，并构建数据行
                        // data.forEach(dataArray => {
                        //     dataArray.forEach(data => {
                        //         const rowData = {};

                        //         function populateRowData(data, prefix = '') {
                        //             Object.keys(data).forEach(key => {
                        //                 const fullKey = prefix ? `${prefix}_${key}` : key;
                        //                 if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
                        //                     populateRowData(data[key], fullKey);
                        //                 } else {
                        //                     rowData[fullKey] = data[key];
                        //                 }
                        //             });
                        //         }

                        //         populateRowData(data);

                        //         // 添加数据行
                        //         const row = allHeadersArray.map(header => rowData[header] || '');
                        //         worksheet.addRow(row);
                        //     });
                        // });
                        // // 写入 Excel 文件
                        // await workbook.xlsx.writeFile(filename)
                        //     .then(() => {
                        //         console.log('Excel 文件已成功创建！');
                        //     })
                        //     .catch(error => {
                        //         console.error('创建 Excel 文件时出错：', error);
                        //     });
                        // console.log('保存成功');

                        const randomInterval = getRandomInterval();
                        console.log(`Waiting for ${randomInterval} milliseconds before next loop iteration`);
                        await new Promise(resolve => setTimeout(resolve, randomInterval));

                    }
                
                } else {
                    console.log(`没有找到文本为" 的链接`);
                }
            } catch (error) {
                console.error(`An error occurred while processing text":`, error);
            }
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