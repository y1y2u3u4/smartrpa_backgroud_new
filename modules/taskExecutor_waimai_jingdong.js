// modules/taskExecutor_xiaohongshu.js
///实现通过亚马逊搜索商品获取标题
import { loadConfig } from './configManager.js';
import { OutputFactory } from './outputHandler.js';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
    constructor(type, element, value, sortedData_new, task_name, cityname,user_id, categoryNames) {
        this.type = type;
        this.element = element;
        this.value = value;
        this.sortedData_new = sortedData_new;
        this.task_name = task_name;
        this.user_id = user_id;
        this.categoryNames = categoryNames;
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
    constructor(element, browser, task_name, cityname, user_id,categoryNames) {
        super('click', element, null, null, task_name, cityname, user_id,categoryNames);
        this.browser = browser;
        console.log('ClickTask task_name:', this.task_name);
        console.log('ClickTask cityname:', this.cityname);
        console.log('ClickTask user_id:', this.user_id);
        console.log('ClickTask categoryNames:', this.categoryNames);
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
            else if (this.element.leixing === '自定义4') {
                console.log('自定义4_start - 京东外卖商品获取');
                try {
                    // 等待页面加载完成
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 1. 处理新手引导弹窗 - 点击"跳过"按钮
                    try {
                        console.log('正在检查并处理新手引导弹窗...');
                        await page.evaluate(() => {
                            const skipButton = document.querySelector('.driver-popover-footer .close-guide');
                            if (skipButton) {
                                console.log('找到新手引导弹窗，点击跳过按钮');
                                skipButton.click();
                                return true;
                            }
                            console.log('未找到新手引导弹窗');
                            return false;
                        });
                        
                        // 等待弹窗关闭
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.log('处理新手引导弹窗时出错:', error.message);
                    }
                    
                    // 2. 点击商品管理菜单（如果未展开）
                    console.log('正在查找并点击商品管理菜单...');
                    await page.evaluate(() => {
                        // 检查商品管理菜单是否已经展开
                        const productManageMenu = document.querySelector('.dj-submenu.dj-submenu-top-level[data-code="489"]');
                        const isExpanded = productManageMenu && productManageMenu.querySelector('.dj-submenu-content.opened');
                        
                        if (productManageMenu && !isExpanded) {
                            // 找到菜单标题并点击它
                            const menuLabel = productManageMenu.querySelector('.dj-submenu-label');
                            if (menuLabel) {
                                console.log('找到商品管理菜单，点击它以展开');
                                menuLabel.click();
                                return true;
                            }
                        } else if (isExpanded) {
                            console.log('商品管理菜单已经展开');
                            return true;
                        }
                        console.log('未找到商品管理菜单');
                        return false;
                    });
                    
                    // 等待子菜单加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 3. 点击商家商品管理子菜单
                    console.log('正在查找并点击商家商品管理...');
                    await page.evaluate(() => {
                        // 直接通过data-path属性找到商家商品管理菜单项
                        const merchantProductItem = document.querySelector('.dj-menu-item[data-path="489,674"]');
                        
                        if (merchantProductItem) {
                            // 查找可点击的标签元素
                            const clickableElement = merchantProductItem.querySelector('.dj-menu-item-label') || merchantProductItem;
                            console.log('找到商家商品管理菜单，点击它');
                            clickableElement.click();
                            return true;
                        }
                        console.log('未找到商家商品管理菜单');
                        return false;
                    });
                    
                    // 等待页面加载
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 4. 处理可能出现的第二个新手引导弹窗 - 点击"跳过"按钮
                    try {
                        console.log('正在检查并处理商品管理新手引导弹窗...');
                        await page.evaluate(() => {
                            const skipButton = document.querySelector('.driver-popover-footer .close-guide');
                            if (skipButton) {
                                console.log('找到商品管理新手引导弹窗，点击跳过按钮');
                                skipButton.click();
                                return true;
                            }
                            console.log('未找到商品管理新手引导弹窗');
                            return false;
                        });
                        
                        // 等待弹窗关闭
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.log('处理商品管理新手引导弹窗时出错:', error.message);
                    }
                    
                    // 5. 点击创建分类按钮
                    console.log('正在查找并点击创建分类按钮...');
                    await page.evaluate(() => {
                        const createCategoryButton = Array.from(document.querySelectorAll('.dj-button-content'))
                            .find(btn => btn.textContent.includes('创建分类'));
                        
                        if (createCategoryButton) {
                            console.log('找到创建分类按钮，点击它');
                            createCategoryButton.closest('button').click();
                            return true;
                        }
                        console.log('未找到创建分类按钮');
                        return false;
                    });
                    
                    // 等待分类创建弹窗出现
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 6. 输入分类名称并确认
                    console.log('正在输入分类名称...');
                    // 分类名称数组，创建多个分类
                    const categoryNames = this.categoryNames[0];
                    
                    // 循环创建分类
                    for (const categoryName of categoryNames) {
                        console.log(`开始创建分类: ${categoryName}`);
                        try {
                            // 确保页面状态稳定后再开始新的分类创建
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            
                            // 点击创建分类按钮
                            const createButtonResult = await page.evaluate(() => {
                                const createCategoryButton = Array.from(document.querySelectorAll('.dj-button-content'))
                                    .find(btn => btn.textContent.includes('创建分类'));
                                
                                if (createCategoryButton) {
                                    console.log('找到创建分类按钮，点击它');
                                    createCategoryButton.closest('button').click();
                                    return true;
                                }
                                console.log('未找到创建分类按钮');
                                return false;
                            });
                            
                            console.log(`创建分类按钮点击结果: ${createButtonResult ? '成功' : '失败'}`);
                            
                            // 等待弹窗出现，增加等待时间
                            await new Promise(resolve => setTimeout(resolve, 2500));
                            
                            // 输入分类名称和选择图标
                            const inputResult = await page.evaluate((name) => {
                                console.log('开始输入分类名称:', name);
                                
                                // 尝试不同的选择器策略找到输入框
                                
                                // 1. 使用最精确的选择器 - 基于弹窗结构
                                const preciseInput = document.querySelector('.dj-modal-content .dj-form .dj-form-item:first-child .dj-input-panel-input');
                                if (preciseInput) {
                                    console.log('找到精确匹配的分类名称输入框');
                                    preciseInput.value = name;
                                    
                                    // 触发必要的事件
                                    preciseInput.dispatchEvent(new Event('input', { bubbles: true }));
                                    preciseInput.dispatchEvent(new Event('change', { bubbles: true }));
                                    preciseInput.dispatchEvent(new Event('blur', { bubbles: true }));
                                    
                                    console.log('输入后的值:', preciseInput.value);
                                    
                                    return { success: true, method: '精确选择器', value: preciseInput.value };
                                }
                                
                                console.log('所有选择器均未找到分类名称输入框');
                                return { success: false, method: '所有方法', error: '未找到输入框' };
                            }, categoryName);
                            
                            if (inputResult.success) {
                                console.log(`输入分类名称"${categoryName}"成功，使用方法: ${inputResult.method}`);
                            } else {
                                console.log(`输入分类名称"${categoryName}"失败: ${inputResult.error}`);
                            }
                            
                            // 等待输入完成，增加等待时间
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 点击确定按钮
                            const confirmResult = await page.evaluate(() => {
                                // 记录当前所有按钮
                                const allButtons = document.querySelectorAll('button');
                                console.log(`找到 ${allButtons.length} 个按钮`);
                                
                                // 首先尝试找到带有"确定"文本的按钮内容
                                const confirmButton = Array.from(document.querySelectorAll('.dj-button-content'))
                                    .find(btn => btn.textContent.includes('确定'));
                                
                                if (confirmButton) {
                                    console.log('找到确定按钮，点击它');
                                    confirmButton.closest('button').click();
                                    return '使用主选择器成功';
                                }
                                
                                // 尝试第二种方法 - 寻找所有按钮中的确定按钮
                                const submitButtons = Array.from(allButtons).filter(btn => {
                                    return btn.textContent.includes('确定') || 
                                           btn.textContent.includes('提交') || 
                                           btn.textContent.includes('保存') || 
                                           btn.textContent.includes('确认');
                                });
                                
                                if (submitButtons.length > 0) {
                                    console.log(`找到 ${submitButtons.length} 个确定/提交/保存按钮，点击第一个`);
                                    submitButtons[0].click();
                                    return '使用按钮文本选择器成功';
                                }
                                
                                // 尝试第三种方法 - 寻找模态框底部按钮
                                const modalFooters = document.querySelectorAll('.dj-modal-footer');
                                if (modalFooters.length > 0) {
                                    console.log(`找到 ${modalFooters.length} 个模态框底部`);
                                    const lastFooter = modalFooters[modalFooters.length - 1];
                                    const footerButtons = lastFooter.querySelectorAll('button');
                                    console.log(`最后一个模态框底部有 ${footerButtons.length} 个按钮`);
                                    
                                    // 通常确认按钮在最右边，所以取最后一个
                                    if (footerButtons.length > 0) {
                                        const okBtn = footerButtons[footerButtons.length - 1];
                                        console.log(`点击模态框底部最后一个按钮: ${okBtn.textContent}`);
                                        okBtn.click();
                                        return '使用模态框底部按钮选择器成功';
                                    }
                                }
                                
                                console.log('所有方法均未找到确定按钮');
                                return '所有方法均失败';
                            });
                            
                            console.log(`点击确定按钮结果: ${confirmResult}`);
                            
                            // 等待分类创建完成，增加等待时间
                            await new Promise(resolve => setTimeout(resolve, 4000));
                            
                            console.log(`尝试创建分类 ${categoryName} 的流程已完成，等待系统处理`);
                            // 检查分类是否成功创建
                            const categoryExists = await page.evaluate((catName) => {
                                const categoryElements = document.querySelectorAll('.category-name');
                                const categories = Array.from(categoryElements).map(el => el.textContent.trim());
                                console.log(`当前存在的分类: ${categories.join(', ')}`);
                                return categories.includes(catName);
                            }, categoryName);
                            
                            console.log(`分类 ${categoryName} ${categoryExists ? '已成功创建' : '可能未成功创建'}`);
                        } catch (error) {
                            console.error(`创建分类 ${categoryName} 时出错:`, error.message);
                        }
                    }
                    
                } catch (error) {
                    console.error('京东外卖商品获取失败:', error.message);
                    throw error;
                }
            }
            else if (this.element.leixing === '自定义5') {
                console.log('自定义5_start - 京东外卖商品获取');
                try {
                    // 等待页面加载完成
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 1. 处理新手引导弹窗 - 点击"跳过"按钮
                    try {
                        console.log('正在检查并处理新手引导弹窗...');
                        await page.evaluate(() => {
                            const skipButton = document.querySelector('.driver-popover-footer .close-guide');
                            if (skipButton) {
                                console.log('找到新手引导弹窗，点击跳过按钮');
                                skipButton.click();
                                return true;
                            }
                            console.log('未找到新手引导弹窗');
                            return false;
                        });
                        
                        // 等待弹窗关闭
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.log('处理新手引导弹窗时出错:', error.message);
                    }
                    
                    // 2. 点击商品管理菜单（如果未展开）
                    console.log('正在查找并点击商品管理菜单...');
                    await page.evaluate(() => {
                        // 检查商品管理菜单是否已经展开
                        const productManageMenu = document.querySelector('.dj-submenu.dj-submenu-top-level[data-code="489"]');
                        const isExpanded = productManageMenu && productManageMenu.querySelector('.dj-submenu-content.opened');
                        
                        if (productManageMenu && !isExpanded) {
                            // 找到菜单标题并点击它
                            const menuLabel = productManageMenu.querySelector('.dj-submenu-label');
                            if (menuLabel) {
                                console.log('找到商品管理菜单，点击它以展开');
                                menuLabel.click();
                                return true;
                            }
                        } else if (isExpanded) {
                            console.log('商品管理菜单已经展开');
                            return true;
                        }
                        console.log('未找到商品管理菜单');
                        return false;
                    });
                    
                    // 等待子菜单加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 3. 点击商家商品管理子菜单
                    console.log('正在查找并点击商家商品管理...');
                    await page.evaluate(() => {
                        // 直接通过data-path属性找到商家商品管理菜单项
                        const merchantProductItem = document.querySelector('.dj-menu-item[data-path="489,674"]');
                        
                        if (merchantProductItem) {
                            // 查找可点击的标签元素
                            const clickableElement = merchantProductItem.querySelector('.dj-menu-item-label') || merchantProductItem;
                            console.log('找到商家商品管理菜单，点击它');
                            clickableElement.click();
                            return true;
                        }
                        console.log('未找到商家商品管理菜单');
                        return false;
                    });
                    
                    // 等待页面加载
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 4. 处理可能出现的第二个新手引导弹窗 - 点击"跳过"按钮
                    try {
                        console.log('正在检查并处理商品管理新手引导弹窗...');
                        await page.evaluate(() => {
                            const skipButton = document.querySelector('.driver-popover-footer .close-guide');
                            if (skipButton) {
                                console.log('找到商品管理新手引导弹窗，点击跳过按钮');
                                skipButton.click();
                                return true;
                            }
                            console.log('未找到商品管理新手引导弹窗');
                            return false;
                        });
                        
                        // 等待弹窗关闭
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.log('处理商品管理新手引导弹窗时出错:', error.message);
                    }
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    console.log('正在查找并点击SPU管理菜单项...');
                    await page.evaluate(() => {
                        // 使用选择器寻找SPU管理菜单项
                        const menuItems = Array.from(document.querySelectorAll('li'));
                        const spuManageItem = menuItems.find(item => {
                            // 查找包含'SPU管理'文本的元素
                            return item.textContent && item.textContent.includes('SPU管理');
                        });
                        
                        if (spuManageItem) {
                            console.log('找到SPU管理菜单项，点击它');
                            spuManageItem.click();
                            return true;
                        }
                        console.log('未找到SPU管理菜单项');
                        return false;
                    });
                                        
                    // 5. 点击批量创建按钮
                    console.log('正在查找并点击批量创建按钮...');
                    await page.evaluate(() => {
                        // 使用提供的选择器寻找批量创建按钮
                        const batchCreateButtons = Array.from(document.querySelectorAll('.link-item'));
                        const batchCreateButton = batchCreateButtons.find(btn => {
                            // 查找标题包含'批量创建'的元素
                            const titleElement = btn.querySelector('.link-item-title');
                            return titleElement && titleElement.textContent.includes('批量创建');
                        });
                        
                        if (batchCreateButton) {
                            console.log('找到批量创建按钮，点击它');
                            batchCreateButton.click();
                            return true;
                        }
                        console.log('未找到批量创建按钮');
                        return false;
                    });

                    // 等待批量创建页面加载
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // 6. 查找并确保批量自主创建商品选项被选中
                    console.log('正在查找并点击批量自主创建商品选项...');
                    const selfCreateOption = await page.evaluate(() => {
                        // 使用提供的选择器查找所有批量自主创建商品选项
                        const radioPanels = document.querySelectorAll('.radio-panel');
                        if (!radioPanels || radioPanels.length === 0) {
                            console.log('未找到radio-panel元素');
                            return false;
                        }
                        
                        console.log(`找到 ${radioPanels.length} 个 radio-panel 元素`);
                        
                        // 遍历所有radio-panel，尝试查找和点击选项
                        let success = false;
                        
                        // 查找是否有已选中的单选按钮
                        let alreadyChecked = false;
                        for (let i = 0; i < radioPanels.length; i++) {
                            const checkedRadio = radioPanels[i].querySelector('label.dj-radio.is-checked');
                            if (checkedRadio && checkedRadio.querySelector('.dj-radio-label').textContent.includes('批量自主创建商品')) {
                                console.log(`panel ${i} 已有选中的批量自主创建商品选项`);
                                alreadyChecked = true;
                                success = true;
                                break;
                            }
                        }
                        
                        // 如果没有已选中的，尝试点击
                        if (!alreadyChecked) {
                            for (let i = 0; i < radioPanels.length; i++) {
                                const radioButton = radioPanels[i].querySelector('label.dj-radio');
                                const radioLabel = radioButton?.querySelector('.dj-radio-label');
                                
                                if (radioButton && radioLabel && radioLabel.textContent.includes('批量自主创建商品')) {
                                    console.log(`在panel ${i} 中找到批量自主创建商品选项，点击它`);
                                    
                                    // 尝试多种点击方法
                                    try {
                                        // 方法1: 直接点击
                                        radioButton.click();
                                        
                                        // 方法2: 点击输入元素
                                        const radioInput = radioButton.querySelector('input.dj-radio-original');
                                        if (radioInput) {
                                            radioInput.click();
                                            radioInput.checked = true;
                                            radioInput.dispatchEvent(new Event('change', { bubbles: true }));
                                        }
                                        
                                        // 方法3: 模拟鼠标事件
                                        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                                            radioButton.dispatchEvent(new MouseEvent(eventType, {
                                                view: window,
                                                bubbles: true,
                                                cancelable: true
                                            }));
                                        });
                                        
                                        success = true;
                                    } catch (e) {
                                        console.error(`点击出错: ${e.message}`);
                                    }
                                    
                                    break;
                                }
                            }
                        }
                        
                        // 检查是否有被选中的元素
                        setTimeout(() => {
                            const checkedAfter = document.querySelector('.radio-panel label.dj-radio.is-checked');
                            console.log('操作后选中状态:', checkedAfter ? '已选中' : '未选中');
                        }, 500);
                        
                        return success;
                    });

                    console.log(`批量自主创建商品选项处理结果: ${selfCreateOption ? '成功' : '失败'}`);

                    // 等待选项处理
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // 7. 点击上传元素
                    console.log('正在查找并点击文件上传区域...');
                    const uploadResult = await page.evaluate(() => {
                        // 使用提供的选择器查找上传区域
                        const uploadArea = document.querySelector('.dj-upload-demo .dj-dragger');
                        if (uploadArea) {
                            console.log('找到上传区域，点击它');
                            // 查找上传链接并点击
                            const uploadLink = uploadArea.querySelector('a');
                            if (uploadLink) {
                                uploadLink.click();
                                return true;
                            }
                            // 如果没找到链接，点击整个区域
                            uploadArea.click();
                            return true;
                        }
                        console.log('未找到上传区域');
                        return false;
                    });

                    console.log(`上传区域点击结果: ${uploadResult ? '成功' : '失败'}`);

                    // 等待文件选择对话框打开
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log('正在查找并点击文件上传区域...');
                    const uploadResult_2 = await page.evaluate(() => {
                        // 使用提供的选择器查找上传区域
                        const uploadArea = document.querySelector('.dj-upload-demo .dj-dragger');
                        if (uploadArea) {
                            console.log('找到上传区域，点击它');
                            // 查找上传链接并点击
                            const uploadLink = uploadArea.querySelector('a');
                            if (uploadLink) {
                                uploadLink.click();
                                return true;
                            }
                            // 如果没找到链接，点击整个区域
                            uploadArea.click();
                            return true;
                        }
                        console.log('未找到上传区域');
                        return false;
                    });

                    // 8. 上传指定的Excel文件
                    try {
                        // 获取用户ID用于找到正确的Excel文件
                        const userId = this.user_id; // 使用this.user_id而不是taskForm.user_id
                        const fileName = `BatchHandleCreateLightFoodSpu_${userId}.xls`;
                        const filePath = path.join(process.cwd(), fileName);
                        
                        console.log(`尝试上传文件: ${filePath}`);
                        
                        // 检查文件是否存在
                        if (fs.existsSync(filePath)) {
                            console.log('文件存在，准备上传');
                            
                            // 使用标准的Puppeteer文件上传方法
                            try {
                                // 找到上传按钮
                                console.log('定位上传按钮...');
                                await page.waitForSelector('.dj-upload-demo .dj-dragger', { timeout: 5000 });
                                
                                // 设置超时处理
                                let fileChooserPromise = page.waitForFileChooser({ timeout: 10000 });
                                
                                // 点击上传按钮
                                console.log('点击上传按钮...');
                                await page.click('.dj-upload-demo .dj-dragger');
                                
                                // 等待文件选择器出现
                                const fileChooser = await fileChooserPromise;
                                console.log('文件选择器已出现，正在设置文件...');
                                
                                // 设置文件
                                await fileChooser.accept([filePath]);
                                console.log('文件已选择，等待上传完成');
                                
                                // 等待上传处理
                                await new Promise(resolve => setTimeout(resolve, 5000));
                                
                                // 尝试查找确认按钮并点击（如果存在）
                                try {
                                    const confirmButtons = await page.$$eval('button', buttons => {
                                        const confirmBtns = buttons.filter(btn => {
                                            const text = btn.textContent.toLowerCase();
                                            return text.includes('确认') || 
                                                   text.includes('提交') || 
                                                   text.includes('开始上传') ||
                                                   text.includes('上传');
                                        });
                                        
                                        return confirmBtns.map(btn => ({
                                            text: btn.textContent,
                                            visible: btn.offsetParent !== null
                                        }));
                                    });
                                    
                                    if (confirmButtons.length > 0) {
                                        console.log('找到确认按钮:', confirmButtons);
                                        await page.evaluate(() => {
                                            const btns = Array.from(document.querySelectorAll('button')).filter(btn => {
                                                const text = btn.textContent.toLowerCase();
                                                return text.includes('确认') || 
                                                    text.includes('提交') || 
                                                    text.includes('开始上传') ||
                                                    text.includes('上传');
                                            });
                                            if (btns.length > 0) btns[0].click();
                                        });
                                        console.log('已点击确认按钮');
                                    } else {
                                        console.log('未找到确认按钮，继续执行');
                                    }
                                } catch (btnError) {
                                    console.log('查找确认按钮时出错:', btnError.message);
                                }
                                
                                // 检查上传状态
                                const uploadStatus = await page.evaluate(() => {
                                    // 检查成功或失败消息
                                    const successMsg = document.querySelector('.dj-message-success');
                                    const errorMsg = document.querySelector('.dj-message-error');
                                    const uploadList = document.querySelector('.dj-upload-list-item');
                                    
                                    if (successMsg) {
                                        return { success: true, message: successMsg.textContent };
                                    }
                                    
                                    if (errorMsg) {
                                        return { success: false, message: errorMsg.textContent };
                                    }
                                    
                                    if (uploadList) {
                                        return { 
                                            success: uploadList.classList.contains('is-success'),
                                            message: uploadList.textContent,
                                            html: uploadList.outerHTML
                                        };
                                    }
                                    
                                    return { success: null, message: '正在处理上传，状态未知' };
                                });
                                
                                console.log('上传操作完成，状态:', uploadStatus);
                                
                            } catch (uploadError) {
                                console.error('文件上传过程发生错误:', uploadError.message);
                                
                                // 尝试一种替代方法 - 直接设置文件输入
                                try {
                                    console.log('尝试替代方法上传文件...');
                                    const fileInput = await page.$('input[type="file"]');
                                    if (fileInput) {
                                        await fileInput.uploadFile(filePath);
                                        console.log('使用替代方法设置文件成功');
                                        
                                        // 触发变更事件
                                        await page.evaluate(() => {
                                            const input = document.querySelector('input[type="file"]');
                                            if (input) {
                                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                            }
                                        });
                                        
                                        await new Promise(resolve => setTimeout(resolve, 3000));
                                        console.log('替代方法处理完成');
                                    } else {
                                        console.error('未找到文件输入元素，无法使用替代方法');
                                    }
                                } catch (altError) {
                                    console.error('替代方法也失败:', altError.message);
                                }
                            }
                            
                        } else {
                            console.error(`文件不存在: ${filePath}`);
                            console.log('当前目录中的文件:');
                            try {
                                const files = fs.readdirSync(process.cwd());
                                console.log(files);
                            } catch (e) {
                                console.error('列出目录内容时出错:', e.message);
                            }
                        }
                    } catch (error) {
                        console.error('上传文件时出错:', error.message);
                        console.error(error.stack);
                    }
                                        
                } catch (error) {
                    console.error('京东外卖商品获取失败:', error.message);
                    throw error;
                }
            }
            else if (this.element.leixing === '自定义6') {
                console.log('自定义6_start - 京东外卖商品获取');
                try {
                    // 等待页面加载完成
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 1. 处理新手引导弹窗 - 点击"跳过"按钮
                    try {
                        console.log('正在检查并处理新手引导弹窗...');
                        await page.evaluate(() => {
                            const skipButton = document.querySelector('.driver-popover-footer .close-guide');
                            if (skipButton) {
                                console.log('找到新手引导弹窗，点击跳过按钮');
                                skipButton.click();
                                return true;
                            }
                            console.log('未找到新手引导弹窗');
                            return false;
                        });
                        
                        // 等待弹窗关闭
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.log('处理新手引导弹窗时出错:', error.message);
                    }
                    
                    // 2. 点击商品管理菜单（如果未展开）
                    console.log('正在查找并点击商品管理菜单...');
                    await page.evaluate(() => {
                        // 检查商品管理菜单是否已经展开
                        const productManageMenu = document.querySelector('.dj-submenu.dj-submenu-top-level[data-code="489"]');
                        const isExpanded = productManageMenu && productManageMenu.querySelector('.dj-submenu-content.opened');
                        
                        if (productManageMenu && !isExpanded) {
                            // 找到菜单标题并点击它
                            const menuLabel = productManageMenu.querySelector('.dj-submenu-label');
                            if (menuLabel) {
                                console.log('找到商品管理菜单，点击它以展开');
                                menuLabel.click();
                                return true;
                            }
                        } else if (isExpanded) {
                            console.log('商品管理菜单已经展开');
                            return true;
                        }
                        console.log('未找到商品管理菜单');
                        return false;
                    });
                    
                    // 等待子菜单加载
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 3. 点击商家商品管理子菜单
                    console.log('正在查找并点击商家商品管理...');
                    await page.evaluate(() => {
                        // 直接通过data-path属性找到商家商品管理菜单项
                        const merchantProductItem = document.querySelector('.dj-menu-item[data-path="489,674"]');
                        
                        if (merchantProductItem) {
                            // 查找可点击的标签元素
                            const clickableElement = merchantProductItem.querySelector('.dj-menu-item-label') || merchantProductItem;
                            console.log('找到商家商品管理菜单，点击它');
                            clickableElement.click();
                            return true;
                        }
                        console.log('未找到商家商品管理菜单');
                        return false;
                    });
                    
                    // 等待页面加载
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    
                    // 4. 处理可能出现的第二个新手引导弹窗 - 点击"跳过"按钮
                    try {
                        console.log('正在检查并处理商品管理新手引导弹窗...');
                        await page.evaluate(() => {
                            const skipButton = document.querySelector('.driver-popover-footer .close-guide');
                            if (skipButton) {
                                console.log('找到商品管理新手引导弹窗，点击跳过按钮');
                                skipButton.click();
                                return true;
                            }
                            console.log('未找到商品管理新手引导弹窗');
                            return false;
                        });
                        
                        // 等待弹窗关闭
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.log('处理商品管理新手引导弹窗时出错:', error.message);
                    }
                    
                    // 等待批量创建页面加载
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    // 6. 点击批量传图按钮
                    console.log('正在查找并点击批量传图按钮...');
                    await page.evaluate(() => {
                        const batchImgButtons = Array.from(document.querySelectorAll('.rightOperationPanelItem'));
                        const batchImgButton = batchImgButtons.find(btn => {
                            const titleElement = btn.querySelector('.rightOperationPanelTitle');
                            return titleElement && titleElement.textContent.includes('批量传图');
                        });
                        
                        if (batchImgButton) {
                            console.log('找到批量传图按钮，点击它');
                            batchImgButton.click();
                            return true;
                        }
                        console.log('未找到批量传图按钮');
                        return false;
                    });
            
                    // 等待批量传图页面加载
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 获取所有要上传的文件
                    const __filename = fileURLToPath(import.meta.url);
                    const __dirname = path.dirname(__filename);
                    const basePath = process.cwd();
                    
                    // 定义上传函数，处理SPU和SKU上传
                    const uploadZipFiles = async (filePrefix, isSpuUpload) => {
                        // 判断有多少个分卷ZIP文件需要上传
                        let zipFiles = [];
                        let partIndex = 1;
                        let partZipPath;
                        
                        do {
                            partZipPath = path.join(basePath, `${filePrefix}_${this.user_id}_part${partIndex}.zip`);
                            if (fs.existsSync(partZipPath)) {
                                zipFiles.push(partZipPath);
                                partIndex++;
                            } else {
                                break;
                            }
                        } while (true);
                        
                        console.log(`发现 ${zipFiles.length} 个${isSpuUpload ? 'SPU' : 'SKU'}图片ZIP文件需要上传`);
                        
                        // 如果没有文件可上传，返回
                        if (zipFiles.length === 0) {
                            console.log(`未找到任何可上传的${isSpuUpload ? 'SPU' : 'SKU'}图片ZIP文件`);
                            return;
                        }
                        
                        // 选择上传类型
                        console.log(`正在选择${isSpuUpload ? 'SPU' : 'SKU'}上传类型...`);
                        await page.evaluate((isSpu) => {
                            // 选择SPU或SKU上传类型
                            const uploadTypeLabels = Array.from(document.querySelectorAll('.dj-radio-label'));
                            const targetLabel = uploadTypeLabels.find(label => 
                                isSpu 
                                ? label.textContent.includes('使用商品编码批量上传，适用于SPU图片上传')
                                : label.textContent.includes('使用SKU编码批量上传，适用于SKU或SPU-SKU图片上传')
                            );
                            
                            if (targetLabel) {
                                console.log(`找到${isSpu ? 'SPU' : 'SKU'}上传类型选项，点击它`);
                                targetLabel.click();
                                return true;
                            }
                            console.log(`未找到${isSpu ? 'SPU' : 'SKU'}上传类型选项`);
                            return false;
                        }, isSpuUpload);
                        
                        // 等待选择反应
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // 选择编码类型
                        console.log(`正在选择${isSpuUpload ? '商家SPU' : '商家SKU'}编码...`);
                        await page.evaluate((isSpu) => {
                            const codeTypeLabels = Array.from(document.querySelectorAll('.dj-radio-label'));
                            const targetLabel = codeTypeLabels.find(label => 
                                isSpu 
                                ? label.textContent.includes('商家SPU编码')
                                : label.textContent.includes('商家SKU编码')
                            );
                            
                            if (targetLabel) {
                                console.log(`找到${isSpu ? '商家SPU' : '商家SKU'}编码选项，点击它`);
                                targetLabel.click();
                                return true;
                            }
                            console.log(`未找到${isSpu ? '商家SPU' : '商家SKU'}编码选项`);
                            return false;
                        }, isSpuUpload);
                        
                        // 等待选择反应
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // 选择替换方式
                        console.log('正在选择替换方式...');
                        await page.evaluate(() => {
                            const replaceLabels = Array.from(document.querySelectorAll('.dj-radio-label'));
                            const targetLabel = replaceLabels.find(label => 
                                label.textContent.includes('根据编号替换对应位置的图片')
                            );
                            
                            if (targetLabel) {
                                console.log('找到替换方式选项，点击它');
                                targetLabel.click();
                                return true;
                            }
                            console.log('未找到替换方式选项');
                            return false;
                        });
                        
                        // 等待选择反应
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // 为每个文件执行上传流程
                        for (let zipIndex = 0; zipIndex < zipFiles.length; zipIndex++) {
                            const currentZipFile = zipFiles[zipIndex];
                            console.log(`开始处理第 ${zipIndex+1}/${zipFiles.length} 个文件: ${currentZipFile}`);
                            
                            // 点击上传按钮
                            await page.evaluate(() => {
                                const uploadButtons = Array.from(document.querySelectorAll('.dj-upload-demo .dj-upload__text a'));
                                if (uploadButtons.length > 0) {
                                    console.log('找到上传按钮，点击它');
                                    uploadButtons[0].click();
                                    return true;
                                }
                                console.log('未找到上传按钮');
                                return false;
                            });
                            
                            // 等待上传按钮点击后的反应
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            try {
                                // 精确定位接受.zip文件的上传组件
                                const targetComponent = await page.evaluate(() => {
                                    // 查找所有上传组件
                                    const uploadComponents = document.querySelectorAll('.dj-upload');
                                    // 遍历寻找接受.zip文件的组件
                                    for (let i = 0; i < uploadComponents.length; i++) {
                                        const component = uploadComponents[i];
                                        const fileInput = component.querySelector('input[type="file"]');
                                        const acceptAttr = fileInput ? fileInput.getAttribute('accept') : '';
                                        
                                        if (fileInput && acceptAttr === '.zip') {
                                            console.log(`找到目标ZIP上传组件 #${i+1}`);
                                            // 确保输入框可见
                                            if (fileInput.classList.contains('hide')) {
                                                fileInput.classList.remove('hide');
                                            }
                                            fileInput.style.display = 'block';
                                            fileInput.style.opacity = '1';
                                            fileInput.style.visibility = 'visible';
                                            fileInput.style.zIndex = '9999';
                                            
                                            return {
                                                index: i,
                                                hasZipInput: true
                                            };
                                        }
                                    }
                                    
                                    return { index: -1, hasZipInput: false };
                                });
                                
                                if (!targetComponent.hasZipInput) {
                                    console.log('未找到接受ZIP文件的上传组件');
                                    continue;
                                }
                                
                                console.log(`成功定位到第 ${targetComponent.index + 1} 个上传组件（支持ZIP文件）`);
                                
                                // 找到并上传文件 - 直接操作文件输入框
                                const fileInput = await page.$('input[type="file"][accept=".zip"]');
                                if (fileInput) {
                                    console.log('找到ZIP文件输入框，准备上传文件');
                                    // 上传当前文件
                                    await fileInput.uploadFile(currentZipFile);
                                    
                                    // 手动触发多种事件
                                    await page.evaluate(() => {
                                        const fileInputs = document.querySelectorAll('input[type="file"][accept=".zip"]');
                                        for (const input of fileInputs) {
                                            // 按先后顺序触发多个事件
                                            ['click', 'focus', 'input', 'change'].forEach(eventType => {
                                                const event = new Event(eventType, { bubbles: true });
                                                input.dispatchEvent(event);
                                            });
                                        }
                                    });
                                    
                                    console.log(`文件已成功上传: ${currentZipFile}`);
                                    
                                    // 等待文件处理 - 30秒
                                    console.log('等待30秒让文件处理完成...');
                                    await new Promise(resolve => setTimeout(resolve, 30000));
                                    
                                    // 查看是否有确认按钮需要点击
                                    const hasConfirmButton = await page.evaluate(() => {
                                        const confirmButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
                                            btn.textContent.includes('确认') || 
                                            btn.textContent.includes('提交') || 
                                            btn.textContent.includes('确定'));
                                        
                                        if (confirmButtons.length > 0) {
                                            console.log('找到确认按钮，自动点击');
                                            confirmButtons[0].click();
                                            return true;
                                        }
                                        return false;
                                    });
                                    
                                    console.log(`确认按钮状态: ${hasConfirmButton ? '已点击' : '未找到'}`);
                                    
                                    // 等待确认按钮操作完成
                                    await new Promise(resolve => setTimeout(resolve, 3000));
                                } else {
                                    console.log('未找到ZIP文件输入框');
                                }
                            } catch (error) {
                                console.error('文件上传过程出错:', error.message);
                            }
                        }
                    };
                    
                    // 先上传SPU图片
                    console.log('开始上传SPU图片...');
                    await uploadZipFiles('product_images_spu_id', true);
                    
                    // 再上传SKU图片
                    console.log('开始上传SKU图片...');
                    await uploadZipFiles('product_images_sku_id', false);
                    
                    console.log('所有图片上传完成');
                    return true;
                   
                } catch (error) {
                    console.error('京东外卖商品获取失败:', error.message);
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
                            info.title = titleElement ? titleElement.textContent.trim() : '';

                            // 提取作者信息
                            const authorElement = element.querySelector('.author');
                            if (authorElement) {
                                info.authorName = authorElement.querySelector('.name').textContent.trim();
                                info.authorAvatar = authorElement.querySelector('img').src;
                                info.authorLink = authorElement.href;
                            }

                            // 提取封面图片
                            const coverElement = element.querySelector('.cover img');
                            info.coverImage = coverElement ? coverElement.src : '';

                            // 提取笔记链接
                            const linkElement = element.querySelector('.cover');
                            info.noteLink = linkElement ? linkElement.href : '';

                            // 提取点赞数
                            const likeElement = element.querySelector('.like-wrapper .count');
                            info.likeCount = likeElement ? likeElement.textContent.trim() : '';

                            // 提取推荐原因
                            const reasonElement = element.querySelector('.recommend-reason-text');
                            info.recommendReason = reasonElement ? reasonElement.textContent.trim() : '';
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
                            if (noteInfo.noteLink !== '') {
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