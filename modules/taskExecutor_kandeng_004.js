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
        const config = loadConfig('config/config.json');
        const outputHandler = OutputFactory.createOutputHandler(config.outputFormat);
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

                                // // 查找并点击HuanshijiCA元素
                                // const huanshijiButton = document.querySelector('span.item.iskeep button span span:first-child');
                                // if (huanshijiButton && huanshijiButton.textContent === cliclValue + "CA") {
                                //     const huanshijiClickEvent = new MouseEvent('click', {
                                //         view: window,
                                //         bubbles: true,
                                //         cancelable: true
                                //     });
                                //     huanshijiButton.closest('button').dispatchEvent(huanshijiClickEvent);
                                //     console.log('Click dispatched on  item', cliclValue + "CA");
                                // } else {
                                //     console.error("无法找到HuanshijiCA按钮");
                                // }
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
                // await new Promise(resolve => setTimeout(resolve, 10000));
                console.log('自定义2_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }
        } else if (this.element.leixing === '自定义2.1') {
            try {
                await page.evaluate(async () => {
                    // 查找包含"侵权词/敏感词"文本的span元素
                    const spans = document.querySelectorAll('.vxe-table--header .vxe-cell--title span');
                    const sensitiveWordSpan = Array.from(spans).find(span => span.textContent.includes('侵权词/敏感词'));

                    if (sensitiveWordSpan) {
                        // 找到包含这个span的模态框
                        const modalContent = sensitiveWordSpan.closest('.ivu-modal-content');
                        if (modalContent) {
                            // 在这个特定的模态框中查找确定按钮
                            const confirmButton = modalContent.querySelector('.ivu-modal-footer button.m-r.ivu-btn.ivu-btn-primary');
                            if (confirmButton) {
                                console.log('Found the correct confirm button');
                                
                                // 确保元素在视图中
                                confirmButton.scrollIntoView();

                                // 手动创建并触发点击事件
                                const clickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                });

                                confirmButton.dispatchEvent(clickEvent);
                                console.log('Click dispatched on confirm button');
                            } else {
                                console.error("在正确的模态框中未找到确定按钮");
                            }
                        } else {
                            console.error("未找到包含侵权词表格的模态框");
                        }
                    } else {
                        console.error("未找到侵权词表格");
                    }
                });
                console.log('自定义2.1_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }
        } else if (this.element.leixing === '自定义2.2') {
            try {
                
                // 创建一个数组来存储所有侵权词/敏感词信息
                this.data = [];
                
                // 获取当前页面的站点名称
                const siteName = await page.evaluate(() => {
                    const activeButton = document.querySelector('.mult-header-h .self_tabs_style .item button.active');
                    return activeButton ? activeButton.textContent.trim() : '未知站点';
                });
                
                // 记录当前活跃站点
                let currentSite = siteName || '未知站点';
                
                const sensitiveWords = await page.evaluate(async () => {
                    // 用于存储所有站点的侵权词/敏感词信息
                    const allSensitiveWords = [];
                    
                    // 获取所有站点按钮
                    const siteButtons = document.querySelectorAll('.mult-header-h .self_tabs_style .item button');
                    console.log('找到站点按钮数量:', siteButtons.length);
                    const siteButtonsArray = Array.from(siteButtons);
                    
                    // 跳过第一个按钮，获取剩余的按钮
                    const remainingSiteButtons = siteButtonsArray.slice(1);
                    console.log('需要处理的站点按钮数量:', remainingSiteButtons.length);
                    
                    // 依次点击每个站点按钮
                    for (let i = 0; i < remainingSiteButtons.length; i++) {
                        const siteButton = remainingSiteButtons[i];
                        // 获取当前站点名称
                        const siteName = siteButton.textContent.trim();
                        console.log(`准备处理第 ${i + 1} 个站点:`, siteName);
                        
                        // 点击站点按钮
                        siteButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        console.log('滚动到站点按钮位置');
                        
                        // 等待一下确保滚动完成
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // 使用click()方法直接点击站点按钮
                        console.log('点击站点按钮:', siteName);
                        siteButton.click();
                        
                        // 等待更长时间确保站点切换完成
                        console.log('等待站点切换完成...');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // 确认当前站点是否已经切换成功
                        const activeButtonText = await new Promise(resolve => {
                            // 检查活跃按钮
                            const activeButton = document.querySelector('.mult-header-h .self_tabs_style .item button.active');
                            const text = activeButton ? activeButton.textContent.trim() : '未知站点';
                            resolve(text);
                        });
                        
                        console.log('当前活跃站点:', activeButtonText);
                        
                        if (activeButtonText !== siteName) {
                            console.warn(`站点切换可能不成功，预期: ${siteName}, 实际: ${activeButtonText}`);
                        }
                        
                        // 查找当前站点的"一键检测侵权词/敏感词"按钮
                        console.log('查找当前站点的检测按钮...');
                        
                        // 查找所有包含"一键检测侵权词/敏感词"文本的按钮
                        const allCheckButtons = Array.from(document.querySelectorAll('button'))
                            .filter(button => button.textContent.includes('一键检测侵权词/敏感词'));
                        
                        console.log(`找到 ${allCheckButtons.length} 个检测按钮`);
                        
                        // 尝试找到当前可见的检测按钮
                        let targetButton = null;
                        for (const button of allCheckButtons) {
                            // 检查按钮是否可见
                            const style = window.getComputedStyle(button);
                            const rect = button.getBoundingClientRect();
                            
                            if (style.display !== 'none' && 
                                style.visibility !== 'hidden' && 
                                rect.width > 0 && 
                                rect.height > 0) {
                                
                                // 检查按钮是否在当前视口内
                                const isInViewport = (
                                    rect.top >= 0 &&
                                    rect.left >= 0 &&
                                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                                );
                                
                                if (isInViewport) {
                                    targetButton = button;
                                    console.log('找到当前可见的检测按钮');
                                    break;
                                }
                            }
                        }
                        
                        
                        if (targetButton) {
                            console.log('找到检测按钮，准备点击');
                            
                            // 确保按钮可见
                            targetButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            // 直接点击
                            console.log('点击检测按钮');
                            targetButton.click();
                            
                            // 等待模态框出现
                            console.log('等待模态框出现...');
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            
                            // 检查模态框是否出现
                            const modalVisible = document.querySelector('.ivu-modal-content') !== null;
                            console.log('模态框是否出现:', modalVisible);
                            
                            if (modalVisible) {
                                // 再次确认当前活跃站点
                                const currentSiteName = activeButtonText;
                                console.log('处理模态框中的数据，当前站点:', currentSiteName);
                                
                                // 首先确保我们定位到正确的模态框 - 当前可见的模态框
                                // 保存当前站点名称，确保它不会丢失
                                const currentSiteNameSaved = currentSiteName || activeButtonText || '未知站点';
                                console.log('当前站点名称保存为:', currentSiteNameSaved);
                                
                                const visibleModalContents = document.querySelectorAll('.ivu-modal-content:not([style*="display: none"])');
                                console.log(`找到 ${visibleModalContents.length} 个可见的模态框`);
                                
                                // 查找包含侵权词/敏感词的模态框
                                let sensitiveWordModal = null;
                                let sensitiveWordHeader = null;
                                let foundModals = [];
                                
                                console.log('开始检查所有模态框，共 ' + visibleModalContents.length + ' 个');
                                
                                // 检查所有模态框，查找包含侵权词/敏感词的表格
                                for (let j = 0; j < visibleModalContents.length; j++) {
                                    const modal = visibleModalContents[j];
                                    // 检查模态框标题
                                    const modalTitle = modal.querySelector('.ivu-modal-header-inner');
                                    const titleText = modalTitle ? modalTitle.textContent : '无标题';
                                    console.log(`模态框 ${j+1} 标题:`, titleText);
                                    
                                    // 检查模态框内容
                                    const modalHTML = modal.innerHTML.substring(0, 100) + '...'; // 只显示前100个字符
                                    console.log(`模态框 ${j+1} 内容预览:`, modalHTML);
                                    
                                    // 检查表格数量
                                    const tables = modal.querySelectorAll('table');
                                    console.log(`模态框 ${j+1} 包含 ${tables.length} 个表格`);
                                    
                                    // 方法1：检查表格标题中是否包含侵权词/敏感词
                                    const tableHeaders = Array.from(modal.querySelectorAll('th div span, th span, .vxe-cell--title span'));
                                    let sensitiveHeader = tableHeaders.find(span => span.textContent.includes('侵权词') || 
                                                                                span.textContent.includes('敏感词'));
                                    
                                    // 方法2：检查表格内容，看是否有侵权词/敏感词的列
                                    if (!sensitiveHeader) {
                                        const tableRows = modal.querySelectorAll('table tr');
                                        for (const row of tableRows) {
                                            const cells = row.querySelectorAll('td, th');
                                            for (const cell of cells) {
                                                if (cell.textContent.includes('侵权词') || 
                                                    cell.textContent.includes('敏感词')) {
                                                    sensitiveHeader = cell;
                                                    console.log(`模态框 ${j+1} 在表格单元格中找到侵权词/敏感词:`, cell.textContent);
                                                    break;
                                                }
                                            }
                                            if (sensitiveHeader) break;
                                        }
                                    }
                                    
                                    // 方法3：检查模态框标题是否为"提示"，并且内容中有表格
                                    if (!sensitiveHeader && modalTitle && modalTitle.textContent === '提示') {
                                        const hasTables = modal.querySelectorAll('table').length > 0;
                                        if (hasTables) {
                                            console.log(`模态框 ${j+1} 找到标题为"提示"的模态框，并且包含表格`);
                                            sensitiveHeader = modalTitle; // 使用模态框标题作为标记
                                        }
                                    }
                                    
                                    if (sensitiveHeader) {
                                        foundModals.push({
                                            index: j,
                                            title: titleText,
                                            modal: modal,
                                            header: sensitiveHeader
                                        });
                                        console.log(`模态框 ${j+1} 可能包含侵权词/敏感词的模态框`);
                                    }
                                }
                                
                                console.log(`共找到 ${foundModals.length} 个可能包含侵权词/敏感词的模态框`);
                                
                                // 如果找到了多个模态框，在标题为"提示"的模态框中按照 i+1 的顺序选择
                                if (foundModals.length > 0) {
                                    // 筛选出标题为"提示"的模态框
                                    const promptModals = foundModals.filter(m => m.title === '提示');
                                    console.log(`找到 ${promptModals.length} 个标题为"提示"的模态框`);
                                    
                                    if (promptModals.length > 0) {
                                        // 获取当前站点的序号
                                        const currentSiteIndex = i+1;
                                        
                                        // 根据站点索引选择对应的"提示"模态框
                                        const modalIndex = currentSiteIndex % promptModals.length;
                                        sensitiveWordModal = promptModals[modalIndex].modal;
                                        sensitiveWordHeader = promptModals[modalIndex].header;
                                        console.log(`根据站点序号 ${currentSiteIndex} 选择第 ${modalIndex+1} 个"提示"模态框（全局索引 ${promptModals[modalIndex].index+1}）`);
                                    } else {
                                        // 如果没有标题为"提示"的，选择第一个
                                        sensitiveWordModal = foundModals[0].modal;
                                        sensitiveWordHeader = foundModals[0].header;
                                        console.log(`没有找到"提示"模态框，选择第一个找到的模态框（索引 ${foundModals[0].index+1}）`);
                                    }
                                    console.log('找到包含侵权词/敏感词的模态框');
                                }
                                
                                // 如果找到了包含侵权词/敏感词的模态框
                                if (sensitiveWordModal) {
                                    
                                    // 提取表格中的侵权词/敏感词信息
                                    // 尝试多种表格结构的选择器
                                    let rows = [];
                                    
                                    // 检查模态框标题
                                    const modalTitle = sensitiveWordModal.querySelector('.ivu-modal-header-inner');
                                    const isPromptModal = modalTitle && modalTitle.textContent === '提示';
                                    
                                    // 如果是"提示"模态框，使用特定的选择器
                                    if (isPromptModal) {
                                        console.log('检测到"提示"模态框，使用特定选择器');
                                        // 尝试直接获取所有行，包括第一行（序号、侵权词/敏感词、操作）
                                        const allRows = sensitiveWordModal.querySelectorAll('tr');
                                        if (allRows && allRows.length > 0) {
                                            rows = allRows;
                                            console.log(`在提示模态框中找到 ${rows.length} 行数据`);
                                        }
                                    } else {
                                        // 尝试不同的选择器来查找表格行
                                        const selectors = [
                                            '.vxe-table--body .vxe-body--row',  // VXE表格
                                            'table tbody tr',                 // 标准HTML表格
                                            '.ivu-table-body tr',             // iView表格
                                            'tr'                              // 任何表格行
                                        ];
                                        
                                        for (const selector of selectors) {
                                            const foundRows = sensitiveWordModal.querySelectorAll(selector);
                                            if (foundRows && foundRows.length > 0) {
                                                rows = foundRows;
                                                console.log(`使用选择器 '${selector}' 找到 ${rows.length} 行数据`);
                                                break;
                                            }
                                        }
                                    }
                                    
                                    const siteWords = [];
                                    
                                    // 如果找到了表格行，尝试提取侵权词/敏感词
                                    if (rows.length > 0) {
                                        // 确定侵权词/敏感词所在的列索引
                                        let sensitiveWordColumnIndex = -1;
                                        
                                        // 查找表头行
                                        const headerRow = sensitiveWordModal.querySelector('thead tr, tr:first-child');
                                        if (headerRow) {
                                            const headerCells = headerRow.querySelectorAll('th, td');
                                            headerCells.forEach((cell, index) => {
                                                if (cell.textContent.includes('侵权词') || 
                                                    cell.textContent.includes('敏感词')) {
                                                    sensitiveWordColumnIndex = index;
                                                    console.log(`侵权词/敏感词在第 ${index+1} 列`);
                                                }
                                            });
                                        }
                                        
                                        // 如果无法从表头确定，假设侵权词在第2列（索引1）
                                        if (sensitiveWordColumnIndex === -1) {
                                            // 检查模态框标题是否为"提示"，如果是，则可能是侵权词模态框
                                            const modalTitle = sensitiveWordModal.querySelector('.ivu-modal-header-inner');
                                            if (modalTitle && modalTitle.textContent === '提示') {
                                                // 对于提示模态框，侵权词在第2列
                                                sensitiveWordColumnIndex = 1;
                                                console.log('提示模态框，侵权词在第2列');
                                            } else {
                                                sensitiveWordColumnIndex = 1; // 默认第2列
                                                console.log('无法确定侵权词列，默认使用第2列');
                                            }
                                        }
                                        
                                        // 输出所有行的详细信息以便调试
                                        console.log('表格行数据详情:');
                                        rows.forEach((row, idx) => {
                                            console.log(`行 ${idx+1} 类型: ${row.tagName}, 父元素: ${row.parentElement ? row.parentElement.tagName : '无'}, 子元素数: ${row.children.length}`);
                                        });
                                        
                                        // 从每行提取侵权词
                                        rows.forEach((row, rowIndex) => {
                                            // 跳过表头行 - 但只有当有thead元素时才检查
                                            const hasTheadParent = row.closest('thead');
                                            if (hasTheadParent) {
                                                console.log(`跳过表头行 ${rowIndex+1}`);
                                                return;
                                            }
                                            
                                            // 对于提示模态框，我们不跳过空行，因为可能没有正确识别子元素
                                            
                                            const cells = row.querySelectorAll('td, th');
                                            if (cells.length > sensitiveWordColumnIndex) {
                                                const wordCell = cells[sensitiveWordColumnIndex];
                                                
                                                // 尝试获取单元格内的文本
                                                let sensitiveWordText = '';
                                                
                                                // 尝试从div中获取文本
                                                const divElement = wordCell.querySelector('div');
                                                if (divElement) {
                                                    sensitiveWordText = divElement.textContent.trim();
                                                } else {
                                                    // 直接从单元格获取文本
                                                    sensitiveWordText = wordCell.textContent.trim();
                                                }
                                                
                                                // 输出单元格内容以便调试
                                                console.log(`行 ${rowIndex+1} 列 ${sensitiveWordColumnIndex+1} 内容:`, sensitiveWordText);
                                                
                                                // 检查是否为表头内容
                                                if (rowIndex === 0) {
                                                    console.log(`跳过第一行（可能是表头）: ${sensitiveWordText}`);
                                                    return;
                                                }
                                                
                                                // 检查是否包含"侵权词"或"敏感词"字样
                                                if (sensitiveWordText === '侵权词/敏感词' || 
                                                    sensitiveWordText === '侵权词' || 
                                                    sensitiveWordText === '敏感词') {
                                                    console.log(`跳过表头内容: ${sensitiveWordText}`);
                                                    return;
                                                }
                                                
                                                // 检查是否为空内容
                                                if (!sensitiveWordText || sensitiveWordText.trim() === '') {
                                                    console.log(`跳过空内容`);
                                                    return;
                                                }
                                                
                                                if (sensitiveWordText) {
                                                    console.log(`行 ${rowIndex+1} 侵权词:`, sensitiveWordText);
                                                    
                                                    siteWords.push({
                                                        site: currentSiteNameSaved, // 使用保存的站点名称
                                                        sensitiveWord: sensitiveWordText,
                                                        timestamp: new Date().toISOString()
                                                    });
                                                }
                                            }
                                        });
                                        
                                        // 将当前站点的侵权词添加到总列表
                                        if (siteWords.length > 0) {
                                            allSensitiveWords.push(...siteWords);
                                            console.log(`从站点 ${currentSiteName} 提取到 ${siteWords.length} 个侵权词/敏感词:`, siteWords);
                                        } else {
                                            console.log(`站点 ${currentSiteName} 没有侵权词/敏感词`);
                                        }
                                        
                                        // 查找并点击确认按钮 - 在当前可见模态框中
                                        const confirmButton = sensitiveWordModal.querySelector('.ivu-modal-footer button.m-r.ivu-btn.ivu-btn-primary, .ivu-modal-footer button.ivu-btn.ivu-btn-primary');
                                        if (confirmButton) {
                                            console.log('找到确认按钮，准备点击');
                                            confirmButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            await new Promise(resolve => setTimeout(resolve, 1000));
                                            
                                            console.log('点击确认按钮');
                                            confirmButton.click();
                                            console.log('已点击确认按钮');
                                            
                                            // 等待确认操作完成
                                            await new Promise(resolve => setTimeout(resolve, 2000));
                                        } else {
                                            console.error('在模态框中未找到确认按钮');
                                            
                                            // 尝试查找任何可能的关闭按钮
                                            const anyCloseButton = sensitiveWordModal.querySelector('button');
                                            if (anyCloseButton) {
                                                console.log('找到一个可能的关闭按钮，尝试点击');
                                                anyCloseButton.click();
                                                await new Promise(resolve => setTimeout(resolve, 2000));
                                            }
                                        }
                                    }
                                } else {
                                    console.error('未找到包含侵权词/敏感词的模态框');
                                    
                                    // 输出所有模态框的标题，帮助调试
                                    visibleModalContents.forEach((modal, index) => {
                                        const title = modal.querySelector('.ivu-modal-header-inner');
                                        console.log(`模态框 ${index+1} 标题:`, title ? title.textContent : '无标题');
                                        console.log(`模态框 ${index+1} 内容摘要:`, modal.innerHTML.substring(0, 200) + '...');
                                    });
                                    
                                    // 尝试关闭第一个模态框
                                    if (visibleModalContents.length > 0) {
                                        const closeButton = visibleModalContents[0].querySelector('.ivu-modal-close');
                                        if (closeButton) {
                                            console.log('尝试关闭模态框');
                                            closeButton.click();
                                            await new Promise(resolve => setTimeout(resolve, 2000));
                                        }
                                    }
                                }
                            } else {
                                console.error('模态框未出现，检查按钮点击可能失败');
                            }
                        } else {
                            console.error('未找到检测按钮');
                            
                            // 输出当前页面上所有按钮的文本内容
                            console.log('当前页面上所有按钮:');
                            document.querySelectorAll('button').forEach((btn, idx) => {
                                console.log(`按钮 ${idx + 1}:`, btn.textContent.trim());
                            });
                        }
                        
                        // 在处理下一个站点前等待
                        console.log(`站点 ${siteName} 处理完成，准备处理下一个站点`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                    
                    // 输出最终结果
                    console.log('所有站点处理完成');
                    console.log(`总共提取到 ${allSensitiveWords.length} 个侵权词/敏感词信息`);
                    console.log('提取的数据:', JSON.stringify(allSensitiveWords, null, 2));
                    
                    return allSensitiveWords;
                });
                
                // 将提取的数据保存到this.data中
                if (sensitiveWords && sensitiveWords.length > 0) {
                    this.data = sensitiveWords;
                    console.log(`总共提取到 ${sensitiveWords.length} 个侵权词/敏感词信息`);
                } else {
                    console.log('没有提取到侵权词/敏感词信息');
                }
                
                // 使用OutputFactory保存数据
                if (this.data && this.data.length > 0) {
                    outputHandler.handle(this.data, 'output', this.task_name, this.cityname,"1","1","侵权禁售词记录");
                    console.log('侵权词/敏感词数据已保存');
                } else {
                    console.log('没有提取到数据或数据为空，跳过保存');
                }
                
                console.log('自定义2.2_done');
            } catch (error) {
                console.error('An error occurred:', error);
            }
        }
        
        else if (this.element.leixing === '自定义3') {
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

            // if (this.data && this.data.length > 0) {
            //     outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
            // } else {
            //     console.log('没有提取到数据或数据为空');
            // }
            outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
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