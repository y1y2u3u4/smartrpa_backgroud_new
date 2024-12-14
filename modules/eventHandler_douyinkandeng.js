///实现通过OZON商家后台搜索查询商品销量
async function importTasks(task_name) {
    console.log('task_name_check:', task_name);
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
    constructor(loopEvents, loopCount, outputData) {
        this.loopEvents = loopEvents;
        this.outputData = outputData;
        this.loopCount = loopCount;
    }
    async execute(page, browser, index,sortedData_new, task_name, cityname, handleEvent) {
        console.log('action.loopEvents:');
        // await page.goto(page.url(), { waitUntil: 'load', timeout: 60000 });
        // console.log('Page loaded.');
        await new Promise(resolve => setTimeout(resolve, 2000));
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
            await new Promise(resolve => setTimeout(resolve, 5000));
            const randomInterval = getRandomInterval();
            console.log(`等待 ${randomInterval} 毫秒后进行下一次循环迭代`);
            await new Promise(resolve => setTimeout(resolve, randomInterval));

        } catch (error) {
            console.error(`处理文本时发生错误:`, error);
        }


    }
}

export async function handleEvent(event, page, browser, index, sortedData_new, task_name, cityname) {
    console.log('task_name:', task_name);
    const { ClickTask, InputTask, OutputTask, KeydownTask, NavigationTask, ScrollTask } = await importTasks(task_name);
    let task;
    console.log('task_name_1:', task_name);
    console.log('cityname_1:', cityname);
    switch (event.type) {
        case 'click':
            task = new ClickTask(event.element, event.value, index, browser, task_name, cityname);
            break;
        case 'input':
            task = new InputTask(event.element, event.value, sortedData_new);
            break;
        case 'output':
            console.log('task_name_1.2:', task_name);
            console.log('cityname_1.2:', cityname);
            task = new OutputTask(event.element, event.value, sortedData_new, task_name, cityname);
            break;
        case 'loop':
            console.log('task_name_1.3:', task_name);
            console.log('cityname_1.3:', cityname);
            // const outputTask = new OutputTask({ leixing: '自定义0' }, event.value, sortedData_new, task_name, cityname);
            // await outputTask.execute(page);
            // const outputData = outputTask.data;  // 直接访问 data 属性
            const outputData = "";
            console.log('outputData:', outputData);
            task = new LoopTask(event.loopEvents, event.loopCount, outputData);  // 传递输出数据给 LoopTask
            console.log('task_name_1.4:', task_name);
            console.log('cityname_1.4:', cityname);
            await task.execute(page, browser, index,sortedData_new, task_name, cityname, handleEvent);
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