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


async function waitForTableData(page, task_name, cityname) {
    try {
        console.log('等待表格数据加载...');
        await page.waitForTimeout(10000);
        
        // 等待表格和分页器出现
        await Promise.all([
            page.waitForSelector('tr.table-row-module_row_tR-2M', { timeout: 30000, visible: true }),
            page.waitForSelector('article[data-widget="simpleTable-TablePagination"]', { timeout: 30000 })
        ]);
        

        // 获取总页数
        const totalPages = await page.evaluate(() => {
            // 首先尝试从总数信息获取
            const totalText = document.querySelector('.text-view-module_caption_1lZxA, .text-view-module_caption_ytwaB')?.textContent;
            if (totalText) {
                const match = totalText.match(/(\d+)中的/);
                if (match) {
                    const total = parseInt(match[1]);
                    return Math.ceil(total / 50); // 每页50条数据
                }
            }

            // 如果无法从总数信息获取，则从分页按钮获取
            // 用 data-widget 属性定位分页器
            const paginationArticle = document.querySelector('article[data-widget="simpleTable-TablePagination"]');
            if (!paginationArticle) {
                console.log('未找到分页器，返回1页');
                return 1;
            }
            const pagination = paginationArticle.querySelector('ul.pagination-module_pagination_2UpUe');
            if (!pagination) {
                console.log('未找到分页ul，返回1页');
                return 1;
            }

            const buttons = Array.from(pagination.querySelectorAll('button'));
            console.log('分页按钮数量:', buttons.length);
            
            // 输出所有按钮的文本内容以便调试
            buttons.forEach((btn, index) => {
                console.log(`按钮 ${index + 1} 文本:`, btn.textContent.trim());
            });

            const pageNumbers = buttons
                .map(btn => btn.textContent.trim())
                .filter(text => /^\d+$/.test(text))
                .map(Number);

            const maxPage = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
            console.log('找到的最大页码:', maxPage);
            return maxPage;
        });

        console.log('总页数:', totalPages);
        let allData = [];

        // 遍历每一页
        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
            console.log(`正在处理第 ${currentPage}/${totalPages} 页`);

            // 如果不是第一页，需要点击翻页按钮
            if (currentPage > 1) {
                await page.evaluate((pageNum) => {
                    // 用 data-widget 属性定位分页器，ul用模糊匹配
                    const paginationArticle = document.querySelector('article[data-widget="simpleTable-TablePagination"]');
                    if (!paginationArticle) return;
                    const pagination = paginationArticle.querySelector('ul[class*="pagination-module_pagination"]');
                    if (!pagination) return;
                    const buttons = Array.from(pagination.querySelectorAll('button'));
                    const targetButton = buttons.find(btn => btn.textContent.trim() === String(pageNum));
                    if (targetButton) {
                        targetButton.click();
                    }
                }, currentPage);

                // 等待新数据加载
                await page.waitForFunction(() => {
                    // 更新加载指示器选择器，添加多种可能的类名
                    const loadingIndicator = document.querySelector('.loading-module_loading_2Yqkq, .loading-module_loading_3pPGW');
                    return !loadingIndicator;
                }, { timeout: 30000 });
                
                // 确保新数据已加载
                await page.waitForTimeout(5000);
            }

            // 提取当前页数据
            const pageData = await page.evaluate(() => {
                // 使用更通用的选择器匹配可能的行样式
                const rows = document.querySelectorAll('tr.table-row-module_row_tR-2M, tr.table-row-module_row_JSSv0, tr.table-row-module_hoverable_1BGOb');
                console.log(`找到 ${rows.length} 行数据`);
                
                return Array.from(rows).map(row => {
                    try {
                        // 获取产品信息 - 兼容多种可能的类名
                        const nameCell = row.querySelector('.styles_nameCellContent_3a8_L, .styles_nameCellContent_vSzxt');
                        const nameLink = nameCell?.querySelector('a');
                        const name = nameLink?.textContent?.trim() || '';
                        const productUrl = nameLink?.href || '';
                        const productId = productUrl ? (productUrl.split('/product/')[1] || '').split('?')[0] : '';
                        
                        // 获取图片信息 - 兼容多种可能的类名
                        const imgElement = row.querySelector('.styles_nameCellImage_oiDkW img, .styles_nameCellImage_C8Ibb img');
                        const imageUrl = imgElement?.src || '';
                        
                        // 获取品牌和卖家信息 - 兼容多种可能的类名
                        const brandDivs = nameCell?.querySelectorAll('.styles_brand_3WOGM, .styles_brand_ofFTK');
                        const brand = brandDivs?.[0]?.querySelector('span')?.getAttribute('title')?.trim() || '';
                        const seller = brandDivs?.[1]?.querySelector('span')?.getAttribute('title')?.trim() || '';
                        
                        // 获取货号
                        let skuNumber = '';
                        if (brandDivs && brandDivs.length > 2) {
                            const skuText = brandDivs[2]?.textContent || '';
                            skuNumber = skuText.replace('货号:', '').trim();
                        }

                        // 获取类别信息 - 兼容多种可能的类名
                        const categoryCell = row.querySelector('.styles_categoryCellContent_2bvg3, .styles_categoryCellContent_F4-Hx');
                        const category1 = categoryCell?.querySelector('.styles_category1_1rCWs, .styles_category1_dyX7k')?.textContent?.trim() || '';
                        const category3 = categoryCell?.querySelector('.styles_category3_36tVL, .styles_category3_gAkdH')?.textContent?.trim() || '';

                        // 获取其他数据列 - 兼容多种可能的类名
                        const cells = Array.from(row.querySelectorAll('.table-cell-module_td_p43QB, .table-cell-module_td__Gx82'));
                        
                        // 更稳健的数据获取方法
                        const getData = (index) => {
                            const cell = cells[index];
                            if (!cell) return '';
                            
                            // 优先使用具有特定类的元素
                            const sortableContent = cell.querySelector('.styles_sortableCellContent_2WeWK, .styles_sortableCellContent_gIxEQ');
                            if (sortableContent) {
                                return sortableContent.textContent.trim();
                            }
                            
                            // 备用：直接获取单元格文本
                            return cell.textContent.trim();
                        };

                        return {
                            name,
                            productUrl,
                            productId,
                            imageUrl,
                            brand,
                            seller,
                            skuNumber,
                            category1,
                            category3,
                            orderAmount: getData(3),
                            turnoverDynamics: getData(4),
                            salesVolume: getData(5),
                            averagePrice: getData(6),
                            availability: getData(7),
                            workingMode: getData(11),
                            deliveryDays: getData(12),
                            volume: getData(13),
                            searchViews: getData(14),
                            cardViews: getData(15),
                            searchToCartRate: getData(16),
                            cardToCartRate: getData(17),
                            adShare: getData(18),
                            createDate: getData(19)
                        };
                    } catch (error) {
                        console.error('处理行数据时出错:', error);
                        return {
                            name: '数据提取失败',
                            error: error.message
                        };
                    }
                });
            });

            // 添加到总数据中
            allData = allData.concat(pageData);
            console.log(`第 ${currentPage} 页数据提取完成，当前总数据条数: ${allData.length}`);
            
            // 每页处理完后稍作等待
            await page.waitForTimeout(5000);
        }

        // 保存所有数据
        if (allData.length > 0) {
            const config = loadConfig('config/config.json');
            const outputHandler = OutputFactory.createOutputHandler(config.outputFormat);
            outputHandler.handle(allData, 'output', task_name, cityname);
            console.log(`所有数据已保存，总条数: ${allData.length}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('等待表格数据时发生错误:', error);
        return false;
    }
}

export class ClickTask extends Task {
    constructor(element, browser, task_name, cityname) {
        super('click', element, null, null, task_name, cityname);
        this.browser = browser;
        console.log('ClickTask task_name:', this.task_name);
        console.log('ClickTask cityname:', this.cityname);
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
            if (this.element.innerText.includes('保存当前页') || this.element.innerText.includes('同步未推送站点') ||
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
                        try {
                            // 等待页面完全加载
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            
                            // 使用更通用的选择器，包含部分匹配
                            let filterButtons = Array.from(document.querySelectorAll('button[class*="filter-chip-module_filterChip"]'));
                            window.logToConsole('(第一次尝试)找到的按钮数量:', filterButtons.length);
                            
                            // 如果没找到，尝试其他可能的选择器
                            if (filterButtons.length === 0) {
                                filterButtons = Array.from(document.querySelectorAll('button[class*="filterChip"]'));
                                window.logToConsole('(第二次尝试)找到的按钮数量:', filterButtons.length);
                            }
                            
                            // 更广泛的匹配
                            if (filterButtons.length === 0) {
                                filterButtons = Array.from(document.querySelectorAll('button[class*="filter"'));
                                window.logToConsole('(第三次尝试)找到的按钮数量:', filterButtons.length);
                            }
                            
                            // 记录所有按钮的文本，帮助调试
                            if (filterButtons.length > 0) {
                                window.logToConsole('所有筛选按钮文本:');
                                filterButtons.forEach((btn, index) => {
                                    window.logToConsole(`按钮 ${index + 1}: ${btn.textContent.trim()}`);
                                });
                            }
                            
                            let categoryButton = filterButtons.find(button => {
                                const text = button.textContent.trim();
                                window.logToConsole('检查按钮文本:', text);
                                return text && (
                                    text.includes('类别') ||
                                    text.includes('分类') ||
                                    text.includes('品类') ||
                                    text.includes('Category') ||
                                    /^类别[:：].*$/.test(text)
                                );
                            });

                            // 如果没找到，尝试获取所有按钮并查找含有"类别"的按钮
                            if (!categoryButton) {
                                window.logToConsole('未找到类别按钮，尝试查找所有按钮');
                                const allButtons = Array.from(document.querySelectorAll('button'));
                                window.logToConsole('找到所有按钮数量:', allButtons.length);
                                
                                if (allButtons.length > 0) {
                                    window.logToConsole('所有按钮文本:');
                                    allButtons.forEach((btn, index) => {
                                        window.logToConsole(`按钮 ${index + 1}: ${btn.textContent.trim()}`);
                                    });
                                }
                                
                                categoryButton = allButtons.find(btn => {
                                    const text = btn.textContent.trim().toLowerCase();
                                    return text.includes('类别') || 
                                           text.includes('分类') || 
                                           text.includes('品类') ||
                                           text.includes('category');
                                });
                            }
                            
                            // 截图记录当前页面状态
                            try {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                const width = window.innerWidth;
                                const height = window.innerHeight;
                                canvas.width = width;
                                canvas.height = height;
                                
                                // 如果找到了类别按钮，给它添加红框标记
                                if (categoryButton) {
                                    const rect = categoryButton.getBoundingClientRect();
                                    categoryButton.style.border = '3px solid red';
                                    window.logToConsole(`找到类别按钮位置: x=${rect.left}, y=${rect.top}, w=${rect.width}, h=${rect.height}`);
                                }
                                
                                window.logToConsole('已记录当前页面状态');
                            } catch (e) {
                                window.logToConsole('截图失败:', e.toString());
                            }

                            // 如果真的找不到按钮，尝试检查是否已经在筛选界面
                            if (!categoryButton) {
                                window.logToConsole('未找到任何类别相关按钮，检查是否已在筛选界面');
                                
                                // 检查是否有清空和应用按钮，这表明可能已经在筛选界面
                                const hasFilterPanel = !!document.querySelector('div[role="dialog"]') || 
                                                 Array.from(document.querySelectorAll('button')).some(btn => 
                                                    btn.textContent.trim() === '应用' || btn.textContent.trim() === '清空');
                                
                                if (hasFilterPanel) {
                                    window.logToConsole('检测到可能已在筛选界面，继续执行后续流程');
                                    return true; // 允许流程继续
                                }
                                
                                window.logToConsole('无法找到类别按钮，也未检测到筛选界面');
                                            return false;
                                    }

                                    window.logToConsole('找到类别按钮，准备点击');
                                    
                                        // 添加高亮效果帮助调试
                            const originalBorder = categoryButton.style.border;
                            const originalBackground = categoryButton.style.background;
                            categoryButton.style.border = '3px solid red';
                            categoryButton.style.background = 'rgba(255, 0, 0, 0.2)';
                            
                            try {
                                // 创建并分发所有鼠标事件
                                            const events = [
                                                new MouseEvent('mousedown', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window,
                                                    buttons: 1
                                                }),
                                                new MouseEvent('mouseup', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window,
                                                    buttons: 1
                                                }),
                                                new MouseEvent('click', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window,
                                                    buttons: 1
                                                })
                                            ];

                                            for (const event of events) {
                                    categoryButton.dispatchEvent(event);
                                                await new Promise(r => setTimeout(r, 100));
                                            }
                                            
                                            // 尝试原生点击
                                categoryButton.click();
                                            
                                            // 等待弹窗出现
                                            return await new Promise(resolve => {
                                    // 先给一个短暂延迟确保点击事件处理完成
                                    setTimeout(async () => {
                                        try {
                                            // 检查是否有筛选面板出现
                                            const filterPanel = document.querySelector('div[role="dialog"]') || 
                                                              document.querySelector('[class*="dropdown-module_wrapper"]');
                                            
                                            if (filterPanel) {
                                                window.logToConsole('检测到筛选面板已打开');
                                                resolve(true);
                                                return;
                                            }
                                            
                                            // 查找清空按钮 - 使用更通用的选择器
                                            const clearButton = Array.from(document.querySelectorAll('button')).find(button => {
                                                return button.textContent.trim().includes('清空');
                                                    });

                                                    if (clearButton) {
                                                window.logToConsole('找到清空按钮，点击面板已打开');
                                                // 可选择点击清空按钮
                                                        clearButton.click();
                                                        window.logToConsole('清空按钮点击完成');
                                                        resolve(true);
                                                    } else {
                                                // 再次尝试点击按钮
                                                window.logToConsole('未检测到筛选面板，尝试再次点击');
                                                categoryButton.click();
                                                
                                                // 给更长的等待时间让面板显示
                                                setTimeout(() => {
                                                    window.logToConsole('二次检查筛选面板');
                                                    const panelExists = !!document.querySelector('div[role="dialog"]') || 
                                                                   Array.from(document.querySelectorAll('button')).some(btn => 
                                                                     btn.textContent.trim() === '应用' || btn.textContent.trim() === '清空');
                                                    
                                                    if (panelExists) {
                                                        window.logToConsole('二次检查发现筛选面板已打开');
                                                        resolve(true);
                                                    } else {
                                                        // 即使面板未打开，也返回成功，让后续步骤检查
                                                        window.logToConsole('未发现筛选面板，但继续执行流程');
                                                        resolve(true);
                                                    }
                                                }, 3000);
                                            }
                                        } catch (error) {
                                            window.logToConsole('检查筛选面板时出错:', error.toString());
                                            // 即使有错误也尝试继续流程
                                            resolve(true);
                                        }
                                    }, 1000);
                                            });
                                        } catch (error) {
                                            window.logToConsole('点击失败:', error.toString());
                                window.logToConsole('错误堆栈:', error.stack);
                                            // 恢复原始样式
                                categoryButton.style.border = originalBorder;
                                categoryButton.style.background = originalBackground;
                                            return false;
                                        } finally {
                                            // 确保延迟后恢复原始样式
                                            setTimeout(() => {
                                    categoryButton.style.border = originalBorder;
                                    categoryButton.style.background = originalBackground;
                                            }, 5000);
                                    }
                                } catch (error) {
                            window.logToConsole('整体执行失败:', error.toString());
                                    window.logToConsole('错误堆栈:', error.stack);
                            // 即使出错，也尝试继续流程
                            return true;
                                }
                            });

                    // 即使点击结果失败，也尝试继续执行，增加容错性
                            if (!clickResult) {
                        console.log('类别按钮点击可能失败，尝试继续执行');
                        // throw new Error('类别按钮点击失败'); // 注释掉这行，不中断流程
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
                            let targetItem = null;  // 添加变量存储整个类别项
                            let categoryName = '';
                            let parentId = '';
                            let treeContainer = null;
                                    let lastScrollTop = 0;

                            // 获取树形容器的函数 - 更新选择器列表
                            async function getTreeContainer() {
                                // 更新选择器列表，添加新的选择器
                                        const selectors = [
                                            '.dropdown-module_scrollContainer_3wIcU', // 新增
                                            '.dropdown-module_wrapper_3ZnAD',         // 新增
                                            '.tree-module_tree_3gXxM',                // 新增
                                            '[class*="tree-module_tree"]',            // 新增 - 部分匹配
                                            '.semi-tree-virtual-list',                // 原有
                                            '.semi-tree-body',                        // 原有
                                            '.semi-tree',                             // 原有
                                            '[role="tree"]',                          // 原有
                                            '.index_busyBoxContent_DXoM8'             // 新增
                                        ];
                                        
                                        for (const selector of selectors) {
                                            const container = document.querySelector(selector);
                                            if (container) {
                                                window.logToConsole(`找到树形容器，使用选择器: ${selector}`);
                                                return container;
                                            }
                                        }
                                        
                                // 如果还是找不到，尝试找到任何可滚动的父容器
                                // 更新类选择器为通用方式
                                        const firstTreeItem = document.querySelector('[class*="tree-item-module_treeItem"]');
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

                            // 滚动处理函数 - 更新选择器
                            async function handleScroll(container) {
                                if (!container) {
                                    window.logToConsole('容器不存在，无法执行滚动');
                                    return false;
                                }

                                try {
                                    // 更新骨架屏选择器为通用方式
                                    const skeletonElements = document.querySelectorAll('[class*="skeleton-common-base-module_skeleton"]');
                                    if (skeletonElements.length > 0) {
                                        window.logToConsole('发现骨架屏，滚动到骨架屏元素');
                                        skeletonElements[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        return true;
                                    }

                                    const currentScrollTop = container.scrollTop;
                                    container.scrollTop += 300;
                                    
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

                            // 查找目标类别并在需要时滚动 - 更新选择器
                            async function findTargetInTree() {
                                // 更新选择器为通用方式
                                const treeItems = document.querySelectorAll('[class*="tree-item-module_treeItem"]');
                                window.logToConsole(`找到 ${treeItems.length} 个树形项目`);
                                
                                for (const item of treeItems) {
                                    // 更新选择器为通用方式
                                    const label = item.querySelector('[class*="data-content-module_label"]');
                                    if (label) {
                                        const text = label.textContent.trim();
                                        window.logToConsole('按钮文本:', text);
                                        if (text === clickValue) {
                                            targetButton = label;
                                            targetItem = item;  // 保存整个类别项
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

                            // 主要的查找和滚动逻辑
                            let scrollAttempts = 0;
                            const maxScrollAttempts = 15;

                            treeContainer = await getTreeContainer();
                            if (!treeContainer) {
                                window.logToConsole('初始化时未找到树形容器');
                                return [];
                            }

                            // 查找目标类别
                            while (scrollAttempts < maxScrollAttempts) {
                                if (await findTargetInTree()) {
                                    break;
                                }

                                const scrollSuccess = await handleScroll(treeContainer);
                                if (!scrollSuccess) {
                                    treeContainer = await getTreeContainer();
                                    if (!treeContainer) {
                                        window.logToConsole('重新获取树形容器失败');
                                        break;
                                    }
                                }

                                await new Promise(resolve => setTimeout(resolve, 1500));
                                scrollAttempts++;
                            }

                            if (!targetButton) {
                                window.logToConsole(`未找到类别: ${clickValue}`);
                                return [];
                            }

                            // 改进的点击逻辑 - 优先尝试点击箭头按钮
                            window.logToConsole(`准备点击类别: ${categoryName}`);
                            
                            // 尝试找到箭头按钮
                            const arrowButton = targetItem.querySelector('[class*="tree-item-module_buttonMarker"] button') || 
                                             targetItem.querySelector('[class*="subtreeMarker"] button');
                            
                            let clickSuccess = false;
                            if (arrowButton) {
                                window.logToConsole('找到箭头按钮，优先点击');
                                
                                // 防止事件冒泡导致点击后折叠
                                const preventPropagation = function(e) {
                                    e.stopPropagation();
                                };
                                
                                try {
                                    // 添加事件拦截
                                    document.body.addEventListener('click', preventPropagation, true);
                                    
                                    // 尝试多种点击方式
                                    arrowButton.click();
                                    
                                    // 如果原生点击可能不起作用，尝试创建事件
                                    const clickEvent = new MouseEvent('click', {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        buttons: 1
                                    });
                                    arrowButton.dispatchEvent(clickEvent);
                                    
                                    window.logToConsole('箭头按钮点击完成');
                                    clickSuccess = true;
                                } catch (clickError) {
                                    window.logToConsole('箭头按钮点击失败:', clickError.toString());
                                } finally {
                                    // 移除事件拦截
                                    document.body.removeEventListener('click', preventPropagation, true);
                                }
                            }
                            
                            // 如果箭头按钮点击失败，回退到原来的点击方式
                            if (!clickSuccess) {
                                window.logToConsole('箭头按钮点击失败或未找到，尝试点击标签');
                                const clickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true,
                                    buttons: 1
                                });
                                targetButton.dispatchEvent(clickEvent);
                                // 尝试原生点击作为备份
                                targetButton.click();
                            }
                            
                            window.logToConsole(`点击类别完成: ${categoryName}`);

                            // 等待子类别加载
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 检查子类别是否成功加载
                            const initialChildItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                            window.logToConsole(`初始子类别数量: ${initialChildItems.length}`);
                            
                            // 如果点击后没有加载子类别，重试一次点击
                            if (initialChildItems.length === 0) {
                                window.logToConsole('未检测到子类别，尝试再次点击');
                                
                                // 尝试整行按钮点击
                                const rowButton = targetItem.querySelector('button');
                                if (rowButton) {
                                    rowButton.click();
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    
                                    // 再次检查
                                    const retryChildItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                    window.logToConsole(`重试后子类别数量: ${retryChildItems.length}`);
                                }
                            }
                            
                            // 后续代码不变
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
                            
                            // 定义一个函数来收集子类别 - 更新选择器
                            const collectSubcategories = () => {
                                const newSubcategories = [];
                                document.querySelectorAll(`[id^="${parentId}_"]`).forEach(element => {
                                    // 更新选择器为通用方式
                                    const labelElement = element.querySelector('[class*="data-content-module_label"]');
                                    if (labelElement) {
                                        const categoryInfo = {
                                            id: element.id,
                                            name: labelElement.textContent.trim(),
                                            // 改进子类别检测
                                            hasChildren: !!element.querySelector('[class*="tree-item-module_hasChildren"]') || 
                                                         !!element.querySelector('[class*="tree-item-module_hasSubtree"]') ||
                                                         !!element.querySelector('[class*="tree-item-module_subtreeMarker"]')
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
                            
                            // 滚动加载逻辑保持不变
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
                                
                                // 执行滚动 - 更新选择器
                                try {
                                    const visibleItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                    if (visibleItems.length > 0) {
                                        const lastItem = visibleItems[visibleItems.length - 1];
                                        // 更新选择器为通用方式
                                        const skeletonElements = document.querySelectorAll('[class*="skeleton-common-base-module_skeleton"]');
                                        
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

                                // 检查是否还有骨架屏元素 - 更新选择器
                                const skeletonElements = document.querySelectorAll('[class*="skeleton-common-base-module_skeleton"]');
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
                                    // 使用更通用的选择器，包含部分匹配
                                    const filterButtons = Array.from(document.querySelectorAll('button[class*="filter-chip-module_filterChip"]'));
                                    window.logToConsole('找到的按钮数量:', filterButtons.length);
                                    
                                    const categoryButton = filterButtons.find(button => {
                                        // 更新为部分匹配选择器
                                        const label = button.querySelector('[class*="filter-chip-module_label"]');
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

                                    // 如果没找到，尝试更通用的方法找到所有按钮
                                    if (!categoryButton) {
                                        window.logToConsole('未找到类别按钮，尝试更通用的搜索方法');
                                        const allButtons = Array.from(document.querySelectorAll('button'));
                                        const possibleCategoryButton = allButtons.find(btn => {
                                            const text = btn.textContent.trim();
                                            return text.includes('类别');
                                        });
                                        
                                        if (possibleCategoryButton) {
                                            window.logToConsole('通过通用搜索找到类别按钮');
                                            // 添加可视化标记，帮助调试
                                            possibleCategoryButton.style.border = '2px solid red';
                                            return await clickButtonWithRetry(possibleCategoryButton);
                                        } else {
                                            window.logToConsole('未找到类别按钮');
                                            return false;
                                        }
                                    }

                                    window.logToConsole('找到类别按钮，准备点击');
                                    return await clickButtonWithRetry(categoryButton);
                                    
                                    // 辅助函数：尝试多种方式点击按钮
                                    async function clickButtonWithRetry(button) {
                                        // 添加高亮效果帮助调试
                                        const originalBorder = button.style.border;
                                        button.style.border = '2px solid red';
                                        
                                        try {
                                            // 创建鼠标事件
                                            const events = [
                                                new MouseEvent('mousedown', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window,
                                                    buttons: 1
                                                }),
                                                new MouseEvent('mouseup', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window,
                                                    buttons: 1
                                                }),
                                                new MouseEvent('click', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window,
                                                    buttons: 1
                                                })
                                            ];

                                            // 触发所有事件
                                            for (const event of events) {
                                                button.dispatchEvent(event);
                                                await new Promise(r => setTimeout(r, 100));
                                            }
                                            
                                            // 尝试原生点击
                                            button.click();
                                            
                                            // 等待弹窗出现
                                            return await new Promise(resolve => {
                                                setTimeout(() => {
                                                    // 查找并点击清空按钮 - 使用更通用的选择器
                                                    const clearButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
                                                        // 更新为部分匹配选择器
                                                        const textSpan = button.querySelector('[class*="button-module_text"]') || button;
                                                        return textSpan.textContent.trim().startsWith('清空');
                                                    });

                                                    if (clearButton) {
                                                        window.logToConsole('找到清空按钮，准备点击');
                                                        clearButton.click();
                                                        window.logToConsole('清空按钮点击完成');
                                                        resolve(true);
                                                    } else {
                                                        window.logToConsole('未找到清空按钮，但继续执行');
                                                        // 即使未找到清空按钮，也返回成功
                                                        // 因为有可能过滤器面板已经打开
                                                        resolve(true);
                                                    }
                                                }, 2000);
                                            });
                                        } catch (error) {
                                            window.logToConsole('点击失败:', error.toString());
                                            // 恢复原始样式
                                            button.style.border = originalBorder;
                                            return false;
                                        } finally {
                                            // 确保延迟后恢复原始样式
                                            setTimeout(() => {
                                                button.style.border = originalBorder;
                                            }, 5000);
                                        }
                                    }
                                } catch (error) {
                                    window.logToConsole('点击失败:', error.toString());
                                    window.logToConsole('错误堆栈:', error.stack);
                                    return false;
                                }
                            });

                            if (!clickResult) {
                                throw new Error('类别按钮点击失败');
                            }

                            // 等待弹窗出现和页面加载
                            await page.waitForTimeout(3000);
                            
                            // 点击清空按钮
                            const clearResult = await page.evaluate(async () => {
                                try {
                                    // 1. 查找清空按钮 - 使用更通用的选择器
                                    const clearButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
                                        // 更新为部分匹配选择器
                                        const textSpan = button.querySelector('[class*="button-module_text"]') || button;
                                        return textSpan.textContent.trim().startsWith('清空');
                                    });

                                    if (!clearButton) {
                                        window.logToConsole('未找到清空按钮，但继续执行');
                                        // 即使未找到清空按钮，也返回成功
                                        return true;
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
                                    
                                    // 直接调用原生点击
                                    clearButton.click();
                                    
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
                                    return true;
                                } catch (error) {
                                    window.logToConsole('点击清空按钮失败:', error.toString());
                                    return true; // 继续执行不阻断流程
                                }
                            });

                            // 3. 点击主类目
                            await page.evaluate(async (clickValue) => {
                                try {
                                    // 使用更通用的选择器
                                    const treeItems = document.querySelectorAll('[class*="tree-item-module_treeItem"]');
                                    window.logToConsole(`寻找目标主类目: ${clickValue}, 找到树项目: ${treeItems.length}个`);
                                    
                                    let targetButton = null;
                                    let targetItem = null;
                                    
                                    for (const item of treeItems) {
                                        // 更新为部分匹配选择器
                                        const label = item.querySelector('[class*="data-content-module_label"]');
                                        if (label) {
                                            const text = label.textContent.trim();
                                            window.logToConsole('类目按钮文本:', text);
                                            if (text === clickValue) {
                                                targetButton = label;
                                                targetItem = item;
                                                break;
                                            }
                                        }
                                    }

                                    if (targetButton && targetItem) {
                                        window.logToConsole(`准备点击类别: ${clickValue}`);
                                        
                                        // 尝试找到箭头按钮进行点击
                                        const arrowButton = targetItem.querySelector('[class*="tree-item-module_buttonMarker"] button') || 
                                                         targetItem.querySelector('[class*="subtreeMarker"] button');
                                        
                                        if (arrowButton) {
                                            window.logToConsole('找到箭头按钮，优先点击');
                                            
                                            // 防止事件冒泡导致点击后折叠
                                            const preventPropagation = function(e) {
                                                e.stopPropagation();
                                            };
                                            
                                            try {
                                                // 添加事件拦截
                                                document.body.addEventListener('click', preventPropagation, true);
                                                
                                                // 尝试多种点击方式
                                                arrowButton.click();
                                                
                                                // 如果原生点击可能不起作用，尝试创建事件
                                                const clickEvent = new MouseEvent('click', {
                                                    view: window,
                                                    bubbles: true,
                                                    cancelable: true,
                                                    buttons: 1
                                                });
                                                arrowButton.dispatchEvent(clickEvent);
                                            } finally {
                                                // 移除事件拦截
                                                document.body.removeEventListener('click', preventPropagation, true);
                                            }
                                        } else {
                                            // 回退到标签点击
                                            window.logToConsole('未找到箭头按钮，点击标签');
                                            targetButton.click();
                                            
                                            const clickEvent = new MouseEvent('click', {
                                                view: window,
                                                bubbles: true,
                                                cancelable: true,
                                                buttons: 1
                                            });
                                            targetButton.dispatchEvent(clickEvent);
                                        }
                                        
                                        window.logToConsole(`点击类别: ${clickValue} 完成`);
                                        await new Promise(resolve => setTimeout(resolve, 2000));
                                    } else {
                                        window.logToConsole(`未找到目标主类目: ${clickValue}`);
                                    }
                                } catch (error) {
                                    window.logToConsole('点击主类目失败:', error.toString());
                                    window.logToConsole('错误堆栈:', error.stack);
                                }
                            }, cliclValue);

                            // 4. 点击子类目
                            await page.evaluate(async (subcategoryName, clickValue) => {
                                try {
                                    // 添加调试辅助函数
                                    function addDebugLog(message, level = 'info') {
                                        const colors = {
                                            info: 'color: #0066cc; font-weight: normal;',
                                            success: 'color: #00cc66; font-weight: bold;',
                                            warning: 'color: #ff9900; font-weight: bold;',
                                            error: 'color: #ff3300; font-weight: bold;'
                                        };
                                        console.log(`%c【子类目点击】${message}`, colors[level]);
                                        if (window.logToConsole) {
                                            window.logToConsole(`【子类目点击】${message}`);
                                        }
                                    }

                                    addDebugLog(`开始查找子类目: ${subcategoryName}`, 'info');
                                    
                                    // 等待页面加载
                                    await new Promise(resolve => setTimeout(resolve, 5000));
                                    
                                    // 1. 查找汽车用品主类目 - 复用获取子类别的代码结构
                                    let targetButton = null;
                                    let targetItem = null;
                                    let categoryName = '';
                                    let parentId = '';
                                    let treeContainer = null;
                                    let lastScrollTop = 0;
                                    
                                    // 获取树形容器
                                    async function getTreeContainer() {
                                        const selectors = [
                                            '.dropdown-module_scrollContainer_3wIcU',
                                            '.dropdown-module_wrapper_3ZnAD',
                                            '.tree-module_tree_3gXxM',
                                            '[class*="tree-module_tree"]',
                                            '.semi-tree-virtual-list',
                                            '.semi-tree-body',
                                            '.semi-tree',
                                            '[role="tree"]',
                                            '.index_busyBoxContent_DXoM8'
                                        ];
                                        
                                        for (const selector of selectors) {
                                            const container = document.querySelector(selector);
                                            if (container) {
                                                addDebugLog(`找到树形容器，使用选择器: ${selector}`, 'success');
                                                return container;
                                            }
                                        }
                                        
                                        // 找不到时的备用方法
                                        const firstTreeItem = document.querySelector('[class*="tree-item-module_treeItem"]');
                                        if (firstTreeItem) {
                                            let parent = firstTreeItem.parentElement;
                                            while (parent) {
                                                const style = window.getComputedStyle(parent);
                                                if (style.overflow === 'auto' || style.overflow === 'scroll' ||
                                                    style.overflowY === 'auto' || style.overflowY === 'scroll') {
                                                    addDebugLog('找到可滚动的父容器', 'success');
                                                    return parent;
                                                }
                                                parent = parent.parentElement;
                                            }
                                        }

                                        addDebugLog('未找到树形容器元素', 'error');
                                        return null;
                                    }
                                    
                                    // 滚动处理函数
                                    async function handleScroll(container) {
                                        if (!container) {
                                            addDebugLog('容器不存在，无法执行滚动', 'error');
                                            return false;
                                        }

                                        try {
                                            const skeletonElements = document.querySelectorAll('[class*="skeleton-common-base-module_skeleton"]');
                                            if (skeletonElements.length > 0) {
                                                addDebugLog('发现骨架屏，滚动到骨架屏元素', 'info');
                                                skeletonElements[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
                                                await new Promise(resolve => setTimeout(resolve, 1000));
                                                return true;
                                            }

                                            const currentScrollTop = container.scrollTop;
                                            container.scrollTop += 300;
                                            
                                            if (Math.abs(currentScrollTop - lastScrollTop) < 10) {
                                                addDebugLog('检测到滚动无效，可能已到达底部', 'warning');
                                                return false;
                                            }
                                            lastScrollTop = currentScrollTop;
                                            
                                            addDebugLog(`滚动状态 - 位置: ${container.scrollTop}`, 'info');
                                        return true;
                                        } catch (error) {
                                            addDebugLog('滚动操作失败: ' + error.toString(), 'error');
                                            return false;
                                        }
                                    }

                                    // 查找汽车用品主类目
                                    async function findAutoCategory(clickValue) {
                                        const treeItems = document.querySelectorAll('[class*="tree-item-module_treeItem"]');
                                        addDebugLog(`找到 ${treeItems.length} 个树形项目`, 'info');
                                        
                                        // 记录所有可见类目项文本，便于调试
                                        const itemTexts = [];
                                        
                                        for (const item of treeItems) {
                                            const label = item.querySelector('[class*="data-content-module_label"]');
                                            if (label) {
                                                const text = label.textContent.trim();
                                                itemTexts.push(text);
                                                
                                                // 使用clickValue进行匹配，而不是固定的"汽车用品"
                                                if (text === clickValue) {
                                                    targetButton = label;
                                                    targetItem = item;
                                                    categoryName = text;
                                                    parentId = item.id;
                                                    addDebugLog(`找到目标类目: "${text}"`, 'success');
                                                    
                                                    // 高亮显示
                                                    targetItem.style.background = 'rgba(255, 255, 0, 0.3)';
                                                    targetButton.style.outline = '2px solid red';
                                                    
                                                    return true;
                                                }
                                            }
                                        }
                                        
                                        // 如果没找到，记录所有已发现的类目，便于调试
                                        if (itemTexts.length > 0) {
                                            addDebugLog(`当前可见类目: ${itemTexts.slice(0, 15).join(', ')}${itemTexts.length > 15 ? '...' : ''}`, 'info');
                                        }
                                        
                                        return false;
                                    }
                                        
                                    // 2. 主要的查找和滚动逻辑 - 复用获取子类别的代码
                                    let scrollAttempts = 0;
                                    const maxScrollAttempts = 15;

                                    treeContainer = await getTreeContainer();
                                    if (!treeContainer) {
                                        addDebugLog('初始化时未找到树形容器', 'error');
                                            return false;
                                    }

                                    // 查找汽车用品主类目
                                    while (scrollAttempts < maxScrollAttempts) {
                                        if (await findAutoCategory(clickValue)) {
                                            break;
                                        }

                                        const scrollSuccess = await handleScroll(treeContainer);
                                        if (!scrollSuccess) {
                                            treeContainer = await getTreeContainer();
                                            if (!treeContainer) {
                                                addDebugLog('重新获取树形容器失败', 'error');
                                                break;
                                            }
                                        }

                                        await new Promise(resolve => setTimeout(resolve, 1500));
                                        scrollAttempts++;
                                    }

                                    if (!targetButton) {
                                        addDebugLog('未找到汽车用品类目', 'error');
                                    return false;
                                }

                                    // 3. 点击汽车用品主类目 - 复用获取子类别的点击逻辑
                                    addDebugLog(`准备点击汽车用品类目: ${categoryName}`, 'info');
                                    
                                    // 确保元素在视图中
                                    targetItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    
                                    // 尝试找到箭头按钮
                                    const arrowButton = targetItem.querySelector('[class*="tree-item-module_buttonMarker"] button') || 
                                                     targetItem.querySelector('[class*="subtreeMarker"] button');
                                    
                                    let clickSuccess = false;
                                    if (arrowButton) {
                                        addDebugLog('找到箭头按钮，优先点击', 'success');
                                        arrowButton.style.outline = '2px solid blue';
                                        
                                        // 防止事件冒泡导致点击后折叠
                                        const preventPropagation = function(e) {
                                            e.stopPropagation();
                                        };
                                        
                                        try {
                                            // 添加事件拦截
                                            document.body.addEventListener('click', preventPropagation, true);
                                            
                                            // 尝试多种点击方式
                                            arrowButton.click();
                                            
                                            // 如果原生点击可能不起作用，尝试创建事件
                                            const clickEvent = new MouseEvent('click', {
                                                view: window,
                                                bubbles: true,
                                                cancelable: true,
                                                buttons: 1
                                            });
                                            arrowButton.dispatchEvent(clickEvent);
                                            
                                            addDebugLog('箭头按钮点击完成', 'success');
                                            clickSuccess = true;
                                        } catch (clickError) {
                                            addDebugLog('箭头按钮点击失败: ' + clickError.toString(), 'error');
                                        } finally {
                                            // 移除事件拦截
                                            document.body.removeEventListener('click', preventPropagation, true);
                                        }
                                    }
                                    
                                    // 如果箭头按钮点击失败，回退到原来的点击方式
                                    if (!clickSuccess) {
                                        addDebugLog('箭头按钮点击失败或未找到，尝试点击标签', 'warning');
                                        const clickEvent = new MouseEvent('click', {
                                            view: window,
                                            bubbles: true,
                                            cancelable: true,
                                            buttons: 1
                                        });
                                        targetButton.dispatchEvent(clickEvent);
                                        // 尝试原生点击作为备份
                                        targetButton.click();
                                    }
                                    
                                    addDebugLog(`汽车用品类目点击完成`, 'success');

                                    // 等待子类目加载
                                    await new Promise(resolve => setTimeout(resolve, 3000));
                                    
                                    // 检查子类目是否成功加载
                                    const initialChildItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                    addDebugLog(`初始子类目数量: ${initialChildItems.length}`, 'info');
                                    
                                    // 如果点击后没有加载子类目，重试一次点击
                                    if (initialChildItems.length === 0) {
                                        addDebugLog('未检测到子类目，尝试再次点击', 'warning');
                                        
                                        // 尝试整行按钮点击
                                        const rowButton = targetItem.querySelector('button');
                                        if (rowButton) {
                                            rowButton.click();
                                            await new Promise(resolve => setTimeout(resolve, 2000));
                                            
                                            // 再次检查
                                            const retryChildItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                            addDebugLog(`重试后子类目数量: ${retryChildItems.length}`, 'info');
                                        }
                                    }
                                    
                                    // 关键改进：持续滚动加载更多子类目，直到找到目标子类目
                                    async function findSubcategoryWithScrolling() {
                                        // 重新获取树形容器，因为展开后DOM可能已改变
                                        treeContainer = await getTreeContainer();
                                        if (!treeContainer) {
                                            addDebugLog('获取子类目容器失败', 'error');
                                            return false;
                                        }
                                        
                                        let allFoundSubcategories = new Set(); // 使用Set避免重复
                                        let maxScrollingAttempts = 30; // 增加滚动尝试次数
                                        let scrollingAttempts = 0;
                                        let consecutiveNoNewItems = 0;
                                        const maxConsecutiveNoNewItems = 5;
                                        
                                        // 记录当前找到的子类目
                                        function collectCurrentSubcategories() {
                                            const subItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                            const currentSubcategories = new Set();
                                            
                                            subItems.forEach(item => {
                                                const label = item.querySelector('[class*="data-content-module_label"]');
                                                if (label) {
                                                    currentSubcategories.add(label.textContent.trim());
                                                }
                                            });
                                            
                                            return currentSubcategories;
                                        }
                                        
                                        // 检查是否找到目标子类目
                                        function checkForTargetSubcategory() {
                                            const subItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                            
                                            for (const item of subItems) {
                                                const label = item.querySelector('[class*="data-content-module_label"]');
                                                if (!label) continue;
                                                
                                                const text = label.textContent.trim();
                                                
                                                // 检查是否是目标子类目
                                                if (text === subcategoryName) {
                                                    addDebugLog(`找到精确匹配的目标子类目: "${text}"`, 'success');
                                                    
                                                    // 高亮显示
                                                    item.style.background = 'rgba(255, 255, 0, 0.3)';
                                                    label.style.outline = '2px solid red';
                                                    
                                                    // 点击子类目
                                                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                                                    
                                                    // 使用异步IIFE立即执行点击
                                                    (async () => {
                                                        try {
                                                            await new Promise(resolve => setTimeout(resolve, 1000));
                                                            
                                                            // 尝试点击复选框
                                                            const checkbox = item.querySelector('input[type="checkbox"], [role="checkbox"]');
                                                            if (checkbox) {
                                                                addDebugLog('找到复选框，点击复选框', 'info');
                                                                checkbox.click();
                                                                if (checkbox.type === 'checkbox') {
                                                                    checkbox.checked = true;
                                                                    const changeEvent = new Event('change', { bubbles: true });
                                                                    checkbox.dispatchEvent(changeEvent);
                                                                }
                                                            } else {
                                                                // 点击标签
                                                                addDebugLog('未找到复选框，点击标签', 'info');
                                                                label.click();
                                                                
                                                                // 使用MouseEvent
                                                                const clickEvent = new MouseEvent('click', {
                                                                    view: window,
                                                                    bubbles: true,
                                                                    cancelable: true,
                                                                    buttons: 1
                                                                });
                                                                label.dispatchEvent(clickEvent);
                                                            }
                                                        } catch (error) {
                                                            addDebugLog(`点击操作失败: ${error.toString()}`, 'error');
                                                        }
                                                    })();
                                                    
                                                    return true;
                                                }
                                            }
                                            
                                            return false;
                                        }
                                        
                                        // 先检查当前是否已有目标子类目
                                        if (checkForTargetSubcategory()) {
                                            return true;
                                        }
                                        
                                        // 开始滚动加载更多子类目
                                        while (scrollingAttempts < maxScrollingAttempts) {
                                            addDebugLog(`滚动加载尝试 ${scrollingAttempts + 1}/${maxScrollingAttempts}`, 'info');
                                            
                                            // 获取当前子类目
                                            const currentSubcategories = collectCurrentSubcategories();
                                            
                                            // 计算新增子类目
                                            const newSubcategories = new Set(
                                                [...currentSubcategories].filter(x => !allFoundSubcategories.has(x))
                                            );
                                            
                                            // 更新所有已找到的子类目
                                            for (const category of currentSubcategories) {
                                                allFoundSubcategories.add(category);
                                            }
                                            
                                            // 输出子类目信息
                                            if (scrollingAttempts === 0 || newSubcategories.size > 0) {
                                                addDebugLog(`当前已发现 ${allFoundSubcategories.size} 个子类目`, 'info');
                                                addDebugLog(`子类目列表: ${[...allFoundSubcategories].join(', ')}`, 'info');
                                            }
                                            
                                            // 检查是否找到新子类目
                                            if (newSubcategories.size > 0) {
                                                addDebugLog(`本次发现 ${newSubcategories.size} 个新子类目`, 'success');
                                                addDebugLog(`新子类目: ${[...newSubcategories].join(', ')}`, 'info');
                                                consecutiveNoNewItems = 0;
                                                
                                                // 检查新加载的子类目中是否有目标子类目
                                                if (checkForTargetSubcategory()) {
                                                    return true;
                                                }
                                            } else {
                                                consecutiveNoNewItems++;
                                                addDebugLog(`连续 ${consecutiveNoNewItems} 次未发现新子类目`, 'warning');
                                            }
                                            
                                            // 执行滚动
                                            // 1. 找到最后一个子类目项，滚动到它
                                            const subItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                            if (subItems.length > 0) {
                                                const lastItem = subItems[subItems.length - 1];
                                                
                                                // 查找骨架屏元素
                                                const skeletonElements = document.querySelectorAll('[class*="skeleton-common-base-module_skeleton"]');
                                                
                                                if (skeletonElements.length > 0) {
                                                    addDebugLog('发现骨架屏，滚动到骨架屏元素', 'info');
                                                    skeletonElements[0].scrollIntoView({ block: 'center' });
                                                } else {
                                                    addDebugLog('滚动到最后一个子类目项', 'info');
                                                    lastItem.scrollIntoView({ block: 'end' });
                                                }
                                                
                                                // 2. 额外滚动一段距离以确保加载更多
                                                await new Promise(resolve => setTimeout(resolve, 500));
                                                const currentScrollTop = treeContainer.scrollTop;
                                                treeContainer.scrollTop += 300 + (scrollingAttempts * 20); // 逐渐增加滚动距离
                                                
                                                // 检查滚动是否有效
                                                if (Math.abs(currentScrollTop - treeContainer.scrollTop) < 10) {
                                                    addDebugLog('滚动无效，可能已到达底部', 'warning');
                                                    consecutiveNoNewItems++;
                                                }
                                            }
                                            
                                            // 等待新内容加载
                                            await new Promise(resolve => setTimeout(resolve, 2000));
                                            
                                            // 检查是否已经找到目标子类目
                                            if (checkForTargetSubcategory()) {
                                                return true;
                                            }
                                            
                                            // 终止条件：连续多次没有新子类目
                                            if (consecutiveNoNewItems >= maxConsecutiveNoNewItems) {
                                                addDebugLog(`连续 ${consecutiveNoNewItems} 次未找到新子类目，停止滚动`, 'warning');
                                                break;
                                            }
                                            
                                            scrollingAttempts++;
                                        }
                                        
                                        // 如果滚动完成后仍未找到，记录所有已发现的子类目
                                        addDebugLog(`滚动完成，共发现 ${allFoundSubcategories.size} 个子类目`, 'info');
                                        addDebugLog(`完整子类目列表: ${[...allFoundSubcategories].join(', ')}`, 'info');
                                        
                                        // 再次尝试最佳匹配
                                        addDebugLog('尝试查找最佳匹配', 'warning');
                                        
                                        // 查找包含关键词的项目
                                        const keywordMatches = ['脚垫', '座套', '汽车脚垫', '车座套'];
                                        const subItems = document.querySelectorAll(`[id^="${parentId}_"]`);
                                        
                                        for (const keyword of keywordMatches) {
                                            for (const item of subItems) {
                                                const label = item.querySelector('[class*="data-content-module_label"]');
                                                if (!label) continue;
                                                
                                                const text = label.textContent.trim();
                                                
                                                if (text.includes(keyword)) {
                                                    addDebugLog(`找到关键词匹配 "${keyword}" 的子类目: "${text}"`, 'success');
                                                    
                                                    // 高亮显示
                                                    item.style.background = 'rgba(255, 255, 0, 0.3)';
                                                    label.style.outline = '2px solid red';
                                                    
                                                    // 点击子类目
                                                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                                                    
                                                    try {
                                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                                        
                                                        // 尝试点击复选框
                                                        const checkbox = item.querySelector('input[type="checkbox"], [role="checkbox"]');
                                                        if (checkbox) {
                                                            addDebugLog('找到复选框，点击复选框', 'info');
                                                            checkbox.click();
                                                            if (checkbox.type === 'checkbox') {
                                                                checkbox.checked = true;
                                                                const changeEvent = new Event('change', { bubbles: true });
                                                                checkbox.dispatchEvent(changeEvent);
                                                            }
                                                        } else {
                                                            // 点击标签
                                                            addDebugLog('未找到复选框，点击标签', 'info');
                                                            label.click();
                                                            
                                                            // 使用MouseEvent
                                                            const clickEvent = new MouseEvent('click', {
                                                                view: window,
                                                                bubbles: true,
                                                                cancelable: true,
                                                                buttons: 1
                                                            });
                                                            label.dispatchEvent(clickEvent);
                                                        }
                                                        
                                                        return true;
                                                    } catch (error) {
                                                        addDebugLog(`点击操作失败: ${error.toString()}`, 'error');
                                                    }
                                                }
                                            }
                                        }
                                        
                                        addDebugLog(`未找到目标子类目 "${subcategoryName}"`, 'error');
                                        return false;
                                    }
                                    
                                    // 执行子类目查找和点击
                                    return await findSubcategoryWithScrolling();
                                } catch (error) {
                                    const errorMessage = `点击子类目总体失败: ${error.toString()}`;
                                    console.error(errorMessage);
                                    console.error('错误堆栈:', error.stack);
                                    
                                    if (window.logToConsole) {
                                        window.logToConsole(errorMessage);
                                        window.logToConsole('错误堆栈: ' + error.stack);
                                    }
                                    
                                    return false;
                                }
                            }, subcategory.name,cliclValue);

                            // 修改顺序：先等待子类目点击完成，再执行应用按钮点击
                            // 添加短暂延迟确保复选框点击操作完成
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 5. 点击应用按钮
                            await page.evaluate(async () => {
                                try {
                                    // 1. 查找应用按钮 - 使用更通用的选择器
                                    const applyButton = Array.from(document.querySelectorAll('button[type="submit"]')).find(button => {
                                        // 更新为部分匹配选择器
                                        const textSpan = button.querySelector('[class*="button-module_text"]') || button;
                                        return textSpan.textContent.trim() === '应用';
                                    });

                                    if (!applyButton) {
                                        window.logToConsole('未找到应用按钮');
                                        return false;
                                    }

                                    window.logToConsole('找到应用按钮，准备点击');
                                    
                                    // 添加高亮效果帮助调试
                                    const originalStyle = applyButton.style.cssText;
                                    applyButton.style.border = '2px solid green';
                                    applyButton.style.boxShadow = '0 0 10px green';

                                    // 2. 创建点击事件
                                    const clickEvent = new MouseEvent('click', {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        buttons: 1
                                    });

                                    // 3. 触发点击事件
                                    applyButton.dispatchEvent(clickEvent);
                                    
                                    // 也尝试原生点击
                                    applyButton.click();
                                    
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
                                    
                                    // 延迟后恢复原始样式
                                    setTimeout(() => {
                                        applyButton.style.cssText = originalStyle;
                                    }, 2000);
                                    
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    return true;
                                } catch (error) {
                                    window.logToConsole('点击应用按钮失败:', error.toString());
                                    window.logToConsole('错误堆栈:', error.stack);
                                    return false;
                                }
                            });

                            // 6. 等待表格数据加载并下载
                            try {
                                const dataLoaded = await waitForTableData(page, this.task_name, this.cityname);
                                if (!dataLoaded) {
                                    throw new Error('表格数据未加载完成');
                                }
                            } catch (error) {
                                console.error('下载操作失败:', error.toString());
                            }
                            
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

// 新增的函数
