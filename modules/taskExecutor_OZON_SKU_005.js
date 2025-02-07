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
                                cancelable: true,
                                buttons: 1
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
                                    cancelable: true,
                                    buttons: 1
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
                    // 注册日志函数
                    await page.exposeFunction('logToConsole', (...args) => {
                        const processedArgs = args.map(arg => {
                            if (arg instanceof Error) return arg.message;
                            if (typeof arg === 'object' && arg !== null) {
                                try {
                                    JSON.stringify(arg);
                                    return arg;
                                } catch (e) {
                                    return String(arg);
                                }
                            }
                            return arg;
                        });
                        console.log(...processedArgs);
                    });

                    // 添加浏览器控制台日志
                    await page.evaluateOnNewDocument(() => {
                        // 保存原始的console方法
                        const originalLog = console.log;
                        const originalError = console.error;

                        // 重写console.log
                        console.log = (...args) => {
                            // 调用原始的console.log
                            originalLog.apply(console, args);
                            // 同时发送到Node.js
                            window.logToConsole(...args);
                        };

                        // 重写console.error
                        console.error = (...args) => {
                            // 调用原始的console.error
                            originalError.apply(console, args);
                            // 同时发送到Node.js
                            window.logToConsole('ERROR:', ...args);
                        };
                    });

                    // 执行点击类别按钮
                    const clickResult = await page.evaluate(async () => {
                        function clickCategoryFilter() {
                            try {
                                const filterButtons = Array.from(document.querySelectorAll('button.filter-chip-module_filterChip_8-rKX'));
                                window.logToConsole('找到的按钮数量:', filterButtons.length);
                                
                                const categoryButton = filterButtons.find(button => {
                                    const label = button.querySelector('.filter-chip-module_label_9Swml');
                                    const text = label?.textContent.trim();
                                    window.logToConsole('按钮文本:', text);
                                    return text && (
                                        text.startsWith('类别') ||
                                        text.startsWith('类别:') ||
                                        text.startsWith('类别：') ||
                                        text.startsWith('类别: ') ||
                                        /^类别[:：]\s*\d+$/.test(text)
                                    );
                                });

                                if (!categoryButton) {
                                    window.logToConsole('未找到类别按钮');
                                    return false;
                                }

                                window.logToConsole('找到类别按钮，准备点击');

                                // 创建鼠标事件
                                const mouseDown = new MouseEvent('mousedown', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                    buttons: 1
                                });
                                
                                const mouseUp = new MouseEvent('mouseup', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                    buttons: 1
                                });
                                
                                const click = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                    buttons: 1
                                });

                                // 触发一系列事件
                                categoryButton.dispatchEvent(mouseDown);
                                categoryButton.dispatchEvent(mouseUp);
                                categoryButton.dispatchEvent(click);
                                
                                // 尝试触发原生点击
                                categoryButton.click();

                                // 等待弹窗出现
                                return new Promise(resolve => {
                                    setTimeout(() => {
                                        // 查找并点击清空按钮
                                        const clearButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
                                            const textSpan = button.querySelector('.button-module_text_Sj3v5');
                                            return textSpan && textSpan.textContent.trim().startsWith('清空');
                                        });

                                        if (clearButton) {
                                            window.logToConsole('找到清空按钮，准备点击');
                                            clearButton.click();
                                            window.logToConsole('清空按钮点击完成');
                                            resolve(true);
                                        } else {
                                            window.logToConsole('未找到清空按钮');
                                            resolve(false);
                                        }
                                    }, 1000); // 等待1秒确保弹窗出现
                                });
                            } catch (error) {
                                window.logToConsole('点击失败:', error.toString());
                                return false;
                            }
                        }

                        return await clickCategoryFilter();
                    });

                    if (!clickResult) {
                        throw new Error('类别按钮点击失败');
                    }

                    // 等待弹窗出现并获取子类别
                    await page.waitForTimeout(2000);

                    // 获取子类别
                    const subcategories = await page.evaluate(async (clickValue) => {
                        try {
                            window.logToConsole('开始获取子类别...');
                            window.logToConsole('要点击的类别值:', clickValue);
                        
                            // 等待初始子类别加载
                            await new Promise(resolve => setTimeout(resolve, 5000));
                            
                            // 查找目标类别按钮
                            let targetButton = null;
                            let categoryName = '';
                            let parentId = '';
                            let treeContainer = null;
                            let lastScrollTop = 0;

                            // 获取树形容器的函数
                            async function getTreeContainer() {
                                // 尝试多个可能的选择器
                                const selectors = [
                                    '.semi-tree-virtual-list',
                                    '.semi-tree-body',
                                    '.semi-tree',
                                    '[role="tree"]'
                                ];

                                for (const selector of selectors) {
                                    const container = document.querySelector(selector);
                                    if (container) {
                                        window.logToConsole(`找到树形容器，使用选择器: ${selector}`);
                                        return container;
                                    }
                                }

                                // 如果还是找不到，尝试找到任何可滚动的父容器
                                const firstTreeItem = document.querySelector('.tree-item-module_treeItem_ZlZ8K');
                                if (firstTreeItem) {
                                    let parent = firstTreeItem.parentElement;
                                    while (parent) {
                                        const style = window.getComputedStyle(parent);
                                        if (style.overflow === 'auto' || style.overflow === 'scroll' ||
                                            style.overflowY === 'auto' || style.overflowY === 'scroll') {
                                            window.logToConsole('找到可滚动的父容器');
                                            return parent;
                                        }
                                        parent = parent.parentElement;
                                    }
                                }

                                window.logToConsole('未找到树形容器元素');
                                return null;
                            }

                            // 滚动处理函数
                            async function handleScroll(container) {
                                if (!container) {
                                    window.logToConsole('容器不存在，无法执行滚动');
                                    return false;
                                }

                                try {
                                    const skeletonElements = document.querySelectorAll('.skeleton-common-base-module_skeleton_z9rfg');
                                    if (skeletonElements.length > 0) {
                                        window.logToConsole('发现骨架屏，滚动到骨架屏元素');
                                        skeletonElements[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        return true;
                                    }

                                    const currentScrollTop = container.scrollTop;
                                    container.scrollTop += 300; // 减小滚动距离以确保平滑
                                    
                                    if (Math.abs(currentScrollTop - lastScrollTop) < 10) {
                                        window.logToConsole('检测到滚动无效，可能已到达底部');
                                        return false;
                                    }
                                    lastScrollTop = currentScrollTop;
                                    
                                    window.logToConsole(`滚动状态 - 位置: ${container.scrollTop}`);
                                    return true;
                                } catch (error) {
                                    window.logToConsole('滚动操作失败:', error.toString());
                                    return false;
                                }
                            }

                            // 主要的查找和滚动逻辑
                            let scrollAttempts = 0;
                            const maxScrollAttempts = 15; // 增加最大尝试次数

                            // 首先获取树形容器
                            treeContainer = await getTreeContainer();
                            if (!treeContainer) {
                                window.logToConsole('初始化时未找到树形容器');
                                return [];
                            }

                            while (scrollAttempts < maxScrollAttempts) {
                                if (await findTargetInTree()) {
                                    break;
                                }

                                // 如果没找到，尝试滚动
                                const scrollSuccess = await handleScroll(treeContainer);
                                if (!scrollSuccess) {
                                    // 尝试重新获取容器
                                    treeContainer = await getTreeContainer();
                                    if (!treeContainer) {
                                        window.logToConsole('重新获取树形容器失败');
                                        break;
                                    }
                                }

                                await new Promise(resolve => setTimeout(resolve, 1500));
                                scrollAttempts++;
                            }

                            // 查找目标并在需要时滚动

                            async function findTargetInTree() {
                                const treeItems = document.querySelectorAll('.tree-item-module_treeItem_ZlZ8K');
                                window.logToConsole(`找到 ${treeItems.length} 个树形项目`);
                                
                                for (const item of treeItems) {
                                    const label = item.querySelector('.data-content-module_label_fGS\\+z');
                                    if (label) {
                                        const text = label.textContent.trim();
                                        window.logToConsole('按钮文本:', text);
                                        if (text === clickValue) {
                                            targetButton = label;
                                            categoryName = text;
                                            parentId = item.id;
                                            window.logToConsole('找到目标类别:', {
                                                text: text,
                                                id: parentId
                                            });
                                            return true;
                                        }
                                    }
                                }
                                return false;
                            }

                            while (scrollAttempts < maxScrollAttempts) {
                                if (await findTargetInTree()) {
                                    break;
                                }

                                // 如果没找到，尝试滚动
                                try {
                                    const skeletonElements = document.querySelectorAll('.skeleton-common-base-module_skeleton_z9rfg');
                                    if (skeletonElements.length > 0) {
                                        window.logToConsole('发现骨架屏，滚动到骨架屏元素');
                                        skeletonElements[0].scrollIntoView({ block: 'center' });
                                    } else {
                                        const currentScrollTop = treeContainer.scrollTop;
                                        treeContainer.scrollTop += 500;
                                        
                                        if (Math.abs(currentScrollTop - lastScrollTop) < 10) {
                                            window.logToConsole('检测到滚动无效，可能已到达底部');
                                        }
                                        lastScrollTop = currentScrollTop;
                                        
                                        window.logToConsole(`滚动状态 - 位置: ${treeContainer.scrollTop}`);
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        scrollAttempts++;
                                    }
                                } catch (error) {
                                    window.logToConsole('滚动操作失败:', error.toString());
                                    // 尝试重新获取树形容器
                                    treeContainer = await getTreeContainer();
                                    if (!treeContainer) {
                                        window.logToConsole('重新获取树形容器失败');
                                        break;
                                    }
                                }
                            }

                            if (!targetButton) {
                                window.logToConsole(`未找到类别: ${clickValue}`);
                                return [];
                            }

                            // 点击目标类别
                            window.logToConsole(`准备点击类别: ${categoryName}`);
                            const clickEvent = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true,
                                buttons: 1
                            });
                            targetButton.dispatchEvent(clickEvent);
                            window.logToConsole(`点击类别完成: ${categoryName}`);

                            // 等待子类别加载
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            const maxAttempts = 100;
                            let attempts = 0;
                            let noNewItemsCount = 0;
                            const maxNoNewItems = 5;
                            let collectedSubcategories = [];
                            lastScrollTop = 0;
                            
                            // 获取树形容器
                            window.logToConsole('开始查找树形容器...');
                            treeContainer = await getTreeContainer();
                            if (!treeContainer) {
                                window.logToConsole('未找到树形容器');
                                return [];
                            }
                            window.logToConsole('成功找到树形容器');
                            
                            // 定义一个函数来收集子类别
                            const collectSubcategories = () => {
                                const newSubcategories = [];
                                document.querySelectorAll(`[id^="${parentId}_"]`).forEach(element => {
                                    const labelElement = element.querySelector('.data-content-module_label_fGS\\+z');
                                    if (labelElement) {
                                        const categoryInfo = {
                                            id: element.id,
                                            name: labelElement.textContent.trim(),
                                            hasChildren: !!element.querySelector('.tree-item-module_hasChildren_CcABP')
                                        };
                                        if (!collectedSubcategories.some(item => item.id === categoryInfo.id)) {
                                            newSubcategories.push(categoryInfo);
                                        }
                                    }
                                });
                                return newSubcategories;
                            };
                            

                            // 等待子类别加载
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            while (attempts < maxAttempts) {
                                window.logToConsole(`\n开始第 ${attempts + 1} 次尝试`);
                                await new Promise(resolve => setTimeout(resolve, 1500));
                                
                                // 获取当前可见的子类别
                                const currentElements = document.querySelectorAll(`[id^="${parentId}_"]`);
                                window.logToConsole(`当前可见子类别数量: ${currentElements.length}`);
                                
                                // 收集新的子类别
                                const newSubcategories = collectSubcategories();
                                window.logToConsole(`发现 ${newSubcategories.length} 个新子类别`);
                                
                                if (newSubcategories.length > 0) {
                                    collectedSubcategories = [...collectedSubcategories, ...newSubcategories];
                                    window.logToConsole(`当前累计子类别数量: ${collectedSubcategories.length}`);
                                    window.logToConsole('新增子类别:', JSON.stringify(newSubcategories.map(s => s.name)));
                                    noNewItemsCount = 0;
                                } else {
                                    noNewItemsCount++;
                                    window.logToConsole(`连续 ${noNewItemsCount} 次没有新子类别`);
                                }
                                
                                // 执行滚动
                                try {
                                    const visibleItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                    if (visibleItems.length > 0) {
                                        const lastItem = visibleItems[visibleItems.length - 1];
                                        const skeletonElements = document.querySelectorAll('.skeleton-common-base-module_skeleton_z9rfg');
                                        
                                        if (skeletonElements.length > 0) {
                                            window.logToConsole('发现骨架屏，滚动到骨架屏元素');
                                            skeletonElements[0].scrollIntoView({ block: 'center' });
                                        } else {
                                            window.logToConsole('滚动到最后一个可见元素');
                                            lastItem.scrollIntoView({ block: 'end' });
                                        }
                                        
                                        await new Promise(resolve => setTimeout(resolve, 500));
                                        const currentScrollTop = treeContainer.scrollTop;
                                        treeContainer.scrollTop += 500;
                                        
                                        // 检查滚动是否有效
                                        if (Math.abs(currentScrollTop - lastScrollTop) < 10) {
                                            window.logToConsole('检测到滚动无效，可能已到达底部');
                                        }
                                        lastScrollTop = currentScrollTop;
                                    }
                                    
                                    window.logToConsole(`滚动状态 - 位置: ${treeContainer.scrollTop}, 容器高度: ${treeContainer.scrollHeight}, 可视高度: ${treeContainer.clientHeight}`);
                                } catch (error) {
                                    window.logToConsole('滚动操作失败:', error.toString());
                                }

                                // 等待新内容加载
                                await new Promise(resolve => setTimeout(resolve, 1500));

                                // 检查是否还有骨架屏元素
                                const skeletonElements = document.querySelectorAll('.skeleton-common-base-module_skeleton_z9rfg');
                                const isAtBottom = Math.abs(treeContainer.scrollTop + treeContainer.clientHeight - treeContainer.scrollHeight) < 10;
                                
                                window.logToConsole(`检查加载状态 - 骨架屏数量: ${skeletonElements.length}, 是否到底: ${isAtBottom}, 无新项次数: ${noNewItemsCount}`);
                                
                                // 判断是否完成加载
                                if ((noNewItemsCount >= maxNoNewItems) || 
                                    (skeletonElements.length === 0 && isAtBottom)) {
                                    window.logToConsole('满足结束条件，停止加载');
                                    window.logToConsole(`最终收集到的子类别数量: ${collectedSubcategories.length}`);
                                    window.logToConsole('子类别列表:', JSON.stringify(collectedSubcategories.map(s => s.name)));
                                    break;
                                }

                                attempts++;
                            }

                            // 最后再滚动到顶部
                            if (treeContainer) {
                                treeContainer.scrollTop = 0;
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }

                            if (collectedSubcategories.length === 0) {
                                window.logToConsole('警告：未收集到任何子类别！');
                            }

                            return collectedSubcategories;
                        } catch (error) {
                            window.logToConsole('获取子类别失败:', error.toString());
                            window.logToConsole('错误堆栈:', error.stack);
                            return [];
                        }
                    }, cliclValue);

                    console.log('页面执行完成，获取到的子类别数量:', subcategories.length);
                    
                    // 遍历子类目并执行操作
                    for (const subcategory of subcategories) {
                        try {
                            console.log(`开始处理子类目: ${subcategory.name}`);
                            
                            // 1. 点击类别筛选按钮
                            const clickResult = await page.evaluate(async () => {
                                try {
                                    const filterButtons = Array.from(document.querySelectorAll('button.filter-chip-module_filterChip_8-rKX'));
                                    window.logToConsole('找到的按钮数量:', filterButtons.length);
                                    
                                    const categoryButton = filterButtons.find(button => {
                                        const label = button.querySelector('.filter-chip-module_label_9Swml');
                                        const text = label?.textContent.trim();
                                        window.logToConsole('按钮文本:', text);
                                        return text && (
                                            text.startsWith('类别') ||
                                            text.startsWith('类别:') ||
                                            text.startsWith('类别：') ||
                                            text.startsWith('类别: ') ||
                                            /^类别[:：]\s*\d+$/.test(text)
                                        );
                                    });

                                    if (!categoryButton) {
                                        window.logToConsole('未找到类别按钮');
                                        return false;
                                    }

                                    window.logToConsole('找到类别按钮，准备点击');

                                    // 创建鼠标事件
                                    const mouseDown = new MouseEvent('mousedown', {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window,
                                        buttons: 1
                                    });
                                    
                                    const mouseUp = new MouseEvent('mouseup', {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window,
                                        buttons: 1
                                    });
                                    
                                    const click = new MouseEvent('click', {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window,
                                        buttons: 1
                                    });

                                    // 触发一系列事件
                                    categoryButton.dispatchEvent(mouseDown);
                                    categoryButton.dispatchEvent(mouseUp);
                                    categoryButton.dispatchEvent(click);
                                    
                                    // 尝试触发原生点击
                                    categoryButton.click();

                                    // 等待弹窗出现
                                    return new Promise(resolve => {
                                        setTimeout(() => {
                                            // 查找并点击清空按钮
                                            const clearButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
                                                const textSpan = button.querySelector('.button-module_text_Sj3v5');
                                                return textSpan && textSpan.textContent.trim().startsWith('清空');
                                            });

                                            if (clearButton) {
                                                window.logToConsole('找到清空按钮，准备点击');
                                                clearButton.click();
                                                window.logToConsole('清空按钮点击完成');
                                                resolve(true);
                                            } else {
                                                window.logToConsole('未找到清空按钮');
                                                resolve(false);
                                            }
                                        }, 10000); // 等待1秒确保弹窗出现
                                    });
                                } catch (error) {
                                    window.logToConsole('点击失败:', error.toString());
                                    return false;
                                }
                            });

                            if (!clickResult) {
                                throw new Error('类别按钮点击失败');
                            }

                            // 等待弹窗出现
                            await page.waitForTimeout(2000);
                            
                            // 等待2秒确保页面加载
                            await page.waitForTimeout(2000);
                            
                            // 点击清空按钮
                            const clearResult = await page.evaluate(async () => {
                                try {
                                    // 1. 查找清空按钮
                                    const clearButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
                                        const textSpan = button.querySelector('.button-module_text_Sj3v5');
                                        return textSpan && textSpan.textContent.trim().startsWith('清空');
                                    });

                                    if (!clearButton) {
                                        window.logToConsole('未找到清空按钮');
                                        return;
                                    }

                                    window.logToConsole('找到清空按钮，准备点击');

                                    // 2. 创建点击事件
                                    const clickEvent = new MouseEvent('click', {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        buttons: 1
                                    });

                                    // 3. 触发点击事件
                                    clearButton.dispatchEvent(clickEvent);
                                    
                                    // 4. 触发表单提交事件
                                    const submitEvent = new Event('submit', {
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    const form = clearButton.closest('form');
                                    if (form) {
                                        form.dispatchEvent(submitEvent);
                                        window.logToConsole('成功触发表单提交');
                                    }

                                    window.logToConsole('成功点击清空按钮');
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } catch (error) {
                                    window.logToConsole('点击清空按钮失败:', error.toString());
                                }
                            });
                            
                            // if (!clearResult) {
                            //     window.logToConsole('清空按钮点击失败');
                            //     return false;
                            // }

                            // 3. 点击主类目
                            await page.evaluate(async (clickValue) => {
                                try {
                                    const treeItems = document.querySelectorAll('.tree-item-module_treeItem_ZlZ8K');
                                    let targetButton = null;
                                    
                                    for (const item of treeItems) {
                                        const label = item.querySelector('.data-content-module_label_fGS\\+z');
                                        if (label && label.textContent && label.textContent.trim() === clickValue) {
                                            targetButton = label;
                                            break;
                                        }
                                    }

                                    if (targetButton) {
                                        window.logToConsole(`准备点击类别: ${clickValue}`);
                                        targetButton.click();
                                        window.logToConsole(`点击类别: ${clickValue}`);
                                        await new Promise(resolve => setTimeout(resolve, 1500));
                                    }
                                } catch (error) {
                                    window.logToConsole('点击主类目失败:', error.toString());
                                }
                            }, cliclValue);

                            // 4. 点击子类目
                            await page.evaluate(async (subcategoryName) => {
                                try {
                                    await new Promise(resolve => setTimeout(resolve, 1500));
                                    let targetCheckbox = null;
                                    let scrollAttempts = 0;
                                    const maxScrollAttempts = 10;
                                    let lastScrollTop = 0;

                                    // 获取树形容器
                                    const getTreeContainer = () => {
                                        const selectors = [
                                            '.semi-tree-virtual-list',
                                            '.semi-tree-body',
                                            '.semi-tree',
                                            '[role="tree"]'
                                        ];
                                        
                                        for (const selector of selectors) {
                                            const container = document.querySelector(selector);
                                            if (container) return container;
                                        }
                                        
                                        // 尝试找到可滚动的父容器
                                        const firstTreeItem = document.querySelector('.tree-item-module_treeItem_ZlZ8K');
                                        if (firstTreeItem) {
                                            let parent = firstTreeItem.parentElement;
                                            while (parent) {
                                                const style = window.getComputedStyle(parent);
                                                if (style.overflow === 'auto' || style.overflow === 'scroll' ||
                                                    style.overflowY === 'auto' || style.overflowY === 'scroll') {
                                                    return parent;
                                                }
                                                parent = parent.parentElement;
                                            }
                                        }
                                        return null;
                                    };

                                    // 查找目标复选框
                                    const findCheckbox = () => {
                                        const treeItems = document.querySelectorAll('.tree-item-module_treeItem_ZlZ8K');
                                        for (const item of treeItems) {
                                            const label = item.querySelector('.data-content-module_label_fGS\\+z');
                                            if (label && label.textContent && label.textContent.trim() === subcategoryName) {
                                                const checkbox = item.querySelector('.checkbox-module_checkbox_PWZqO');
                                                if (checkbox) return checkbox;
                                            }
                                        }
                                        return null;
                                    };

                                    const treeContainer = getTreeContainer();
                                    if (!treeContainer) {
                                        window.logToConsole('未找到树形容器');
                                        return;
                                    }

                                    while (scrollAttempts < maxScrollAttempts) {
                                        // 尝试查找复选框
                                        targetCheckbox = findCheckbox();
                                        if (targetCheckbox) break;

                                        // 如果没找到，尝试滚动
                                        try {
                                            const skeletonElements = document.querySelectorAll('.skeleton-common-base-module_skeleton_z9rfg');
                                            if (skeletonElements.length > 0) {
                                                window.logToConsole('发现骨架屏，滚动到骨架屏元素');
                                                skeletonElements[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
                                            } else {
                                                const currentScrollTop = treeContainer.scrollTop;
                                                treeContainer.scrollTop += 300;
                                                
                                                if (Math.abs(currentScrollTop - lastScrollTop) < 10) {
                                                    window.logToConsole('检测到滚动无效，可能已到达底部');
                                                    break;
                                                }
                                                lastScrollTop = currentScrollTop;
                                            }
                                            
                                            window.logToConsole(`滚动状态 - 位置: ${treeContainer.scrollTop}`);
                                            await new Promise(resolve => setTimeout(resolve, 1000));
                                        } catch (error) {
                                            window.logToConsole('滚动操作失败:', error.toString());
                                            break;
                                        }
                                        
                                        scrollAttempts++;
                                        window.logToConsole(`滚动尝试次数: ${scrollAttempts}`);
                                    }

                                    if (targetCheckbox) {
                                        window.logToConsole(`找到子类目 ${subcategoryName} 的复选框`);
                                        
                                        // 确保复选框在视图中
                                        targetCheckbox.scrollIntoView({ block: 'center', behavior: 'smooth' });
                                        await new Promise(resolve => setTimeout(resolve, 500));
                                        
                                        // 获取父级label元素
                                        const labelElement = targetCheckbox.closest('label');
                                        
                                        // 创建鼠标事件
                                        const mouseEvents = ['mousedown', 'mouseup', 'click'];
                                        const eventOptions = {
                                            view: window,
                                            bubbles: true,
                                            cancelable: true,
                                            buttons: 1,
                                            detail: 1
                                        };

                                        // 对input元素触发事件
                                        for (const eventType of mouseEvents) {
                                            const event = new MouseEvent(eventType, eventOptions);
                                            targetCheckbox.dispatchEvent(event);
                                            await new Promise(resolve => setTimeout(resolve, 100));
                                        }

                                        // 对label元素触发事件
                                        if (labelElement) {
                                            for (const eventType of mouseEvents) {
                                                const event = new MouseEvent(eventType, eventOptions);
                                                labelElement.dispatchEvent(event);
                                                await new Promise(resolve => setTimeout(resolve, 100));
                                            }
                                        }

                                        // 直接设置checked属性
                                        targetCheckbox.checked = !targetCheckbox.checked;
                                        
                                        // 触发change事件
                                        const changeEvent = new Event('change', { bubbles: true });
                                        targetCheckbox.dispatchEvent(changeEvent);
                                        
                                        window.logToConsole(`点击子类目 ${subcategoryName} 的复选框成功`);
                                        await new Promise(resolve => setTimeout(resolve, 1500));
                                        return true;
                                    } else {
                                        window.logToConsole(`未找到子类目 ${subcategoryName} 的复选框`);
                                        return false;
                                    }
                                } catch (error) {
                                    window.logToConsole('点击子类目复选框失败:', error.toString());
                                    return false;
                                }
                            }, subcategory.name);

                            // 5. 点击应用按钮
                            await page.evaluate(async () => {
                                try {
                                    // 1. 查找应用按钮
                                    const applyButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
                                        const textSpan = button.querySelector('.button-module_text_Sj3v5');
                                        return textSpan && textSpan.textContent.trim() === '应用';
                                    });

                                    if (!applyButton) {
                                        window.logToConsole('未找到应用按钮');
                                        return;
                                    }

                                    window.logToConsole('找到应用按钮，准备点击');

                                    // 2. 创建点击事件
                                    const clickEvent = new MouseEvent('click', {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        buttons: 1
                                    });

                                    // 3. 触发点击事件
                                    applyButton.dispatchEvent(clickEvent);
                                    
                                    // 4. 触发表单提交事件
                                    const submitEvent = new Event('submit', {
                                        bubbles: true,
                                        cancelable: true
                                    });
                                    const form = applyButton.closest('form');
                                    if (form) {
                                        form.dispatchEvent(submitEvent);
                                        window.logToConsole('成功触发表单提交');
                                    }

                                    window.logToConsole('成功点击应用按钮');
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } catch (error) {
                                    window.logToConsole('点击应用按钮失败:', error.toString());
                                }
                            });

                            // 6. 等待表格数据加载并下载
                            await page.evaluate(async () => {
                                async function waitForTableData() {
                                    try {
                                        window.logToConsole('等待表格数据加载...');
                                        
                                        // 最多等待30秒
                                        const maxWaitTime = 30000;
                                        const startTime = Date.now();
                                        
                                        while (Date.now() - startTime < maxWaitTime) {
                                            // 检查表格行是否存在且有数据
                                            const tableRows = document.querySelectorAll('tr.table-row-module_row_JSSv0');
                                            if (tableRows.length > 0) {
                                                window.logToConsole(`找到 ${tableRows.length} 行数据`);
                                                return true;
                                            }
                                            
                                            // 等待100毫秒后再次检查
                                            await new Promise(resolve => setTimeout(resolve, 100));
                                        }
                                        
                                        throw new Error('等待表格数据超时');
                                    } catch (error) {
                                        window.logToConsole('等待表格数据失败:', error);
                                        return false;
                                    }
                                }

                                // async function waitForDownload() {
                                //     try {
                                //         await new Promise((resolve, reject) => {
                                //             let downloadTimeout;
                                //             let isDownloading = false;

                                //             // 创建一个检查下载状态的函数
                                //             const checkDownloadStatus = () => {
                                //                 const downloadingElements = document.querySelectorAll('.notification-module_notification_Kj\\+Wk');
                                //                 for (const elem of downloadingElements) {
                                //                     const text = elem.textContent.toLowerCase();
                                //                     if (text.includes('正在下载') || text.includes('downloading')) {
                                //                         isDownloading = true;
                                //                         return false; // 继续等待
                                //                     }
                                //                     if (text.includes('下载完成') || text.includes('downloaded')) {
                                //                         return true; // 下载完成
                                //                     }
                                //                 }
                                //                 return !isDownloading; // 如果从未开始下载，返回true
                                //             };

                                //             // 设置检查间隔
                                //             const checkInterval = setInterval(() => {
                                //                 if (checkDownloadStatus()) {
                                //                     clearInterval(checkInterval);
                                //                     clearTimeout(downloadTimeout);
                                //                     resolve();
                                //                 }
                                //             }, 1000);

                                //             // 设置超时
                                //             downloadTimeout = setTimeout(() => {
                                //                 clearInterval(checkInterval);
                                //                 if (isDownloading) {
                                //                     reject(new Error('下载超时'));
                                //                 } else {
                                //                     resolve(); // 如果从未开始下载，就继续执行
                                //                 }
                                //             }, 300000); // 30秒超时
                                //         });
                                //         return true;
                                //     } catch (error) {
                                //         window.logToConsole('等待下载时发生错误:', error.toString());
                                //         return false;
                                //     }
                                // }

                                async function clickDownloadButton() {
                                    try {
                                        // 查找下载按钮（多种方式）
                                        let downloadButton = document.querySelector('button[data-test-id="export-button"]');
                                        
                                        if (!downloadButton) {
                                            // 尝试通过类名查找
                                            downloadButton = document.querySelector('button.button-module_button_x9kDW');
                                        }
                                        
                                        if (!downloadButton) {
                                            // 尝试通过文本内容查找
                                            downloadButton = Array.from(document.querySelectorAll('button')).find(button => 
                                                button.textContent.includes('下载') || 
                                                button.textContent.includes('导出') ||
                                                button.textContent.includes('export')
                                            );
                                        }

                                        if (!downloadButton) {
                                            throw new Error('未找到下载按钮');
                                        }

                                        window.logToConsole('找到下载按钮，准备点击');
                                        
                                        // 创建并触发下载按钮的点击事件
                                        const clickEvent = new MouseEvent('click', {
                                            view: window,
                                            bubbles: true,
                                            cancelable: true,
                                            buttons: 1
                                        });
                                        downloadButton.dispatchEvent(clickEvent);
                                        
                                        window.logToConsole('成功点击下载按钮，等待选项出现...');
                                        
                                        // 等待包含所有设置的报告选项出现
                                        let reportOption = null;
                                        const optionStartTime = Date.now();
                                        while (Date.now() - optionStartTime < 10000) { // 等待10秒
                                            const options = Array.from(document.querySelectorAll('div.data-cell-module_dataCell_z0Yiq.dropdown-item-module_dropdownItem_99nD2'));
                                            reportOption = options.find(div => div.textContent.includes('包含所有设置的报告'));
                                            if (reportOption) break;
                                            await new Promise(resolve => setTimeout(resolve, 100));
                                        }
                                        
                                        if (!reportOption) {
                                            throw new Error('未找到包含所有设置的报告选项');
                                        }
                                        
                                        // 等待报告生成完成
                                        const maxWaitTime = 300000; // 最长等待30秒
                                        const startTime = Date.now();
                                        
                                        while (Date.now() - startTime < maxWaitTime) {
                                            // 检查是否还在生成报告
                                            const generatingText = document.querySelector('div.data-content-module_caption_nC\+Qq')?.textContent;
                                            const isGenerating = generatingText && generatingText.includes('正在生成报告');
                                            
                                            if (!isGenerating && !downloadButton.disabled && !downloadButton.classList.contains('button-module_loading_CH8SU')) {
                                                window.logToConsole('报告生成完成，下载按钮已恢复可点击状态');
                                                break;
                                            }
                                            await new Promise(resolve => setTimeout(resolve, 500)); // 每500ms检查一次
                                        }
                                        
                                        if (Date.now() - startTime >= maxWaitTime) {
                                            window.logToConsole('等待报告生成完成超时');
                                            return false;
                                        }

                                        // 点击选项
                                        const reportClickEvent = new MouseEvent('click', {
                                            view: window,
                                            bubbles: true,
                                            cancelable: true,
                                            buttons: 1
                                        });
                                        reportOption.dispatchEvent(reportClickEvent);
                                        
                                        window.logToConsole('成功点击包含所有设置的报告选项，等待下载完成...');
                                        return true;
                                        return false;
                                    } catch (error) {
                                        window.logToConsole('点击下载按钮失败:', error.toString());
                                        return false;
                                    }
                                }

                                try {
                                    // 首先等待表格数据加载
                                    const dataLoaded = await waitForTableData();
                                    if (!dataLoaded) {
                                        throw new Error('表格数据未加载，无法点击下载按钮');
                                    }

                                    // 数据加载完成后，执行下载操作
                                    const downloadSuccess = await clickDownloadButton();
                                    if (!downloadSuccess) {
                                        throw new Error('下载操作失败');
                                    }
                                } catch (error) {
                                    window.logToConsole('下载操作失败:', error.toString());
                                }
                            });
                            
                            console.log(`完成子类目 ${subcategory.name} 的处理`);
                            
                            // 添加间隔，避免请求过于频繁
                            await page.waitForTimeout(2000);

                        } catch (error) {
                            console.error(`处理子类目 ${subcategory.name} 时出错:`, error);
                            continue; // 继续处理下一个子类目
                        }
                    }

                    console.log('所有子类目处理完成');
                } catch (error) {
                    console.error('操作失败:', error);
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
            // 等待几何输入元素出现
            await page.waitForFunction(() => {
                return document.querySelector('._geometryInputs_ail1k_12') !== null;
            }, { timeout: 30000 }).catch(error => {
                console.log('等待几何输入元素超时:', error);
            });

            this.data = await page.evaluate(() => {
                const geometryInputs = document.querySelector('._geometryInputs_ail1k_12');
                const result = {};

                if (geometryInputs) {
                    const inputs = geometryInputs.querySelectorAll('input');
                    const dimensions = {};

                    inputs.forEach(input => {
                        const label = input.nextElementSibling.textContent.toLowerCase();
                        if (label.includes('длина')) {
                            dimensions.length = parseFloat(input.value) || 0;
                        } else if (label.includes('ширина')) {
                            dimensions.width = parseFloat(input.value) || 0;
                        } else if (label.includes('высота')) {
                            dimensions.height = parseFloat(input.value) || 0;
                        }
                    });

                    result.dimensions = dimensions;
                }

                // 提取体积信息
                const volumeElement = document.querySelector('._volumeCaption_ail1k_27');
                if (volumeElement) {
                    const volumeText = volumeElement.textContent;
                    const volumeMatch = volumeText.match(/(\d+\.?\d*)\s*л/);
                    if (volumeMatch) {
                        result.volume = parseFloat(volumeMatch[1]) || 0;
                    }
                }

                // 提取标题、价格和图片链接
                const itemCell = document.querySelector('.ozi__data-cell__dataCell__QUywL');
                if (itemCell) {
                    // 提取标题
                    const titleElement = itemCell.querySelector('.ozi__data-content__label__tXF2r');
                    if (titleElement) {
                        result.title = titleElement.textContent.trim();
                    }

                    // 提取价格
                    const priceElement = itemCell.querySelector('._itemPrice_gxabl_1');
                    if (priceElement) {
                        const priceText = priceElement.textContent;
                        const priceMatch = priceText.match(/(\d+)/);
                        result.price = priceMatch ? parseInt(priceMatch[0]) : 0;
                    }

                    // 提取图片链接
                    const imageElement = itemCell.querySelector('._selectedItemImage_gxabl_36');
                    if (imageElement) {
                        result.imageUrl = imageElement.src;
                    }
                }

                return [result];
            });

            console.log('提取的尺寸和体积数据:', this.data);


            if (Array.isArray(this.data) && this.data.length > 0) {
                console.log(`处理尺寸数据，数组长度: ${this.data.length}`);
                outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
            } else {
                console.log('未找到尺寸数据');
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
