// modules/taskExecutor.js
///实现通过OZON商家后台搜索查询商品销量
import { loadConfig } from './configManager.js';
import { OutputFactory } from './outputHandler.js';

function isUniqueAttribute(attribute, event, events) {
    if (!event) {
        console.log('event is null or undefined');
        return false;
    }
    const inputs = events.filter(e => e.type === 'input');
    const values = inputs.map(e => e.element[attribute]).filter(value => value !== '');
    console.log('values:', values);
    const count = values.filter(value => value === event.element[attribute]).length;
    return count === 1;
}




export class Task {
    constructor(type, element, value, sortedData_new, task_name, cityname) {
        this.type = type;
        this.element = element;
        this.value = value;
        this.sortedData_new = sortedData_new;
        this.task_name = task_name;
        this.cityname = cityname;
        this.status = 'pending';
        this.result = null;
        console.log('Task task_name_0:', task_name);
        console.log('Task cityname_0:', cityname);
        console.log('Task task_name:', this.task_name);
        console.log('Task cityname:', this.cityname);
    }
    async execute(page) {
        throw new Error("Method 'execute()' must clickbe implemented.");
    }
}



export class ClickTask extends Task {
    constructor(element, browser) {
        super('click', element);
        this.browser = browser;
    }
    async execute(page) {
        console.log('page URL:', page.url());
        const newPagePromise = new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                console.log('Timeout waiting for new page');
                resolve(null); // 如果超时，解决 Promise 并返回 null
            }, 30000);
            this.browser.once('targetcreated', async target => {
                clearTimeout(timeoutId);
                if (target.type() === 'page') {
                    resolve(await target.page());
                }
            });
        });
        
        let clickSelector;
        let isXPath_click = false;
        if (this.element.id) {
            clickSelector = `#${this.element.id}`;
        }
        else if (this.element.tagName && this.element.innerText) {
            if (this.element.innerText.includes('保存当前页') || this.element.innerText.includes('同步��未推送站点') ||
                this.element.innerText.includes('翻译') || this.element.innerText.includes('保存所有站点') || this.element.innerText.includes('保存并提交所有站点')
            )
            {
                clickSelector = `//button[contains(., '${this.element.innerText}')]`;
            } 
            else if (this.element.innerText === '视频管理') {
                clickSelector = "//li[contains(@class, 'semi-navigation-item')]//span[contains(@class, 'semi-navigation-item-text')]/span[text()='视频管理']";
            }
            else {
                clickSelector = `//${this.element.tagName.toLowerCase()}[text()='${this.element.innerText}'] | //${this.element.tagName.toLowerCase()}/span[text()='${this.element.innerText}']`;
            }
            isXPath_click = true;
        }
        else if (this.element.className) {
            if (this.element.className === "a[data-click-name='shop_title_click']") {
                clickSelector = `${this.element.className.split(' ').join('.')}`;;
            } else if (this.element.className.includes('确定')) {
                clickSelector = `//div[@data-v-3e50dd5e]//button[contains(@class, 'ivu-btn-primary') and span[text() ='${this.element.innerText}']]`;
            }
            else {
                clickSelector = `.${this.element.className.split(' ').join('.')}`;
            }
        }
        console.log('clickSelector:', clickSelector);
        console.log('isXPath_click:', isXPath_click);
        console.log('leixing:', this.element.leixing);

        // const cliclValue = this.value;
        const cliclValue = this.element.innerText;


        try {
            if (!this.element.leixing) {
                if (isXPath_click) {
                    if (this.element.innerText.includes('确定')) {
                        console.log('尝试点击"确定"按钮');
                        await page.evaluate((selector) => {
                            const xpathResult = document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                            console.log('xpathResult:', xpathResult);
                            const element = xpathResult.snapshotItem(2);
                            if (element) {
                                console.log('找到"确定"按钮元素:', element);
                                element.click();
                                console.log('点击"确定"按钮成功');
                            } else {
                                console.log('未找到"确定"按钮元素');
                            }
                        }, clickSelector);
                    } else {
                        console.log('clickSelector:', clickSelector);
                        console.log('page URL:', page.url());
                        await page.waitForFunction(
                            (selector) => {
                                const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                                return xpathResult.singleNodeValue !== null;
                            },
                            { timeout: 10000 },
                            clickSelector
                        ).catch(error => console.log(`等待元素超时: ${error.message}`));

                        await page.evaluate((selector) => {
                            const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                            console.log('xpathResult:', xpathResult);
                            const element = xpathResult.singleNodeValue;
                            if (element) {
                                console.log('找到元素:', element);
                                element.click();
                                console.log('点击元素成功');
                            } else {
                                console.log('未找到元素');
                            }
                        }, clickSelector);
                    }
                } else {
                    const elementExists = await page.evaluate((selector) => {
                        return !!document.querySelector(selector);
                    }, clickSelector);

                    if (elementExists) {
                        try {
                            await page.click(clickSelector);
                            console.log(`成功点击元素: ${clickSelector}`);
                            return page; 
                        } catch (error) {
                            console.log(`点击元素失败: ${error.message}`);
                        }
                    } else {
                        console.log(`元素 ${clickSelector} 不存在，跳过点击操作`);
                        return page; 
                    }
                    // 无论点击是否成功，都等待可能的新页面

                }
            } else if (this.element.leixing === '自定义1') {
                console.log('点击"刊登管理"菜单项以展开子菜单');
                await page.evaluate(async () => {
                    const menuTitle = document.querySelector('.ivu-menu-submenu-title');
                    console.log('menuTitle', menuTitle);
                    if (menuTitle) {
                        console.log('Found the menu title, clicking to expand...');
                        menuTitle.click();
                        console.log('menuTitle_1');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const productListItem = document.evaluate("//li[contains(@class, 'ivu-menu-item') and .//span[text()='产品列表']]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (productListItem) {
                            console.log('Found the product list item, clicking...');
                            productListItem.click();
                            console.log('productListItem_1');
                        } else {
                            console.error("无法找到菜单项");
                        }
                    } else {
                        console.error("无法找到菜单标题");
                    }
                });
            } else if (this.element.leixing === '自定义2') {
                await page.evaluate(async (cliclValue) => {
                    const labels = document.querySelectorAll('.ivu-form-item-label[style="width: 60px;"]');
                    let storeFormItem = null;
                    labels.forEach(label => {
                        if (label.textContent.trim() === "店铺") {
                            storeFormItem = label.parentElement;
                        }
                    });

                    if (storeFormItem) {
                        const selectButton = storeFormItem.querySelector('.ivu-select-selection');
                        if (selectButton) {
                            console.log('Found the select button:', selectButton);
                            selectButton.scrollIntoView();
                            const clickEvent = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                            });
                            selectButton.dispatchEvent(clickEvent);
                            console.log('Click dispatched on select button');
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            console.log("cliclValue", cliclValue);
                            const item = document.evaluate(`//li[contains(@class, 'ivu-select-item') and text()="${cliclValue}"]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                            if (item) {
                                console.log('Found the item:', item);
                                item.scrollIntoView();
                                const itemClickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                });
                                item.dispatchEvent(itemClickEvent);
                                console.log('Click dispatched on item');
                            } else {
                                console.error(`无法找到包含"${cliclValue}"的下拉项`);
                            }
                        } else {
                            console.error("无法找到选择器 .ivu-select-selection 对应的元素");
                        }
                    } else {
                        console.error("无法找到包含 '店铺' 标签的 .ivu-form-item 元素");
                    }
                }, cliclValue);
                await new Promise(resolve => setTimeout(resolve, 10000));
                console.log('自定义2_done');
            } else if (this.element.leixing === '自定义3') {
                await page.evaluate(async (clickSelector) => {
                    const selectButton = document.querySelector(clickSelector);
                    if (selectButton) {
                        console.log('Found the select button, clicking to expand...');
                        selectButton.click();
                    } else {
                        console.error("无法找到选择器对应的元素");
                    }
                }, clickSelector);
                const input = await page.$(clickSelector);
                if (input) {
                    await input.uploadFile(cliclValue).catch(error => console.error('文件上传失败:', error));
                    const uploadButtonSelector = '.btn';
                    await page.waitForSelector(uploadButtonSelector, { visible: true, timeout: 5000 })
                        .catch(() => console.log('上传按钮未出现'));
                    await page.click(uploadButtonSelector).catch(error => console.log(`点击上传按钮失败: ${error.message}`));
                } else {
                    console.error('未找到上传输入元素');
                }
                console.log('自定义3_done');
            } else if (this.element.leixing === '自定义4') {
                console.log('自定义4_start');

                try {
                    await page.evaluate(async (cliclValue) => {
                        // 查找搜索输入框
                        const searchInput = document.querySelector('input[id^="input___"]');
                        if (!searchInput) {
                            throw new Error('未找到搜索输入框');
                        }

                        // 聚焦输入框
                        searchInput.focus();

                        // 清空现有内容
                        searchInput.value = '';

                        // 模拟用户输入
                        searchInput.value = cliclValue;

                        // 触发输入事件
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

                        // 触发回车键
                        searchInput.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            bubbles: true,
                            cancelable: true
                        }));

                        console.log('已触发搜索输入和回车');

                        // 等待下拉菜单出现并点击
                        let attempts = 0;
                        const maxAttempts = 5;

                        while (attempts < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // 查找下拉菜单容器
                            const dropdown = document.querySelector('.ozi__dropdown__wrapper__J7d88');
                            if (!dropdown) {
                                console.log('未找到下拉菜单容器，继续尝试...');
                                attempts++;
                                continue;
                            }

                            // 查找第一个商品项
                            const firstResult = dropdown.querySelector('.ozi__data-cell__dataCell__QUywL._alignItemPrice_k7foi_28');
                            if (firstResult) {
                                // 确保元素在视图中
                                firstResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                                // 等待滚动完成
                                await new Promise(resolve => setTimeout(resolve, 100));

                                // 模拟完整的点击事件序列
                                ['mouseenter', 'mouseover', 'mousedown', 'click', 'mouseup'].forEach(eventType => {
                                    const event = new MouseEvent(eventType, {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: firstResult.getBoundingClientRect().left + 10,
                                        clientY: firstResult.getBoundingClientRect().top + 10
                                    });
                                    firstResult.dispatchEvent(event);
                                });

                                console.log('已点击搜索结果');
                                return true;
                            }

                            console.log(`尝试第 ${attempts + 1} 次查找商品项...`);
                            attempts++;
                        }

                        throw new Error('未能在指定次数内找到并点击商品项');
                    }, cliclValue);

                    // 等待页面加载和可能的跳转完成
                    await page.waitForTimeout(5000);
                    console.log('自定义4_done');

                } catch (error) {
                    console.error('搜索和点击操作失败:', error);

                    // 输出当前页面状态以便调试
                    const pageContent = await page.content();
                    // console.log('页面内容:', pageContent);

                    throw error;
                }
            }


        } catch (error) {
            console.error('执行点击操作时发生错误:', error);
        }

        console.log('check_1');
        // const newPage = await newPagePromise
        console.log('check_2');
        // console.log('newPage:', newPage);
        
        // if (newPage !== null) {
        //     console.log('newPage URL:', newPage.url());
        //     await newPage.setViewport({ width: 1280, height: 720 });
        //     await newPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
        //         console.log('Navigation timeout after 20 seconds');
        //     });
        // }

        console.log('check_3')

        return page;

    }
}

export class InputTask extends Task {
    constructor(element, value, sortedData_new) {
        super('input', element, value, sortedData_new);
    }
    async execute(page) {
        let inputSelector;
        let isXPath = false;
        
        // 首先检查是否有placeholder属性
        if (this.element.placeholder && this.element.placeholder === '多条请换行，最多输入100个') {
            inputSelector = `//*[@placeholder='${this.element.placeholder}']`;
            isXPath = true;
        }
        // 然后检查label属性
        else if (this.element.label && this.element.label === 'sku输入') {
            inputSelector = `//*[@placeholder='多条请换行，最多输入100个']`;
            isXPath = true;
        }
        else if (this.element.label && isUniqueAttribute('label', this, this.sortedData_new)) {
            if (this.element.label === '要点说明1') {
                inputSelector = `//label[normalize-space(text())='要点说明']/following-sibling::div//textarea`;
            } 
            else if (this.element.label === '要点说明2') {
                inputSelector = `//label[normalize-space(text())='要点说明']/following-sibling::div//textarea`;
            }
            else if (this.element.label === 'sku输入') {
                inputSelector = `//*[@placeholder='${this.element.placeholder}']`;
                isXPath = true;
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
        else if (this.element.id && isUniqueAttribute('id', this, this.sortedData_new)) {
            inputSelector = `#${this.element.id}`;
        } else if (this.element.className && isUniqueAttribute('className', this, this.sortedData_new)) {
            inputSelector = `.${this.element.className.split(' ').join('.')}`;
        } else if (this.element.tagName && isUniqueAttribute('tagName', this, this.sortedData_new)) {
            inputSelector = this.element.tagName.toLowerCase();
        } else if (this.element.innerText && isUniqueAttribute('innerText', this, this.sortedData_new)) {
            inputSelector = `//*[text()='${this.element.innerText}']`;
            isXPath = true;
        } else if (this.element.placeholder && isUniqueAttribute('placeholder', this, this.sortedData_new)) {
            inputSelector = `//*[@placeholder='${this.element.placeholder}']`;
            isXPath = true;
        }
        const inputValue = this.value;
        const inputlable = this.element.label;

        console.log('inputSelector:', inputSelector);
        console.log('isXPath:', isXPath);
        // if (!this.element.leixing) {
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
                    // 清输入框并输入新的值
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
        // } 
        return page;
    }
}

export class OutputTask extends Task {
    constructor(element, value, sortedData_new,task_name, cityname) {
        super('output', element, value, sortedData_new, task_name, cityname);
        console.log('OutputTask task_name:', this.task_name);
        console.log('OutputTask cityname:', this.cityname);
        this.data = null;  // 添加这一行用于存储数据
    }
    async execute(page) {
        console.log('task_name_2:', this.task_name);
        console.log('cityname_2:', this.cityname);
        const config = loadConfig('config/config.json');
        const outputHandler = OutputFactory.createOutputHandler(config.outputFormat);
        if (this.element.leixing === '自定义1') {
            this.data = await page.evaluate(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const shopListContainer = document.querySelector('#shop-all-list');
                        const shops = [];
                        const shopList = shopListContainer.querySelectorAll('li');
                        shopList.forEach(shop => {
                            const nameElement = shop.querySelector('.tit h4');
                            const linkElement = shop.querySelector('.tit a');
                            const imgElement = shop.querySelector('.pic img');
                            const reviewElement = shop.querySelector('.review-num b');
                            const priceElement = shop.querySelector('.mean-price b');
                            const tagElements = shop.querySelectorAll('.tag-addr .tag');
                            const dealElements = shop.querySelectorAll('.si-deal a');

                            const name = nameElement ? nameElement.innerText.trim() : '';
                            const link = linkElement ? linkElement.href : '';
                            const image = imgElement ? imgElement.src : '';
                            const reviewCount = reviewElement ? reviewElement.innerText.trim() : '';
                            const price = priceElement ? priceElement.innerText.trim() : '';

                            const tags = [];
                            tagElements.forEach(tagElement => {
                                tags.push(tagElement.innerText.trim());
                            });

                            const deals = [];
                            dealElements.forEach(dealElement => {
                                deals.push({
                                    title: dealElement.title,
                                    link: dealElement.href
                                });
                            });

                            shops.push({
                                name,
                                link,
                                image,
                                review_count: reviewCount,
                                price,
                                tags,
                                deals
                            });
                        });

                        resolve(shops);
                    }, 5000);
                });
            });

            // 将数据转换为 JSON 格式
            this.data = await Promise.all(this.data.map(async (row) => {
                const allData = await getAllData(row.name,this.cityname);
                // console.log('All Data:', allData);
                return {
                    ...row,
                    gaodeName: allData.gaode.name,
                    gaodeAddress: allData.gaode.address,
                    gaodePhone: allData.gaode.phone,
                    tengxunName: allData.tengxun.name,
                    tengxunAddress: allData.tengxun.address,
                    tengxunPhone: allData.tengxun.phone,
                    baiduName: allData.baidu.name,
                    baiduAddress: allData.baidu.address,
                    baiduPhone: allData.baidu.phone
                };
            }));

            // console.log('Updated data:', this.data);

            outputHandler.handle(this.data, 'output', this.task_name);
        }
        else if (this.element.leixing === '自定义2') {
            this.data = await page.evaluate(() => {
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
            console.log('data:', this.data);

        }
        else if (this.element.leixing === '自定义3') {

            this.data = await page.evaluate(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const channelNameElement = document.querySelector('.avatar-text-FBPe7r');
                        const channelName = channelNameElement ? channelNameElement.textContent.trim() : '';

                        const videoCards = document.querySelectorAll('.video-card-zQ02ng');
                        const videos = [];
                        if (videoCards.length === 0) {
                            // 如果没有视频卡片,返回只包含channelName的对象
                            resolve([{
                                channelName: channelName,
                                title: '',
                                publishTime: '',
                                views: 0,
                                comments: 0,
                                likes: 0,
                                coverUrl: '',
                                duration: ''
                            }]);
                        } else {
                        videoCards.forEach(card => {
                            const titleElement = card.querySelector('.info-title-text-YTLo9y');
                            const timeElement = card.querySelector('.info-time-iAYLF0');
                            const viewsElement = card.querySelector('.info-figure-z1H3gA:nth-child(1) .info-figure-text-B6wLrt');
                            const commentsElement = card.querySelector('.info-figure-z1H3gA:nth-child(2) .info-figure-text-B6wLrt');
                            const likesElement = card.querySelector('.info-figure-z1H3gA:nth-child(3) .info-figure-text-B6wLrt');
                            const coverElement = card.querySelector('.video-card-cover-xx9wyS');
                            const durationElement = card.querySelector('.badge-pcgoA6');

                            videos.push({
                                channelName: channelName,
                                title: titleElement ? titleElement.textContent.trim() : '',
                                publishTime: timeElement ? timeElement.textContent.trim() : '',
                                views: viewsElement ? parseInt(viewsElement.textContent) : 0,
                                comments: commentsElement ? parseInt(commentsElement.textContent) : 0,
                                likes: likesElement ? parseInt(likesElement.textContent) : 0,
                                coverUrl: coverElement ? coverElement.style.backgroundImage.slice(5, -2) : '',
                                duration: durationElement ? durationElement.textContent.trim() : ''
                            });
                        });
                        }

                        resolve(videos);
                    }, 2000);
                });
            });
            console.log('Updated data:', this.data);

            outputHandler.handle(this.data, 'output', this.task_name);

        }
        else if (this.element.leixing === '自定义4') {
            // 等待表格元素出现
            await page.waitForFunction(() => {
                return document.querySelector('.vxe-table--header') !== null;
            }, { timeout: 30000 }).catch(error => {
                console.log('等待表格元素超时:', error);
            });
        
            // 先获取表格数据
            const tableData = await page.evaluate(() => {
                const results = [];
                
                // 获取表头信息
                const headers = [];
                const headerCells = document.querySelectorAll('.vxe-header--column .vxe-cell--title');
                headerCells.forEach(cell => {
                    // 去除表头中的提示图标和弹窗内容
                    const headerText = cell.textContent.replace(/\s+/g, ' ').trim();
                    // 使用正则表达式移除图标后的文本
                    const cleanHeader = headerText.replace(/\s+[\s\S]*$/, '').trim();
                    headers.push(cleanHeader);
                });
                
                // 获取表格内容
                const rows = document.querySelectorAll('.vxe-body--row');
                rows.forEach(row => {
                    const rowData = {};
                    const cells = row.querySelectorAll('.vxe-body--column');
                    
                    cells.forEach((cell, index) => {
                        if (index < headers.length) {
                            // 跳过复选框和序号列
                            if (index > 1) {
                                const header = headers[index];
                                
                                // 处理不同类型的单元格内容
                                if (header === '商品图') {
                                    const img = cell.querySelector('img');
                                    rowData[header] = img ? img.src : '';
                                } else if (header === '尺寸 （长*宽*高 CM）') {
                                    const text = cell.textContent.trim();
                                    // 尝试解析尺寸格式 (长x宽x高)
                                    const dimensions = text.split('*').map(dim => parseFloat(dim) || 0);
                                    if (dimensions.length === 3) {
                                        rowData['长'] = dimensions[0];
                                        rowData['宽'] = dimensions[1];
                                        rowData['高'] = dimensions[2];
                                    }
                                    rowData[header] = text;
                                } else if (header === '重量') {
                                    const text = cell.textContent.trim();
                                    // 提取数字部分
                                    const weightMatch = text.match(/(\d+\.?\d*)/);
                                    rowData[header] = weightMatch ? parseFloat(weightMatch[1]) : 0;
                                } else if (header === '商品费/包邮价') {
                                    const text = cell.textContent.trim();
                                    // 提取价格数字
                                    const priceMatch = text.match(/(\d+\.?\d*)/);
                                    rowData[header] = priceMatch ? parseFloat(priceMatch[1]) : 0;
                                } else {
                                    rowData[header] = cell.textContent.trim();
                                }
                            }
                        }
                    });
                    
                    // 只添加非空对象
                    if (Object.keys(rowData).length > 0) {
                        results.push(rowData);
                    }
                });
                
                // 如果没有找到行数据，尝试获取表格的其他信息
                if (results.length === 0) {
                    // 获取表格的基本信息
                    const tableInfo = {
                        tableFound: true,
                        headerCount: headers.length,
                        headers: headers.filter(h => h !== ''),
                        tableWidth: document.querySelector('.vxe-table--header')?.style.width || '',
                        message: '找到表格但没有数据行'
                    };
                    results.push(tableInfo);
                }
                
                return results;
            });
        
            console.log('提取的表格数据:', tableData);
        
            // 点击"查看详情"按钮
            try {
                // 等待"查看详情"按钮出现
                await page.waitForSelector('button.el-button--text span', { timeout: 20000 });
                await page.waitForTimeout(5000); // 减少等待时间，避免过长超时
                
                // 设置页面默认超时
                await page.setDefaultTimeout(60000); // 设置更长的默认超时时间
                
                // 查找包含"查看详情"文本的按钮
                const detailButtons = await page.$$('button.el-button--text span');
                let clicked = false;
                
                for (const button of detailButtons) {
                    const text = await page.evaluate(el => el.textContent.trim(), button);
                    if (text === '查看详情') {
                        console.log('找到"查看详情"按钮，点击中...');
                        await button.click();
                        clicked = true;
                        break;
                    }
                }
                
                if (!clicked) {
                    console.log('未找到"查看详情"按钮');
                } else {
                    // 等待弹窗出现
                    await page.waitForSelector('.el-dialog', { timeout: 10000 });
                    console.log('弹窗已出现，正在提取信息...');
                    
                    // 等待内容加载完成
                    console.log('等待5秒让内容初步加载...');
                    await page.waitForTimeout(5000);
                    
                    // 检查DOM是否稳定
                    console.log('检查DOM是否稳定...');
                    let lastDOMSize = 0;
                    let stableCount = 0;
                    const maxStabilityChecks = 5;
                    
                    for (let i = 0; i < maxStabilityChecks; i++) {
                        const currentSize = await page.evaluate(() => document.body.innerHTML.length);
                        console.log(`DOM大小检查 ${i+1}/${maxStabilityChecks}: ${currentSize} (上次: ${lastDOMSize})`);
                        
                        if (currentSize === lastDOMSize) {
                            stableCount++;
                            if (stableCount >= 3) {
                                console.log('DOM已稳定，继续处理');
                                break;
                            }
                        } else {
                            stableCount = 0;
                        }
                        
                        lastDOMSize = currentSize;
                        await page.waitForTimeout(1000);
                    }
                    
                    // 检查图片加载状态
                    const imagesLoaded = await page.evaluate(() => {
                        const allImages = document.querySelectorAll('.el-dialog__body .el-image img');
                        console.log(`找到 ${allImages.length} 张图片`);
                        
                        let loadedImages = 0;
                        allImages.forEach(img => {
                            if (img.complete) {
                                loadedImages++;
                            }
                        });
                        console.log(`已加载完成 ${loadedImages}/${allImages.length} 张图片`);
                        
                        return {
                            total: allImages.length,
                            loaded: loadedImages
                        };
                    });
                    
                    // 如果图片未全部加载完成，额外等待
                    if (imagesLoaded.loaded < imagesLoaded.total && imagesLoaded.total > 0) {
                        const waitTime = Math.min(10000, imagesLoaded.total * 1000);
                        console.log(`部分图片尚未加载完成 (${imagesLoaded.loaded}/${imagesLoaded.total})，额外等待${waitTime/1000}秒...`);
                        await page.waitForTimeout(waitTime);
                    }
                    
                    // 再次检查图片加载状态
                    const finalImagesLoaded = await page.evaluate(() => {
                        const allImages = document.querySelectorAll('.el-dialog__body .el-image img');
                        let loadedImages = 0;
                        allImages.forEach(img => {
                            if (img.complete) {
                                loadedImages++;
                            }
                        });
                        console.log(`最终加载完成 ${loadedImages}/${allImages.length} 张图片`);
                        return {
                            total: allImages.length,
                            loaded: loadedImages
                        };
                    });
                    
                    console.log(`图片加载状态: ${finalImagesLoaded.loaded}/${finalImagesLoaded.total} 已加载`);
                    
                    // 额外等待确保所有内容加载完成
                    const extraWaitTime = finalImagesLoaded.total > 0 ? 3000 : 1000;
                    console.log(`额外等待${extraWaitTime/1000}秒确保所有内容加载完成...`);
                    await page.waitForTimeout(extraWaitTime);
                    
                    // 提取弹窗信息
                    const detailData = await page.evaluate(() => {
                        const dialogInfo = {};
                        
                        // 获取弹窗标题
                        const dialogTitle = document.querySelector('.el-dialog__title');
                        if (dialogTitle) {
                            dialogInfo.title = dialogTitle.textContent.trim();
                        }
                        
                        // 获取基本信息表格数据
                        const infoTable = document.querySelector('.el-dialog__body table');
                        if (infoTable) {
                            const tableData = {};
                            const rows = infoTable.querySelectorAll('tr');
                            
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 2) {
                                    const key = cells[0].textContent.trim();
                                    
                                    // 特殊处理尺寸信息
                                    if (key === '尺寸(cm)') {
                                        const dimensionSpans = cells[1].querySelectorAll('span');
                                        const dimensions = {};
                                        
                                        dimensionSpans.forEach(span => {
                                            const text = span.textContent.trim();
                                            const match = text.match(/(长|宽|高)：(\d+\.?\d*)/);
                                            if (match) {
                                                dimensions[match[1]] = parseFloat(match[2]);
                                            }
                                        });
                                        
                                        tableData[key] = dimensions;
                                    } 
                                    // 特殊处理重量信息
                                    else if (key === '重量(g)') {
                                        const weightSpans = cells[1].querySelectorAll('span');
                                        const weights = {};
                                        
                                        weightSpans.forEach(span => {
                                            const text = span.textContent.trim();
                                            if (text.includes('毛重')) {
                                                const match = text.match(/毛重：(\d+\.?\d*)/);
                                                if (match) {
                                                    weights.grossWeight = parseFloat(match[1]);
                                                }
                                            } else if (text.includes('出库平均重量')) {
                                                const match = text.match(/出库平均重量：(\d+\.?\d*)/);
                                                if (match) {
                                                    weights.averageWeight = parseFloat(match[1]);
                                                }
                                            }
                                        });
                                        
                                        tableData[key] = weights;
                                    }
                                    // 特殊处理关键词
                                    else if (key === 'Key Words') {
                                        const keywordButtons = cells[1].querySelectorAll('button.el-button--mini span');
                                        const keywords = [];
                                        
                                        keywordButtons.forEach(button => {
                                            const keyword = button.textContent.trim();
                                            if (keyword && !keyword.includes('复制')) {
                                                keywords.push(keyword);
                                            }
                                        });
                                        
                                        tableData[key] = keywords;
                                    }
                                    // 特殊处理商品属性
                                    else if (key === '商品属性') {
                                        const attributeDivs = cells[1].querySelectorAll('div div');
                                        const attributes = [];
                                        
                                        attributeDivs.forEach(div => {
                                            const attribute = div.textContent.trim();
                                            if (attribute) {
                                                attributes.push(attribute);
                                            }
                                        });
                                        
                                        tableData[key] = attributes;
                                    }
                                    // 特殊处理规格和包装清单
                                    else if (key === 'Specification' || key === 'Package List') {
                                        const contentDiv = cells[1].querySelector('div');
                                        if (contentDiv) {
                                            tableData[key] = contentDiv.innerHTML.trim();
                                        } else {
                                            tableData[key] = cells[1].textContent.trim();
                                        }
                                    }
                                    // 处理其他普通字段
                                    else {
                                        tableData[key] = cells[1].textContent.trim();
                                    }
                                }
                            });
                            
                            dialogInfo.basicInfo = tableData;
                        }
                        
                        // 获取图片信息
                        const imageGroups = {};
                        
                        // 通用函数：提取指定类型的图片
                        function extractImagesByType(typeText) {
                            const images = [];
                            // 查找所有h5标题元素
                            const allH5Elements = document.querySelectorAll('.el-dialog__body h5[style="margin-right: 10px;"]');
                            
                            // 遍历所有h5元素，寻找包含指定类型文本的元素
                            for (const h5 of allH5Elements) {
                                if (h5.textContent.includes(typeText)) {
                                    // 找到父元素下的所有图片
                                    const imgElements = h5.parentElement.querySelectorAll('.el-image img');
                                    
                                    imgElements.forEach(img => {
                                        if (img.src) {
                                            images.push(img.src);
                                        }
                                    });
                                    
                                    break;
                                }
                            }
                            
                            return images;
                        }
                        
                        // 提取所有图片类型
                        const imageTypes = ['主图', '细节图', '全家福', '场景图', '尺寸图', '其它图'];
                        
                        // 遍历所有图片类型并提取
                        imageTypes.forEach(type => {
                            const images = extractImagesByType(type);
                            if (images.length > 0) {
                                // 将类型名称转换为camelCase作为键名
                                const key = type === '主图' ? 'mainImages' :
                                           type === '细节图' ? 'detailImages' :
                                           type === '全家福' ? 'familyImages' :
                                           type === '场景图' ? 'sceneImages' :
                                           type === '尺寸图' ? 'dimensionImages' : 
                                           type === '其它图' ? 'otherImages' :
                                           type.replace(/[\u4e00-\u9fa5]+/g, match => match.charAt(0).toLowerCase() + match.slice(1)) + 'Images';
                                
                                imageGroups[key] = images;
                            }
                        });
                        
                        // 尝试使用data-v属性查找其它图
                        if (!imageGroups['otherImages']) {
                            const otherImages = [];
                            const otherImageElements = document.querySelectorAll('div[data-v-15c51896] h5[data-v-15c51896][style="margin-right: 10px;"]');
                            
                            otherImageElements.forEach(h5 => {
                                if (h5.textContent.includes('其它图')) {
                                    // 找到父元素下的所有图片
                                    const imgElements = h5.parentElement.querySelectorAll('.el-image img');
                                    
                                    imgElements.forEach(img => {
                                        if (img.src) {
                                            otherImages.push(img.src);
                                        }
                                    });
                                }
                            });
                            
                            if (otherImages.length > 0) {
                                imageGroups['otherImages'] = otherImages;
                            }
                        }
                        
                        dialogInfo.images = imageGroups;
                        
                        return dialogInfo;
                    });
                    
                    console.log('提取的弹窗详情数据:', detailData);
                    
                    // 合并表格数据和弹窗数据
                    this.data = {
                        tableData: tableData,
                        detailData: detailData
                    };
                    
                    // 关闭弹窗
                    console.log('数据提取完成，准备关闭弹窗...');
                    
                    // 根据图片数量决定等待时间
                    const hasImages = detailData.images && Object.keys(detailData.images).length > 0;
                    const totalImages = hasImages ? Object.values(detailData.images).flat().length : 0;
                    const waitTime = totalImages > 0 ? Math.min(10000, totalImages * 500) : 2000;
                    
                    console.log(`等待${waitTime/1000}秒后关闭弹窗...`);
                    await page.waitForTimeout(waitTime);
                    
                    // 尝试多种方法关闭弹窗
                    const closeSuccess = await page.evaluate(() => {
                        try {
                            console.log('尝试关闭弹窗...');
                            
                            // 方法1：使用更精确的选择器 - 通过footer中的关闭按钮
                            const footerCloseButton = document.querySelector('div.footer button.el-button.el-button--default.el-button--small span');
                            if (footerCloseButton && footerCloseButton.textContent.trim() === '关闭') {
                                console.log('找到footer中的关闭按钮，点击中...');
                                footerCloseButton.click();
                                console.log('通过footer中的关闭按钮关闭弹窗');
                                return true;
                            }
                            
                            // 方法2：使用data-v属性的选择器
                            const dataVCloseButton = document.querySelector('button[data-v-15c51896].el-button.el-button--default.el-button--small span');
                            if (dataVCloseButton && dataVCloseButton.textContent.trim() === '关闭') {
                                console.log('找到带data-v属性的关闭按钮，点击中...');
                                dataVCloseButton.click();
                                console.log('通过带data-v属性的关闭按钮关闭弹窗');
                                return true;
                            }
                            
                            // 方法3：使用一般的选择器
                            const closeButton = document.querySelector('button.el-button.el-button--default.el-button--small span');
                            if (closeButton && closeButton.textContent.trim() === '关闭') {
                                console.log('找到关闭按钮，点击中...');
                                closeButton.click();
                                console.log('通过关闭按钮关闭弹窗');
                                return true;
                            }
                            
                            // 方法4：使用更精确的选择器点击关闭按钮
                            const closeButtons = document.querySelectorAll('button.el-dialog__headerbtn');
                            if (closeButtons && closeButtons.length > 0) {
                                closeButtons[closeButtons.length - 1].click();
                                console.log('通过点击关闭按钮关闭弹窗');
                                return true;
                            }
                            
                            // 方法5：尝试点击图标
                            const closeIcons = document.querySelectorAll('i.el-dialog__close.el-icon.el-icon-close');
                            if (closeIcons && closeIcons.length > 0) {
                                closeIcons[closeIcons.length - 1].click();
                                console.log('通过点击关闭图标关闭弹窗');
                                return true;
                            }
                            
                            // 方法6：直接修改DOM
                            const dialog = document.querySelector('.el-dialog__wrapper');
                            if (dialog) {
                                // 直接修改样式使其隐藏
                                dialog.style.display = 'none';
                                
                                // 移除body上的相关类
                                document.body.classList.remove('el-popup-parent--hidden');
                                document.body.style.overflow = 'auto';
                                document.body.style.paddingRight = '0px';
                                
                                // 移除遮罩
                                const modal = document.querySelector('.v-modal');
                                if (modal) {
                                    modal.style.display = 'none';
                                }
                                
                                console.log('通过修改DOM关闭弹窗');
                                return true;
                            }
                            
                            // 方法7：模拟ESC键
                            const escEvent = new KeyboardEvent('keydown', {
                                key: 'Escape',
                                code: 'Escape',
                                keyCode: 27,
                                which: 27,
                                bubbles: true,
                                cancelable: true
                            });
                            document.dispatchEvent(escEvent);
                            console.log('通过ESC键关闭弹窗');
                            
                            return true;
                        } catch (error) {
                            console.error('关闭弹窗时出错:', error);
                            return false;
                        }
                    });
                    
                    if (closeSuccess) {
                        console.log('弹窗已关闭');
                    } else {
                        console.log('关闭弹窗失败，尝试使用Puppeteer的keyboard.press方法');
                        await page.keyboard.press('Escape');
                    }
                    
                    // 等待弹窗消失
                    await page.waitForTimeout(1000);
                }
            } catch (error) {
                console.log('处理"查看详情"按钮或提取弹窗信息时出错:', error);
                console.log('错误详情:', error.stack);
                console.log('尝试继续执行其他操作...');
                
                // 如果获取弹窗信息失败，至少返回表格数据
                this.data = tableData;
                
                // 尝试关闭可能存在的弹窗
                try {
                    await page.evaluate(() => {
                        const dialogs = document.querySelectorAll('.el-dialog__wrapper');
                        dialogs.forEach(dialog => {
                            dialog.style.display = 'none';
                        });
                        const masks = document.querySelectorAll('.v-modal');
                        masks.forEach(mask => {
                            mask.style.display = 'none';
                        });
                    });
                    console.log('已尝试通过DOM操作关闭可能存在的弹窗');
                } catch (closeError) {
                    console.log('尝试关闭弹窗时出错:', closeError);
                }
            }
        
            if (this.data) {
                console.log(`处理数据，准备输出`);
                outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
            } else {
                console.log('未找到任何数据');
            }
        }

        else if (this.element.leixing === '自定义0') {
            this.data = await page.evaluate(() => {
                const shops = [];
                const links = document.querySelectorAll('#region-nav a');
                let texts = Array.from(links).map(link => link.innerText);
                // 将数据转换为 JSON 格
                return texts;
            });
            console.log('data:', this.data);

        }
        return page;
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
        return page;
    }
}
export class NavigationTask extends Task {
    constructor(url) {
        super('navigation', null);
        this.url = url;
    }
    // constructor(url, value, sortedData_new, task_name, cityname) {
    //     super('navigation', null, value, sortedData_new, task_name, cityname);
    //     this.url = url;
    // }

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
        
        return page;
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
        return page;
    }
}


export class TaskExecutor {
    constructor(tasks) {
        this.tasks = tasks;
    }

    async executeAll(page) {
        for (const task of this.tasks) {
            page = await task.execute(page); 
        }
    }
}
