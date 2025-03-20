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

        const data = this.outputData || []; 
        const excludeDistricts = [];
        for (let text of data.filter(d => !excludeDistricts.includes(d))) {
            console.log('Processing text:', text);
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
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


                    // 先点击<a class="more J_packdown" href="javascript:;">更多<i class="icon-arr-extend"></i></a>点击
                    await page.waitForSelector('#region-nav-sub');
                    // 获取子区域列表

                    try {
                        console.log('开始尝试点击第二个"更多"按钮');

                        // 等待页面加载稳定
                        await page.waitForTimeout(2000);

                        // 使用 XPath 来精确定位第二个"更多"按钮
                        const secondMoreButtonXPath = '(//a[contains(@class, "more") and contains(@class, "J_packdown")])[2]';

                        // 等待第二个按钮出现
                        await page.waitForXPath(secondMoreButtonXPath, {
                            visible: true,
                            timeout: 5000
                        });

                        // 获取第二个按钮元素
                        const [secondMoreButton] = await page.$x(secondMoreButtonXPath);

                        if (secondMoreButton) {
                            // 确保按钮在视图中
                            await secondMoreButton.evaluate(button => {
                                button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            });

                            await page.waitForTimeout(500); // 等待滚动完成

                            // 尝试多种点击方法
                            try {
                                await Promise.race([
                                    secondMoreButton.click(),
                                    page.evaluate(button => button.click(), secondMoreButton),
                                    // 使用 XPath 的方式在页面上下文中点击
                                    page.evaluate(xpath => {
                                        const button = document.evaluate(
                                            xpath,
                                            document,
                                            null,
                                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                                            null
                                        ).singleNodeValue;
                                        if (button) {
                                            const event = new MouseEvent('click', {
                                                bubbles: true,
                                                cancelable: true,
                                                view: window
                                            });
                                            button.dispatchEvent(event);
                                        }
                                    }, secondMoreButtonXPath)
                                ]);

                                console.log('成功点击第二个"更多"按钮');
                                await page.waitForTimeout(1000); // 等待动画效果
                            } catch (clickError) {
                                throw new Error(`点击第二个"更多"按钮失败: ${clickError.message}`);
                            }
                        } else {
                            throw new Error('未找到第二个"更多"按钮');
                        }
                    } catch (error) {
                        console.error('点击第二个"更多"按钮时发生错误:', error.message);
                    }


                    await page.waitForTimeout(1000);
                    console.log('当前页面URL:', await page.url());

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
                    
                    for (let i = 0; i < totalPageNumber; i++) {
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

                        const randomInterval = getRandomInterval();
                        console.log(`Waiting for ${randomInterval} milliseconds before next loop iteration`);
                        await new Promise(resolve => setTimeout(resolve, randomInterval));
                    }
                } else {
                    console.log(`没有找到文本为" 的链接`);
                }
                    break; // 如果成功执行，跳出重试循环
                } catch (error) {
                    retryCount++;
                    console.error(`尝试第 ${retryCount} 次出错:`, error);
                    
                    if (retryCount < maxRetries) {
                        console.log(`正在进行第 ${retryCount} 次重试...`);
                        await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        console.error(`在 ${maxRetries} 次尝试后仍然失败，跳过当前处理:`, error);
                        break;
                    }
                }
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