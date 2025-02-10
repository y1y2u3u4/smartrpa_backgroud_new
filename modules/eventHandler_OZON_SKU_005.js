
///实现通过OZON的店铺来获取对应的 sku 数据
async function importTasks(task_name) {
    const module = await import(`./taskExecutor_${task_name}.js`);
    return {
        ClickTask: module.ClickTask,
        InputTask: module.InputTask,
        OutputTask: module.OutputTask,
        KeydownTask: module.KeydownTask,
        NavigationTask: module.NavigationTask,
        ScrollTask: module.ScrollTask
    };
}

function getRandomInterval(min = 2000, max = 8000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class LoopTask {
    constructor(loopEvents, loopCount, outputData, handleEventFunction) {  // 添加 handleEventFunction 参数
        this.loopEvents = loopEvents;
        this.outputData = outputData;
        this.loopCount = loopCount;
        this.handleEvent = handleEventFunction;  // 保存 handleEvent 函数引用
    }
    async execute(page, browser, index, sortedData_new, task_name, cityname, handleEvent) {
        console.log('action.loopEvents:');
        // await page.goto(page.url(), { waitUntil: 'load', timeout: 60000 });
        // console.log('Page loaded.');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // try {
        //     await page.waitForSelector('.e2r', { timeout: 10000 });
        // } catch (error) {
        //     console.log('等待选择器 .e2r 超时，继续执行');
        // }

        let currentPage = 1;
        let totalPages = 1;

        while (true) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await page.waitForSelector('input[placeholder*="请输入商品名称"], input.base-input-module_baseInput_vFlRR.input-module_baseInput_QHL39, .input-module_inputTokensContainer_kvU9K input, [data-widget="tableFilter-ProductsSearch"] input, .styles_productsSearch_WhG9p input', { timeout: 15000 });
                console.log('搜索框已找到');

                // 每次循环时重新获取分页信息
                const paginationInfo = await page.evaluate(() => {
                    try {
                        const paginationContainer = document.querySelector('.s4e');
                        if (!paginationContainer) {
                            console.log('未找到分页元素');
                            return null;
                        }

                        console.log('分页元素已找到');

                        const pageLinks = paginationContainer.querySelectorAll('a.s2e');
                        const allPages = Array.from(pageLinks).map(link => link.textContent.trim());

                        const totalPages = allPages
                            .filter(text => !isNaN(parseInt(text)))
                            .map(text => parseInt(text))
                            .reduce((max, current) => Math.max(max, current), 0);

                        const currentPage = Array.from(pageLinks).findIndex(link => link.classList.contains('r8e')) + 1;

                        console.log('所有页码:', allPages);
                        console.log('当前页面类名:', Array.from(pageLinks).map(link => link.className));

                        const paginationInfo = { currentPage, totalPages, allPages };
                        console.log('分页信息:', paginationInfo);
                        console.log(`当前页码: ${currentPage}, 总页数: ${totalPages}`);

                        const hasEllipsis = Array.from(pageLinks).some(el => el.textContent.trim() === '...');
                        if (hasEllipsis) {
                            console.log('注意：存在省略号（...），实际总页数可能大于显示的最大数字');
                        }

                        return paginationInfo;
                    } catch (error) {
                        console.error('执行过程中发生错误:', error);
                        return null;
                    }
                });

                if (paginationInfo) {
                    console.log('成功获取分页信息:', paginationInfo);
                    currentPage = paginationInfo.currentPage
                    totalPages = paginationInfo.totalPages
                } else {
                    console.log('未能获取分页信息');
                }
            } catch (error) {
                console.log('等待选择器 .re0 .eq9 超时，继续执行');
            }

            console.log(`当前页码: ${currentPage}, 总页数: ${totalPages}`);


            const loopEvents = this.loopEvents || [];
            try {
                for (const loopEvent of loopEvents) {
                    try {
                        console.log(`执行循环事件:`, loopEvent);
                        page = await handleEvent(loopEvent, page, browser, index, sortedData_new, task_name, cityname);
                    } catch (error) {
                        console.error(`循环中发生错误:`, error);
                    }
                }

            } catch (error) {
                console.error(`处理文本时发生错误:`, error);
            }

            // if (currentPage < totalPages) {
            if (currentPage >= totalPages) {
                try {
                    await page.click('a.es1.b2117-a0.b2117-b6.b2117-b1');
                    console.log('点击了下一页按钮');
                    try {
                        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
                    } catch (error) {
                        console.log('导航等待超时，继续执行');
                    }
                } catch (error) {
                    console.log('无法点击下一页按钮，可能已经到达最后一页或页面结构发生变化');
                    break;
                }
            } else {
                console.log('已到达最后一页，退出循环');
                break;
            }
        }

    }
}

export async function handleEvent(event, page, browser,index, sortedData_new, task_name, cityname) {
    const { ClickTask, InputTask, OutputTask, KeydownTask, NavigationTask, ScrollTask } = await importTasks(task_name);
    let task;
    console.log('task_name_1:', task_name);
    console.log('cityname_1:', cityname);
    switch (event.type) {
        case 'click':
            task = new ClickTask(event.element, browser, task_name, cityname);
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
            // const outputTask = new OutputTask({ leixing: '自定义0' }, event.value, sortedData_new, task_name, cityname);
            // await outputTask.execute(page);
            // const outputData = outputTask.data;  // 直接访问 data 属性
            const outputData ="";
            console.log('outputData:', outputData);
            task = new LoopTask(event.loopEvents, event.loopCount, outputData, handleEvent);  // 传入 handleEvent 函数
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
        await page.close();  // 关闭旧页面
        page = newPage;
    }
    return page;
}