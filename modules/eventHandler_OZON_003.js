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
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let currentPage = 1;
        let totalPages = 1;

        while (true) {
            try {
                // 1. 等待页面加载
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 2. 执行当前页面的循环事件
                const loopEvents = this.loopEvents || [];
                for (const loopEvent of loopEvents) {
                    try {
                        console.log(`执行循环事件:`, loopEvent);
                        page = await handleEvent(loopEvent, page, browser, index, sortedData_new, task_name, cityname);
                    } catch (error) {
                        console.error(`循环中发生错误:`, error);
                    }
                }

                // 3. 获取分页信息
                // await page.waitForSelector('.et7', { timeout: 30000 });
                const paginationInfo = await page.evaluate(() => {
                    try {
                        const paginationContainer = document.querySelector('.et7');
                        if (!paginationContainer) {
                            console.log('未找到分页元素');
                            return null;
                        }

                        console.log('分页元素已找到');

                        const pageLinks = paginationContainer.querySelectorAll('a.se8');
                        const allPages = Array.from(pageLinks).map(link => link.textContent.trim());

                        const totalPages = allPages
                            .filter(text => !isNaN(parseInt(text)))
                            .map(text => parseInt(text))
                            .reduce((max, current) => Math.max(max, current), 0);

                        const currentPage = Array.from(pageLinks).findIndex(link => link.classList.contains('es9')) + 1;

                        // console.log('所有页码:', allPages);
                        // console.log('当前页面类名:', Array.from(pageLinks).map(link => link.className));

                        const paginationInfo = { currentPage, totalPages, allPages };
                        // console.log('分页信息:', paginationInfo);
                        // console.log(`当前页码: ${currentPage}, 总页数: ${totalPages}`);

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
                    currentPage = paginationInfo.currentPage;
                    totalPages = paginationInfo.totalPages;
                }

                console.log(`当前页码: ${currentPage}, 总页数: ${totalPages}`);

                // 4. 判断是否需要进入下一页
                if (currentPage >= totalPages) {
                    console.log('已到达最后一页，退出循环');
                    break;
                }

                // 5. 点击下一页并等待页面加载
                try {
                    await page.click('a.s6e.b2117-a0.b2117-b6.b2117-b1');
                    console.log('点击了下一页按钮');
                    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {
                        console.log('导航等待超时，继续执行');
                    });
                } catch (error) {
                    console.log('无法点击下一页按钮，可能已经到达最后一页或页面结构发生变化');
                    break;
                }
                
            } catch (error) {
                console.error(`处理页面时发生错误:`, error);
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
            task = new ClickTask(event.element, browser);
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
            // await task.execute(page, browser, index, sortedData_new, task_name,cityname,handleEvent);
            // return; // LoopTask already handles the execution of nested events
            const newLoopPage = await task.execute(page, browser, index, sortedData_new, task_name, cityname, handleEvent);
            return newLoopPage || page; // 如果 newLoopPage 是 undefined，则返回原始页面
        case 'scroll':
            task = new ScrollTask(event.distance, event.direction, task_name, cityname);
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