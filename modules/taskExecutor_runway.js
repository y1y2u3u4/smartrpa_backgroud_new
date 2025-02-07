// modules/taskExecutor.js
///实现通过chatgpt+runway 实现图片生成视频
import { loadConfig } from './configManager.js';
import { OutputFactory } from './outputHandler.js';

// 1. 在文件顶部定义全局变量
let globalPromptText = '';

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
            else if (this.element.className === "mb-1 me-1") {
                clickSelector = `button[aria-label="Send prompt"]`;
            }
            else {
                clickSelector = `.${this.element.className.split(' ').join('.')}`;
            }
        }
        console.log('clickSelector:', clickSelector);
        console.log('isXPath_click:', isXPath_click);
        console.log('leixing:', this.element.leixing);
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
                            // 1. 等待元素可见和可点击
                            await page.waitForSelector(clickSelector, { 
                                visible: true, 
                                timeout: 10000  // 增加到10秒
                            });
                            
                            // 2. 确保元素在视图中
                            await page.evaluate((selector) => {
                                const element = document.querySelector(selector);
                                if (element) {
                                    element.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center'
                                    });
                                }
                            }, clickSelector);
                            
                            await page.waitForTimeout(2000);  // 增加到2秒

                            // 3. 尝试多种点击方法，每种方法点击两次
                            let clicked = false;
                            
                            // 方法1: 直点击两次
                            try {
                                // 第一次点击
                                await page.click(clickSelector, {
                                    delay: 200,  // 增加到200ms
                                    button: 'left',
                                    clickCount: 1
                                });
                                await page.waitForTimeout(2000);  // 增加到2秒
                                // 第二次点击
                                await page.click(clickSelector, {
                                    delay: 200,  // 增加到200ms
                                    button: 'left',
                                    clickCount: 1
                                });
                                clicked = true;
                            } catch (e) {
                                console.log('方法1失败:', e.message);
                            }

                            // 方法2: 使用 evaluate 点击两次
                            if (!clicked) {
                                try {
                                    await page.evaluate((selector) => {
                                        const element = document.querySelector(selector);
                                        if (element) {
                                            element.click();
                                            setTimeout(() => {
                                                element.click();
                                            }, 2000);  // 增加到2秒
                                            return true;
                                        }
                                        return false;
                                    }, clickSelector);
                                    await page.waitForTimeout(3000);  // 增加到3秒
                                    clicked = true;
                                } catch (e) {
                                    console.log('方法2失败:', e.message);
                                }
                            }

                            // 方法3: 使用 mouse 命令点击两次
                            if (!clicked) {
                                try {
                                    const elementHandle = await page.$(clickSelector);
                                    const box = await elementHandle.boundingBox();
                                    // 第一次点击
                                    await page.mouse.move(
                                        box.x + box.width / 2,
                                        box.y + box.height / 2,
                                        { steps: 10 }  // 增加移动步骤
                                    );
                                    await page.waitForTimeout(500);  // 移动后等待
                                    await page.mouse.down();
                                    await page.waitForTimeout(200);  // 增加到200ms
                                    await page.mouse.up();
                                    
                                    await page.waitForTimeout(2000);  // 增加到2秒
                                    
                                    // 第二次点击
                                    await page.mouse.down();
                                    await page.waitForTimeout(200);  // 增加到200ms
                                    await page.mouse.up();
                                    clicked = true;
                                } catch (e) {
                                    console.log('方法3失败:', e.message);
                                }
                            }

                            // 方法4: 使用 JS 点击事件点击两次
                            if (!clicked) {
                                try {
                                    await page.evaluate((selector) => {
                                        const element = document.querySelector(selector);
                                        if (element) {
                                            // 第一次点击
                                            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                                                const event = new MouseEvent(eventType, {
                                                    view: window,
                                                    bubbles: true,
                                                    cancelable: true,
                                                    buttons: 1
                                                });
                                                element.dispatchEvent(event);
                                            });
                                            
                                            // 延迟后第二次点击
                                            setTimeout(() => {
                                                ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                                                    const event = new MouseEvent(eventType, {
                                                        view: window,
                                                        bubbles: true,
                                                        cancelable: true,
                                                        buttons: 1
                                                    });
                                                    element.dispatchEvent(event);
                                                });
                                            }, 2000);  // 增加到2秒
                                        }
                                    }, clickSelector);
                                    await page.waitForTimeout(3000);  // 增加到3秒
                                    clicked = true;
                                } catch (e) {
                                    console.log('方法4失败:', e.message);
                                }
                            }

                            if (clicked) {
                                console.log(`成功点击元素两次: ${clickSelector}`);
                            } else {
                                throw new Error('所有点击方法都失败了');
                            }

                            // 等待可能的页面变化
                            await page.waitForTimeout(5000);  // 增加到5秒
                            
                            return page;
                        } catch (error) {
                            console.error(`点击元素失败: ${error.message}`);
                            return page;
                        }
                    } else {
                        console.log(`元素 ${clickSelector} 不存在，跳过点击操作`);
                        return page; 
                    }
                }


                
            } else if (this.element.leixing === '自定义1') {
                console.log('点击"刊登管理"菜单项以展开子单');
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
                    await input.uploadFile(cliclValue).catch(error => console.error('文件上传失:', error));
                    const uploadButtonSelector = '.btn';
                    await page.waitForSelector(uploadButtonSelector, { visible: true, timeout: 5000 })
                        .catch(() => console.log('上传按钮未出现'));
                    await page.click(uploadButtonSelector).catch(error => console.log(`点击上传按钮失败: ${error.message}`));
                } else {
                    console.error('未找到上传输入元素');
                }
                console.log('自定义3_done');
            } 

            else if (this.element.leixing === 'leixing_001') {
                await page.evaluate(async () => {
                    // 1. 点击上传按钮
                    const button = document.querySelector('button.flex.items-center.justify-center.h-8.w-8.rounded-lg.rounded-bl-xl');
                    if (button) {
                        button.click();
                    } else {
                        console.log('Button not found');
                    }
                });

                // 2. 理文件选择
                const [fileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.evaluate(() => document.querySelector('input[type="file"]').click())
                ]);

                // 3. 上传文件
                await fileChooser.accept([cliclValue])
                    .catch(error => console.error('文件上传失败:', error));

                // 4. 等待上传完成
                await page.waitForTimeout(10000);

                // 5. 移除可能存在的文件输入元素
                await page.evaluate(() => {
                    const fileInputs = document.querySelectorAll('input[type="file"]');
                    fileInputs.forEach(input => input.remove());
                });
                await page.evaluate(() => {
                    document.body.click();
                });
                // 修改这里：等待发送按钮变为可点击状态
                await page.waitForSelector(
                    'button[aria-label="Send prompt"][data-testid="send-button"]:not([disabled])',
                    { timeout: 120000 }
                );

                console.log('leixing_001 完成');
            } 
            else if (this.element.leixing === 'leixing_002') {
                // 先等待内容加载
                await page.waitForSelector('.overflow-y-auto.p-4 code', { timeout: 50000 });

                // 复制内容并存储到全局变量
                globalPromptText = await page.evaluate(() => {
                    try {
                        const codeElement = document.querySelector('.overflow-y-auto.p-4 code');
                        if (!codeElement) {
                            throw new Error('Code element not found');
                        }

                        const textToCopy = codeElement.textContent.trim();
                        if (!textToCopy) {
                            throw new Error('No content to copy');
                        }

                        console.log('准备复制的内容:', textToCopy.slice(0, 50) + '...');
                        return textToCopy;
                    } catch (error) {
                        console.error('Copy failed:', error);
                        return null;
                    }
                });
                
                console.log('Content stored in global variable:', globalPromptText?.slice(0, 50) + '...');

                // 输出复制结果
                if (globalPromptText) {
                    console.log('内容已成功复制到剪贴板');
                } else {
                    console.log('复制失败');
                }

                console.log('leixing_002 完成');
            }
            else if (this.element.leixing === 'leixing_004') {
                // 2. 处理文件选择和上传
                const [fileChooser] = await Promise.all([
                    page.waitForFileChooser(),
                    page.evaluate(() => document.querySelector('input[type="file"]').click())
                ]);

                // 3. 上传文件
                await fileChooser.accept([cliclValue])
                    .catch(error => console.error('文件上传失败:', error));

                // 4. 等待上传完成
                await page.waitForTimeout(2000);

                // 5. 清理文件输入元素
                await page.evaluate(() => {
                    const fileInputs = document.querySelectorAll('input[type="file"]');
                    fileInputs.forEach(input => input.remove());
                    document.body.click();
                });

                try {
                    // 等待并检查是否出现 Crop 按钮
                    const cropButtonExists = await page.evaluate(() => {
                        return new Promise((resolve) => {
                            console.log('开始检查 Crop 按钮是否存在...');

                            // 检查函数
                            function checkForCropButton() {
                                const buttons = Array.from(document.querySelectorAll('button'));
                                const cropButton = buttons.find(btn =>
                                    btn.textContent.trim().toLowerCase() === 'crop' ||
                                    btn.innerText.trim().toLowerCase() === 'crop'
                                );

                                if (cropButton) {
                                    console.log('找到 Crop 按钮:', {
                                        text: cropButton.textContent,
                                        className: cropButton.className,
                                        attributes: Array.from(cropButton.attributes)
                                            .map(attr => `${attr.name}="${attr.value}"`)
                                            .join(', ')
                                    });
                                    return true;
                                }
                                return false;
                            }

                            // 设置最大等待时间为10秒
                            const maxWaitTime = 60000;
                            const startTime = Date.now();

                            // 定期检查按钮是否出现
                            const checkInterval = setInterval(() => {
                                const exists = checkForCropButton();
                                const elapsedTime = Date.now() - startTime;

                                if (exists) {
                                    console.log(`Crop 按钮在 ${elapsedTime}ms 后出现`);
                                    clearInterval(checkInterval);
                                    resolve(true);
                                } else if (elapsedTime >= maxWaitTime) {
                                    console.log('等待 Crop 按钮超时');
                                    clearInterval(checkInterval);
                                    resolve(false);
                                }
                            }, 500); // 每500ms检查一次
                        });
                    });

                    console.log('Crop 按钮检查结果:', cropButtonExists);

                    if (cropButtonExists) {
                        let maxAttempts = 6; // 最多尝试6次，每次10秒，总共1分钟
                        let attempts = 0;
                        let buttonClicked = false;

                        while (attempts < maxAttempts && !buttonClicked) {
                            attempts++;
                            console.log(`尝试第 ${attempts}/${maxAttempts} 次点击...`);
                            
                            // 等待10秒
                            await page.waitForTimeout(10000);

                            // 检查按钮是否仍然存在并尝试点击
                            const clickResult = await page.evaluate(() => {
                                console.log('开始执行点击操作');

                                const buttons = Array.from(document.querySelectorAll('button'));
                                const cropButton = buttons.find(btn =>
                                    btn.textContent.trim().toLowerCase() === 'crop' ||
                                    btn.innerText.trim().toLowerCase() === 'crop'
                                );

                                if (!cropButton) {
                                    console.log('未找到 Crop 按钮');
                                    return { success: false, buttonExists: false };
                                }

                                try {
                                    // 方法1: 直接点击
                                    cropButton.click();
                                    console.log('方法1: 直接点击成功');

                                    // 方法2: 触发点击事件
                                    const clickEvent = new MouseEvent('click', {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    cropButton.dispatchEvent(clickEvent);
                                    console.log('方法2: 事件触发成功');

                                    return { success: true, buttonExists: true };
                                } catch (error) {
                                    console.error('点击操作失败:', error);
                                    return { success: false, buttonExists: true };
                                }
                            });

                            console.log(`第 ${attempts} 次点击结果:`, clickResult);

                            // 如果按钮不存在了，说明可能已经成功点击
                            if (!clickResult.buttonExists) {
                                console.log('Crop 按钮已消失，可能已成功点击');
                                buttonClicked = true;
                                break;
                            }

                            // 等待一小段时间观察按钮是否消失
                            await page.waitForTimeout(2000);

                            // 再次检查按钮是否存在
                            const buttonStillExists = await page.evaluate(() => {
                                const buttons = Array.from(document.querySelectorAll('button'));
                                return buttons.some(btn => 
                                    btn.textContent.trim().toLowerCase() === 'crop' ||
                                    btn.innerText.trim().toLowerCase() === 'crop'
                                );
                            });

                            if (!buttonStillExists) {
                                console.log('确认 Crop 按钮已消失，点击成功');
                                buttonClicked = true;
                                break;
                            }

                            console.log(`第 ${attempts} 次点击后按钮仍然存在，将继续尝试...`);
                        }

                        if (!buttonClicked) {
                            console.log('达到最大尝试次数，Crop 按钮点击失败');
                        }
                    } else {
                        console.log('未检测到 Crop 按钮，跳过点击操作');
                    }

                } catch (error) {
                    console.error('处理 Crop 按钮时发生错误:', error);
                }


                // 8. 等待 Generate 按钮出现并可点击
                await page.waitForSelector(
                    'button.Button-sc-c1bth8-0.Button__StyledButton-sc-c1bth8-1.gQzGCo.ExploreModeGenerateButton__Button-sc-1siz82w-0.dkrKcQ.Footer__StyledGenerateButton-sc-1tsd6ve-3.bJXJAg[data-loading="false"]',
                    { 
                        visible: true, 
                        timeout: 240000 
                    }
                );
                
                console.log('Generate 按钮已出现');
                console.log('leixing_004 完成');
            } 
            else if (this.element.leixing === 'leixing_005') {
                await page.evaluate(() => {
                    async function clickGenerateButton() {
                        const totalSubmissions = 5;
                        let successCount = 0;
                        

                        async function singleClick() {
                            try {
                                // 查找 Generate 按钮
                                const generateButton = document.querySelector('button[data-loading="false"]') ||
                                    document.querySelector('.ExploreModeGenerateButton__Button-sc-1siz82w-0');

                                if (!generateButton) {
                                    throw new Error('未找到 Generate 按钮');
                                }

                                // 检查按钮状态
                                if (generateButton.disabled || generateButton.getAttribute('data-loading') === 'true') {
                                    throw new Error('按钮已禁用或正在加载中');
                                }

                                // 创建并触发点击事件
                                const clickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true,
                                    buttons: 1
                                });

                                generateButton.dispatchEvent(clickEvent);
                                console.log(`成功提交第 ${successCount + 1} 次生成请求`);
                                
                                // 等待并处理可能出现的 Crop 按钮
                                
                                return true;

                            } catch (error) {
                                console.error(`提交失败: `, error);
                                return false;
                            }
                        }

                        while (successCount < totalSubmissions) {
                            // 等待按钮变为可用状态
                            await new Promise(resolve => {
                                const checkButton = setInterval(async () => {
                                    const button = document.querySelector('button[data-loading="false"]');
                                    if (button && !button.disabled) {
                                        clearInterval(checkButton);
                                        const success = await singleClick();
                                        if (success) {
                                            successCount++;
                                        }
                                        resolve();
                                    }
                                }, 1000); // 每秒检查一次按钮状态
                            });

                            // 如果还没有完成所有提交，等待10秒后继续
                            if (successCount < totalSubmissions) {
                                await new Promise(resolve => setTimeout(resolve, 10000));
                            }
                        }

                        console.log(`完成所有 ${totalSubmissions} 次提交`);
                        return true;
                    }

                    // 执行提交操作
                    return clickGenerateButton();
                });

                // 4. 等待生成完成
                await page.waitForTimeout(3000);
                console.log('leixing_005 完成');
            } 

            else if (this.element.leixing === '自定义4') {
                console.log('自定义4_start');
                await page.evaluate(async (cliclValue) => {
                    const searchInput = document.querySelector('input[name="text"]');
                    if (!searchInput) {
                        throw new Error('未找到搜索按钮');
                    }
                    if (searchInput) {
                        // 聚焦到输入框
                        searchInput.focus();

                        // 设置输入框的值
                        searchInput.value = cliclValue;

                        // 创建并触发 'input' 事件
                        const inputEvent = new Event('input', { bubbles: true });
                        searchInput.dispatchEvent(inputEvent);

                        // 创建并触发 'change' 事件
                        const changeEvent = new Event('change', { bubbles: true });
                        searchInput.dispatchEvent(changeEvent);

                        console.log(`已在搜索框中输入: "${cliclValue}"`);

                        // 找到包含搜索框的表单
                        const searchButton = document.querySelector('button[type="submit"]');
                        if (searchButton) {
                            // 点击搜索按钮
                            searchButton.click();
                        } else {
                            console.log('未找到搜索按钮');
                        }
                    } else {
                        console.log('未找到搜索输入框');
                    }
                }, cliclValue);

                await new Promise(resolve => setTimeout(resolve, 5000));
                console.log('自定义4_done');
            }
        } catch (error) {
            console.error('执行点击操作时发生错误:', error);
        }

        console.log('check_1');
        const newPage = await newPagePromise
        console.log('check_2');
        console.log('newPage:', newPage);
        
        // if (newPage !== null) {
        //     console.log('newPage URL:', newPage.url());
        //     await newPage.setViewport({ width: 1280, height: 720 });
        //     // 只在需要时候等待导航
        //     if (this.element.requiresNavigation) {
        //         await newPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
        //             console.log('Navigation timeout after 10 seconds');
        //         });
        //     }
        // }

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
        // else if (this.element.id && isUniqueAttribute('id', this, this.sortedData_new)) {
        //     inputSelector = `#${this.element.id}`;
        // } else if (this.element.className && isUniqueAttribute('className', this, this.sortedData_new)) {
        //     inputSelector = `.${this.element.className.split(' ').join('.')}`;
        // } 
        else if (this.element.placeholder === 'Message Runway Magic Prompt') {
            inputSelector = 'div.ProseMirror';
        } 
        
        // else if (this.element.tagName && isUniqueAttribute('tagName', this, this.sortedData_new)) {
        //     inputSelector = this.element.tagName.toLowerCase();
        // }
        
        
        else if (this.element.innerText && isUniqueAttribute('innerText', this, this.sortedData_new)) {
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
            if (this.element.leixing === 'leixing_003') {
                console.log('leixing_003_start');
                
                try {
                    // 使用全局变量中的内容
                    const textToUse = globalPromptText || this.value;
                    console.log('Using text from global variable:', textToUse?.slice(0, 50) + '...');

                    // 等待编辑器加载
                    await page.waitForSelector('.TextPromptEditor-module__textbox__YlZy9', { 
                        visible: true, 
                        timeout: 10000 
                    });

                    // 使用新的 setPromptText 函数设���文本
                    const success = await page.evaluate((inputValue) => {
                        function setPromptText(text) {
                            try {
                                // 1. 找到编辑器容器
                                const editorContainer = document.querySelector('.TextPromptEditor-module__textbox__YlZy9');
                                if (!editorContainer) {
                                    throw new Error('Editor container not found');
                                }

                                // 2. 创建新的段落内容
                                const content = `<p>${text}</p>`;

                                // 3. 设置内容
                                editorContainer.innerHTML = content;

                                // 4. 触发一系列必要的事件
                                const events = [
                                    new Event('focus', { bubbles: true }),
                                    new InputEvent('input', {
                                        bubbles: true,
                                        cancelable: true,
                                        inputType: 'insertText',
                                        data: text
                                    }),
                                    new Event('change', { bubbles: true }),
                                    new Event('blur', { bubbles: true })
                                ];

                                events.forEach(event => {
                                    editorContainer.dispatchEvent(event);
                                });

                                // 5. 移除占位符文本（如果存在）
                                const placeholder = document.querySelector('.PlaceholderText__Placeholder-sc-77ryjz-0');
                                if (placeholder) {
                                    placeholder.style.display = 'none';
                                }

                                console.log('Text set successfully:', text.slice(0, 50) + '...');
                                return true;

                            } catch (error) {
                                console.error('Failed to set text:', error);
                                console.log('Debug info:', {
                                    editorFound: !!document.querySelector('.TextPromptEditor-module__textbox__YlZy9'),
                                    editorContent: document.querySelector('.TextPromptEditor-module__textbox__YlZy9')?.innerHTML,
                                    allEditors: document.querySelectorAll('[contenteditable="true"]')
                                });
                                return false;
                            }
                        }

                        return setPromptText(inputValue);
                    }, textToUse);

                    if (!success) {
                        throw new Error('Failed to set prompt text');
                    }

                    // 等待一下确保内容已更新
                    await page.waitForTimeout(1000);
                    
                } catch (error) {
                    console.error('操作失败:', error);
                }
            }
            else {
                console.log('check001:');
                await page.evaluate(async (value) => {
                // 找到 ProseMirror 编辑器
                const textArea = document.querySelector('div.ProseMirror');
                if (!textArea) {
                    console.error('未找到 ProseMirror 编辑器');
                    return;
                }

                console.log('找到编辑器元素:', textArea);

                // 设置内容
                textArea.innerHTML = value;

                // 触发输入事件
                const inputEvent = new Event('input', { bubbles: true });
                textArea.dispatchEvent(inputEvent);

                console.log('内容已设置:', value);
            }, inputValue);

            // 等待一下确保内容已经更新
            await page.waitForTimeout(1000);
            }
        } 
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
            this.data = await page.evaluate(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        try {
                            const products = [];
                            const productCards = document.querySelectorAll('.tile-root');
                            console.log('找到的产品卡片数量:', productCards.length);

                            // const shopNameElement = document.querySelector('.x2.x7.x8.i6l_18 .tsHeadline600Large');
                            // const shopName = shopNameElement ? shopNameElement.textContent.trim() : '未找到店铺名称';
                            // console.log('店铺名称:', shopName);

                            productCards.forEach((card, index) => {
                                const product = {};
                                // product.shopName = shopName;

                                // 提取标题
                                const titleElement = card.querySelector('.tsBody500Medium');
                                product.title = titleElement ? titleElement.textContent.trim() : '未找到标题';

                                // 提取价格信息
                                const priceElement = card.querySelector('.tsHeadline500Medium');
                                product.currentPrice = priceElement ? priceElement.textContent.trim() : '未找到当前价格';

                                const oldPriceElement = card.querySelector('.tsBodyControl400Small');
                                product.oldPrice = oldPriceElement ? oldPriceElement.textContent.trim() : '未找到原价';

                                const discountElement = card.querySelector('.c3017-a2.c3017-a7.c3017-b1');
                                product.discount = discountElement ? discountElement.textContent.trim() : '未找到折扣';

                                const ratingElement = card.querySelector('.q1 span');
                                product.rating = ratingElement ? ratingElement.textContent.trim().split(' ')[0] : '未找到评分';

                                const reviewCountElement = card.querySelector('.q1 span[style="color: rgba(0, 26, 52, 0.6);"]');
                                let reviewCount = '未找到评论数';
                                if (reviewCountElement) {
                                    const reviewText = reviewCountElement.textContent.trim();
                                    const match = reviewText.match(/(\d+)/);
                                    reviewCount = match ? match[1] : reviewText;
                                }
                                product.reviewCount = reviewCount

                                const imageElement = card.querySelector('img.jr8_23');
                                product.imageUrl = imageElement ? imageElement.src : '未找到图片URL';

                                const linkElement = card.querySelector('a.js0_23');
                                product.link = linkElement ? linkElement.href : '未找到链接';

                                // 提取商ID（如果有的话）
                                const idMatch = product.link.match(/\/product\/([^\/]+)/);
                                product.id = idMatch ? idMatch[1] : '未找到ID';

                                console.log(`产品 ${index + 1}:`, product);
                                products.push(product);
                            });

                            resolve(products);
                        } catch (error) {
                            console.error('数据提取过程中出错:', error);
                            resolve([]);
                        }
                    }, 5000); // 增加延迟到5秒
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