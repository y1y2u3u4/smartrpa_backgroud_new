// modules/taskExecutor_yimaihuopan.js
///实现通过亚马逊搜索商品获取标题
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
    constructor(element, browser, task_name, cityname) {
        super('click', element, null, null, task_name, cityname);
        this.browser = browser;
        console.log('ClickTask task_name:', this.task_name);
        console.log('ClickTask cityname:', this.cityname);
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
            // } else if (this.element.leixing === '自定义4') {
            //     console.log('自定义4_start');
            //     try {
            //         await page.waitForSelector('input.search-input[type="text"]', { timeout: 5000 });
                    
            //         // 点击搜索框并输入内容
            //         await page.click('input.search-input[type="text"]');
            //         await page.keyboard.type('input.search-input[type="text"]', cliclValue, { delay: 100 });
                    
            //         // 等待一下确保输入完成
            //         await new Promise(resolve => setTimeout(resolve, 500));
                    
            //         // 按下回车键触发搜索
            //         await page.keyboard.press('Enter');
            //         console.log('已触发搜索');

            //         // 等待搜索结果加载并点击图文按钮
            //         await new Promise(resolve => setTimeout(resolve, 3000));
                    
            //         // 等待并点击图文按钮
            //         await page.waitForSelector('#short_note.channel', { timeout: 5000 });
            //         await page.evaluate(() => {
            //             const tuWenButton = document.querySelector('#short_note.channel');
            //             if (!tuWenButton) {
            //                 throw new Error('未找到图文按钮');
            //             }
            //             tuWenButton.click();
            //             console.log('已点击图文按钮');
            //         });

            //         // 等待图文内容加载
            //         await new Promise(resolve => setTimeout(resolve, 2000));

            //         // 持续滚动并收集数据
            //         this.data = await page.evaluate(async () => {
            //             function sleep(ms) {
            //                 return new Promise(resolve => setTimeout(resolve, ms));
            //             }

            //             // 提取笔记信息的函数
            //             function extractNoteInfo(element) {
            //                 const info = {};
            //                 try {
            //                     // 提取标题
            //                     const titleElement = element.querySelector('.title span');
            //                     info.title = titleElement ? titleElement.textContent.trim() : 'N/A';

            //                     // 提取作者信息
            //                     const authorElement = element.querySelector('.author');
            //                     if (authorElement) {
            //                         info.authorName = authorElement.querySelector('.name').textContent.trim();
            //                         info.authorAvatar = authorElement.querySelector('img').src;
            //                         info.authorLink = authorElement.href;
            //                     }

            //                     // 提取封面图片
            //                     const coverElement = element.querySelector('.cover img');
            //                     info.coverImage = coverElement ? coverElement.src : 'N/A';

            //                     // 提取笔记链接
            //                     const linkElement = element.querySelector('.cover');
            //                     info.noteLink = linkElement ? linkElement.href : 'N/A';

            //                     // 提取点赞数
            //                     const likeElement = element.querySelector('.like-wrapper .count');
            //                     info.likeCount = likeElement ? likeElement.textContent.trim() : '0';

            //                     // 提取推荐原因
            //                     const reasonElement = element.querySelector('.recommend-reason-text');
            //                     info.recommendReason = reasonElement ? reasonElement.textContent.trim() : 'N/A';
            //                 } catch (error) {
            //                     console.error('提取笔记信息时出错:', error);
            //                 }
            //                 return info;
            //             }

            //             const scrollStep = 2000; // 每次滚动的像素
            //             const scrollInterval = 1500; // 滚动间隔时间（毫秒）
            //             const maxScrollAttempts = 2000; // 最大滚动次数
            //             let scrollAttempts = 0;
            //             let allNotes = new Set(); // 使用 Set 来存储唯一的笔记数据
            //             let previousSize = 0; // 记录上一次的数据量
            //             let noNewDataCount = 0; // 记录连续没有新数据的次数

            //             while (scrollAttempts < maxScrollAttempts) {
            //                 // 获取当前可见的笔记卡片
            //                 const noteElements = document.querySelectorAll('section.note-item');
                        
            //                 // 提取并存储笔记信息
            //                 noteElements.forEach(element => {
            //                     const noteInfo = extractNoteInfo(element);
            //                     // 使用笔记链接作为唯一标识
            //                     if (noteInfo.noteLink !== 'N/A') {
            //                         allNotes.add(JSON.stringify(noteInfo));
            //                     }
            //                 });

            //                 // 检查是否有新数据
            //                 if (allNotes.size === previousSize) {
            //                     noNewDataCount++;
            //                     // 如果连续20次没有新数据，则认为已到达末尾
            //                     if (noNewDataCount >= 10) {
            //                         console.log('连续20次没有新数据，结束滚动');
            //                         break;
            //                     }
            //                     // 没有新数据时额外等待1秒
            //                     await sleep(3000);
            //                 } else {
            //                     noNewDataCount = 0; // 有新数据，重置计数器
            //                 }
            //                 previousSize = allNotes.size;

            //                 // 滚动页面
            //                 window.scrollBy(0, scrollStep);
            //                 console.log(`第 ${scrollAttempts + 1} 次滚动，当前收集到 ${allNotes.size} 条数据`);
                        
            //                 // 等待内容加载
            //                 await sleep(scrollInterval);
            //                 scrollAttempts++;
            //             }

            //             if (scrollAttempts >= maxScrollAttempts) {
            //                 console.log('达到最大滚动次数，停止滚动');
            //             }

            //             // 滚动回页面顶部
            //             window.scrollTo(0, 0);

            //             // 将 Set 转换回数组并返回
            //             return Array.from(allNotes).map(note => JSON.parse(note));
            //         });

            //         console.log('提取的数据:', this.data);

            //         if (this.data && this.data.length > 0) {
            //             outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
            //         } else {
            //             console.log('没有提取到数据或数据为空');
            //         }
            //     } catch (error) {
            //         console.error('搜索操作失败:', error.message);
            //         throw error;
            //     }
            // }

        } else if (this.element.leixing === '自定义4') {
            console.log('自定义4_start');
            try {
                await page.waitForFunction(() => document.readyState === 'complete');
                console.log('页面加载完成');
                
                // 等待初始数据加载
                await new Promise(resolve => setTimeout(resolve, 5000));

                // 选择每页显示200条数据
                console.log('开始设置每页显示条数...');
                
                // 找到并点击包含"条/页"的下拉框
                await page.waitForSelector('.el-pagination__sizes .el-input__inner');
                const currentValue = await page.evaluate(() => {
                    const input = document.querySelector('.el-pagination__sizes .el-input__inner');
                    return input ? input.value : null;
                });
                console.log('当前每页显示：', currentValue);

                if (currentValue !== '200条/页') {
                    await page.click('.el-pagination__sizes .el-input__inner');
                    await page.waitForSelector('.el-select-dropdown__list');
                    
                    // 等待下拉选项完全显示
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 点击200条/页选项
                    await page.evaluate(() => {
                        const lists = document.querySelectorAll('.el-select-dropdown__list');
                        for (const list of lists) {
                            const options = list.querySelectorAll('.el-select-dropdown__item');
                            for (const option of options) {
                                if (option.textContent.trim() === '200条/页') {
                                    option.click();
                                    return true;
                                }
                            }
                        }
                        return false;
                    });
                    
                    // 等待选择生效
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    // 验证选择结果
                    const newValue = await page.evaluate(() => {
                        const input = document.querySelector('.el-pagination__sizes .el-input__inner');
                        return input ? input.value : null;
                    });
                    console.log('设置后每页显示：', newValue);
                }

                // 解析clickValue获取页码范围
                const range = cliclValue.split('-').map(Number);
                const startPage = range[0] || 1;
                const endPage = range[1] || 2000;

                let totalRecords = 0;
                
                for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
                    try {
                        // 输入页码并触发跳转
                        await page.waitForSelector('.el-pagination__editor .el-input__inner');
                        await page.evaluate((page) => {
                            const input = document.querySelector('.el-pagination__editor .el-input__inner');
                            input.value = page;
                            input.dispatchEvent(new Event('input'));
                            input.dispatchEvent(new Event('change'));
                            // 模拟回车键触发跳转
                            input.dispatchEvent(new KeyboardEvent('keydown', {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                bubbles: true
                            }));
                        }, currentPage);

                        // 等待页面加载
                        await new Promise(resolve => setTimeout(resolve, 7000));

                        // 验证页码是否正确跳转
                        const actualPage = await page.evaluate(() => {
                            const input = document.querySelector('.el-pagination__editor .el-input__inner');
                            return input ? parseInt(input.value) : null;
                        });
                        
                        if (actualPage !== currentPage) {
                            console.log(`页码跳转可能失败，期望页码: ${currentPage}，实际页码: ${actualPage}`);
                            continue;
                        }

                        // 获取当前页数据
                        const pageData = await page.evaluate(() => {
                            const rows = document.querySelectorAll('.vxe-body--row');
                            return Array.from(rows).map(row => {
                                const getCellContent = (colId) => {
                                    const cell = row.querySelector(`[colid="col_${colId}"]`);
                                    return cell ? cell.textContent.trim() : '';
                                };

                                // 获取商品图片URL
                                const getImageUrl = () => {
                                    const imgCell = row.querySelector('[colid="col_6"]');
                                    if (imgCell) {
                                        const img = imgCell.querySelector('.el-image__inner');
                                        return img ? img.getAttribute('src') : '';
                                    }
                                    return '';
                                };

                                return {
                                    rowId: row.getAttribute('rowid'),
                                    number: getCellContent(3),                    // 序号
                                    category: getCellContent(4),                  // 类目
                                    sku: getCellContent(5),                       // SKU
                                    image_url: getImageUrl(),                    // 商品图片
                                    title_en: getCellContent(7),                  // 英文标题
                                    title_cn: getCellContent(8),                  // 中文标题
                                    dimensions: getCellContent(9),                // 包装尺寸
                                    weight: getCellContent(10),                   // 重量
                                    price: getCellContent(11),                    // 价格
                                    stock: getCellContent(12),                    // 库存
                                    warehouse: getCellContent(13),                // 仓库
                                    turnover_days: getCellContent(16),            // 周转天数
                                    package_size: getCellContent(19),             // 包装尺寸
                                    expiry_date: getCellContent(20),              // 有效期
                                    target_countries: getCellContent(21),         // 目标国家
                                    status: getCellContent(24),                   // 状态
                                    stock_status: getCellContent(25),             // 库存状态
                                    listing_status: getCellContent(26),           // 刊登状态
                                    update_time: getCellContent(28)               // 更新时间
                                };
                            });
                        });

                        if (pageData && pageData.length > 0) {
                            // 立即处理当前页数据
                            outputHandler.handle(pageData, 'output', this.task_name, this.cityname);
                            totalRecords += pageData.length;
                            console.log(`第${currentPage}页数据获取并处理成功，当前共处理${totalRecords}条数据`);
                        } else {
                            console.log(`第${currentPage}页没有获取到数据`);
                        }

                    } catch (error) {
                        console.error(`获取第${currentPage}页数据失败:`, error);
                        continue;
                    }
                }

                if (totalRecords === 0) {
                    console.log('整个过程没有提取到任何数据');
                } else {
                    console.log(`数据采集完成，共处理${totalRecords}条数据`);
                }
            } catch (error) {
                console.error('执行失败:', error);
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
                            const reviewCount = reviewElement ? reviewElement.textContent.trim() : '';
                            const price = priceElement ? priceElement.textContent.trim() : '';

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
                await page.keyboard.type('input.search-input[type="text"]', cliclValue, { delay: 100 });
                
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