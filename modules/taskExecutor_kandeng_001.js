// modules/taskExecutor.js
///实现通过 e百的任务批量刊登工作流
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



const getData_gaode = async (keywords,cityname) => {
    try {
        const url = `https://restapi.amap.com/v5/place/text?keywords=${encodeURIComponent(keywords)}&region=${encodeURIComponent(cityname + '市')}&key=e5fa6ceff746bd2728fd7ab09823141c&show_fields=business`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // console.log('res:', res);
        if (res.ok) {
            const data = await res.json();
            // console.log('Data:', data);

            // 提取 pois 中的第一个对象的名称和电话字段
            if (data.pois && data.pois.length > 0) {
                const firstPoi = data.pois[0];
                const result = {
                    name: firstPoi.name,
                    address: firstPoi.address,
                    phone: firstPoi.business.tel
                };
                console.log('Extracted Data:', result);
                return result;
            } else {
                console.error('No POIs found.');
            }
        } else {
            console.error('Server error:', await res.text());
        }
    } catch (e) {
        console.error('Error fetching:', e);
    }
};


const getData_tengxun = async (keywords, cityname) => {
    try {
        const res = await fetch('http://localhost:8082/getData_tengxun', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keywords, cityname })
        });
        if (res.ok) {
            const data = await res.json();
            // console.log('data.result:', data);
            return data;
        } else {
            console.error('Server error:', await res.text());
        }
    } catch (e) {
        console.error('Error fetching:', e);
    }
};

const getData_baidu = async (keywords, cityname) => {
    try {
        const res = await fetch('http://localhost:8082/api/getData_baidu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keywords, cityname })
        });
        if (res.ok) {
            const data = await res.json();
            // console.log('data.result:', data);
            return data;
        } else {
            console.error('Server error:', await res.text());
        }
    } catch (e) {
        console.error('Error fetching:', e);
    }
};



const getAllData = async (keywords,cityname) => {
    console.log('cityname_f:', cityname);
    const [gaodeData, tengxunData, baiduData] = await Promise.all([
        getData_gaode(keywords, cityname),
        getData_tengxun(keywords, cityname),
        getData_baidu(keywords, cityname)
    ]);

    return {
        gaode: gaodeData || { name: null, address: null, phone: null },
        tengxun: tengxunData || { name: null, address: null, phone: null },
        baidu: baiduData || { name: null, address: null, phone: null }
    };
};


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
    constructor(element, index, browser) {
        super('click', element);
        this.index = index;  // 添加这一行
        this.browser = browser;
    }
    async execute(page) {
        console.log('page URL:', page.url());
        const newPagePromise = new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                console.log('Timeout waiting for new page');
                resolve(null); // 如果超时，解决 Promise 并返回 null
            }, 2000);
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
            if (this.element.innerText.includes('保存当前页') || this.element.innerText.includes('同步至未推送站点') ||
                this.element.innerText.includes('翻译') || this.element.innerText.includes('保存所有站点') || this.element.innerText.includes('保存并提交所有站点')
            ) {
                clickSelector = `//button[contains(., '${this.element.innerText}')]`;
            } else if (this.element.innerText.includes('确定')) {
                clickSelector = `//div[@data-v-3e50dd5e]//button[contains(@class, 'ivu-btn-primary') and span[text() ='${this.element.innerText}']]`;
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
            console.log('点击“刊登管理”菜单项以展开子菜单');

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
        } else if (this.element.leixing === '自定义2') {
            console.log('dianjikaishi:');
            try {
                await page.evaluate(async (cliclValue) => {
                    // 查找所有具有特定样式的标签元素
                    const labels = document.querySelectorAll('.ivu-form-item-label[style="width: 60px;"]');

                    // 迭代这些标签以找到包含 "店铺" 文本的标签
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

                            // 确保元素在视图中
                            selectButton.scrollIntoView();

                            // 手动创建并触发点击事件
                            const clickEvent = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                            });

                            selectButton.dispatchEvent(clickEvent);
                            console.log('Click this dispatched on select button');

                            // 设置适当的延时，确保下拉菜单有时间加载
                            await new Promise(resolve => setTimeout(resolve, 2000));

                            // 使用XPath选择包含“Sadong”文本的下拉项
                            console.log("cliclValue", cliclValue)
                            const item = document.evaluate(`//li[contains(@class, 'ivu-select-item') and text()="${cliclValue}"]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                            if (item) {
                                console.log('Found the Sadong item:', item);
                                item.scrollIntoView();

                                // 手动创建并触发点击事件
                                const itemClickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                });

                                item.dispatchEvent(itemClickEvent);
                                console.log('Click this dispatched on Sadong item');
                            } else {
                                console.error("无法找到包含“Sadong”的下拉项");
                            }
                        } else {
                            console.error("无法找到选择器 .ivu-select-selection 对应的元素");
                        }
                    } else {
                        console.error("无法找到包含 '店铺' 标签的 .ivu-form-item 元素");
                    }
                }, cliclValue);
                await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(e => console.log('等待页面加载超时，继续执行'));
                await new Promise(resolve => setTimeout(resolve, 10000));
                console.log('自定义2_done');
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
        const newPage = await newPagePromise.catch(() => null);
        console.log('check_2');
        console.log('newPage:', newPage);
        
        if (newPage !== null) {
            console.log('newPage URL:', newPage.url());
            await newPage.setViewport({ width: 1280, height: 720 });
            await newPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
                console.log('Navigation timeout after 20 seconds');
            });
        }

        console.log('check_3');

        return newPage || page;

    }
}

export class InputTask extends Task {
    constructor(element, value, sortedData_new) {
        super('input', element, value, sortedData_new);
    }
    async execute(page) {
        let inputSelector;
        let isXPath = false;
        if (this.element.label && isUniqueAttribute('label', this, this.sortedData_new)) {
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
        else if (this.element.leixing === '自定义4') {
            this.data = await page.evaluate(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        try {
                            // 选择包含提示内容的所有元素
                            const messages = document.querySelectorAll('.mess-box span');

                            // 定义一个数组来存储组合后的信息
                            let combinedMessages = [];

                            // 遍历所有的提示信息，并两两组合
                            for (let i = 0; i < messages.length; i += 2) {
                                const combinedMessage = `${messages[i].innerText}: ${messages[i + 1] ? messages[i + 1].innerText : ''}`;
                                combinedMessages.push(combinedMessage);
                            }

                            // 输出组合后的内容
                            combinedMessages.forEach(message => {
                                console.log(message);
                            });

                            resolve(combinedMessages);
                        } catch (error) {
                            console.error('数据提取过程中出错:', error);
                            resolve([]);
                        }
                    }, 5000); // 保留5秒延迟
                });
            });

            console.log('提取的数据:', this.data);

            if (this.data && this.data.length > 0) {
                outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
            } else {
                console.log('没有提取到数据或数据为空');
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