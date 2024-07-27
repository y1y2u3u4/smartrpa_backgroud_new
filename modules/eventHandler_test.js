// modules/taskExecutor.js
import path from 'path';
import fs from 'fs';

export class Task {
    constructor(type, element, value) {
        this.type = type;
        this.element = element;
        this.value = value;
        this.status = 'pending';
        this.result = null;
    }

    async execute(page) {
        throw new Error("Method 'execute()' must be implemented.");
    }
}

export class ClickTask extends Task {
    constructor(element, index) {
        super('click', element);
        this.index = index;  // 添加这一行
    }
    async execute(page) {
        let clickSelector;
        let isXPath_click = false;

        if (this.element.id) {
            clickSelector = `#${this.element.id}`;
        } else if (this.element.tagName && this.element.innerText) {
            if (this.element.innerText.includes('保存当前页') || this.element.innerText.includes('同步至未推送站点') ||
                this.element.innerText.includes('翻译') || this.element.innerText.includes('保存所有站点') || this.element.innerText.includes('保存并提交所有站点')
            ) {
                clickSelector = `//button[contains(., '${this.element.innerText}')]`;
            } else if (this.element.innerText.includes('确定')) {
                clickSelector = `//div[@data-v-3e50dd5e]//button[contains(@class, 'ivu-btn-primary') and span[text() ='${this.element.innerText}')]`;
            } else {
                clickSelector = `//${this.element.tagName.toLowerCase()}[text()='${this.element.innerText}'] | //${this.element.tagName.toLowerCase()}/span[text()='${this.element.innerText}']`;
            }
            isXPath_click = true;
        } else if (this.element.className) {
            if (this.element.className === "a[data-click-name='shop_title_click']") {
                clickSelector = `${this.element.className.split(' ').join('.')}`;
            } else if (this.element.className.includes('确定')) {
                clickSelector = `//div[@data-v-3e50dd5e]//button[contains(@class, 'ivu-btn-primary') and span[text() ='${this.element.innerText}')]`;
            } else {
                clickSelector = `.${this.element.className.split(' ').join('.')}`;
            }
        }

        console.log('clickSelector:', clickSelector);
        console.log('isXPath_click:', isXPath_click);
        console.log('leixing:', this.element.leixing);
        // const cliclValue = event.value;
        const cliclValue = this.index;

        if (!this.element.leixing) {
            if (isXPath_click) {
                if (this.element.innerText.includes('确定')) {
                    console.log('点击“确定”按钮');
                    await page.evaluate((selector) => {
                        const xpathResult = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                        console.log('xpathResult:', xpathResult);
                        const element = xpathResult.snapshotItem(2);
                        console.log('element:', element);
                        element.click();
                    }, clickSelector);
                    console.log('点击“确定”按钮_2');
                }
                else {
                    await page.evaluate((selector) => {
                        const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        console.log('xpathResult:', xpathResult);
                        const element = xpathResult.singleNodeValue;
                        console.log('element:', element);
                        element.click();
                    }, clickSelector);
                }
                // await page.waitForSelector(clickSelector, { visible: true, timeout: 5000 });

            } else {
                // const url = await page.url();
                // console.log('Current URL:', url);
                // await page.waitForSelector(clickSelector, { visible: true, timeout: 5000 });
                await page.click(clickSelector);
            }
        } else if (this.element.leixing === '自定义1') {
            await page.evaluate(async () => {
                const menuTitle = document.querySelector('.ivu-menu-submenu-title');
                console.log('menuTitle', menuTitle);
                if (menuTitle) {
                    console.log('Found the menu title, clicking to expand...');
                    menuTitle.click();
                    console.log('menuTitle_1');
                    // 等待子菜单加载完毕并点击“产品列表”菜单项
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const productListItem = document.evaluate("//li[contains(@class, 'ivu-menu-item') and .//span[text()='产品列表']]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    // console.log('productListItem', productListItem);
                    if (productListItem) {
                        console.log('Found the product list item, clicking...');
                        productListItem.click();
                        console.log('productListItem_1');
                    } else {
                        console.error("无法找到“产品列表”菜单项");
                    }
                }
            });
        } else if (this.element.leixing === '自定义0') {
            try {
                await page.evaluate(async (cliclValue) => {
                    // 查找所有具有特定样式的标签元素
                    let xpath = '/html/body/div/div/main/div/div/div[2]/div[2]/ul/li'; // XPath，选择 ul 下的所有 li 元素
                    let result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); // 获取所有匹配的元素
                    let element = result.snapshotItem(cliclValue); // 获取元素
                    console.log('element:', element);
                    element.querySelector('a').click()
                }, cliclValue);
                // await new Promise(resolve => setTimeout(resolve, 10000));
                console.log('自定义0_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }
        } else if (this.element.leixing === '自定义3') {
            try {
                await page.evaluate(async (clickSelector) => {
                    const selectButton = document.querySelector(clickSelector);

                    if (selectButton) {
                        console.log('Found the select button, clicking to expand...');
                        selectButton.click();
                    } else {
                        console.error("无法找到选择器 .ivu-select-selection 对应的元素");
                    }
                }, clickSelector);
                const input = await page.$(clickSelector);
                await input.uploadFile(cliclValue);
                // 如果需要手动触发上传操作（可选）
                // 假设有一个上传按钮需要点击来完成上传
                const uploadButtonSelector = '.btn';  // 替换为实际的上传按钮选择器
                await page.waitForSelector(uploadButtonSelector, { visible: true });
                await page.click(uploadButtonSelector);

                console.log('自定义3_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }
        }


        console.log('check_1');
        const newPagePromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Timeout waiting for new page'));
            }, 2000); // 设置超时时间为 5 秒

            browser.once('targetcreated', async target => {
                clearTimeout(timeoutId); // 如果 'targetcreated' 事件被触发，那么清除超时
                if (target.type() === 'page') {
                    resolve(await target.page());
                }
            });
        });
        console.log('check_2');
        const newPage = await newPagePromise.catch(() => null);
        console.log('check_3');
        console.log('newPage:', newPage);
        if (newPage !== null) {
            console.log('newPage:');
            await newPage.setViewport({ width: 1280, height: 720 });
            page = newPage;
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
                console.log('Navigation timeout after 10 seconds');
            });
        }
        console.log('check_4');

    }
}

export class InputTask extends Task {
    constructor(element, value) {
        super('input', element, value);
    }
    async execute(page) {
        let inputSelector;
        let isXPath = false;
        if (this.element.label && isUniqueAttribute('label', this, sortedData_new)) {
            if (this.element.label === '要点说明1') {
                inputSelector = `//label[normalize-space(text())='要点说明']/following-sibling::div//textarea`;
            } else if (this.element.label === '要点说明2') {
                inputSelector = `//label[normalize-space(text())='要点说明']/following-sibling::div//textarea`;
            }
            else if (this.element.label === '要点说明3') {
                inputSelector = `//label[normalize-space(text())='要点说明']/following-sibling::div//textarea`;
            }
            else if (this.element.label === '要点说明4') {
                inputSelector = `//label[normalize-space(text())='要点说明']/following-sibling::div//textarea`;
            }
            else if (this.element.label === '要点说明5') {
                inputSelector = `//label[normalize-space(text())='要点说明']/following-sibling::div//textarea`;
            }
            else if (this.element.label === '产品描述') {
                inputSelector = `//label[normalize-space(text())='要点说明']/following-sibling::div//textarea`;
            }
            else {
                inputSelector = `//label[normalize-space(text())='${this.element.label}']/following-sibling::input | //label[normalize-space(text())='${this.element.label}']/following-sibling::div//textarea`;
            }
            isXPath = true;
        }
        else if (this.element.id && isUniqueAttribute('id', this, sortedData_new)) {
            inputSelector = `#${this.element.id}`;
        } else if (this.element.className && isUniqueAttribute('className', this, sortedData_new)) {
            inputSelector = `.${this.element.className.split(' ').join('.')}`;
        } else if (this.element.tagName && isUniqueAttribute('tagName', this, sortedData_new)) {
            inputSelector = this.element.tagName.toLowerCase();
        } else if (this.element.innerText && isUniqueAttribute('innerText', this, sortedData_new)) {
            inputSelector = `//*[text()='${this.element.innerText}']`;
            isXPath = true;
        } else if (this.element.placeholder && isUniqueAttribute('placeholder', this, sortedData_new)) {
            inputSelector = `//*[@placeholder='${this.element.placeholder}']`;
            isXPath = true;
        }
        const inputValue = this.value;
        const inputlable = this.element.label;

        console.log('inputSelector:', inputSelector);
        console.log('isXPath:', isXPath);
        // if (!event.element.leixing) {
        if (isXPath) {
            await page.evaluate(async (selector, value, lable) => {
                value = String(value);
                let element;
                if (lable === '要点说明2') {
                    const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    console.log('xpathResult:', xpathResult);
                    element = xpathResult.singleNodeValue.parentNode.parentNode.parentNode.nextElementSibling.children[0].children[0].children[0];
                    console.log('element:', element);
                }
                else if (lable === '要点说明3') {
                    const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    console.log('xpathResult:', xpathResult);
                    const element_0 = xpathResult.singleNodeValue;
                    const element_1 = element_0.parentNode.parentNode.parentNode.nextElementSibling.nextElementSibling;
                    element = element_1.children[0].children[0].children[0]
                    console.log('element:', element);
                }
                else if (lable === '要点说明4') {
                    const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    console.log('xpathResult:', xpathResult);
                    const element_0 = xpathResult.singleNodeValue;
                    const element_1 = element_0.parentNode.parentNode.parentNode.nextElementSibling.nextElementSibling.nextElementSibling;
                    element = element_1.children[0].children[0].children[0]
                    console.log('element:', element);
                }
                else if (lable === '要点说明5') {
                    const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    console.log('xpathResult:', xpathResult);
                    const element_0 = xpathResult.singleNodeValue;
                    const element_1 = element_0.parentNode.parentNode.parentNode.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling;
                    element = element_1.children[0].children[0].children[0]
                    console.log('element:', element);
                }
                else if (lable === '产品描述') {
                    const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    console.log('xpathResult:', xpathResult);
                    const element_0 = xpathResult.singleNodeValue;
                    const element_1 = element_0.parentNode.parentNode.parentNode.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling.nextElementSibling;
                    element = element_1.children[1].children[0].children[0].children[0].children[1].children[0]
                    console.log('element:', element);
                }
                else {
                    const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                    console.log('xpathResult:', xpathResult);
                    element = xpathResult.singleNodeValue;
                    console.log('element:', element);
                }

                // 模拟用户输入
                const inputEvent = new Event('input', { bubbles: true });
                const changeEvent = new Event('change', { bubbles: true });
                const blurEvent = new Event('blur', { bubbles: true });

                // 检查元素是否是 contenteditable
                if (element.contentEditable === 'true') {
                    // 清空输入框并输入新的值
                    element.innerText = '';
                    element.dispatchEvent(inputEvent);

                    for (let i = 0; i < value.length; i++) {
                        element.innerText += value[i];
                        element.dispatchEvent(inputEvent);
                        await new Promise(resolve => setTimeout(resolve, 20)); // 模拟用户输入间隔
                    }

                    element.dispatchEvent(blurEvent);
                } else {
                    // 清空输入框并输入新的值
                    element.value = '';
                    element.dispatchEvent(inputEvent);

                    for (let i = 0; i < value.length; i++) {
                        element.value += value[i];
                        element.dispatchEvent(inputEvent);
                        await new Promise(resolve => setTimeout(resolve, 20)); // 模拟用户输入间隔
                    }

                    element.dispatchEvent(changeEvent);
                }
            }, inputSelector, inputValue, inputlable);
        } else {
            await page.evaluate(async (selector, value) => {
                value = String(value);
                const element = document.querySelector(selector);
                console.log('element:', element);

                // 模拟用户输入
                const inputEvent = new Event('input', { bubbles: true });
                const changeEvent = new Event('change', { bubbles: true });

                // 清空输入框并输入新的值
                element.value = '';
                element.dispatchEvent(inputEvent);

                for (let i = 0; i < value.length; i++) {
                    element.value += value[i];
                    element.dispatchEvent(inputEvent);
                    await new Promise(resolve => setTimeout(resolve, 100)); // 模拟用户输入间隔
                }

                element.dispatchEvent(changeEvent);
            }, inputSelector, inputValue, inputlable);
        }
    }
}


export class OutputTask extends Task {
    constructor(element) {
        super('output', element);
    }
    async execute(page) {
        if (this.element.leixing === '自定义1') {
            const newData = await page.evaluate(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        // 获取页面标题
                        let titleElement = document.querySelector('title');
                        let titleText = titleElement ? titleElement.innerText : '';

                        // 获取所有 p 元素
                        const pElements = document.querySelectorAll('div.transcription > div > div > div > p');

                        let bodyContent = '';

                        // 遍历所有 p 元素，将其内容保存到 body 中
                        pElements.forEach(p => {
                            bodyContent += p.innerHTML.trim().replace(/<[^>]+>/g, '') + ' ';
                        });

                        // 构建 JSON 对象
                        const result = {
                            title: titleText,
                            body: bodyContent.trim(),
                        };

                        resolve(result);
                    }, 5000);
                });
            });

            // 将数据转换为 JSON 格式
            console.log('newData:', newData);
            const jsonData = JSON.stringify(newData, null, 2);
            // 定义文件路径和名称
            const filePath = path.join(process.cwd(), 'data', 'output', `${newData.title}.json`);
            fs.writeFile(filePath, jsonData, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log('File written successfully');
                }
            });
            // console.log('data:', data);

        }
        else if (this.element.leixing === '自定义2') {
            const data = await page.evaluate(() => {
                const shops = [];
                const shopElements = document.querySelectorAll('.J_content_list');

                shopElements.forEach(shop => {
                    const address = shop.querySelector('.shopdetail p:nth-of-type(2)').innerText.replace('地址：', '').trim();
                    const phone = shop.querySelector('.shopdetail p:nth-of-type(3)').innerText.replace('电话：', '').trim();
                    const hours = shop.querySelector('.shopdetail p:nth-of-type(4)').innerText.replace('营业时间：', '').trim();

                    shops.push({
                        address: address,
                        phone: phone,
                        hours: hours
                    });
                });

                return shops;
            });

            // 将数据转换为 JSON 格式
            jsonData_2 = data;
            console.log('jsonData_2:', jsonData_2);

        }

        else if (this.element.leixing === '自定义0') {
            const data = await page.evaluate(() => {
                let buttons = document.querySelectorAll('[class*="MuiButton-label-"]');
                let lastButton = buttons[buttons.length - 1]; // 获取最后一个按钮
                let text = lastButton.innerText; // 获取按钮的文本内容
                let number = parseInt(text); // 将文本内容转换为数字
                console.log('number:', number);
                // 将数据转换为 JSON 格
                return number;
            });

            // // 将数据转换为 JSON 格式
            // jsonData_0 = data;
            // console.log('jsonData_0:', jsonData_0);


        }
    }
}

export class KeydownTask extends Task {
    constructor(key) {
        super('keydown', null);
        this.key = key;
    }
    async execute(page) {
        // await this.save();
        try {
            await page.keyboard.press(this.key);
            // await this.update('completed');
        } catch (error) {
            // await this.update('failed', error.message);
        }
    }
}

export class NavigationTask extends Task {
    constructor(url) {
        super('navigation', null);
        this.url = url;
    }

    async execute(page) {
        // await this.save();
        try {
            await Promise.all([
                page.goto(this.url),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
            // await page.goto(this.url);
            // await new Promise(resolve => setTimeout(resolve, 5000)); // 等待3秒钟
            // await this.update('completed');
        } catch (error) {
            // await this.update('failed', error.message);
        }
    }
}
export class ScrollTask extends Task {
    constructor(distance, direction) {
        super('scroll', null);
        this.distance = distance;
        this.direction = direction;
    } async execute(page) {
        // await this.save();
        try {
            await page.evaluate((distance, direction) => {
                window.scrollBy(0, direction === 'down' ? distance : -distance);
            }, this.distance, this.direction);
            await new Promise(resolve => setTimeout(resolve, 5000));
            // await this.update('completed');
        } catch (error) {
            // await this.update('failed', error.message);
        }
    }
}


export class TaskExecutor {
    constructor(tasks) {
        this.tasks = tasks;
    }

    async executeAll(page) {
        for (const task of this.tasks) {
            await task.execute(page);
        }
    }
}



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

