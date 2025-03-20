// modules/taskExecutor.js
///实现通过OZON的店铺来获取对应的 sku 数据
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
            }, 4000);
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
        const cliclValue = this.value;


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
                console.log('Hover and click operation started');
                await page.evaluate(async () => {
                    const AVATAR_SELECTORS = [
                        "span.semi-avatar.semi-avatar-circle.semi-avatar-small.semi-avatar-grey.semi-dropdown-showing",
                        ".semi-avatar",
                        "img[src*='aweme-avatar']",
                        "[class*='avatar']"
                    ];
                    let avatarElement;
                    for (let selector of AVATAR_SELECTORS) {
                        avatarElement = document.querySelector(selector);
                        if (avatarElement) {
                            console.log('找到头像元素:', selector);
                            avatarElement.click();
                            console.log('已点击头像');
                            break;
                        }
                    }
                    if (!avatarElement) {
                        console.error('未找到头像元素');
                        return;
                    }
                    const mouseoverEvent = new MouseEvent('mouseover', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    avatarElement.dispatchEvent(mouseoverEvent);
                    console.log('已模拟鼠标悬停在头像上');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const menuItems = document.querySelectorAll('.semi-dropdown-menu *');
                    console.log('找到的菜单项数量:', menuItems.length);
                    for (let item of menuItems) {
                        console.log('菜单项内容:', item.textContent.trim());
                        if (item.textContent.trim() === '退出代运营状态') {
                            console.log('找到"退出代运营状态"选项');
                            item.click();
                            console.log('已点击"退出代运营状态"');
                            return;
                        }
                    }
                    console.error('未找到"退出代运营状态"选项');
                });
                console.log('自定义4_done');
            }
        } catch (error) {
            console.error('执行点击操作时发生错误:', error);
        }

        console.log('check_1');
        const newPage = await newPagePromise
        console.log('check_2');
        console.log('newPage:', newPage);

        if (newPage !== null) {
            console.log('newPage URL:', newPage.url());
            await newPage.setViewport({ width: 1280, height: 720 });
            await newPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
                console.log('Navigation timeout after 20 seconds');
            });
        }

        console.log('check_3')

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
    constructor(element, value, sortedData_new, task_name, cityname) {
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
                // const allData = await getAllData(row.name, this.cityname);
                // console.log('All Data:', allData);
                return {
                    ...row,
                    // gaodeName: allData.gaode.name,
                    // gaodeAddress: allData.gaode.address,
                    // gaodePhone: allData.gaode.phone,
                    // tengxunName: allData.tengxun.name,
                    // tengxunAddress: allData.tengxun.address,
                    // tengxunPhone: allData.tengxun.phone,
                    // baiduName: allData.baidu.name,
                    // baiduAddress: allData.baidu.address,
                    // baiduPhone: allData.baidu.phone
                };
            }));

            // console.log('Updated data:', this.data);
            outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
        }
        else if (this.element.leixing === '自定义2') {
            this.data = await page.evaluate(() => {
                const shops = [];
                const links = document.querySelectorAll('#region-nav a');
                let texts = Array.from(links).map(link => link.innerText);
                // 将数据转换为 JSON 格
                return texts;
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
            this.data = await page.evaluate(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const products = [];
                        // 使用更新后的选择器来定位商品卡片
                        const productCards = document.querySelectorAll('div[class*="tile-root"]');
                        console.log('找到的产品卡片数量:', productCards.length);

                        productCards.forEach((card, index) => {
                            const product = {};

                            // 提取链接和ID
                            const linkElement = card.querySelector('a[class*="tile-clickable-element"]');
                            product.link = linkElement ? linkElement.href : '未找到链接';
                            product.id = product.link ? product.link.match(/\/product\/([^\/\?]+)/)?.[1] : '未找到ID';

                            // 提取图片URL
                            const imageElement = card.querySelector('img[class*="b933-a"]');
                            product.imageUrl = imageElement ? imageElement.src : '未找到图片URL';

                            // 提取价格信息
                            const currentPriceElement = card.querySelector('span[class*="tsHeadline500Medium"]');
                            product.currentPrice = currentPriceElement ? currentPriceElement.textContent.trim() : '未找到当前价格';

                            const oldPriceElement = card.querySelector('span[class*="tsBodyControl400Small"]');
                            product.oldPrice = oldPriceElement ? oldPriceElement.textContent.trim() : '未找到原价';

                            // 提取折扣信息
                            const discountElement = card.querySelector('span[class*="c3025-b4"]');
                            product.discount = discountElement ? discountElement.textContent.trim() : '未找到折扣';

                            // 提取标题
                            const titleElement = card.querySelector('span[class*="tsBody500Medium"]');
                            product.title = titleElement ? titleElement.textContent.trim() : '未找到标题';

                            // ---------- 优化评分收集 (开始) ----------
                            // 使用三种不同方法尝试提取评分
                            let rating = null;
                            
                            // 方法1: 通过原始选择器查找黄色星星图标附近的评分文本
                            const ratingContainer1 = card.querySelector('svg[class*="p6b18-a5"][style*="color:rgba(255, 165, 0, 1)"]');
                            if (ratingContainer1 && !rating) {
                                const ratingElement = ratingContainer1.closest('span[class*="p6b18-a4"]')?.querySelector('span[style*="color:rgba(7, 7, 7, 1)"]');
                                if (ratingElement) {
                                    rating = ratingElement.textContent.trim();
                                }
                            }
                            
                            // 方法2: 通过替代颜色格式查找黄色星星图标
                            if (!rating) {
                                const ratingContainer2 = card.querySelector('svg[style*="color: rgb(255, 165, 0)"]');
                                if (ratingContainer2) {
                                    const ratingElement = ratingContainer2.closest('span')?.querySelector('span[style*="color: rgb(7, 7, 7)"]');
                                    if (ratingElement) {
                                        rating = ratingElement.textContent.trim();
                                    }
                                }
                            }
                            
                            // 方法3: 查找任何包含可能是评分的数值文本(通常是1-5之间带小数点的数字)
                            if (!rating) {
                                // 检查p6b类元素内的所有span
                                const ratingContainers = card.querySelectorAll('div[class*="p6b"]');
                                for (const container of ratingContainers) {
                                    const spans = container.querySelectorAll('span');
                                    for (const span of spans) {
                                        const text = span.textContent.trim();
                                        // 评分一般是1到5之间的数字，可能带有小数点
                                        if (/^[1-5](\.\d)?$/.test(text)) {
                                            rating = text;
                                            break;
                                        }
                                    }
                                    if (rating) break;
                                }
                            }
                            
                            product.rating = rating || '未找到评分';
                            // ---------- 优化评分收集 (结束) ----------

                            // 提取评论数（寻找包含"отзыва"文字的元素）
                            const reviewContainer = card.querySelector('svg[class*="p6b18-a5"][style*="color:rgba(0, 26, 52, 0.4)"]');
                            if (reviewContainer) {
                                const reviewElement = reviewContainer.closest('span[class*="p6b18-a4"]').querySelector('span[style*="color:rgba(0, 26, 52, 0.6)"]');
                                if (reviewElement) {
                                    const reviewText = reviewElement.textContent.trim();
                                    product.reviewCount = reviewText.replace(/[^\d]/g, ''); // 只保留数字
                                } else {
                                    product.reviewCount = '0';
                                }
                            } else {
                                product.reviewCount = '0';
                            }

                            // 提取配送信息
                            const deliveryElement = card.querySelector('div[class*="tsBodyControl500Medium"]');
                            product.deliveryDate = deliveryElement ? deliveryElement.textContent.trim() : '未找到配送日期';

                            // 检查是否标注为优惠活动
                            const promotionElement = card.querySelector('svg[style*="color: rgb(16, 196, 76)"]');
                            product.hasPromotion = !!promotionElement;

                            // 收集"添加到购物车"按钮信息
                            const cartButtonElement = card.querySelector('button[class*="b2122-"]');
                            product.cartButtonText = cartButtonElement ? cartButtonElement.textContent.trim() : '';

                            console.log(`产品 ${index + 1}:`, product);
                            products.push(product);
                        });

                        resolve(products);
                    }, 5000);
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
// export class ScrollTask extends Task {
//     constructor(distance, direction) {
//         super('scroll', null);
//         this.distance = distance;
//         this.direction = direction;
//     } async execute(page) {
//         // await this.save();
//         try {
//             await page.evaluate((distance, direction) => {
//                 window.scrollBy(0, direction === 'down' ? distance : -distance);
//             }, this.distance, this.direction);
//             await new Promise(resolve => setTimeout(resolve, 5000));
//             // await this.update('completed');
//         } catch (error) {
//             // await this.update('failed', error.message);
//         }
//         return page;
//     }
// }


export class ScrollTask extends Task {
    constructor(distance, direction) {
        super('scroll', null);
        this.distance = distance;
        this.direction = direction;
    }

    async execute(page) {
        try {
            let previousCount = 0;
            let currentCount = 0;
            let noChangeCount = 0;

            while (noChangeCount < 6) { // 连续3次数量没变化时停止
                // 获取当前商品数量
                currentCount = await page.evaluate(() => {
                    return document.querySelectorAll('div[data-index][class*="tile-root"]').length;
                });

                console.log(`当前商品数量: ${currentCount}`);

                if (currentCount === previousCount) {
                    noChangeCount++;
                    console.log(`商品数量未变化，连续${noChangeCount}次`);
                } else {
                    noChangeCount = 0;
                    console.log('商品数量发生变化，重置计数器');
                }

                // 执行滚动
                await page.bringToFront();
                await page.evaluate((distance, direction) => {
                    window.scrollBy(0, direction === 'down' ? distance : -distance);
                }, this.distance, this.direction);

                // 等待新内容加载
                await page.waitForTimeout(10000);

                previousCount = currentCount;
            }

            console.log('滚动结束，商品数量已稳定');

        } catch (error) {
            console.error('滚动过程发生错误:', error);
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