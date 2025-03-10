// modules/taskExecutor_xiaohongshu.js
///实现通过亚马逊搜索商品获取标题
import { loadConfig } from './configManager.js';
import { OutputFactory } from './outputHandler.js';
import XLSX from 'xlsx';

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
    constructor(type, element, value, sortedData_new, task_name, cityname,user_id) {
        this.type = type;
        this.element = element;
        this.value = value;
        this.sortedData_new = sortedData_new;
        this.task_name = task_name;
        this.user_id = user_id;
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
    constructor(element, browser, task_name, cityname, user_id) {
        super('click', element, null, null, task_name, cityname, user_id);
        this.browser = browser;
        console.log('ClickTask task_name:', this.task_name);
        console.log('ClickTask cityname:', this.cityname);
        console.log('ClickTask user_id:', this.user_id);
    }
    async execute(page) {
        console.log('task_name_2:', this.task_name);
        console.log('cityname_2:', this.cityname);
        console.log('page URL:', page.url());
        const config = loadConfig('config/config.json');
        const outputHandler = OutputFactory.createOutputHandler(config.outputFormat);
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
            } 
            else if (this.element.leixing === '自定义4.1') {
                console.log('自定义4_start - 美团外卖店铺信息获取');
                try {
                    // 第一步：点击店铺设置菜单
                    console.log('正在查找并点击店铺设置...');
                    await page.waitForSelector('div.menu-item_1AO3bt i.icon-wmbmenu-shopsetting', { timeout: 10000 });
                    await page.evaluate(() => {
                        const menuItem = document.querySelector('div.menu-item_1AO3bt i.icon-wmbmenu-shopsetting').closest('div.menu-item_1AO3bt');
                        if (!menuItem) {
                            throw new Error('未找到店铺设置菜单');
                        }
                        menuItem.click();
                        console.log('已点击店铺设置菜单');
                    });
                    
                    // 等待子菜单加载
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 第二步：点击门店管理
                    console.log('正在查找并点击门店管理...');
                    await page.waitForSelector('li.sub-menu-item_12D-nq span.txt_3ycVal', { timeout: 5000 });
                    await page.evaluate(() => {
                        const subMenuItems = Array.from(document.querySelectorAll('li.sub-menu-item_12D-nq span.txt_3ycVal'));
                        const storeManagementItem = subMenuItems.find(item => item.textContent.includes('门店管理'));
                        if (!storeManagementItem) {
                            throw new Error('未找到门店管理子菜单');
                        }
                        storeManagementItem.click();
                        console.log('已点击门店管理子菜单');
                    });
                    
                    // 等待页面加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 处理可能出现的各种弹窗
                    try {
                        console.log('开始依次处理弹窗...');
            
                        // 首先检测是否有iframe
                        const checkAndGetIframe = async () => {
                            const iframes = await page.$$('iframe');
                            console.log(`在主页面上找到 ${iframes.length} 个iframe`);
                            
                            if (iframes.length > 0) {
                                // 列出iframe的一些属性便于调试
                                const iframeInfo = await page.evaluate(() => {
                                    return Array.from(document.querySelectorAll('iframe')).map(iframe => {
                                        return {
                                            id: iframe.id,
                                            name: iframe.name,
                                            src: iframe.src,
                                            class: iframe.className
                                        };
                                    });
                                });
                                
                                console.log('找到的iframe信息:', JSON.stringify(iframeInfo, null, 2));
                                
                                // 获取所有帧
                                const frames = await page.frames();
                                console.log(`总共有 ${frames.length} 个帧`);
                                
                                // 优先查找名为 hashframe 的iframe
                                let targetFrame = frames.find(f => f.name() === 'hashframe');
                                
                                // 如果没找到，则选择第一个非主帧
                                if (!targetFrame) {
                                    targetFrame = frames.find(f => f !== page.mainFrame());
                                }
                                
                                if (targetFrame) {
                                    console.log(`已定位到目标iframe: ${targetFrame.name() || '未命名'}`);
                                    return targetFrame;
                                }
                            }
                            
                            console.log('未找到iframe，将在主页面上操作');
                            return null;
                        };
                        
                        // 获取目标帧（iframe或主帧）
                        const targetFrame = await checkAndGetIframe() || page;
                        console.log(`将在${targetFrame === page ? '主页面' : 'iframe'}上执行操作`);
            
                        
                        
                        // 检查页面上是否有弹窗，使用更全面的检测方式
                        const checkForModal = async () => {
                            return await targetFrame.evaluate(() => {
                                // 输出整个页面中所有的modal和弹窗相关元素，帮助调试
                                console.log('调试: 开始检查所有可能的弹窗元素');
                                
                                // 获取所有可能是弹窗的元素
                                const allModals = document.querySelectorAll('.roo-modal, .roo-modal-dialog, [class*="Modal"], [class*="modal"]');
                                console.log(`调试: 找到 ${allModals.length} 个可能的弹窗元素`);
                                
                                // 特别检测高z-index的全屏覆盖元素（可能是弹窗背景或容器）
                                const highZIndexElements = Array.from(document.querySelectorAll('body > div'))
                                    .filter(div => {
                                        const style = window.getComputedStyle(div);
                                        const zIndex = parseInt(style.zIndex);
                                        const position = style.position;
                                        // 打印所有顶层div的z-index和定位信息
                                        console.log(`调试: 顶层div - id=${div.id}, class=${div.className}, z-index=${zIndex}, position=${position}`);
                                        return !isNaN(zIndex) && zIndex > 100 && (position === 'absolute' || position === 'fixed');
                                    });
                                console.log(`调试: 找到 ${highZIndexElements.length} 个高z-index的全屏元素`);
                                
                                // 输出每个可能的弹窗的类名和内容摘要
                                allModals.forEach((modal, index) => {
                                    console.log(`调试: 弹窗 #${index+1} 类名=${modal.className}, 内容=${modal.textContent.substring(0, 50)}...`);
                                });
                                
                                highZIndexElements.forEach((elem, index) => {
                                    console.log(`调试: 高z-index元素 #${index+1} id=${elem.id}, 类名=${elem.className}, 内容=${elem.textContent.substring(0, 50)}...`);
                                });
                                
                                // 检查所有带"我知道了"按钮的元素
                                const knowButtons = Array.from(document.querySelectorAll('button'))
                                    .filter(btn => btn.textContent.includes('我知道了'));
                                console.log(`调试: 找到 ${knowButtons.length} 个"我知道了"按钮`);
                                
                                // 检查是否有任何套餐相关的元素
                                const comboElements = document.querySelectorAll('[class*="combo"], [class*="Combo"]');
                                console.log(`调试: 找到 ${comboElements.length} 个套餐相关元素`);
                                
                                // 检查普通弹窗
                                const hasRegularModal = document.querySelector('.roo-modal') !== null;
                                
                                // 检查各种可能的套餐弹窗选择器
                                const hasComboModal = document.querySelector('[class*="comboModalWrap"]') !== null;
                                
                                // 检查弹窗中是否包含特定标题
                                const hasTitleModal = Array.from(document.querySelectorAll('.roo-modal-title'))
                                    .some(title => title.textContent.includes('新版套餐功能上线'));
                                
                                // 检查高z-index元素
                                const hasHighZIndexOverlay = highZIndexElements.length > 0;
                                
                                // 特别为用户提供的HTML代码检查特定结构
                                const hasSpecificLayout = document.querySelector('div[style*="position: absolute"][style*="z-index: 1001"]') !== null;
                                
                                // 检查按钮
                                const hasKnowButton = knowButtons.length > 0;
                                
                                console.log(`检测弹窗: 普通=${hasRegularModal}, 套餐=${hasComboModal}, 标题=${hasTitleModal}, 高z元素=${hasHighZIndexOverlay}, 特定结构=${hasSpecificLayout}, 按钮=${hasKnowButton}`);
                                
                                // 任何一种弹窗存在都返回true
                                return hasRegularModal || hasComboModal || hasTitleModal || hasKnowButton || hasHighZIndexOverlay || hasSpecificLayout || (allModals.length > 0);
                            });
                        };
                        
                        // 点击空白处或弹窗按钮关闭弹窗
                        const clickEmptySpace = async () => {
                            // 执行页面内的点击逻辑
                            return await targetFrame.evaluate(() => {
                                console.log('开始处理弹窗...');
                                
                                // 辅助函数：记录点击操作
                                const logClick = (element, description) => {
                                    console.log(`点击了 ${description}: ${element ? 
                                        (element.tagName + (element.className ? '.' + element.className : '')) : 
                                        '未知元素'}`);
                                    return true;
                                };
                                
                                // 1. 优先查找并点击所有"我知道了"按钮
                                const knowButtons = Array.from(document.querySelectorAll('button'))
                                    .filter(btn => btn.textContent.includes('我知道了'));
                                
                                if (knowButtons.length > 0) {
                                    knowButtons[0].click();
                                    return logClick(knowButtons[0], '"我知道了"按钮');
                                }
                                
                                // 2. 查找任何可能的弹窗按钮
                                const modalButtons = document.querySelectorAll('.roo-modal button, .roo-modal-dialog button, [class*="modal"] button');
                                if (modalButtons.length > 0) {
                                    // 点击第一个按钮
                                    modalButtons[0].click();
                                    return logClick(modalButtons[0], '弹窗按钮');
                                }
                                
                                // 3. 特别检查套餐相关按钮
                                const comboButtons = document.querySelectorAll('[class*="combo"] button, [class*="Combo"] button');
                                if (comboButtons.length > 0) {
                                    comboButtons[0].click();
                                    return logClick(comboButtons[0], '套餐相关按钮');
                                }
                                
                                // 4. 查找任何弹窗关闭按钮
                                const closeButtons = document.querySelectorAll('.roo-modal-close, .close, [class*="close"]');
                                if (closeButtons.length > 0) {
                                    closeButtons[0].click();
                                    return logClick(closeButtons[0], '关闭按钮');
                                }
                                
                                // 5. 检查高z-index元素 - 重新定义以解决作用域问题
                                const highZElements = Array.from(document.querySelectorAll('body > div'))
                                    .filter(div => {
                                        const style = window.getComputedStyle(div);
                                        const zIndex = parseInt(style.zIndex);
                                        const position = style.position;
                                        return !isNaN(zIndex) && zIndex > 100 && (position === 'absolute' || position === 'fixed');
                                    });
                                
                                if (highZElements.length > 0) {
                                    // 找到最高z-index的元素
                                    const topElement = highZElements.sort((a, b) => {
                                        const aZIndex = parseInt(window.getComputedStyle(a).zIndex) || 0;
                                        const bZIndex = parseInt(window.getComputedStyle(b).zIndex) || 0;
                                        return bZIndex - aZIndex;
                                    })[0];
                                    
                                    console.log(`尝试点击高z-index元素: z-index=${window.getComputedStyle(topElement).zIndex}`);
                                    
                                    // 先尝试点击该元素内的按钮
                                    const buttons = topElement.querySelectorAll('button');
                                    if (buttons.length > 0) {
                                        buttons[0].click();
                                        return logClick(buttons[0], '高z-index元素内的按钮');
                                    }
                                    
                                    // 如果没有按钮，点击元素本身
                                    topElement.click();
                                    return logClick(topElement, '高z-index元素');
                                }
                                
                                // 6. 检查特定结构元素
                                const specificElements = [
                                    'div[style*="position: absolute"][style*="z-index: 1001"]',
                                    'div[style*="z-index: 1001"]',
                                    'div[style*="position: absolute"][style*="width: 100%"][style*="top: 0px"]'
                                ];
                                
                                for (const selector of specificElements) {
                                    const element = document.querySelector(selector);
                                    if (element) {
                                        console.log(`找到匹配选择器 ${selector} 的元素`);
                                        
                                        // 检查元素内的按钮
                                        const buttons = element.querySelectorAll('button');
                                        if (buttons.length > 0) {
                                            buttons[0].click();
                                            return logClick(buttons[0], `特定元素内的按钮`);
                                        }
                                        
                                        element.click();
                                        return logClick(element, `匹配 ${selector} 的元素`);
                                    }
                                }
                                
                                // 7. 如果找不到明确的按钮，尝试点击弹窗空白处
                                const modals = document.querySelectorAll('.roo-modal, .roo-modal-dialog, [class*="modal"]');
                                if (modals.length > 0) {
                                    modals[0].click();
                                    return logClick(modals[0], '弹窗空白处');
                                }
                                
                                // 最后尝试点击页面左上角
                                console.log('找不到明确的弹窗元素，尝试点击页面左上角');
                                
                                // 创建点击事件
                                const clickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: 5,
                                    clientY: 5
                                });
                                
                                // 尝试点击页面左上角的元素
                                const element = document.elementFromPoint(5, 5);
                                if (element) {
                                    element.dispatchEvent(clickEvent);
                                    return logClick(element, '页面左上角元素');
                                }
                                
                                // 最后尝试点击document.body
                                document.body.dispatchEvent(clickEvent);
                                return logClick(document.body, 'body元素');
                            }).catch(err => {
                                console.log('点击过程中出错:', err.message);
                                return false;
                            });
                        };
                        
                        // 直接使用puppeteer的鼠标点击功能
                        const clickWithPuppeteer = async () => {
                            try {
                                // 先获取iframe的位置
                                if (targetFrame !== page) {
                                    // 如果是iframe，需要获取它在页面上的位置
                                    const framePosition = await page.evaluate(() => {
                                        const iframe = document.querySelector('iframe#hashframe') || document.querySelector('iframe');
                                        if (iframe) {
                                            const rect = iframe.getBoundingClientRect();
                                            return {
                                                x: rect.left + 5, // 在iframe内偏移5像素
                                                y: rect.top + 5  // 在iframe内偏移5像素
                                            };
                                        }
                                        return null;
                                    });
                                    
                                    if (framePosition) {
                                        console.log(`在iframe位置点击: x=${framePosition.x}, y=${framePosition.y}`);
                                        await page.mouse.click(framePosition.x, framePosition.y);
                                    } else {
                                        // 如果无法获取iframe位置，就在左上角点击
                                        console.log('无法获取iframe位置，在页面左上角点击');
                                        await page.mouse.click(5, 5);
                                    }
                                } else {
                                    // 如果是主页面，直接点击
                                    await page.mouse.click(5, 5);
                                    console.log('在主页面上点击坐标(5,5)');
                                }
                                return true;
                            } catch (err) {
                                console.log('Puppeteer点击失败:', err.message);
                                return false;
                            }
                        };
                        
                        
                        // 等待按钮点击后的反应
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // 依次处理每个弹窗
                        const requiredClicks = 3; // 需要处理的弹窗数量
                        let clickCount = 0;
                        let startTime = Date.now();
                        const maxWaitTime = 20000; // 最多等待20秒
                        
                        while (clickCount < requiredClicks) {
                            // 检查是否超时
                            if (Date.now() - startTime > maxWaitTime) {
                                console.log(`等待超过${maxWaitTime/1000}秒，停止等待更多弹窗`);
                                break;
                            }
                            
                            console.log(`尝试处理第 ${clickCount + 1} 个弹窗...`);
                            
                            // 检查是否有弹窗
                            const modalExists = await checkForModal();
                            if (!modalExists) {
                                console.log(`没有找到第 ${clickCount + 1} 个弹窗，等待...`);
                                
                                // 如果已经点击了至少一个弹窗，但找不到更多，可能已经处理完成
                                if (clickCount > 0) {
                                    console.log('已处理至少一个弹窗，但没有找到更多，可能已经完成');
                                    // 尝试再次点击，以防有未检测到的弹窗
                                    await clickWithPuppeteer();
                                    clickCount++;
                                }
                                
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue;
                            }
                            
                            console.log(`找到第 ${clickCount + 1} 个弹窗，开始处理...`);
                            
                            // 尝试智能点击
                            let clicked = await clickEmptySpace();
                            
                            // 如果智能点击失败，尝试使用puppeteer直接点击
                            if (!clicked) {
                                console.log('智能点击失败，尝试使用Puppeteer直接点击');
                                clicked = await clickWithPuppeteer();
                            }
                            
                            if (clicked) {
                                clickCount++;
                                console.log(`成功处理了 ${clickCount} 个弹窗`);
                                // 等待下一个弹窗出现或当前弹窗完全消失
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            } else {
                                console.log('所有点击方法均失败，等待后重试');
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                        }
                        
                        console.log(`已完成弹窗处理，共处理了 ${clickCount} 个弹窗`);
                        
                        // 最后处理关闭按钮
                        console.log('尝试处理最后的关闭按钮...');
                        await targetFrame.evaluate(() => {
                            const closeButton = document.querySelector('button.close[data-dismiss="roo-modal"]');
                            if (closeButton) {
                                console.log('找到关闭按钮，点击它');
                                closeButton.click();
                                return true;
                            }
                            console.log('未找到关闭按钮');
                            return false;
                        });
                        
                        // 等待关闭按钮点击后的反应
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (modalError) {
                        console.log('弹窗处理过程中出现错误，继续执行:', modalError.message);
                        // 尝试直接点击几次，作为错误恢复策略
                        try {
                            for (let i = 0; i < 3; i++) {
                                await page.mouse.click(5, 5);
                                await new Promise(resolve => setTimeout(resolve, 1500));
                            }
                        } catch (finalError) {
                            console.log('最终恢复策略也失败:', finalError.message);
                        }
                    }
            
                    
                    // 等待页面内容加载完成
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 收集所有店铺信息
                    console.log('开始收集店铺信息...');
                    
                    // 重新获取iframe
                    const frames = await page.frames();
                    const targetFrame = frames.find(f => f.name() === 'hashframe') || 
                                      frames.find(f => f !== page.mainFrame());
                    
                    if (!targetFrame) {
                        console.log('警告: 无法找到iframe，将在主页面上获取数据');
                    } else {
                        console.log(`在iframe [${targetFrame.name() || '未命名'}] 中获取数据`);
                    }
                    
                    // 使用正确的frame执行评估函数
                    const frameToUse = targetFrame || page;
                    
                    this.data = await frameToUse.evaluate(async () => {
                        // 提取店铺基本信息
                        const storeInfo = {};
                        
                        // 查找门店名称和ID
                        const poiNameElement = document.querySelector('.poi-name');
                        if (poiNameElement) {
                            // 提取名称和ID
                            const fullText = poiNameElement.textContent.trim();
                            const nameMatch = fullText.match(/(.*?)(?=\s*门店ID：|$)/);
                            const idMatch = fullText.match(/门店ID：(\d+)/);
                            
                            if (nameMatch) storeInfo.name = nameMatch[1].trim();
                            if (idMatch) storeInfo.id = idMatch[1];
                        }
                        
                        // 提取地址
                        const addressElement = document.querySelector('.mb5.color-999');
                        if (addressElement) {
                            const addressText = addressElement.textContent.trim();
                            if (addressText.startsWith('地址：')) {
                                storeInfo.address = addressText.replace('地址：', '').trim();
                            }
                        }
                        
                        // 提取链接
                        const linkElement = document.querySelector('.color-999 a.color-link');
                        if (linkElement) {
                            storeInfo.link = linkElement.href;
                        }
                        
                        // 获取店铺商标/图片
                        const logoImgElement = document.querySelector('.img-uploader-thumbnail-img, .uploader-thumbnail-img');
                        if (logoImgElement) {
                            storeInfo.logo = logoImgElement.src;
                        }
                        
                        // 获取其他可能的店铺信息
                        const panelBodies = document.querySelectorAll('.panel-body');
                        const additionalInfo = {};
                        
                        // 明确提取餐厅电话信息
                        const phoneElements = document.querySelectorAll('.items-group');
                        phoneElements.forEach(element => {
                            const titleElement = element.querySelector('.items-group-title');
                            if (titleElement && titleElement.textContent.trim() === '餐厅电话') {
                                const phoneElement = element.querySelector('.basic-info span.color-666');
                                if (phoneElement) {
                                    storeInfo.phone = phoneElement.textContent.trim();
                                    console.log('获取到餐厅电话:', storeInfo.phone);
                                }
                            }
                        });
                        
                        panelBodies.forEach(panel => {
                            // 提取面板中的标题和内容
                            const titleElement = panel.querySelector('.items-group-title');
                            const contentElement = panel.querySelector('.basic-info span.color-666');
                            
                            if (titleElement && contentElement) {
                                const title = titleElement.textContent.trim();
                                const content = contentElement.textContent.trim();
                                additionalInfo[title] = content;
                                
                                // 如果在附加信息中找到餐厅电话，也单独保存
                                if (title === '餐厅电话' && !storeInfo.phone) {
                                    storeInfo.phone = content;
                                    console.log('从附加信息中获取到餐厅电话:', storeInfo.phone);
                                }
                            }
                        });
                        
                        if (Object.keys(additionalInfo).length > 0) {
                            storeInfo.additionalInfo = additionalInfo;
                        }
                        
                        // 获取所有商品分类（如果有）
                        const categories = [];
                        const categoryElements = document.querySelectorAll('.tag-item_1KIyLi');
                        if (categoryElements && categoryElements.length > 0) {
                            categoryElements.forEach(item => {
                                const nameElement = item.querySelector('.name_1LJueu');
                                if (nameElement) {
                                    categories.push(nameElement.textContent.trim());
                                }
                            });
                        }
                        
                        if (categories.length > 0) {
                            storeInfo.categories = categories;
                        }
                        
                        return {
                            storeInfo: storeInfo,
                            timestamp: new Date().toISOString(),
                            platform: '美团外卖',
                            source: '门店管理页面'
                        };
                    });
                    
                    console.log(`店铺信息收集完成! 店铺名称: ${this.data.storeInfo?.name || '未知'}, ID: ${this.data.storeInfo?.id || '未知'}`);
                    
                    if (this.data && this.data.storeInfo) {
                        outputHandler.handle(this.data, 'output_waimai', this.task_name, "店铺信息", this.user_id, this.tuiguang_phonenumber);
                        console.log('店铺数据已成功保存');
                    } else {
                        console.log('没有提取到店铺数据或数据为空');
                    }
                    
                } catch (error) {
                    console.error('美团外卖店铺信息获取失败:', error.message);
                    throw error;
                }
            }

            else if (this.element.leixing === '自定义4.2') {
                console.log('自定义4_start - 美团外卖商品获取');
                try {
                    // 第一步：点击商品管理
                    console.log('正在查找并点击商品管理...');
                    await page.waitForSelector('div.menu-item_1AO3bt i.icon-wmbmenu-productmanage', { timeout: 10000 });
                    await page.evaluate(() => {
                        const menuItem = document.querySelector('div.menu-item_1AO3bt i.icon-wmbmenu-productmanage').closest('div.menu-item_1AO3bt');
                        if (!menuItem) {
                            throw new Error('未找到商品管理菜单');
                        }
                        menuItem.click();
                        console.log('已点击商品管理菜单');
                    });
                    
                    // 等待子菜单加载
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 第二步：点击商品列表
                    console.log('正在查找并点击商品列表...');
                    await page.waitForSelector('li.sub-menu-item_12D-nq span.txt_3ycVal', { timeout: 5000 });
                    await page.evaluate(() => {
                        const subMenuItems = Array.from(document.querySelectorAll('li.sub-menu-item_12D-nq span.txt_3ycVal'));
                        const productListItem = subMenuItems.find(item => item.textContent.includes('商品列表'));
                        if (!productListItem) {
                            throw new Error('未找到商品列表子菜单');
                        }
                        productListItem.click();
                        console.log('已点击商品列表子菜单');
                    });
                    
                    // 等待页面加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 处理可能出现的各种弹窗
                    try {
                        console.log('开始依次处理弹窗...');
            
                        // 首先检测是否有iframe
                        const checkAndGetIframe = async () => {
                            const iframes = await page.$$('iframe');
                            console.log(`在主页面上找到 ${iframes.length} 个iframe`);
                            
                            if (iframes.length > 0) {
                                // 列出iframe的一些属性便于调试
                                const iframeInfo = await page.evaluate(() => {
                                    return Array.from(document.querySelectorAll('iframe')).map(iframe => {
                                        return {
                                            id: iframe.id,
                                            name: iframe.name,
                                            src: iframe.src,
                                            class: iframe.className
                                        };
                                    });
                                });
                                
                                console.log('找到的iframe信息:', JSON.stringify(iframeInfo, null, 2));
                                
                                // 获取所有帧
                                const frames = await page.frames();
                                console.log(`总共有 ${frames.length} 个帧`);
                                
                                // 优先查找名为 hashframe 的iframe
                                let targetFrame = frames.find(f => f.name() === 'hashframe');
                                
                                // 如果没找到，则选择第一个非主帧
                                if (!targetFrame) {
                                    targetFrame = frames.find(f => f !== page.mainFrame());
                                }
                                
                                if (targetFrame) {
                                    console.log(`已定位到目标iframe: ${targetFrame.name() || '未命名'}`);
                                    return targetFrame;
                                }
                            }
                            
                            console.log('未找到iframe，将在主页面上操作');
                            return null;
                        };
                        
                        // 获取目标帧（iframe或主帧）
                        const targetFrame = await checkAndGetIframe() || page;
                        console.log(`将在${targetFrame === page ? '主页面' : 'iframe'}上执行操作`);
            
                        
                        
                        // 检查页面上是否有弹窗，使用更全面的检测方式
                        const checkForModal = async () => {
                            return await targetFrame.evaluate(() => {
                                // 输出整个页面中所有的modal和弹窗相关元素，帮助调试
                                console.log('调试: 开始检查所有可能的弹窗元素');
                                
                                // 获取所有可能是弹窗的元素
                                const allModals = document.querySelectorAll('.roo-modal, .roo-modal-dialog, [class*="Modal"], [class*="modal"]');
                                console.log(`调试: 找到 ${allModals.length} 个可能的弹窗元素`);
                                
                                // 特别检测高z-index的全屏覆盖元素（可能是弹窗背景或容器）
                                const highZIndexElements = Array.from(document.querySelectorAll('body > div'))
                                    .filter(div => {
                                        const style = window.getComputedStyle(div);
                                        const zIndex = parseInt(style.zIndex);
                                        const position = style.position;
                                        // 打印所有顶层div的z-index和定位信息
                                        console.log(`调试: 顶层div - id=${div.id}, class=${div.className}, z-index=${zIndex}, position=${position}`);
                                        return !isNaN(zIndex) && zIndex > 100 && (position === 'absolute' || position === 'fixed');
                                    });
                                console.log(`调试: 找到 ${highZIndexElements.length} 个高z-index的全屏元素`);
                                
                                // 输出每个可能的弹窗的类名和内容摘要
                                allModals.forEach((modal, index) => {
                                    console.log(`调试: 弹窗 #${index+1} 类名=${modal.className}, 内容=${modal.textContent.substring(0, 50)}...`);
                                });
                                
                                highZIndexElements.forEach((elem, index) => {
                                    console.log(`调试: 高z-index元素 #${index+1} id=${elem.id}, 类名=${elem.className}, 内容=${elem.textContent.substring(0, 50)}...`);
                                });
                                
                                // 检查所有带"我知道了"按钮的元素
                                const knowButtons = Array.from(document.querySelectorAll('button'))
                                    .filter(btn => btn.textContent.includes('我知道了'));
                                console.log(`调试: 找到 ${knowButtons.length} 个"我知道了"按钮`);
                                
                                // 检查是否有任何套餐相关的元素
                                const comboElements = document.querySelectorAll('[class*="combo"], [class*="Combo"]');
                                console.log(`调试: 找到 ${comboElements.length} 个套餐相关元素`);
                                
                                // 检查普通弹窗
                                const hasRegularModal = document.querySelector('.roo-modal') !== null;
                                
                                // 检查各种可能的套餐弹窗选择器
                                const hasComboModal = document.querySelector('[class*="comboModalWrap"]') !== null;
                                
                                // 检查弹窗中是否包含特定标题
                                const hasTitleModal = Array.from(document.querySelectorAll('.roo-modal-title'))
                                    .some(title => title.textContent.includes('新版套餐功能上线'));
                                
                                // 检查高z-index元素
                                const hasHighZIndexOverlay = highZIndexElements.length > 0;
                                
                                // 特别为用户提供的HTML代码检查特定结构
                                const hasSpecificLayout = document.querySelector('div[style*="position: absolute"][style*="z-index: 1001"]') !== null;
                                
                                // 检查按钮
                                const hasKnowButton = knowButtons.length > 0;
                                
                                console.log(`检测弹窗: 普通=${hasRegularModal}, 套餐=${hasComboModal}, 标题=${hasTitleModal}, 高z元素=${hasHighZIndexOverlay}, 特定结构=${hasSpecificLayout}, 按钮=${hasKnowButton}`);
                                
                                // 任何一种弹窗存在都返回true
                                return hasRegularModal || hasComboModal || hasTitleModal || hasKnowButton || hasHighZIndexOverlay || hasSpecificLayout || (allModals.length > 0);
                            });
                        };
                        
                        // 点击空白处或弹窗按钮关闭弹窗
                        const clickEmptySpace = async () => {
                            // 执行页面内的点击逻辑
                            return await targetFrame.evaluate(() => {
                                console.log('开始处理弹窗...');
                                
                                // 辅助函数：记录点击操作
                                const logClick = (element, description) => {
                                    console.log(`点击了 ${description}: ${element ? 
                                        (element.tagName + (element.className ? '.' + element.className : '')) : 
                                        '未知元素'}`);
                                    return true;
                                };
                                
                                // 1. 优先查找并点击所有"我知道了"按钮
                                const knowButtons = Array.from(document.querySelectorAll('button'))
                                    .filter(btn => btn.textContent.includes('我知道了'));
                                
                                if (knowButtons.length > 0) {
                                    knowButtons[0].click();
                                    return logClick(knowButtons[0], '"我知道了"按钮');
                                }
                                
                                // 2. 查找任何可能的弹窗按钮
                                const modalButtons = document.querySelectorAll('.roo-modal button, .roo-modal-dialog button, [class*="modal"] button');
                                if (modalButtons.length > 0) {
                                    // 点击第一个按钮
                                    modalButtons[0].click();
                                    return logClick(modalButtons[0], '弹窗按钮');
                                }
                                
                                // 3. 特别检查套餐相关按钮
                                const comboButtons = document.querySelectorAll('[class*="combo"] button, [class*="Combo"] button');
                                if (comboButtons.length > 0) {
                                    comboButtons[0].click();
                                    return logClick(comboButtons[0], '套餐相关按钮');
                                }
                                
                                // 4. 查找任何弹窗关闭按钮
                                const closeButtons = document.querySelectorAll('.roo-modal-close, .close, [class*="close"]');
                                if (closeButtons.length > 0) {
                                    closeButtons[0].click();
                                    return logClick(closeButtons[0], '关闭按钮');
                                }
                                
                                // 5. 检查高z-index元素 - 重新定义以解决作用域问题
                                const highZElements = Array.from(document.querySelectorAll('body > div'))
                                    .filter(div => {
                                        const style = window.getComputedStyle(div);
                                        const zIndex = parseInt(style.zIndex);
                                        const position = style.position;
                                        return !isNaN(zIndex) && zIndex > 100 && (position === 'absolute' || position === 'fixed');
                                    });
                                
                                if (highZElements.length > 0) {
                                    // 找到最高z-index的元素
                                    const topElement = highZElements.sort((a, b) => {
                                        const aZIndex = parseInt(window.getComputedStyle(a).zIndex) || 0;
                                        const bZIndex = parseInt(window.getComputedStyle(b).zIndex) || 0;
                                        return bZIndex - aZIndex;
                                    })[0];
                                    
                                    console.log(`尝试点击高z-index元素: z-index=${window.getComputedStyle(topElement).zIndex}`);
                                    
                                    // 先尝试点击该元素内的按钮
                                    const buttons = topElement.querySelectorAll('button');
                                    if (buttons.length > 0) {
                                        buttons[0].click();
                                        return logClick(buttons[0], '高z-index元素内的按钮');
                                    }
                                    
                                    // 如果没有按钮，点击元素本身
                                    topElement.click();
                                    return logClick(topElement, '高z-index元素');
                                }
                                
                                // 6. 检查特定结构元素
                                const specificElements = [
                                    'div[style*="position: absolute"][style*="z-index: 1001"]',
                                    'div[style*="z-index: 1001"]',
                                    'div[style*="position: absolute"][style*="width: 100%"][style*="top: 0px"]'
                                ];
                                
                                for (const selector of specificElements) {
                                    const element = document.querySelector(selector);
                                    if (element) {
                                        console.log(`找到匹配选择器 ${selector} 的元素`);
                                        
                                        // 检查元素内的按钮
                                        const buttons = element.querySelectorAll('button');
                                        if (buttons.length > 0) {
                                            buttons[0].click();
                                            return logClick(buttons[0], `特定元素内的按钮`);
                                        }
                                        
                                        element.click();
                                        return logClick(element, `匹配 ${selector} 的元素`);
                                    }
                                }
                                
                                // 7. 如果找不到明确的按钮，尝试点击弹窗空白处
                                const modals = document.querySelectorAll('.roo-modal, .roo-modal-dialog, [class*="modal"]');
                                if (modals.length > 0) {
                                    modals[0].click();
                                    return logClick(modals[0], '弹窗空白处');
                                }
                                
                                // 6. 最后尝试点击页面左上角
                                console.log('找不到明确的弹窗元素，尝试点击页面左上角');
                                
                                // 创建点击事件
                                const clickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: 5,
                                    clientY: 5
                                });
                                
                                // 尝试点击页面左上角的元素
                                const element = document.elementFromPoint(5, 5);
                                if (element) {
                                    element.dispatchEvent(clickEvent);
                                    return logClick(element, '页面左上角元素');
                                }
                                
                                // 最后尝试点击document.body
                                document.body.dispatchEvent(clickEvent);
                                return logClick(document.body, 'body元素');
                            }).catch(err => {
                                console.log('点击过程中出错:', err.message);
                                return false;
                            });
                        };
                        
                        // 直接使用puppeteer的鼠标点击功能
                        const clickWithPuppeteer = async () => {
                            try {
                                // 先获取iframe的位置
                                if (targetFrame !== page) {
                                    // 如果是iframe，需要获取它在页面上的位置
                                    const framePosition = await page.evaluate(() => {
                                        const iframe = document.querySelector('iframe#hashframe') || document.querySelector('iframe');
                                        if (iframe) {
                                            const rect = iframe.getBoundingClientRect();
                                            return {
                                                x: rect.left + 5, // 在iframe内偏移5像素
                                                y: rect.top + 5  // 在iframe内偏移5像素
                                            };
                                        }
                                        return null;
                                    });
                                    
                                    if (framePosition) {
                                        console.log(`在iframe位置点击: x=${framePosition.x}, y=${framePosition.y}`);
                                        await page.mouse.click(framePosition.x, framePosition.y);
                                    } else {
                                        // 如果无法获取iframe位置，就在左上角点击
                                        console.log('无法获取iframe位置，在页面左上角点击');
                                        await page.mouse.click(5, 5);
                                    }
                                } else {
                                    // 如果是主页面，直接点击
                                    await page.mouse.click(5, 5);
                                    console.log('在主页面上点击坐标(5,5)');
                                }
                                return true;
                            } catch (err) {
                                console.log('Puppeteer点击失败:', err.message);
                                return false;
                            }
                        };
                        
                        
                        // 等待按钮点击后的反应
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // 依次处理每个弹窗
                        const requiredClicks = 3; // 需要处理的弹窗数量
                        let clickCount = 0;
                        let startTime = Date.now();
                        const maxWaitTime = 20000; // 最多等待20秒
                        
                        while (clickCount < requiredClicks) {
                            // 检查是否超时
                            if (Date.now() - startTime > maxWaitTime) {
                                console.log(`等待超过${maxWaitTime/1000}秒，停止等待更多弹窗`);
                                break;
                            }
                            
                            console.log(`尝试处理第 ${clickCount + 1} 个弹窗...`);
                            
                            // 检查是否有弹窗
                            const modalExists = await checkForModal();
                            if (!modalExists) {
                                console.log(`没有找到第 ${clickCount + 1} 个弹窗，等待...`);
                                
                                // 如果已经点击了至少一个弹窗，但找不到更多，可能已经处理完成
                                if (clickCount > 0) {
                                    console.log('已处理至少一个弹窗，但没有找到更多，可能已经完成');
                                    // 尝试再次点击，以防有未检测到的弹窗
                                    await clickWithPuppeteer();
                                    clickCount++;
                                }
                                
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue;
                            }
                            
                            console.log(`找到第 ${clickCount + 1} 个弹窗，开始处理...`);
                            
                            // 尝试智能点击
                            let clicked = await clickEmptySpace();
                            
                            // 如果智能点击失败，尝试使用puppeteer直接点击
                            if (!clicked) {
                                console.log('智能点击失败，尝试使用Puppeteer直接点击');
                                clicked = await clickWithPuppeteer();
                            }
                            
                            if (clicked) {
                                clickCount++;
                                console.log(`成功处理了 ${clickCount} 个弹窗`);
                                // 等待下一个弹窗出现或当前弹窗完全消失
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            } else {
                                console.log('所有点击方法均失败，等待后重试');
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                        }
                        
                        console.log(`已完成弹窗处理，共处理了 ${clickCount} 个弹窗`);
                        
                        // 最后处理关闭按钮
                        console.log('尝试处理最后的关闭按钮...');
                        await targetFrame.evaluate(() => {
                            const closeButton = document.querySelector('button.close[data-dismiss="roo-modal"]');
                            if (closeButton) {
                                console.log('找到关闭按钮，点击它');
                                closeButton.click();
                                return true;
                            }
                            console.log('未找到关闭按钮');
                            return false;
                        });
                        
                        // 等待关闭按钮点击后的反应
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (modalError) {
                        console.log('弹窗处理过程中出现错误，继续执行:', modalError.message);
                        // 尝试直接点击几次，作为错误恢复策略
                        try {
                            for (let i = 0; i < 3; i++) {
                                await page.mouse.click(5, 5);
                                await new Promise(resolve => setTimeout(resolve, 1500));
                            }
                        } catch (finalError) {
                            console.log('最终恢复策略也失败:', finalError.message);
                        }
                    }
            
                    
                    // 等待页面内容加载完成
            
            
                    // 刷新页面
                    console.log('刷新页面...');
                    await page.reload({ waitUntil: 'networkidle0' });
                    console.log('页面刷新完成');
            
                    // 等待页面加载
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    // 收集所有分类和商品数据
                    console.log('开始收集商品分类和商品数据...');
                    
                    // 重新获取iframe
                    const frames = await page.frames();
                    const targetFrame = frames.find(f => f.name() === 'hashframe') || 
                                      frames.find(f => f !== page.mainFrame());
                    
                    if (!targetFrame) {
                        console.log('警告: 无法找到iframe，将在主页面上获取数据');
                    } else {
                        console.log(`在iframe [${targetFrame.name() || '未命名'}] 中获取数据`);
                    }
                    
                    // 使用正确的frame执行评估函数
                    const frameToUse = targetFrame || page;
                    
                    // 1. 获取所有分类
                    const categories = await frameToUse.evaluate(() => {
                        return Array.from(document.querySelectorAll('.tag-item_1KIyLi')).map(item => {
                            const nameElement = item.querySelector('.name_1LJueu');
                            const countElement = item.querySelector('.count-info_2EQ9Mk');
                            return {
                                name: nameElement ? nameElement.textContent.trim() : 'unknown',
                                count: countElement ? countElement.textContent.replace(/[()]/g, '').trim() : '0'
                            };
                        });
                    });
            
                    const allProducts = [];
            
                // 2. 逐个处理分类
                for (let i = 0; i < categories.length; i++) {
                    try {
                        const category = categories[i];
                        console.log(`正在处理分类: ${category.name}, 预计商品数: ${category.count}`);
                        
                        // 2.1 点击分类
                        try {
                            await frameToUse.evaluate((index) => {
                                const tags = document.querySelectorAll('.tag-item_1KIyLi');
                                if (tags[index]) {
                                    tags[index].click();
                                }
                            }, i);
                        } catch (error) {
                            console.error(`点击分类时出错: ${error.message}，继续执行`);
                        }
                        
                        // 等待加载
                        await frameToUse.waitForTimeout(3000);
                        
                        // 2.2 执行滚动加载
                        try {
                            await frameToUse.evaluate(() => {
                                return new Promise((resolve) => {
                                    const scrollStep = 400;
                                    let currentPosition = 0;
                                    let scrollCount = 0;
                                    
                                    const scrollInterval = setInterval(() => {
                                        currentPosition += scrollStep;
                                        window.scrollTo({
                                            top: currentPosition,
                                            behavior: 'smooth'
                                        });
                                        
                                        scrollCount++;
                                        if (scrollCount >= 10) {
                                            clearInterval(scrollInterval);
                                            window.scrollTo(0, 0);
                                            resolve();
                                        }
                                    }, 1200);
                                });
                            });
                        } catch (error) {
                            console.error(`滚动加载时出错: ${error.message}，继续执行`);
                        }
                        
                        // 2.3 获取总页数
                        let totalPages = 1;
                        try {
                            totalPages = await frameToUse.evaluate(() => {
                                try {
                                    const hasPagination = document.querySelector('.pagination-wrap_2TyJ2R') !== null;
                                    if (!hasPagination) return 1;
                                    
                                    const pageItems = Array.from(document.querySelectorAll('.roo-pagination li:not(.arrow)'));
                                    const pageNumbers = pageItems
                                        .map(item => {
                                            const text = item.textContent.trim();
                                            return isNaN(parseInt(text)) ? 0 : parseInt(text);
                                        })
                                        .filter(num => num > 0);
                                    
                                    return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
                                } catch (error) {
                                    return 1;
                                }
                            });
                        } catch (error) {
                            console.error(`获取总页数时出错: ${error.message}，默认为1页`);
                        }
                        
                        // 2.4 逐页处理
                        let currentCategory = category && category.name ? category.name : "未知分类";
                        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
                            try {
                                console.log(`正在处理分类 ${currentCategory} 的第 ${currentPage}/${totalPages} 页...`);
                                
                                // 如果不是第一页，点击翻页
                                if (currentPage > 1) {
                                    let pageChanged = false;
                                    try {
                                        pageChanged = await frameToUse.evaluate((page) => {
                                            try {
                                                const specificPageBtn = Array.from(document.querySelectorAll('.roo-pagination li:not(.arrow)'))
                                                    .find(item => item.textContent.trim() === page.toString());
                                                
                                                if (specificPageBtn) {
                                                    specificPageBtn.click();
                                                    return true;
                                                } else {
                                                    const nextPageBtn = document.querySelector('.roo-pagination li.arrow:not(.disabled) a');
                                                    if (nextPageBtn) {
                                                        nextPageBtn.click();
                                                        return true;
                                                    }
                                                }
                                                return false;
                                            } catch (error) {
                                                return false;
                                            }
                                        }, currentPage);
                                    } catch (error) {
                                        console.error(`翻页操作出错: ${error.message}，继续执行`);
                                    }
                                    
                                    if (!pageChanged) {
                                        console.log('无法翻页，但将继续尝试处理当前页');
                                    }
                                    
                                    // 等待页面加载
                                    await frameToUse.waitForTimeout(2500);
                                    
                                    // 执行滚动
                                    try {
                                        await frameToUse.evaluate(() => {
                                            return new Promise((resolve) => {
                                                const scrollStep = 400;
                                                let currentPosition = 0;
                                                let scrollCount = 0;
                                                
                                                const scrollInterval = setInterval(() => {
                                                    currentPosition += scrollStep;
                                                    window.scrollTo({
                                                        top: currentPosition,
                                                        behavior: 'smooth'
                                                    });
                                                    
                                                    scrollCount++;
                                                    if (scrollCount >= 10) {
                                                        clearInterval(scrollInterval);
                                                        window.scrollTo(0, 0);
                                                        resolve();
                                                    }
                                                }, 1200);
                                            });
                                        });
                                    } catch (error) {
                                        console.error(`滚动页面时出错: ${error.message}，继续执行`);
                                    }
                                }
                                
                                // 2.5 提取当前页商品数据
                                let pageProducts = [];
                                try {
                                    pageProducts = await frameToUse.evaluate((currentCategoryParam) => {
                                        console.log('开始提取商品数据...');
                                        const currentCategory = currentCategoryParam || "未知分类";
                                        
                                        // 尝试多种可能的商品卡片选择器
                                        const selectors = [
                                            '.product-card_3h3efl',
                                            '.item-card_2VWbNS',
                                            '.product-item',
                                            '[class*="product-card"]',
                                            '[class*="item-card"]',
                                            '.food-card',
                                            '.dish-item'
                                        ];
                                        
                                        let productElements = [];
                                        let usedSelector = '';
                                        
                                        // 尝试所有可能的选择器
                                        for (const selector of selectors) {
                                            const elements = document.querySelectorAll(selector);
                                            console.log(`选择器 "${selector}" 匹配了 ${elements.length} 个元素`);
                                            
                                            if (elements.length > 0) {
                                                productElements = Array.from(elements);
                                                usedSelector = selector;
                                                break;
                                            }
                                        }
                                        
                                        if (productElements.length === 0) {
                                            console.log('未找到任何商品元素，输出页面结构以帮助调试:');
                                            // 输出页面中的一些关键元素
                                            const bodyClasses = document.body.className;
                                            const mainContainers = document.querySelectorAll('div[class*="container"]').length;
                                            console.log(`Body类名: ${bodyClasses}, 主容器数量: ${mainContainers}`);
                                            console.log(`页面HTML片段: ${document.body.innerHTML.substring(0, 500)}`);
                                            return [];
                                        }
                                        
                                        console.log(`使用选择器 "${usedSelector}" 找到 ${productElements.length} 个商品`);
                                        
                                        // 根据找到的选择器调整数据提取逻辑
                                        return productElements.map((card, index) => {
                                            try {
                                                console.log(`提取第 ${index+1} 个商品数据`);
                                                
                                                // 尝试多种可能的名称选择器
                                                let name = '未知商品';
                                                const nameSelectors = [
                                                    '.title_1jeSVk input.roo-input',
                                                    '.title input',
                                                    '[class*="title"] input',
                                                    '[class*="name"]',
                                                    '[class*="title"]'
                                                ];
                                                
                                                for (const selector of nameSelectors) {
                                                    const element = card.querySelector(selector);
                                                    if (element) {
                                                        name = element.value || element.textContent.trim();
                                                        if (name) break;
                                                    }
                                                }
                                                
                                                // 尝试多种可能的价格选择器
                                                let price = '0';
                                                const priceSelectors = [
                                                    '.price_2yPEAp span',
                                                    '[class*="price"] span',
                                                    '[class*="price"]'
                                                ];
                                                
                                                for (const selector of priceSelectors) {
                                                    const element = card.querySelector(selector);
                                                    if (element) {
                                                        price = element.textContent.trim();
                                                        if (price) break;
                                                    }
                                                }
                                                
                                                // 尝试获取图片
                                                let imgSrc = '';
                                                const img = card.querySelector('img');
                                                if (img) imgSrc = img.src || '';
                                                
                                                return {
                                                    category: currentCategory,
                                                    name,
                                                    price,
                                                    image: imgSrc
                                                };
                                            } catch (error) {
                                                console.log(`提取商品 ${index+1} 数据时出错: ${error.message}`);
                                                return {
                                                    category: currentCategory,
                                                    name: '提取错误',
                                                    price: '0',
                                                    image: '',
                                                    error: error.message
                                                };
                                            }
                                        });
                                    }, currentCategory);
                                } catch (error) {
                                    console.error(`提取商品数据时出错: ${error.message}，继续执行`);
                                    pageProducts = [];
                                }
                                
                                try {
                                    if (pageProducts && pageProducts.length > 0 && pageProducts[0]) {
                                        console.log(`第一个商品分类: ${pageProducts[0].category || '未知'}`);
                                    }
                                    console.log(`从分类 ${currentCategory} 第 ${currentPage} 页提取到 ${pageProducts.length} 个商品`);
                                    
                                    // 添加到总结果
                                    if (pageProducts && pageProducts.length > 0) {
                                        allProducts.push(...pageProducts);
                                    }
                                } catch (error) {
                                    console.error(`处理提取结果时出错: ${error.message}，继续执行`);
                                }
                            } catch (pageError) {
                                console.error(`处理第 ${currentPage} 页时出错: ${pageError.message}，继续下一页`);
                                continue;
                            }
                        }
                    } catch (categoryError) {
                        console.error(`处理分类 ${i} 时出错: ${categoryError.message}，继续下一个分类`);
                        continue;
                    }
                }
                    // 在最后添加这些代码
                    console.log(`所有分类处理完毕，总共收集到 ${allProducts.length} 个商品`);
                    this.data = {
                        categories: categories,
                        products: allProducts,
                        totalProductCount: allProducts.length,
                        shopInfo: {
                            timestamp: new Date().toISOString(),
                            platform: '美团外卖'
                        }
                    };
            
                    console.log(`数据收集完成! 总共收集 ${this.data.products ? this.data.products.length : 0} 个商品，${this.data.categories ? this.data.categories.length : 0} 个分类`);
                    
                    if (this.data && this.data.products.length > 0) {
                        outputHandler.handle(this.data, 'output_waimai', this.task_name,"商品图片信息", this.user_id, this.tuiguang_phonenumber);
                        console.log('商品数据已成功保存');
                    } else {
                        console.log('没有提取到商品数据或数据为空');
                    }
                } catch (error) {
                    console.error('美团外卖商品获取失败:', error.message);
                    throw error;
                }
            }


            else if (this.element.leixing === '自定义5') {
                console.log('自定义4_start - 美团外卖商品获取');
                try {

                    // 等待页面加载
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    // 收集所有分类和商品数据
                    console.log('开始收集商品详细数据...');

                    // 点击商品下载按钮
                    console.log('尝试点击商品下载按钮...');
                    try {
                        // 首先检查内容是否在iframe中
                        const iframes = await page.$$('iframe');
                        console.log(`在主页面上找到 ${iframes.length} 个iframe`);
                        
                        let frameWithDownloadButton = null;
                        let downloadButtonSelector = 'button.roo-btn-link span i.icon-product-icon-productdown';
                        
                        // 先在主页面查找
                        const mainPageHasButton = await page.$(downloadButtonSelector).then(res => !!res).catch(() => false);
                        
                        if (mainPageHasButton) {
                            console.log('在主页面找到下载按钮');
                            await page.evaluate(() => {
                                const downloadButton = document.querySelector('button.roo-btn-link span i.icon-product-icon-productdown').closest('button');
                                if (!downloadButton) {
                                    throw new Error('未找到商品下载按钮');
                                }
                                downloadButton.click();
                                console.log('已点击商品下载按钮');
                            });
                        } else if (iframes.length > 0) {
                            // 依次在每个iframe中查找
                            console.log('在主页面未找到下载按钮，开始检查iframe...');
                            
                            const frames = await page.frames();
                            for (let i = 0; i < frames.length; i++) {
                                const frame = frames[i];
                                if (!frame) continue;
                                
                                try {
                                    console.log(`检查frame ${i}...`);
                                    const hasButton = await frame.$(downloadButtonSelector).then(res => !!res).catch(() => false);
                                    if (hasButton) {
                                        console.log(`在frame ${i}中找到下载按钮`);
                                        frameWithDownloadButton = frame;
                                        break;
                                    }
                                } catch (frameError) {
                                    console.log(`检查frame ${i}时出错:`, frameError.message);
                                }
                            }
                            
                            if (frameWithDownloadButton) {
                                console.log('在iframe中找到下载按钮，准备点击');
                                await frameWithDownloadButton.evaluate(() => {
                                    const downloadButton = document.querySelector('button.roo-btn-link span i.icon-product-icon-productdown').closest('button');
                                    if (!downloadButton) {
                                        throw new Error('iframe中未找到商品下载按钮');
                                    }
                                    downloadButton.click();
                                    console.log('已点击iframe中的商品下载按钮');
                                });
                            } else {
                                console.log('在所有地方都未找到标准下载按钮，尝试查找其他可能的下载按钮...');
                                throw new Error('未找到商品下载按钮');
                            }
                        } else {
                            throw new Error('未找到商品下载按钮，且页面上没有iframe');
                        }
                        
                        // 等待新页面加载
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // 点击下载最新商品按钮
                        console.log('尝试点击下载最新商品按钮...');
                        
                        // 检查是否在iframe中
                        const downloadFrames = await page.frames();
                        let targetFrame = page; // 默认为主页面
                        
                        // 查找包含下载按钮的frame
                        for (const frame of downloadFrames) {
                            try {
                                const hasDownloadButton = await frame.$('button.roo-btn-primary span').then(res => !!res).catch(() => false);
                                if (hasDownloadButton) {
                                    console.log('在frame中找到下载最新商品按钮');
                                    targetFrame = frame;
                                    break;
                                }
                            } catch (frameError) {
                                // 继续检查下一个frame
                                console.log('检查frame时出错:', frameError.message);
                            }
                        }
                        
                        // 在找到的frame中点击按钮
                        try {
                            await targetFrame.waitForSelector('button.roo-btn-primary span', { timeout: 15000 });
                            await targetFrame.evaluate(() => {
                                const buttons = Array.from(document.querySelectorAll('button.roo-btn-primary span'));
                                const downloadButton = buttons.find(button => button.textContent.includes('下载最新商品'));
                                if (!downloadButton) {
                                    throw new Error('未找到下载最新商品按钮');
                                }
                                downloadButton.closest('button').click();
                                console.log('已点击下载最新商品按钮');
                            });
                        } catch (targetFrameError) {
                            console.error('在找到的frame中点击下载最新商品按钮失败:', targetFrameError.message);
                            
                            // 尝试使用其他更通用的选择器
                            console.log('尝试使用更通用的选择器...');
                            const found = await targetFrame.evaluate(() => {
                                // 尝试查找所有可能的按钮
                                const allButtons = Array.from(document.querySelectorAll('button'));
                                const downloadBtn = allButtons.find(btn => {
                                    return (btn.textContent || '').includes('下载最新商品') || 
                                           (btn.textContent || '').includes('下载商品') || 
                                           (btn.innerHTML || '').includes('下载');
                                });
                                
                                if (downloadBtn) {
                                    downloadBtn.click();
                                    return true;
                                }
                                return false;
                            });
                            
                            if (!found) {
                                throw new Error('使用所有方法都未找到下载最新商品按钮');
                            }
                        }
                        
                        // 等待下载链接出现
                        console.log('等待下载链接出现...');
                        await new Promise(resolve => setTimeout(resolve, 4000));
                        
                        // 如果没有找到下载链接，先刷新页面并重新点击商品下载按钮
                        console.log('刷新页面并重新点击商品下载按钮...');
                        try {
                            // 刷新页面
                            await page.reload({ waitUntil: 'networkidle0' });
                            console.log('页面刷新完成');
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            
                            // 重新点击商品下载按钮
                            const iframes = await page.$$('iframe');
                            console.log(`在主页面上找到 ${iframes.length} 个iframe`);
                            
                            let frameWithDownloadButton = null;
                            let downloadButtonSelector = 'button.roo-btn-link span i.icon-product-icon-productdown';
                            
                            // 先在主页面查找
                            const mainPageHasButton = await page.$(downloadButtonSelector).then(res => !!res).catch(() => false);
                            
                            if (mainPageHasButton) {
                                console.log('在主页面找到下载按钮');
                                await page.evaluate(() => {
                                    const downloadButton = document.querySelector('button.roo-btn-link span i.icon-product-icon-productdown').closest('button');
                                    if (!downloadButton) {
                                        throw new Error('未找到商品下载按钮');
                                    }
                                    downloadButton.click();
                                    console.log('已点击商品下载按钮');
                                });
                            } else if (iframes.length > 0) {
                                // 依次在每个iframe中查找
                                console.log('在主页面未找到下载按钮，开始检查iframe...');
                                
                                const frames = await page.frames();
                                for (let i = 0; i < frames.length; i++) {
                                    const frame = frames[i];
                                    if (!frame) continue;
                                    
                                    try {
                                        console.log(`检查frame ${i}...`);
                                        const hasButton = await frame.$(downloadButtonSelector).then(res => !!res).catch(() => false);
                                        if (hasButton) {
                                            console.log(`在frame ${i}中找到下载按钮`);
                                            frameWithDownloadButton = frame;
                                            break;
                                        }
                                    } catch (frameError) {
                                        console.log(`检查frame ${i}时出错:`, frameError.message);
                                    }
                                }
                                
                                if (frameWithDownloadButton) {
                                    console.log('在iframe中找到下载按钮，准备点击');
                                    await frameWithDownloadButton.evaluate(() => {
                                        const downloadButton = document.querySelector('button.roo-btn-link span i.icon-product-icon-productdown').closest('button');
                                        if (!downloadButton) {
                                            throw new Error('iframe中未找到商品下载按钮');
                                        }
                                        downloadButton.click();
                                        console.log('已点击iframe中的商品下载按钮');
                                    });
                                }
                            }
                            
                            // 等待新页面加载
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            
                            // 再次点击下载最新商品按钮
                            console.log('再次尝试点击下载最新商品按钮...');
                            try {
                                await page.waitForSelector('button.roo-btn-primary span', { timeout: 10000 });
                                await page.evaluate(() => {
                                    const buttons = Array.from(document.querySelectorAll('button.roo-btn-primary span'));
                                    const downloadButton = buttons.find(button => button.textContent.includes('下载最新商品'));
                                    if (!downloadButton) {
                                        throw new Error('未找到下载最新商品按钮');
                                    }
                                    downloadButton.closest('button').click();
                                    console.log('已点击下载最新商品按钮');
                                });
                            } catch (buttonError) {
                                console.error('再次点击下载最新商品按钮失败:', buttonError.message);
                            }
                            
                            // 等待下载链接出现
                            await new Promise(resolve => setTimeout(resolve, 4000));
                        } catch (refreshError) {
                            console.error('刷新页面或重新点击商品下载按钮失败:', refreshError.message);
                        }
                        
                        // 获取下载链接 - 在所有frame中查找
                        let downloadUrl = null;
                        const allFrames = await page.frames();
                        
                        // 先尝试在主页面查找
                        try {
                            downloadUrl = await page.evaluate(() => {
                                const links = document.querySelectorAll('td a[target="_blank"]');
                                if (links.length === 0) {
                                    // 尝试其他可能的选择器
                                    const alternativeLinks = document.querySelectorAll('a[href*=".xls"]') || 
                                                          document.querySelectorAll('a[download]') || 
                                                          document.querySelectorAll('a[href*="download"]');
                                    if (alternativeLinks.length > 0) {
                                        return alternativeLinks[0].href;
                                    }
                                    return null;
                                }
                                // 获取第一个链接，通常是最新的
                                return links[0].href;
                            });
                        } catch (mainPageError) {
                            console.log('在主页面查找下载链接失败:', mainPageError.message);
                            downloadUrl = null;
                        }
                        
                        // 如果主页面没找到，尝试在每个iframe中查找
                        if (!downloadUrl) {
                            console.log('在主页面未找到下载链接，开始检查iframe...');
                            
                            for (const frame of allFrames) {
                                if (frame === page) continue; // 跳过主页面
                                
                                try {
                                    const frameUrl = await frame.evaluate(() => {
                                        const links = document.querySelectorAll('td a[target="_blank"]');
                                        if (links.length === 0) {
                                            // 尝试其他可能的选择器
                                            const alternativeLinks = document.querySelectorAll('a[href*=".xls"]') || 
                                                               document.querySelectorAll('a[download]') || 
                                                               document.querySelectorAll('a[href*="download"]');
                                            if (alternativeLinks.length > 0) {
                                                return alternativeLinks[0].href;
                                            }
                                            return null;
                                        }
                                        return links[0].href;
                                    });
                                    
                                    if (frameUrl) {
                                        downloadUrl = frameUrl;
                                        console.log('在iframe中找到下载链接');
                                        break;
                                    }
                                } catch (frameError) {
                                    console.log('检查iframe中的下载链接时出错:', frameError.message);
                                }
                            }
                        }
                        
                        if (!downloadUrl) {
                            throw new Error('在所有页面和iframe中都未找到下载链接');
                        }
                        
                        console.log('获取到下载链接:', downloadUrl);
                        
                        // 下载表格内容
                        if (downloadUrl) {
                            try {
                                console.log('开始下载表格内容...');
                                
                                try {
                                    // 使用浏览器上下文中的fetch API下载文件
                                    console.log('使用浏览器fetch API下载文件...');
                                    
                                    // 在页面上下文中执行fetch请求
                                    // 注意：这里使用page.evaluate在浏览器中执行fetch
                                    const fetchResult = await page.evaluate(async (url) => {
                                        try {
                                            // 设置请求头
                                            const requestOptions = {
                                                method: 'GET',
                                                headers: {
                                                    'User-Agent': navigator.userAgent,
                                                    'Referer': 'https://e.waimai.meituan.com/',
                                                    'Accept': 'application/octet-stream'
                                                }
                                            };
                                            
                                            // 执行请求
                                            const response = await fetch(url, requestOptions);
                                            
                                            if (!response.ok) {
                                                return { success: false, error: `请求失败，状态码: ${response.status}` };
                                            }
                                            
                                            // 获取二进制数据
                                            const arrayBuffer = await response.arrayBuffer();
                                            
                                            // 转换为base64字符串
                                            const base64Data = await new Promise((resolve) => {
                                                const reader = new FileReader();
                                                reader.onloadend = () => resolve(reader.result.split(',')[1]); // 移除data:application/octet-stream;base64,前缀
                                                reader.readAsDataURL(new Blob([arrayBuffer]));
                                            });
                                            
                                            return {
                                                success: true,
                                                data: base64Data,
                                                size: arrayBuffer.byteLength
                                            };
                                        } catch (err) {
                                            return { success: false, error: err.toString() };
                                        }
                                    }, downloadUrl);
                                    
                                    // 检查fetch执行结果
                                    if (!fetchResult.success) {
                                        throw new Error(`浏览器fetch请求失败: ${fetchResult.error}`);
                                    }
                                    
                                    console.log('成功获取文件内容，大小:', fetchResult.size, '字节');
                                    
                                    // 从浏览器获取的base64数据转换为缓冲区
                                    const buffer = Buffer.from(fetchResult.data, 'base64');
                                    
                                    // 验证数据是否正确
                                    if (buffer.length === 0) {
                                        throw new Error('下载文件内容为空');
                                    }
                                    
                                    // 这里不使用require，因为不需要再将数据转换为base64了
                                    // 直接使用从浏览器环境返回的base64数据
                                    console.log(`成功获取文件内容: ${buffer.length} 字节`);
                                    
                                    // 我们已经有base64内容了，直接使用
                                    const base64Content = fetchResult.data;
                                    
                                    // 在Node.js环境中保存文件
                                    try {
                                        // 这些模块引用位于Node.js环境，运行在页面上下文之外
                                        const fs = require('fs');
                                        const path = require('path');
                                        const tempFilePath = path.join(process.cwd(), 'temp_download.xls');
                                        
                                        // 从浏览器传回的base64内容转换为buffer并保存
                                        fs.writeFileSync(tempFilePath, Buffer.from(base64Content, 'base64'));
                                        console.log(`文件已保存到本地: ${tempFilePath}`);
                                    } catch (fsError) {
                                        console.error('保存文件到本地时出错:', fsError.message);
                                        // 继续执行，因为我们不需要本地文件就可以处理数据
                                    }
                                    
                                    // 创建或更新this.data对象
                                    this.data = {};
                                    // 保存下载链接和文件内容
                                    this.data.downloadUrl = downloadUrl;
                                    this.data.downloadContent = "base64Content";
                                    this.data.downloadTime = new Date().toISOString();
                                    this.data.fileSize = fetchResult.size; // 使用从浏览器返回的文件大小
                                    this.data.shopInfo = {
                                        timestamp: new Date().toISOString(),
                                        platform: '美团外卖'
                                    };
                                    
                                    console.log('表格下载成功，文件大小:', buffer.length, '字节');
                                    
                                    // 解析Excel文件内容
                                    try {
                                        // 将Base64转换为二进制数据
                                        const excelBuffer = Buffer.from(base64Content, 'base64');
                                        
                                        // 使用xlsx库解析Excel数据
                                        const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
                                        
                                        // 获取第一个工作表
                                        const firstSheetName = workbook.SheetNames[0];
                                        const worksheet = workbook.Sheets[firstSheetName];
                                        
                                        // 将工作表转换为JSON
                                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                                        
                                        // 存储解析后的数据
                                        this.data.parsedExcelData = jsonData;
                                        
                                        // 提取表格的基本信息
                                        this.data.excelInfo = {
                                            sheetNames: workbook.SheetNames,
                                            totalSheets: workbook.SheetNames.length,
                                            rowCount: jsonData.length
                                        };
                                        
                                        console.log(`Excel文件解析成功，共${jsonData.length}行数据，${workbook.SheetNames.length}个工作表`);
                                        
                                        // 提取一些重要字段作为摘要（假设前10行数据）
                                        if (jsonData.length > 0) {
                                            const sampleData = jsonData.slice(0, Math.min(10, jsonData.length));
                                            this.data.dataSummary = sampleData;
                                            
                                            // 获取所有列名
                                            const columnNames = Object.keys(jsonData[0]);
                                            this.data.columnNames = columnNames;
                                            console.log('表格列名:', columnNames.join(', '));
                                        }
                                    } catch (error) {
                                        console.error('解析Excel文件时出错:', error.message);
                                        this.data.excelParseError = error.message;
                                    }
                                    
                                    // 保存数据到output_waimai
                                    outputHandler.handle(this.data, 'output_waimai', this.task_name, "详细商品信息", this.user_id, this.tuiguang_phonenumber);
                                    console.log('XLS文件内容已成功保存到output_waimai');
                                    
                                    // // 返回到商品列表页面
                                    // try {
                                    //     console.log('尝试返回到商品列表页面...');
                                    //     // 改用page.goto而不是page.goBack，因为goBack可能会导致超时
                                    //     const mainUrl = 'https://e.waimai.meituan.com/';
                                    //     await page.goto(mainUrl, { timeout: 30000 });
                                    //     await new Promise(resolve => setTimeout(resolve, 2000));
                                    //     console.log('成功返回到商品列表页面');
                                    // } catch (navError) {
                                    //     console.error('返回商品列表页面失败:', navError.message);
                                    //     console.log('继续执行脚本...');
                                    //     // 这里不抛出错误，允许脚本继续执行
                                    // }
                                } catch (downloadError) {
                                    console.error('下载表格内容失败:', downloadError.message);
                                    this.data = this.data || {};
                                    this.data.downloadError = downloadError.message;
                                }
                            } catch (outerError) {
                                console.error('下载过程发生严重错误:', outerError.message);
                                this.data = this.data || {};
                                this.data.criticalError = outerError.message;
                                
                                // 即使出错也记录日志
                                try {
                                    this.data.downloadUrl = downloadUrl;
                                    this.data.errorTime = new Date().toISOString();
                                    outputHandler.handle(this.data, 'output_waimai', this.task_name, this.cityname, this.user_id, this.tuiguang_phonenumber);
                                    console.log('已保存错误信息到output_waimai');
                                } catch (finalError) {
                                    console.error('无法保存错误信息:', finalError.message);
                                }
                            }
                        }
                    } catch (buttonError) {
                        console.error('点击下载按钮或获取下载链接失败:', buttonError.message);
                        
                        // 记录错误状态的截图
                        try {
                            await page.screenshot({ path: 'error_screenshot.png' });
                            console.log('已保存错误状态的页面截图');
                        } catch (screenshotError) {
                            console.error('保存错误截图失败:', screenshotError.message);
                        }
                        
                        // 仍然处理已获取的任何数据
                        this.data = this.data || {};
                        this.data.error = buttonError.message;
                        this.data.errorTime = new Date().toISOString();
                        this.data.shopInfo = {
                            timestamp: new Date().toISOString(),
                            platform: '美团外卖'
                        };
                        
                        // 保存数据到output_waimai
                        outputHandler.handle(this.data, 'output_waimai', this.task_name, this.cityname, this.user_id, this.tuiguang_phonenumber);
                        console.log('已保存错误信息到output_waimai');
                    }
                } 
                
                catch (error) {
                    console.error('美团外卖商品获取失败:', error.message);
                    
                    // 确保即使出错也有数据输出
                    try {
                        if (!this.data) {
                            this.data = {
                                error: error.message,
                                errorTime: new Date().toISOString(),
                                shopInfo: {
                                    timestamp: new Date().toISOString(),
                                    platform: '美团外卖'
                                }
                            };
                            
                            // 保存数据到output_waimai
                            outputHandler.handle(this.data, 'output_waimai', this.task_name, this.cityname, this.user_id, this.tuiguang_phonenumber);
                            console.log('已保存错误数据到output_waimai');
                        }
                    } catch (outputError) {
                        console.error('尝试保存错误信息失败:', outputError.message);
                    }
                    
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
        const outputHandler = new OutputFactory();
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
            // 存储所有收集到的数据
            let allNotes = [];
            const outputHandler = new OutputFactory();
            
            try {
                await page.waitForSelector('input.search-input[type="text"]', { timeout: 5000 });
                
                // 点击搜索框并输入内容
                await page.click('input.search-input[type="text"]');
                await page.type('input.search-input[type="text"]', cliclValue, { delay: 100 });
                
                // 等待一下确保输入完成
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 按下回车键触发搜索
                await page.keyboard.press('Enter');
                console.log('已触发搜索');

                // 等待搜索结果加载并点击图文按钮
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // 等待并点击图文按钮
                await page.waitForSelector('#short_note.channel', { timeout: 5000 });
                await page.evaluate(() => {
                    const tuWenButton = document.querySelector('#short_note.channel');
                    if (!tuWenButton) {
                        throw new Error('未找到图文按钮');
                    }
                    tuWenButton.click();
                    console.log('已点击图文按钮');
                });

                // 等待图文内容加载
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 持续滚动并收集数据
                this.data = await page.evaluate(async () => {
                    function sleep(ms) {
                        return new Promise(resolve => setTimeout(resolve, ms));
                    }

                    // 提取笔记信息的函数
                    function extractNoteInfo(element) {
                        const info = {};
                        try {
                            // 提取标题
                            const titleElement = element.querySelector('.title span');
                            info.title = titleElement ? titleElement.textContent.trim() : 'N/A';

                            // 提取作者信息
                            const authorElement = element.querySelector('.author');
                            if (authorElement) {
                                info.authorName = authorElement.querySelector('.name').textContent.trim();
                                info.authorAvatar = authorElement.querySelector('img').src;
                                info.authorLink = authorElement.href;
                            }

                            // 提取封面图片
                            const coverElement = element.querySelector('.cover img');
                            info.coverImage = coverElement ? coverElement.src : 'N/A';

                            // 提取笔记链接
                            const linkElement = element.querySelector('.cover');
                            info.noteLink = linkElement ? linkElement.href : 'N/A';

                            // 提取点赞数
                            const likeElement = element.querySelector('.like-wrapper .count');
                            info.likeCount = likeElement ? likeElement.textContent.trim() : '0';

                            // 提取推荐原因
                            const reasonElement = element.querySelector('.recommend-reason-text');
                            info.recommendReason = reasonElement ? reasonElement.textContent.trim() : 'N/A';
                        } catch (error) {
                            console.error('提取笔记信息时出错:', error);
                        }
                        return info;
                    }

                    const scrollStep = 2000; // 每次滚动的像素
                    const scrollInterval = 1500; // 滚动间隔时间（毫秒）
                    const maxScrollAttempts = 200; // 最大滚动次数
                    let scrollAttempts = 0;
                    let allNotes = new Set(); // 使用 Set 来存储唯一的笔记数据
                    let previousSize = 0; // 记录上一次的数据量
                    let noNewDataCount = 0; // 记录连续没有新数据的次数

                    while (scrollAttempts < maxScrollAttempts) {
                        // 获取当前可见的笔记卡片
                        const noteElements = document.querySelectorAll('section.note-item');
                        
                        // 提取并存储笔记信息
                        noteElements.forEach(element => {
                            const noteInfo = extractNoteInfo(element);
                            // 使用笔记链接作为唯一标识
                            if (noteInfo.noteLink !== 'N/A') {
                                allNotes.add(JSON.stringify(noteInfo));
                            }
                        });

                        // 检查是否有新数据
                        if (allNotes.size === previousSize) {
                            noNewDataCount++;
                            // 如果连续20次没有新数据，则认为已到达末尾
                            if (noNewDataCount >= 20) {
                                console.log('连续20次没有新数据，结束滚动');
                                break;
                            }
                            // 没有新数据时额外等待1秒
                            await sleep(1000);
                        } else {
                            noNewDataCount = 0; // 有新数据，重置计数器
                        }
                        previousSize = allNotes.size;

                        // 滚动页面
                        window.scrollBy(0, scrollStep);
                        console.log(`第 ${scrollAttempts + 1} 次滚动，当前收集到 ${allNotes.size} 条数据`);
                        
                        // 等待内容加载
                        await sleep(scrollInterval);
                        scrollAttempts++;
                    }

                    if (scrollAttempts >= maxScrollAttempts) {
                        console.log('达到最大滚动次数，停止滚动');
                    }

                    // 滚动回页面顶部
                    window.scrollTo(0, 0);

                    // 将 Set 转换回数组并返回
                    return Array.from(allNotes).map(note => JSON.parse(note));
                });

                console.log('提取的数据:', this.data);

                if (this.data && this.data.length > 0) {
                    outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
                } else {
                    console.log('没有提取到数据或数据为空');
                }
            } catch (error) {
                console.error('搜索操作失败:', error.message);
                throw error;
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