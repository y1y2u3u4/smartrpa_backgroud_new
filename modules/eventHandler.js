import { ClickTask, InputTask, OutputTask, KeydownTask, NavigationTask, ScrollTask } from './taskExecutor.js';


function getRandomInterval(min = 2000, max = 8000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class LoopTask {
    constructor(loopEvents, loopCount,i) {
        this.loopEvents = loopEvents;
        this.loopCount = loopCount;
        this.i = i;  // 添加这一行
    }

    async execute(page, handleEvent) {
        for (let i = 3; i < 45; i++) {
            // if (text === '西城区') {
            //     continue;
            // }
            console.log('Processing i:', i);

            try {
                let url = `https://niklas-luhmann-archiv.de/bestand/zettelkasten/1/auszug/01?page=${i}`;
                await page.goto(url, { waitUntil: 'load', timeout: 60000 });
                // 确保页面完全加载
                // await page.goto(page.url(), { waitUntil: 'load', timeout: 60000 });
                console.log('Page loaded.');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // // 查找元素并捕获错误
                // const foundLink_0 = await page.evaluate((text) => {
                //     try {
                //         let xpath = `//a/span[text()='行政区'] | //a[text()='行政区']`;
                //         let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                //         let linkElement = xpathResult.singleNodeValue;
                //         return linkElement !== null; // 返回是否找到链接
                //     } catch (error) {
                //         console.error('Error in evaluate for finding link:', error);
                //         return false;
                //     }
                // }, text);

                // if (foundLink_0) {
                //     console.log('Link found for text:', text);

                //     // 点击链接并等待导航完成，最多等待3秒钟
                //     await Promise.race([
                //         page.waitForNavigation({ waitUntil: 'networkidle0' }),
                //         page.evaluate((text) => {
                //             let xpath = `//a/span[text()='行政区'] | //a[text()='行政区']`;
                //             let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                //             let linkElement = xpathResult.singleNodeValue;
                //             if (linkElement) {
                //                 linkElement.click();
                //             }
                //         }, text),
                //         new Promise(resolve => setTimeout(resolve, 3000))
                //     ]);

                //     console.log('Navigation completed or timeout for text:', text);

                //     // 获取总页数

                // } else {
                //     console.log(`没有找到文本为 "${text}" 的链接`);
                // }

                // // 等待一定时间确保页面渲染完成
                // await new Promise(resolve => setTimeout(resolve, 2000));

                // 查找元素并捕获错误
                // const foundLink = await page.evaluate(() => {
                //     try {
                //         let xpath = '/html/body/div/div/main/div/div/div[2]/div[2]/ul/li'; // XPath，选择 ul 下的所有 li 元素
                //         let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                //         let linkElement = xpathResult.singleNodeValue;
                //         return linkElement // 返回是否找到链接
                //     } catch (error) {
                //         console.error('Error in evaluate for finding link:', error);
                //         return false;
                //     }
                // });
                const xpath = '/html/body/div/div/main/div/div/div[2]/div[2]/ul/li'; // XPath，选择 ul 下的所有 li 元素
                // await new Promise(resolve => setTimeout(resolve, 3000));
                await page.waitForFunction(
                    (xpath) => !!document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
                    { timeout: 5000 },
                    xpath); // 等待 XPath 出现，最多等待 5000 毫秒

                const foundLink = await page.evaluate((xpath) => {
                    let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    let linkElement = xpathResult.singleNodeValue;
                    return linkElement !== null; // 返回是否找到链接
                }, xpath);

                console.log('foundLink:', foundLink);

                if (foundLink) {
                    console.log('Link found for text:', i);

                    // // 点击链接并等待导航完成，最多等待3秒钟
                    // await Promise.race([
                    //     page.waitForNavigation({ waitUntil: 'networkidle0' }),
                    //     page.evaluate((text) => {
                    //         let xpath = `//a/span[text()='${text}'] | //a[text()='${text}']`;
                    //         let xpathResult = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    //         let linkElement = xpathResult.singleNodeValue;
                    //         if (linkElement) {
                    //             linkElement.click();
                    //         }
                    //     }, text),
                    //     new Promise(resolve => setTimeout(resolve, 3000))
                    // ]);

                    // console.log('Navigation completed or timeout for text:', text);

                    // 获取总页数
                    const totalPageNumber = await page.evaluate(() => {
                        let xpath = '/html/body/div/div/main/div/div/div[2]/div[2]/ul/li'; // XPath，选择 ul 下的所有 li 元素
                        let result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); // 获取所有匹配的元素
                        return result.snapshotLength
                    });

                    console.log('Total page number:', totalPageNumber);

                    const loopCount = totalPageNumber || 1;
                    const loopEvents = this.loopEvents || [];
                    const date = new Date();
                    // const dateString = date.toISOString().replace(/:/g, '-'); // 将时间中的冒号替换为短横线，因为冒号在文件名中是非法的
                    // const filename = `output_${dateString}.xlsx`;

                    for (let j = 0; j < loopCount; j++) {

                        for (const loopEvent of loopEvents) {
                            try {
                                await handleEvent(loopEvent,page, j);

                            } catch (error) {
                                console.error(`An error occurred in the loop event:`, error);
                            }
                        }
                        await page.goBack(); // 返回上一页

                        const xpath = '/html/body/div/div/main/div/div/div[2]/div[2]/ul/li'; // XPath，选择 ul 下的所有 li 元素
                        // await new Promise(resolve => setTimeout(resolve, 3000));
                        await page.waitForFunction(
                            (xpath) => !!document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
                            { timeout: 50000 },
                            xpath); // 等待 XPath 出现，最多等待 5000 毫秒

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
                        console.log('保存成功');

                        const randomInterval = getRandomInterval();
                        console.log(`Waiting for ${randomInterval} milliseconds before next loop iteration`);
                        await new Promise(resolve => setTimeout(resolve, randomInterval));

                    }
                } else {
                    console.log(`没有找到文本为 "${i}" 的链接`);
                }
            } catch (error) {
                console.error(`An error occurred while processing text "${i}":`, error);
            }
        }
    }
}


export async function handleEvent(event, page, index) {
    let task;
    switch (event.type) {
        case 'click':
            task = new ClickTask(event.element, index);
            break;
        case 'input':
            task = new InputTask(event.element, event.value);
            break;
        case 'output':
            task = new OutputTask(event.element, event.value);
            break;
        case 'loop':
            task = new LoopTask(event.loopEvents, event.loopCount);
            await task.execute(page, handleEvent);
            break;
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
    await task.execute(page);
}

