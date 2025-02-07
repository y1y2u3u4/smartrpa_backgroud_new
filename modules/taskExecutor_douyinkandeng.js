// modules/taskExecutor.js
///实现抖音创作中心实现视频发布
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
    constructor(element, value, index, browser, task_name, cityname) {
        super('click', element, value, null, task_name, cityname);
        this.index = index;  // 添加这一行
        this.browser = browser;
        this.value = value;
    }
    async execute(page) {
        console.log('page URL:', page.url());
        console.log('index:', this.index);
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
                isXPath_click = true;
            }
            else if (this.element.innerText === '管理') {
                // clickSelector = `(//tr[@class="douyin-creator-pc-table-row"])[${this.index+1}]//span[text()="管理"]`;
                clickSelector = `//span[contains(@class, "_Ji1e") and text()="管理"]`;
                isXPath_click = true;
            }
            else if (this.element.innerText === '发布') {
                // clickSelector = `(//tr[@class="douyin-creator-pc-table-row"])[${this.index+1}]//span[text()="管理"]`;
                clickSelector = `button.button-dhlUZE.primary-cECiOJ.fixed-J9O8Yw`;
            }
            else if (this.element.innerText === '密码登录') {
                // clickSelector = `(//tr[@class="douyin-creator-pc-table-row"])[${this.index+1}]//span[text()="管理"]`;
                clickSelector = `//div[@class='toggle-crGaLh']/span[text()='密码登录 ']`;
                isXPath_click = true;
            }
            else if (this.element.innerText === '隐私政策') {
                // clickSelector = `(//tr[@class="douyin-creator-pc-table-row"])[${this.index+1}]//span[text()="管理"]`;
                clickSelector = `div[class*="agreement"] img`;
            }
            else if (this.element.innerText === '视频管理') {
                clickSelector = "//li[contains(@class, 'semi-navigation-item')]//span[contains(@class, 'semi-navigation-item-text')]/span[text()='视频管理']";
                isXPath_click = true;
            }
            else {
                clickSelector = `//${this.element.tagName.toLowerCase()}[text()='${this.element.innerText}'] | //${this.element.tagName.toLowerCase()}/span[text()='${this.element.innerText}']`;
                isXPath_click = true;
            }

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
                    console.log('clickSelector:', clickSelector);
                    console.log('page URL:', page.url());
                    await page.waitForFunction(
                        (selector) => {
                            const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                            return xpathResult.singleNodeValue !== null;
                        },
                        { timeout: 10000 },
                        clickSelector
                    );
                    await page.evaluate((selector) => {
                        const xpathResult = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        console.log('xpathResult:', xpathResult);
                        const element = xpathResult.singleNodeValue;
                        console.log('element:', element);
                        element.click();
                    }, clickSelector);
                }

            } else {
                await page.click(clickSelector);
            }
        } else if (this.element.leixing === '自定义1') {
            console.log('准备上传视频');

            try {
                // 使用传入的本地视频路径
                const videoPath = cliclValue;
                console.log('videoPath:', videoPath);

                // 等待文件选择器并点击上传按钮
                const [fileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.evaluate(() => document.querySelector('input[type="file"]').click())
                ]);

                // 上传文件
                await fileChooser.accept([videoPath])
                    .catch(error => console.error('文件上传失败:', error));

                // 等待上传完成
                await page.waitForTimeout(8000);

                // 清理文件输入元素
                await page.evaluate(() => {
                    const fileInputs = document.querySelectorAll('input[type="file"]');
                    fileInputs.forEach(input => input.remove());
                    document.body.click();
                });

                console.log('视频上传成功');

            } catch (error) {
                console.error('视频上传过程中发生错误:', error);
            }
        } 
        else if (this.element.leixing === '自定义2') {
            try {
                console.log('自定义2_start');
                await page.evaluate(async (cliclValue) => {
                    // 工具函数：触发指定类型的事件
                    function triggerEvent(element, eventType, event) {
                        element.dispatchEvent(event);
                    }

                    // 工具函数：模拟键盘事件（keydown, keypress, keyup）
                    function simulateKeyEvents(element, key) {
                        const keyEvents = ['keydown', 'keypress', 'keyup'];
                        keyEvents.forEach(eventType => {
                            const keyEvent = new KeyboardEvent(eventType, {
                                key: key,
                                code: key,
                                keyCode: key === 'Enter' ? 13 : 0,
                                which: key === 'Enter' ? 13 : 0,
                                bubbles: true,
                                cancelable: true,
                            });
                            triggerEvent(element, eventType, keyEvent);
                        });
                    }

                    // 主要执行流程
                    async function main() {
                        try {
                            const inputSelector = 'input[placeholder="请输入抖音号搜索"]';
                            const inputElement = document.querySelector(inputSelector);

                            if (!inputElement) {
                                throw new Error(`未找到输入框，选择器：${inputSelector}`);
                            }

                            console.log('找到输入框元素');

                            // 1. 聚焦输入框
                            inputElement.focus();
                            console.log('输入框已聚焦');

                            // 2. 设置输入框的值
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(inputElement, cliclValue);
                            console.log(`已设置输入框值为：${cliclValue}`);

                            // 3. 触发 input 和 change 事件
                            const inputEvent = new Event('input', { bubbles: true });
                            inputElement.dispatchEvent(inputEvent);

                            const changeEvent = new Event('change', { bubbles: true });
                            inputElement.dispatchEvent(changeEvent);
                            console.log('已触发 input 和 change 事件');

                            // 4. 模拟回车键
                            simulateKeyEvents(inputElement, 'Enter');
                            console.log('已模拟回车键，执行搜索操作');

                            // 5. 点击搜索图标作为备选方案
                            const searchIconSelector = '.douyin-creator-pc-icon-search';
                            const searchIcon = document.querySelector(searchIconSelector);

                            if (searchIcon) {
                                // 使用 setTimeout 确保回车键事件先触发
                                await new Promise(resolve => {
                                    setTimeout(() => {
                                        searchIcon.click();
                                        console.log('已点击搜索图标，执行搜索操作');
                                        resolve();
                                    }, 1000); // 延时1秒
                                });
                            } else {
                                console.warn(`未找到搜索图标，选择器：${searchIconSelector}`);
                            }

                            console.log('搜索操作完成');
                        } catch (error) {
                            console.error('执行过程中发生错误:', error.message);
                        }
                    }

                    // 检查输入框是否存在，如果不存在则等待
                    function waitForElement(selector, callback, interval = 500, maxAttempts = 20) {
                        return new Promise((resolve, reject) => {
                            let attempts = 0;
                            const timer = setInterval(() => {
                                const element = document.querySelector(selector);
                                console.log(`尝试查找元素 (${attempts + 1}/${maxAttempts}):`, selector);
                                if (element) {
                                    clearInterval(timer);
                                    console.log('找到元素:', selector);
                                    callback().then(resolve).catch(reject);
                                } else {
                                    attempts++;
                                    if (attempts >= maxAttempts) {
                                        clearInterval(timer);
                                        reject(new Error(`未找到元素：${selector}，停止尝试`));
                                    }
                                }
                            }, interval);
                        });
                    }

                    // 执行主流程
                    await waitForElement('input[placeholder="请输入抖音号搜索"]', main)
                        .catch(error => console.error('等待元素时发生错误:', error.message));

                    // 等待2秒让搜索结果加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 等待并点击管理按钮
                    const clickResult = await new Promise((resolve, reject) => {
                        let attempts = 0;
                        const maxAttempts = 20;
                        const interval = setInterval(() => {
                            const manageBtn = document.querySelector('span.table-oper-btn-mKBpOw');
                            if (manageBtn) {
                                clearInterval(interval);
                                manageBtn.click();
                                resolve('找到并点击了管理按钮');
                            } else {
                                attempts++;
                                if (attempts >= maxAttempts) {
                                    clearInterval(interval);
                                    reject(new Error('未找到管理按钮'));
                                }
                            }
                        }, 500);
                    });
                    
                    return clickResult; // 返回结果到 Node 环境

                }, cliclValue).then(result => {
                    console.log('点击管理按钮结果:', result);
                }).catch(error => {
                    console.error('点击管理按钮时发生错误:', error.message);
                });
                await new Promise(resolve => setTimeout(resolve, 10000));
                console.log('自定义2_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }

        } 
        else if (this.element.leixing === '自定义2.1') {
            try {
                console.log('自定义2.1_start');
                await page.evaluate(async (cliclValue) => {
                    // 工具函数：触发指定类型的事件
                    function triggerEvent(element, eventType, event) {
                        element.dispatchEvent(event);
                    }

                    // 工具函数：模拟键盘事件（keydown, keypress, keyup）
                    function simulateKeyEvents(element, key) {
                        const keyEvents = ['keydown', 'keypress', 'keyup'];
                        keyEvents.forEach(eventType => {
                            const keyEvent = new KeyboardEvent(eventType, {
                                key: key,
                                code: key,
                                keyCode: key === 'Enter' ? 13 : 0,
                                which: key === 'Enter' ? 13 : 0,
                                bubbles: true,
                                cancelable: true,
                            });
                            triggerEvent(element, eventType, keyEvent);
                        });
                    }

                    // 主要执行流程
                    async function main() {
                        try {
                            const inputSelector = 'input[placeholder="请输入手机号码登录"]';
                            const inputElement = document.querySelector(inputSelector);

                            if (!inputElement) {
                                throw new Error(`未找到输入框，选择器：${inputSelector}`);
                            }

                            console.log('找到输入框元素');

                            // 1. 聚焦输入框
                            inputElement.focus();
                            console.log('输入框已聚焦');

                            // 2. 设置输入框的值
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(inputElement, cliclValue);
                            console.log(`已设置输入框值为：${cliclValue}`);

                            // 3. 触发 input 和 change 事件
                            const inputEvent = new Event('input', { bubbles: true });
                            inputElement.dispatchEvent(inputEvent);

                            const changeEvent = new Event('change', { bubbles: true });
                            inputElement.dispatchEvent(changeEvent);
                            console.log('已触发 input 和 change 事件');

                            // 4. 模拟回车键
                            simulateKeyEvents(inputElement, 'Enter');
                            console.log('已模拟回车键，执行登录操作');

                            // 5. 点击登录按钮作为备选方案
                            const loginButtonSelector = 'button[type="submit"]'; // 替换为实际的登录按钮选择器
                            const loginButton = document.querySelector(loginButtonSelector);

                            if (loginButton) {
                                // 使用 setTimeout 确保回车键事件先触发
                                await new Promise(resolve => {
                                    setTimeout(() => {
                                        loginButton.click();
                                        console.log('已点击登录按钮，执行登录操作');
                                        resolve();
                                    }, 1000); // 延时1秒
                                });
                            } else {
                                console.warn(`未找到登录按钮，选择器：${loginButtonSelector}`);
                            }

                            console.log('登录操作完成');
                        } catch (error) {
                            console.error('执行过程中发生错误:', error.message);
                        }
                    }

                    // 检查输入框是否存在，如果不存在则等待
                    function waitForElement(selector, callback, interval = 500, maxAttempts = 20) {
                        return new Promise((resolve, reject) => {
                            let attempts = 0;
                            const timer = setInterval(() => {
                                const element = document.querySelector(selector);
                                console.log(`尝试查找元素 (${attempts + 1}/${maxAttempts}):`, selector);
                                if (element) {
                                    clearInterval(timer);
                                    console.log('找到元素:', selector);
                                    callback().then(resolve).catch(reject);
                                } else {
                                    attempts++;
                                    if (attempts >= maxAttempts) {
                                        clearInterval(timer);
                                        reject(new Error(`未找到元素：${selector}，停止尝试`));
                                    }
                                }
                            }, interval);
                        });
                    }

                    // 执行主流程
                    await waitForElement('input[placeholder="请输入手机号码登录"]', main)
                        .catch(error => console.error('等待元素时发生错误:', error.message));

                }, cliclValue);
                await new Promise(resolve => setTimeout(resolve, 10000));
                console.log('自定义2_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }

        } 
        else if (this.element.leixing === '自定义2.2') {
            try {
                console.log('自定义2.1_start');
                await page.evaluate(async (cliclValue) => {
                    // 工具函数：触发指定类型的事件
                    function triggerEvent(element, eventType, event) {
                        element.dispatchEvent(event);
                    }

                    // 工具函数：模拟键盘事件（keydown, keypress, keyup）
                    function simulateKeyEvents(element, key) {
                        const keyEvents = ['keydown', 'keypress', 'keyup'];
                        keyEvents.forEach(eventType => {
                            const keyEvent = new KeyboardEvent(eventType, {
                                key: key,
                                code: key,
                                keyCode: key === 'Enter' ? 13 : 0,
                                which: key === 'Enter' ? 13 : 0,
                                bubbles: true,
                                cancelable: true,
                            });
                            triggerEvent(element, eventType, keyEvent);
                        });
                    }

                    // 主要执行流程
                    async function main() {
                        try {
                            const inputSelector = 'input[placeholder="请输入密码"]';
                            const inputElement = document.querySelector(inputSelector);

                            if (!inputElement) {
                                throw new Error(`未找到输入框，选择器：${inputSelector}`);
                            }

                            console.log('找到输入框元素');

                            // 1. 聚焦输入框
                            inputElement.focus();
                            console.log('输入框已聚焦');

                            // 2. 设置输入框的值
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeInputValueSetter.call(inputElement, cliclValue);
                            console.log(`已设置输入框值为：${cliclValue}`);

                            // 3. 触发 input 和 change 事件
                            const inputEvent = new Event('input', { bubbles: true });
                            inputElement.dispatchEvent(inputEvent);

                            const changeEvent = new Event('change', { bubbles: true });
                            inputElement.dispatchEvent(changeEvent);
                            console.log('已触发 input 和 change 事件');

                            // 4. 模拟回车键
                            simulateKeyEvents(inputElement, 'Enter');
                            console.log('已模拟回车键，执行登录操作');

                            // 5. 点击登录按钮作为备选方案
                            const loginButtonSelector = 'button[type="submit"]'; // 替换为实际的登录按钮选择器
                            const loginButton = document.querySelector(loginButtonSelector);

                            if (loginButton) {
                                // 使用 setTimeout 确保回车键事件先触发
                                await new Promise(resolve => {
                                    setTimeout(() => {
                                        loginButton.click();
                                        console.log('已点击登录按钮，执行登录操作');
                                        resolve();
                                    }, 1000); // 延时1秒
                                });
                            } else {
                                console.warn(`未找到登录按钮，选择器：${loginButtonSelector}`);
                            }

                            console.log('登录操作完成');
                        } catch (error) {
                            console.error('执行过程中发生错误:', error.message);
                        }
                    }

                    // 检查输入框是否存在，如果不存在则等待
                    function waitForElement(selector, callback, interval = 500, maxAttempts = 20) {
                        return new Promise((resolve, reject) => {
                            let attempts = 0;
                            const timer = setInterval(() => {
                                const element = document.querySelector(selector);
                                console.log(`尝试查找元素 (${attempts + 1}/${maxAttempts}):`, selector);
                                if (element) {
                                    clearInterval(timer);
                                    console.log('找到元素:', selector);
                                    callback().then(resolve).catch(reject);
                                } else {
                                    attempts++;
                                    if (attempts >= maxAttempts) {
                                        clearInterval(timer);
                                        reject(new Error(`未找到元素：${selector}，停止尝试`));
                                    }
                                }
                            }, interval);
                        });
                    }

                    // 执行主流程
                    await waitForElement('input[placeholder="请输入手机号码登录"]', main)
                        .catch(error => console.error('等待元素时发生错误:', error.message));

                }, cliclValue);
                await new Promise(resolve => setTimeout(resolve, 10000));
                console.log('自定义2_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }

        }

        else if (this.element.leixing === '自定义4') {
            try {

                console.log('Hover and click operation completed');

                await page.evaluate(async (clickSelector) => {
                    const AVATAR_SELECTORS = [
                        "span.semi-avatar.semi-avatar-circle.semi-avatar-small.semi-avatar-grey.semi-dropdown-showing",
                        ".semi-avatar",
                        "img[src*='aweme-avatar']",
                        "[class*='avatar']"
                    ];
                    // 尝试找到并点击头像
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

                    // 模拟鼠标悬停
                    const mouseoverEvent = new MouseEvent('mouseover', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    avatarElement.dispatchEvent(mouseoverEvent);
                    console.log('已模拟鼠标悬停在头像上');

                    // 等待下拉菜单加载
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // 查找并点击"退出代运营状态"选项
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

                }, clickSelector);

                console.log('自定义4_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }
        } 

        else if (this.element.leixing === '自定义5') {
            try {
                console.log('开始执行发布流程');

                await page.evaluate(async () => {
                    // 等待检查结果出现
                    const waitForCheck = async () => {
                        const maxAttempts = 30; // 最多等待30次
                        const interval = 5000; // 每次等待5秒
                        
                        for (let attempt = 0; attempt < maxAttempts; attempt++) {
                            // 查找检查结果元素
                            const checkResult = document.querySelector('.detectItemTitle-X5pTL9');
                            if (checkResult && checkResult.textContent.includes('作品未见异常')) {
                                console.log('检查完成，结果正常');
                                return true;
                            }
                            console.log(`等待检查结果，第 ${attempt + 1} 次尝试`);
                            await new Promise(resolve => setTimeout(resolve, interval));
                        }
                        console.log('等待检查结果超时');
                        return false;
                    };

                    // 等待检查完成
                    const checkCompleted = await waitForCheck();
                    
                    if (checkCompleted) {
                        // 查找并点击发布按钮
                        const publishButton = document.querySelector('button.button-dhlUZE.primary-cECiOJ.fixed-J9O8Yw');
                        if (publishButton) {
                            console.log('找到发布按钮');
                            // 确保按钮可见和可点击
                            if (publishButton.offsetParent !== null && !publishButton.disabled) {
                                publishButton.click();
                                console.log('已点击发布按钮');
                            } else {
                                console.log('发布按钮不可用');
                            }
                        } else {
                            console.error('未找到发布按钮');
                        }
                    } else {
                        console.error('检查未通过或等待超时');
                    }
                });

                console.log('发布流程完成');
            } catch (error) {
                console.error('执行发布流程时出错:', error);
            }
        } 
        console.log('check_1');
        const newPage = await Promise.race([
            newPagePromise,
            // 2秒后超时
            new Promise(resolve => setTimeout(() => resolve(null), 2000))
        ]);
        console.log('check_2');
        console.log('newPage:', newPage);

        if (newPage) {
            console.log('newPage URL:', newPage.url());
            // await newPage.setViewport({ width: 1280, height: 720 });
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
            else if (this.element.label === '自定义1') {
                inputSelector = `input[placeholder="填写作品标题，为作品获得更多流量"]`;
            }
            else if (this.element.label === '自定义2') {
                inputSelector = `div[data-placeholder="添加作品简介"]`;
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
        console.log('inputlable:', inputlable);
        console.log('inputValue:', inputValue);
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
            if (inputlable === '自定义1') {
                console.log('自定义1:', inputlable);
                inputSelector = `input[placeholder="填写作品标题，为作品获得更多流量"]`;
                await page.evaluate(async (selector, value) => {
                    value = String(value);
                    const element = document.querySelector(selector);
                    console.log('element:', element);

                    if (element) {
                        // 定义一个新的 value 属性，以便框架能够检测到变化
                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        nativeInputValueSetter.call(element, value);

                        // 触发 input 和 change 事件
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));

                        console.log('输入值已设置');
                    } else {
                        console.error('未找到输入框');
                    }
                }, inputSelector, inputValue);

            }
            else if (inputlable === '自定义2') {
                console.log('自定义2:', inputlable);
                inputSelector = `div[data-placeholder="添加作品简介"]`;
                await page.evaluate(async (selector, value) => {
                    console.log('自定义 2 执行:');
                    value = String(value);
                    const element = document.querySelector(selector);
                    console.log('element:', element);

                    if (element) {
                        // 将光标移动到开始位置
                        const range = document.createRange();
                        const selection = window.getSelection();
                        range.selectNodeContents(element);
                        range.collapse(true); // true means collapse to start
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        // 在开始位置插入内容
                        document.execCommand('insertText', false, value);
                        
                        // 触发input事件
                        const inputEvent = new Event('input', { bubbles: true });
                        element.dispatchEvent(inputEvent);
                    } else {
                        console.error('未找到简介输入区域');
                    }
                }, inputSelector, inputValue);
            }
            else if (inputlable === '自定义3') {
                console.log('自定义3:', inputlable);
                await page.evaluate(async (selector, value) => {
                    console.log('自定义 3 执行:', value);
                    value = String(value);
                    
                    // 解析模式和位置
                    const [mode, location] = value.split('/');
                    console.log('模式:', mode, '位置:', location);

                    // 1. 先处理模式选择
                    const modeSelector = document.querySelector('.anchor-item-UTleEn .semi-select');
                    if (modeSelector) {
                        console.log('找到模式选择器');
                        
                        const currentMode = modeSelector.querySelector('.semi-select-selection-text').textContent;
                        const targetMode = mode === '打卡模式' ? '打卡模式' : '带货模式';
                        
                        if (currentMode !== targetMode) {
                            modeSelector.click();
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            const modeOption = Array.from(document.querySelectorAll('.semi-select-option'))
                                .find(option => option.textContent === targetMode);
                            
                            if (modeOption) {
                                modeOption.click();
                                console.log('已选择模式:', targetMode);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } else {
                            console.log('当前已是目标模式:', targetMode);
                        }
                    }

                    // 2. 处理位置选择
                    if (location) {
                        const locationSelector = document.querySelector('.semi-select.select-PJBSlx');
                        if (locationSelector) {
                            console.log('找到位置选择器');

                            const selectedText = locationSelector.querySelector('.semi-select-selection-text');
                            if (selectedText && selectedText.textContent.trim() === location) {
                                console.log('位置已经被选择：', location);
                                return;
                            }

                            locationSelector.click();
                            console.log('已点击位置选择器以打开下拉菜单');

                            await new Promise(resolve => setTimeout(resolve, 1000));

                            const inputField = locationSelector.querySelector('input');
                            if (inputField) {
                                inputField.value = location;
                                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                                console.log('已在搜索框中输入位置名称');

                                await new Promise(resolve => setTimeout(resolve, 1000));

                                const targetOption = Array.from(document.querySelectorAll('.semi-select-option, .option-v2-_HHRPT'))
                                    .find(option => option.textContent.includes(location));

                                if (targetOption) {
                                    targetOption.click();
                                    console.log('已选择位置:', location);
                                } else {
                                    console.log('未找到目标位置选项，请检查搜索结果');
                                }
                            } else {
                                console.log('未找到位置搜索输入框');
                            }
                        } else {
                            console.log('未找到位置选择器，请检查页面结构');
                        }
                    }
                }, inputSelector, inputValue);
            }
            else if (inputlable === '自定义4') {
                console.log('开始执行自定义4任务，输入值:', inputValue);
                try {
                    const result = await page.evaluate(async (inputValue) => {
                        const downloadContent = document.querySelector('.download-content-Lci5tL');
                        console.log('找到下载内容区域:', downloadContent);

                        if (downloadContent) {
                            const labels = downloadContent.querySelectorAll('.radio-d4zkru');
                            console.log('找到的按钮数量:', labels.length);

                            if (labels.length === 2) {
                                const labelTexts = Array.from(labels).map(label => label.textContent.trim());
                                console.log('按钮文本:', labelTexts);

                                const targetIndex = inputValue === '允许' ? 0 : 1;
                                const targetLabel = labels[targetIndex];
                                
                                // 创建完整的鼠标事件序列
                                const mouseEvents = [
                                    new MouseEvent('mouseenter', { bubbles: true, cancelable: true }),
                                    new MouseEvent('mouseover', { bubbles: true, cancelable: true }),
                                    new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
                                    new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
                                    new MouseEvent('click', { bubbles: true, cancelable: true })
                                ];

                                // 按顺序触发事件
                                mouseEvents.forEach(event => {
                                    targetLabel.dispatchEvent(event);
                                });

                                const targetInput = targetLabel.querySelector('input');
                                console.log('目标input当前状态:', targetInput.checked);
                                
                                // 直接设置input的checked状态
                                targetInput.checked = !targetInput.checked;
                                
                                // 触发input的change事件
                                targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                                
                                console.log('操作后input状态:', targetInput.checked);
                                
                                return { success: true, message: '操作完成' };
                            } else {
                                return { success: false, message: '没有找到正确数量的按钮' };
                            }
                        } else {
                            return { success: false, message: '未找到.download-content-Lci5tL元素' };
                        }
                    }, inputValue);

                    console.log('自定义4任务执行结果:', result);
                    if (!result.success) {
                        console.error('执行失败:', result.message);
                    }
                } catch (error) {
                    console.error('自定义4任务执行出错:', error);
                }
            }
            else if (inputlable === '自定义5') {
                console.log('自定义5:', inputlable);
                await page.evaluate(async (value) => {
                    console.log('自定义 5 执行:', value);
                    value = String(value);

                    // 判断是否为立即发布
                    const isImmediatePublish = value === '立即发布';
                    console.log('是否立即发布:', isImmediatePublish, '输入值:', value);
                    
                    // 获取发布选项按钮
                    const labels = document.querySelectorAll('.radio-d4zkru.one-line-pe7juM');
                    if (labels.length === 2) {
                        // 根据输入内容决定点击哪个按钮
                        const targetLabel = isImmediatePublish ? labels[0] : labels[1];
                        
                        // 检查当前状态
                        const input = targetLabel.querySelector('input');
                        const isChecked = input && input.checked;
                        
                        // 如果当前状态不是目标状态，则点击
                        if (!isChecked) {
                            console.log(`点击${isImmediatePublish ? '立即发布' : '定时发布'}按钮`);
                            targetLabel.click();
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }

                        // 如果不是立即发布，说明是定时发布，需要设置时间
                        if (!isImmediatePublish) {
                            console.log('准备设置定时发布时间');
                            // 等待时间输入框出现
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            const dateInput = document.querySelector('.semi-input');
                            if (dateInput) {
                                // 格式化日期时间字符串
                                let dateStr = value;
                                if (dateStr.includes('/')) {
                                    dateStr = dateStr.replace(/\//g, '-'); // 替换所有的/为-
                                }
                                if (dateStr.includes('  ')) {
                                    dateStr = dateStr.replace(/\s+/g, ' '); // 将多个空格替换为单个空格
                                }
                                dateStr = dateStr.trim(); // 移除首尾空格
                                
                                console.log('原始时间:', value);
                                console.log('格式化后的时间:', dateStr);
                                
                                // 先清空输入框
                                dateInput.value = '';
                                dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                                await new Promise(resolve => setTimeout(resolve, 100));
                                
                                // 设置新的值
                                dateInput.value = dateStr;
                                dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                                
                                // 触发 change 事件
                                dateInput.dispatchEvent(new Event('change', { bubbles: true }));
                                
                                // 模拟按下Enter键
                                dateInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                                dateInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
                                
                                console.log('设置发布时间:', dateStr);
                                
                                // 等待时间选择器更新
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                // 验证输入值
                                console.log('最终输入框的值:', dateInput.value);
                            } else {
                                console.error('未找到时间输入框');
                            }
                        }
                    } else {
                        console.error('未找到发布选项按钮');
                    }
                }, inputValue);
            }
            else {
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
                const allData = await getAllData(row.name, this.cityname);
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