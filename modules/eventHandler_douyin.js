
///实现通过抖音创作中心实现视频刊登和表现数据获取
// import { ClickTask, InputTask, OutputTask, KeydownTask, NavigationTask, ScrollTask } from `./taskExecutor_${task_name}.js`;

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
    constructor(loopEvents, loopCount, outputData) {
        this.loopEvents = loopEvents;
        this.outputData = outputData; 
        this.loopCount = loopCount;
    }
    async execute(page, browser, index, sortedData_new, task_name, cityname, handleEvent) {
        console.log('action.loopEvents:');
        console.log('index:', index);
        await page.goto(page.url(), { waitUntil: 'load', timeout: 60000 });
        console.log('Page loaded.');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.waitForSelector('.douyin-creator-pc-page-small', { timeout: 60000 });

        const paginationInfo = await page.evaluate(() => {
            const paginationElement = document.querySelector('.douyin-creator-pc-page-small');
            console.log('paginationElement:', paginationElement);
            if (paginationElement) {
                const paginationText = paginationElement.textContent.trim();
                console.log('paginationText:', paginationText);
                const [currentPage, totalPages] = paginationText.split('/').map(num => parseInt(num.trim(), 10));
                console.log('currentPage:', currentPage);
                console.log('totalPages:', totalPages);
                return { currentPage, totalPages };
            }
            return null;
        });
        console.log('paginationInfo:', paginationInfo);
        const totalPages = paginationInfo ? paginationInfo.totalPages : null;

        console.log('总页数:', totalPages);
        const loopCount = this.loopCount || [];
        console.log('loopCount:', loopCount);
        
        const totalPagesPerPart = Math.ceil(totalPages / 4);
        const startPage = (loopCount - 1) * totalPagesPerPart;
        const endPage = Math.min(loopCount * totalPagesPerPart, totalPages);
        
        for (let i = startPage; i < endPage; i++) {
            try {
            await page.goto(page.url(), { waitUntil: 'load', timeout: 60000 });
            console.log('Page loaded.');
            console.log(`当前页码: ${i+1}, 总页数: ${paginationInfo.totalPages}`);
            await page.waitForSelector('.douyin-creator-pc-page-small', { timeout: 100000 });

            const paginationInfo_focus = await page.evaluate(() => {
                const paginationElement = document.querySelector('.douyin-creator-pc-page-small');
                console.log('paginationElement:', paginationElement);
                if (paginationElement) {
                    const paginationText = paginationElement.textContent.trim();
                    console.log('paginationText:', paginationText);
                    const [currentPage_focus, totalPages_focus] = paginationText.split('/').map(num => parseInt(num.trim(), 10));
                    console.log('currentPage_focus:', currentPage_focus);
                    console.log('totalPages_focus:', totalPages_focus);
                    return { currentPage_focus, totalPages_focus };
                }
                return null;
            });
            console.log('paginationInfo_focus:', paginationInfo_focus);
            let currentPage_focus = paginationInfo_focus ? paginationInfo_focus.currentPage_focus : null;

            try {
                while (currentPage_focus < i+1) {
                    // 查找并点击下一页按钮
                    console.log('currentPage_focus:', currentPage_focus);
                    await page.evaluate(() => {
                        const nextButton = document.querySelector('.douyin-creator-pc-page-next');
                        if (nextButton && !nextButton.classList.contains('douyin-creator-pc-page-item-disabled')) {
                            nextButton.click();
                        }
                    });
                    console.log(`导航至第 ${currentPage_focus + 1} 页`);
                    // await page.waitForNavigation({ waitUntil: 'networkidle0' });
                    currentPage_focus++;

                    // 添加一个短暂的延迟,以确保页面完全加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                console.log('Navigation completed or timeout for text:');
                const loopEvents = this.loopEvents || [];
                for (let j = 0; j < 5; j++) {
                    await page.waitForSelector('.douyin-creator-pc-page-small', { timeout: 10000 });

                    const paginationInfo_focus = await page.evaluate(() => {
                        const paginationElement = document.querySelector('.douyin-creator-pc-page-small');
                        console.log('paginationElement:', paginationElement);
                        if (paginationElement) {
                            const paginationText = paginationElement.textContent.trim();
                            console.log('paginationText:', paginationText);
                            const [currentPage_focus, totalPages_focus] = paginationText.split('/').map(num => parseInt(num.trim(), 10));
                            console.log('currentPage_focus:', currentPage_focus);
                            console.log('totalPages_focus:', totalPages_focus);
                            return { currentPage_focus, totalPages_focus };
                        }
                        return null;
                    });
                    console.log('paginationInfo_focus:', paginationInfo_focus);
                    let currentPage_focus = paginationInfo_focus ? paginationInfo_focus.currentPage_focus : null;
                    while (currentPage_focus < i + 1) {
                        // 查找并点击下一页按钮
                        console.log('currentPage_focus:', currentPage_focus);
                        await page.evaluate(() => {
                            const nextButton = document.querySelector('.douyin-creator-pc-page-next');
                            if (nextButton && !nextButton.classList.contains('douyin-creator-pc-page-item-disabled')) {
                                nextButton.click();
                            }
                        });
                        console.log(`导航至第 ${currentPage_focus + 1} 页`);
                        // await page.waitForNavigation({ waitUntil: 'networkidle0' });
                        currentPage_focus++;

                        // 添加一个短暂的延迟,以确保页面完全加载
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    for (const loopEvent of loopEvents) {
                        try {
                            console.log(`Executing loop event:`, loopEvent);
                            const index=j;
                            page = await handleEvent(loopEvent, page, browser, index, sortedData_new, task_name, cityname);

                            
                        } catch (error) {
                            console.error(`An error occurred in the loop:`, error);
                            console.log('跳过当前事件,继续下一个');
                            continue; // 跳过当前事件,继续下一个
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    const randomInterval = getRandomInterval();
                    console.log(`Waiting for ${randomInterval} milliseconds before next loop iteration`);
                    await new Promise(resolve => setTimeout(resolve, randomInterval));

                }

            } catch (error) {
                console.error(`An error occurred while processing text":`, error);
            }
            } catch (error) {
                console.error(`An error occurred on page ${i + 1}:`, error);
                continue; // 继续下一个循环
            }
        
        }
    
    }
}

export async function handleEvent(event, page, browser, index, sortedData_new, task_name, cityname) {
    const { ClickTask, InputTask, OutputTask, KeydownTask, NavigationTask, ScrollTask } = await importTasks(task_name);
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
            // const outputTask = new OutputTask({ leixing: '自定义0' }, event.value, sortedData_new, task_name, cityname);
            // await outputTask.execute(page);
            // const outputData = outputTask.data;  // 直接访问 data 属性
            const outputData ="";
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
    return page;
}