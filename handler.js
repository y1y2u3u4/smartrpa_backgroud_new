// handler.js
import { loadConfig } from './modules/configManager.js';
import { launchBrowser, setupPage, launchBrowser_adsPower, setupPage_adsPower, closeBrowser_adsPower, launchBrowser_adsPower_lianjie, launchBrowser_adsPower_lianjie_local,launchBrowser_adsPower_lianjie_linux,launchBrowser_adsPower_lianjie_local_api,launchBrowser_adsPower_lianjie_linux_api, closePage_adsPower, launchBrowser_adsPower_bendi } from './modules/puppeteerManager.js';
import { matchAndReplace, DataProcessor } from './modules/dataProcessor.js';
import { OutputFactory } from './modules/outputHandler.js';
// import { handleEvent } from './modules/eventHandler_3.js';
import { inserttask, findTaskList, findTaskcookies, findTaskCategoryNames, findTaskDetail, findTaskinfo } from "./modules/notes.js";
import xlsx from 'xlsx';
import puppeteer from 'puppeteer';
import path from 'path';
import { taskExecutor } from './modules/taskExecutor.js';
import { eventHandler } from './modules/eventHandler.js';
import fs from 'fs/promises';
import { processProductImages } from './modules/imageProcessor.js';

async function importHandleEvent(task_name) {
    console.log('importTasks called with:', task_name);
    console.log('Type of task_name:', typeof task_name);
    console.log('task_name stringified:', JSON.stringify(task_name));
    const { handleEvent } = await import(`./modules/eventHandler_${task_name}.js`);

    const handleEventCode_check = await fs.readFile(`./modules/eventHandler_${task_name}.js`, 'utf8');
    console.log('handleEventCode_check:', handleEventCode_check);

    return handleEvent;
}
export async function handler_login(req, res) {
    const environment = process.env.ENVIRONMENT;
    let config;
    if (environment === 'cloud') {
        config = loadConfig('config/config.json');
    } else {
        config = loadConfig('config/config_off.json');
    }
    const url = req.body.url;
    const task_name = req.body.task_name;
    const user_id = req.body.user_id;
    const tuiguang_phonenumber = req.body.tuiguang_phonenumber;
    // 获取用户提供的登录成功选择器，如果未提供则使用默认选择器
    const loginSuccessSelectors = req.body.successSelectors || [
        'div.user-container',
        '.userinfo-container .username',
        '.userinfo-container',
        'div#header-avatar.dropdown-wrapper--1F0hA.avatar-wrapper--10nXI'
    ];
    let browser;
    let page;
    
    try {
        // 使用指定显示器启动浏览器
        browser = await launchBrowser(config.puppeteerConfig);
        page = await setupPage(browser, config.cookies);
    

    // const browser = await launchBrowser(config.puppeteerConfig);
    // let page = await setupPage(browser, config.cookies);
    await page.setDefaultNavigationTimeout(180000); // 设置超时时间为 3 分钟
    
    console.log(`正在导航到 ${url}...`);
    await page.goto(url);

    // 创建基于用户提供的选择器或默认选择器的Promise数组
    const selectorPromises = loginSuccessSelectors.map(selector => 
        page.waitForSelector(selector, { timeout: 10 * 60 * 1000 })
    );
    
    // 等待任一选择器出现
    const element = await Promise.race(selectorPromises);
    
    // 等待用户登录过程并定期检查登录状态
    console.log('检测到目标元素，开始监测登录状态...');
    
    // 为了确认包含用户信息，检查页面上的文本内容
    let loginConfirmed = false;
    const maxAttempts = 10; // 最大尝试次数
    let attempts = 0;
    
    while (!loginConfirmed && attempts < maxAttempts) {
        try {
            // 检查京东外卖登录平台
            if (url.includes('store.jddj.com')) {
                const userText = await page.evaluate(() => {
                    // 尝试获取用户菜单文本
                    const userMenuText = document.querySelector('.dj-button-content')?.innerText;
                    return userMenuText || '';
                });
                
                console.log('检测到用户信息文本:', userText);
                
                // 如果用户文本不为空且不含有"登录"或"注册"字样，则认为登录成功
                if (userText && !userText.includes('登录') && !userText.includes('注册')) {
                    loginConfirmed = true;
                    console.log('检测到登录成功状态！');
                } else {
                    console.log(`第 ${attempts + 1}/${maxAttempts} 次监测，未检测到登录状态，等待 30 秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒后重新检测
                    attempts++;
                }
            } else {
                // 其他平台的默认处理，假设元素存在就表示登录成功
                loginConfirmed = true;
            }
        } catch (error) {
            console.error(`第 ${attempts + 1}/${maxAttempts} 次监测出错:`, error);
            // 出错时进行重试而不是直接判定为成功
            await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒后重新检测
            attempts++;
        }
    }
    
    if (!loginConfirmed) {
        console.log('达到最大监测次数，仍未检测到登录状态，将继续执行...');
        // 等待更长时间让用户手动登录
        await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
        console.log('成功确认登录状态！');
    }
    
    console.log('登录成功.');
    // 登录成功后，保存登录状态
    // 从 URL 中提取域名
    let domain = '';
    try {
        // 尝试从 URL 中提取域名
        const urlObj = new URL(url);
        domain = urlObj.hostname;
        console.log(`从 URL 提取域名: ${domain}`);
    } catch (error) {
        console.error(`无法从 URL 提取域名: ${error.message}`);
    }
    
    // 获取cookies
    const allCookies = await page.cookies();
    let cookies = allCookies;
    
    // 如果有效域名，则过滤特定域名的 cookies
    if (domain) {
        // 过滤出特定域名及其子域名的 cookies
        cookies = allCookies.filter(cookie => {
            // 完全匹配或者是子域名
            return cookie.domain === domain || 
                   cookie.domain === `.${domain}` || 
                   domain.endsWith(cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`);
        });
        
        console.log(`所有 cookies: ${allCookies.length}, 过滤后的 cookies: ${cookies.length}`);
    }
    
    // 保存cookies到文件
    const outputHandler = OutputFactory.createOutputHandler(config.outputFormat);
    await outputHandler.handle(JSON.stringify(cookies, null, 2), 'login', task_name,'cityname', user_id, tuiguang_phonenumber);

    console.log('保存成功.');

    await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        console.error('自动登录过程中出错:', error);
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('关闭浏览器时出错:', closeError);
            }
        }
    }
}

export async function handler_run_base(req, res) {
    // 添加未捕获异常的全局处理
    let browser, page;
    
    try {
        console.log('开始处理任务请求_base');
        const environment = process.env.ENVIRONMENT;
        let config;
        if (environment === 'cloud') {
            config = loadConfig('config/config.json');
        } else {
            config = loadConfig('config/config_off.json');
        }

        const sortedData = req.body.sortedData;
        console.log('req.body.row:', req.body.row);
        const rows = Array.isArray(req.body.row) ? req.body.row : [req.body.row];
        const task_name = req.body.task_name;
        const user_id = req.body.user_id;
        const workflowFile = req.body.workflowFile;
        console.log('task_name值:', task_name, '类型:', typeof task_name);
        console.log('条件判断结果:', task_name === 'waimai_meituan');
        let adsPowerUserId = req.body.adsPowerUserId || 'kn8o287';
        console.log('初始adsPowerUserId:', adsPowerUserId);
        if (task_name === 'waimai_meituan') {
            adsPowerUserId = 'kubsdhs';
            console.log('已替换为新的adsPowerUserId:', adsPowerUserId);
        } else if (task_name === 'waimai_jingdong') {
            adsPowerUserId = 'kubsdhs';
            console.log('已替换为新的adsPowerUserId:', adsPowerUserId);
        }
        console.log('最终adsPowerUserId:', adsPowerUserId);

        const BASE_URL = req.body.BASE_URL;



        //获取执行代码
        await taskExecutor(task_name);
        await eventHandler(task_name);

        const handleEvent = await importHandleEvent(task_name);
        console.log('task_name_0:', task_name);


        let cookies = [];
        let categoryNames = [];
        const cookieFilePath = path.join(process.cwd(), `cookie_${task_name}_${user_id}.json`);
        try {
            const cookieFileContent = await fs.readFile(cookieFilePath, 'utf-8');
            cookies = JSON.parse(cookieFileContent);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Cookie 文件不存在: ${cookieFilePath}，将从数据库获取`);
                const TaskList = await findTaskcookies(task_name,user_id);
                TaskList.sort((a, b) => b.id - a.id);
                const latestTask = TaskList.length > 0 ? TaskList[0] : null;

                if (latestTask && latestTask.cookies) {
                    try {
                        // 检查cookies类型
                        if (typeof latestTask.cookies === 'string') {
                            try {
                                // 先尝试解析一次
                                cookies = JSON.parse(latestTask.cookies);
                                console.log('第一次解析后的类型:', typeof cookies);
                                
                                // 如果得到的仍然是字符串，可能是字符串形式的JSON，再解析一次
                                if (typeof cookies === 'string') {
                                    try {
                                        cookies = JSON.parse(cookies);
                                        console.log('第二次解析后的类型:', typeof cookies);
                                    } catch (e) {
                                        console.log('第二次解析失败，使用原始字符串:', e);
                                    }
                                }
                                
                                // 确保cookies是数组
                                if (!Array.isArray(cookies)) {
                                    console.log('解析结果不是数组，将其转换为数组');
                                    cookies = [cookies];
                                }
                            } catch (parseError) {
                                console.error('解析 task_cookies 字符串失败:', parseError);
                                cookies = [];
                            }
                        } else if (typeof latestTask.cookies === 'object') {
                            // 如果已经是对象，直接使用
                            console.log('cookies已经是对象类型');
                            cookies = latestTask.cookies;
                            if (!Array.isArray(cookies)) {
                                console.log('cookies对象不是数组格式，将其转换为数组');
                                cookies = [cookies];
                            }
                        } else {
                            console.error('意外的cookies类型:', typeof latestTask.cookies);
                            cookies = [];
                        }
                        
                        console.log('成功解析cookies，数量:', Array.isArray(cookies) ? cookies.length : 0);
                    } catch (parseError) {
                        console.error('处理cookies时发生错误:', parseError);
                        cookies = [];
                    }
                } else {
                    console.log('没有找到cookies或latestTask为空');
                    cookies = [];
                }

                await fs.writeFile(cookieFilePath, JSON.stringify(cookies, null, 2));
                console.log(`Cookies 已保存到文件: ${cookieFilePath}`);


            } else {
                console.error('读取 cookie 文件时发生错误:', error);
                cookies = [];
            }
        }
        function cleanCategoryNames(categoryNames) {
            console.log('原始分类名称:', categoryNames);
            
            // 定义一个通用的清理函数
            const cleanString = (str) => {
                if (typeof str !== 'string') return str;
                
                return str
                    .replace(/【.*?】/g, '')  // 移除【】中的内容
                    // 扩展表情符号匹配范围
                    .replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{2700}-\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}]/gu, '')
                    // 匹配类似 (￣▽￣)～■ 的表情组合
                    .replace(/\([^\)]*\)[～~]?[■□◆◇○●]/g, '')
                    // 匹配其他常见表情组合
                    .replace(/\([^\)]*\)/g, '')  // 移除(...)形式的表情
                    .replace(/（[^）]*）/g, '')   // 移除（...）形式的表情
                    .replace(/[～~][■□◆◇○●]/g, '') // 移除～■等组合
                    .replace(/\r/g, '')          // 移除\r换行符
                    .replace(/—\s*—/g, '')       // 移除— —符号
                    .trim();                     // 移除前后空格
            };
            
            if (typeof categoryNames === 'string') {
                return cleanString(categoryNames);
            } else if (Array.isArray(categoryNames)) {
                return categoryNames.map(item => {
                    if (Array.isArray(item)) {
                        return item.map(subItem => cleanString(subItem));
                    } else {
                        return cleanString(item);
                    }
                });
            }
            
            console.log('处理后分类名称:', categoryNames);
            return categoryNames || '';
        }
        // 如果是京东外卖任务，从美团外卖的数据中获取分类名称
        if (task_name === 'waimai_jingdong') {

            if ( workflowFile==='test_jingdong_1.json'){
                console.log('正在获取美团外卖的分类数据...');
                const allproducts = await findTaskCategoryNames("waimai_meituan", user_id, '商品图片信息');
                categoryNames = allproducts.categoryNames;
                // 剔除类别名称中的表情符号（如【🥤】或【❤️】）
                if (categoryNames && Array.isArray(categoryNames)) {
                    console.log('原始分类名称:', categoryNames);
                    
                    // 使用cleanCategoryNames函数处理
                    const cleanedCategoryNames = cleanCategoryNames(categoryNames);
                    
                    // 如果需要详细日志，可以添加比较逻辑
                    if (Array.isArray(cleanedCategoryNames)) {
                        cleanedCategoryNames.forEach((item, index) => {
                            const original = categoryNames[index];
                            if (JSON.stringify(item) !== JSON.stringify(original)) {
                                console.log(`处理前: "${JSON.stringify(original)}", 处理后: "${JSON.stringify(item)}"`);
                            }
                        });
                    }
                    
                    categoryNames = cleanedCategoryNames;
                    console.log('处理后分类名称:', categoryNames);
                }
            }
            else if ( workflowFile==='test_jingdong_2.json'){
                try {


                    console.log('正在获取美团外卖的分类数据...');
                    const allproducts = await findTaskCategoryNames("waimai_meituan", user_id, '商品图片信息');
                    categoryNames = allproducts.categoryNames;
                    if (categoryNames && Array.isArray(categoryNames)) {
                        console.log('原始分类名称:', categoryNames);
                        
                        // 使用cleanCategoryNames函数处理
                        const cleanedCategoryNames = cleanCategoryNames(categoryNames);
                        
                        // 如果需要详细日志，可以添加比较逻辑
                        if (Array.isArray(cleanedCategoryNames)) {
                            cleanedCategoryNames.forEach((item, index) => {
                                const original = categoryNames[index];
                                if (JSON.stringify(item) !== JSON.stringify(original)) {
                                    console.log(`处理前: "${JSON.stringify(original)}", 处理后: "${JSON.stringify(item)}"`);
                                }
                            });
                        }
                        
                        categoryNames = cleanedCategoryNames;
                        console.log('处理后分类名称:', categoryNames);
                    }
                    let products = allproducts.products;
                    
                    // 获取商品详情信息
                    console.log('正在获取商品详情信息...');
                    let productDetails = await findTaskDetail("waimai_meituan", user_id, '详细商品信息');
                    console.log(`获取到的商品详情: 共${productDetails.length}项`);


                    console.log('开始预处理商品详情，确保相同商品名称只对应一个商品ID...');
                    // 创建一个映射，用于存储商品名称到商品ID的唯一映射
                    const uniqueProductMap = {};
                    
                    // 预处理商品详情
                    productDetails.forEach(detail => {
                        if (detail.商品名称 && detail.商品ID) {
                            const productName = detail.商品名称.trim();
                            // 如果这个商品名称还没有对应的ID，则添加
                            if (!uniqueProductMap[productName]) {
                                uniqueProductMap[productName] = detail.商品ID;
                                console.log(`为商品 "${productName}" 设置唯一ID: ${detail.商品ID}`);
                            }
                        }
                    });
                    
                    // 更新productDetails，确保相同名称的商品使用相同的ID
                    productDetails = productDetails.map(detail => {
                        if (detail.商品名称) {
                            const productName = detail.商品名称.trim();
                            if (uniqueProductMap[productName]) {
                                return {
                                    ...detail,
                                    // 商品ID: uniqueProductMap[productName]
                                    spu_id: `${uniqueProductMap[productName]}0`
                                };
                            }
                        }
                        return detail;
                    });
                    
                    console.log(`预处理完成，唯一商品映射数量: ${Object.keys(uniqueProductMap).length}`);
                    
                    // 通过商品名称关联商品ID
                    if (products && products.length > 0 && productDetails && productDetails.length > 0) {
                        console.log('开始通过商品名称关联商品ID...');
                        
                        // 创建一个新的产品数组来存储扩展后的产品
                        let expandedProducts = [];
                        
                        products.forEach(product => {
                            // 查找所有匹配当前商品名称的记录
                            const matchedDetails = productDetails.filter(detail => 
                                detail.商品名称 && product.name && 
                                detail.商品名称.trim() === product.name.trim()
                            );
                            
                            if (matchedDetails && matchedDetails.length > 0) {
                                console.log(`为商品 ${product.name} 找到 ${matchedDetails.length} 个匹配的SKU`);
                                
                                // 为每个匹配的详情创建一个新的产品对象
                                matchedDetails.forEach(detail => {
                                    if (detail.商品ID) {
                                        console.log(`为商品 ${product.name} 关联到ID: ${detail.商品ID}`);
                                        expandedProducts.push({
                                            ...product,
                                            spu_id: detail.spu_id,
                                            sku_id: detail.商品ID
                                        });
                                    }
                                });
                            } else {
                                // 如果没有匹配项，保留原始产品
                                expandedProducts.push(product);
                            }
                        });
                        
                        // 用扩展后的产品替换原始产品数组
                        products = expandedProducts;
                        console.log(`成功关联商品ID，处理后商品数: ${products.length}`);
                    }
                    console.log(`获取到的商品信息: ${JSON.stringify(products)}`);
                    // 获取店铺位置信息
                    console.log('正在获取店铺位置信息...');
                    const storeAddress = await findTaskinfo("waimai_meituan", user_id, '店铺信息');
                    console.log(`获取到的店铺地址: ${storeAddress}`);
                    
                    // 从地址中提取城市信息
                    let cityName = '';
                    if (storeAddress && storeAddress !== '暂无地址信息' && storeAddress !== '解析错误，无法获取地址信息') {
                        // 尝试从地址中提取城市名称（通常是地址的第二部分）
                        const addressParts = storeAddress.split('市');
                        if (addressParts.length > 1) {
                            // 提取第一个“市”前面的内容
                            const cityWithPrefix = addressParts[0];
                            // 如果有省份则去除
                            const provinceSuffix = cityWithPrefix.lastIndexOf('省');
                            cityName = provinceSuffix !== -1 ? 
                                cityWithPrefix.substring(provinceSuffix + 1) : 
                                cityWithPrefix.split(/[省自治区特别行政区]/).pop();
                            // 添加“市”后缀
                            cityName = cityName + '市';
                        } else {
                            // 如果没有“市”字，尝试其他方式提取
                            const cityMatches = storeAddress.match(/(?:[一-龥]+(?:省|自治区|特别行政区))?([^省区县]+?(?:市|地区|盟))/);
                            if (cityMatches && cityMatches.length > 1) {
                                cityName = cityMatches[1];
                            }
                        }
                    }
                    console.log(`提取到的城市名称: ${cityName}`);
                    
    
                    try {
                        // 读取Excel文件
                        console.log('读取BatchHandleCreateLightFoodSpu.xls文件...');
                        const excelPath = path.join(process.cwd(), 'BatchHandleCreateLightFoodSpu.xls');
                        console.log(`Excel路径: ${excelPath}`);
                        
                        // 读取Excel文件
                        const workbook = xlsx.readFile(excelPath);
                        
                        // 获取第一个sheet（商品信息）和第四个sheet（销售城市）
                        const productSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const citySheet = workbook.Sheets[workbook.SheetNames[3]];
                        
                        // 将第四个sheet转换为JSON
                        const cityData = xlsx.utils.sheet_to_json(citySheet);
                        
                        // 在城市数据中查找对应的城市ID
                        let cityId = '';
                        if (cityName) {
                            const cityMatch = cityData.find(city => city['城市名称'] === cityName);
                            if (cityMatch) {
                                cityId = cityMatch['城市ID'];
                                console.log(`找到城市ID: ${cityId}`);
                            } else {
                                console.log(`未找到城市 ${cityName} 的ID`);
                            }
                        }
                        
                        // 获取第一个sheet的数据
                        const productData = xlsx.utils.sheet_to_json(productSheet, {header: 'A'});
                        
                        // 读取并打印表头数据，帮助确认列结构
                        console.log('表格头部数据:');
                        console.log(JSON.stringify(productData[0], null, 2));
                        console.log('第二行数据:');
                        console.log(JSON.stringify(productData[1], null, 2));
                        
                        // 从第四行开始填写商品数据
                        let startRow = 4; // Excel中第4行（索引从0开始）
                        
                        // 动态确定列标识
                        // 首先分析表头找到对应的列
                        let PRODUCT_NAME_COL = null;  // 商品名称*
                        let SPU_COL = null;           // 商家spu编码
                        let SKU_COL =null;
                        let WEIGHT_COL = null;        // 商品重量* （单位：kg）
                        let PRICE_COL = null;          // 商品价格* （单位：元）
                        let CATEGORY_COL = null;       // 一级店内分类
                        let CITY_ID_COL = null;        // 销售城市ID
                        let FINAL_CATEGORY_ID_COL = null; // 商品类目（末级类目ID）
                        let Xiaoshoushuxing_COL = null; // 销售属性名称
                        let Xiaoshoushuxing_value_COL = null; // 销售属性值
                        let Zidingyishuxing_COL = null; // 自定义属性名称
                        let Shangpinpinpaiid_COL = null; // 商品品牌ID
                        
                        // 遍历表头行找到对应列
                        const headers = productData[0] || {};
                        const headerRow = productData[1] || {}; // 有时第二行才是真正的标题
                        
                        // 检查所有列提取列标识
                        Object.keys(headers).forEach(col => {
                            // 检查第一行
                            if (headers[col] && typeof headers[col] === 'string') {
                                if (headers[col].includes('商品名称*')) PRODUCT_NAME_COL = col;
                                if (headers[col].includes('商家spu编码')) SPU_COL = col;
                                if (headers[col].includes('商家sku编码')) SKU_COL = col;
                                if (headers[col].includes('重量')) WEIGHT_COL = col;
                                if (headers[col].includes('价格')) PRICE_COL = col;
                                if (headers[col].includes('一级店内分类')) CATEGORY_COL = col;
                                if (headers[col].includes('销售城市ID')) CITY_ID_COL = col;
                                if (headers[col].includes('商品类目（末级类目ID）') || headers[col].includes('商品类目（末级类目ID）')) FINAL_CATEGORY_ID_COL = col;
                                if (headers[col].includes('销售属性名称')) Xiaoshoushuxing_COL = col;
                                if (headers[col].includes('销售属性值')) Xiaoshoushuxing_value_COL = col;
                                if (headers[col].includes('自定义属性')) Zidingyishuxing_COL = col;
                                if (headers[col].includes('商品品牌ID')) Shangpinpinpaiid_COL = col;
                            }
                            
                            // 检查第二行
                            if (headerRow[col] && typeof headerRow[col] === 'string') {
                                if (headerRow[col].includes('商品名称*')) PRODUCT_NAME_COL = col;
                                if (headerRow[col].includes('重量')) WEIGHT_COL = col;
                                if (headerRow[col].includes('价格')) PRICE_COL = col;
                                if (headerRow[col].includes('一级店内分类')) CATEGORY_COL = col;
                                if (headerRow[col].includes('销售城市ID')) CITY_ID_COL = col;
                                if (headerRow[col].includes('商品类目（末级类目ID）') || headerRow[col].includes('商品类目（末级类目ID')) FINAL_CATEGORY_ID_COL = col;
                            }
                        });
                        
                        // 如果没有找到，使用默认值
                        PRODUCT_NAME_COL = PRODUCT_NAME_COL || 'B';
                        SPU_COL = SPU_COL || 'E';
                        SKU_COL = SKU_COL || 'H';
                        WEIGHT_COL = WEIGHT_COL || 'I';
                        PRICE_COL = PRICE_COL || 'J';
                        CATEGORY_COL = CATEGORY_COL || 'M';
                        CITY_ID_COL = CITY_ID_COL || 'T';
                        FINAL_CATEGORY_ID_COL = FINAL_CATEGORY_ID_COL || 'D';
                        Xiaoshoushuxing_COL = Xiaoshoushuxing_COL || 'F';
                        Xiaoshoushuxing_value_COL = Xiaoshoushuxing_value_COL || 'G';
                        Zidingyishuxing_COL = Zidingyishuxing_COL || 'Q';
                        Shangpinpinpaiid_COL = Shangpinpinpaiid_COL || 'L';

                        
                        // 输出最终确定的列标识
                        console.log('确定的列标识:');
                        console.log(`商品名称列: ${PRODUCT_NAME_COL}`)
                        console.log(`商品重量列: ${WEIGHT_COL}`);
                        console.log(`商品价格列: ${PRICE_COL}`);
                        console.log(`一级店内分类列: ${CATEGORY_COL}`);
                        console.log(`销售城市ID列: ${CITY_ID_COL}`);
                        console.log(`商品类目(末级类目ID)列: ${FINAL_CATEGORY_ID_COL}`);
                        
                        // 根据图片中展示的Excel表格结构，进行手动确认
                        // 基于用户提供的图片和要求，这里还可以手动确认
                        // 如果自动检测不准确，可以考虑按照图片中的列序手动设置
                        
                        // 如果有商品详情，填入Excel
                        if (productDetails && productDetails.length > 0) {
                            for (let i = 0; i < productDetails.length; i++) {
                                const product = productDetails[i];
                                const targetRow = startRow + i;
                                
                                // 确保在范围内
                                if (targetRow >= productData.length) {
                                    // 需要添加新行
                                    const newRow = {};
                                    productData.push(newRow);
                                }
                                
                                // 填写各字段
                                productData[targetRow][PRODUCT_NAME_COL] = cleanCategoryNames(product.商品名称);
                                productData[targetRow][SPU_COL] = product.spu_id || '';
                                productData[targetRow][SKU_COL] = product.商品ID || '';
                                const weight = product['重量(g)'] ? parseInt(product['重量(g)']) : 0;
                                productData[targetRow][WEIGHT_COL] = weight <= 0 ? '0.500' : (weight / 1000).toFixed(3);
                                productData[targetRow][PRICE_COL] = product.价格 || '';
                                productData[targetRow][CATEGORY_COL] = cleanCategoryNames(product.分类名称);
                                productData[targetRow][Xiaoshoushuxing_COL]="规格"
                                // 检查规格名称是否为空，如果为空则使用默认值
                                productData[targetRow][Xiaoshoushuxing_value_COL] = product.规格名称 ? product.规格名称 : "标准份";
                                productData[targetRow][Zidingyishuxing_COL]=product.属性;
                                // productData[targetRow][CITY_ID_COL] = cityId || '';
                                productData[targetRow][CITY_ID_COL] =0;
                                productData[targetRow][FINAL_CATEGORY_ID_COL] = '31139'; // 固定值末级类目ID
                                productData[targetRow][Shangpinpinpaiid_COL] = '35247'; // 固定值商品品牌ID
    
                            }
                            
                            // 创建新的工作簿，不修改原文件
                            const newWorkbook = xlsx.utils.book_new();
                            
                            // 创建带有偏移列的数据（从第二列开始插入，第一列保持为空）
                            const offsetData = [];
                            for (const row of productData) {
                                const newRow = {};
                                // 显式设置第一列为空
                                newRow['A'] = '';
                                // 根据原始数据中的列位置调整到新位置（B列开始）
                                Object.keys(row).forEach(key => {
                                    if (key === 'A') {
                                        // A列数据放到B列
                                        newRow['B'] = row[key];
                                    } else {
                                        // 其他列向右偏移一列
                                        const newColIndex = String.fromCharCode(key.charCodeAt(0) + 1);
                                        newRow[newColIndex] = row[key];
                                    }
                                });
                                offsetData.push(newRow);
                            }
                            
                            // 将更新后的数据建立为新的sheet
                            const newSheet = xlsx.utils.json_to_sheet(offsetData, {skipHeader: true});
                            
                            // 将该sheet添加到新工作簿中，并指定名称为"商品信息"
                            xlsx.utils.book_append_sheet(newWorkbook, newSheet, '商品信息');
                            
                            // 生成新文件名，带有user_id后缀
                            const newExcelPath = path.join(process.cwd(), `BatchHandleCreateLightFoodSpu_${user_id}.xls`);
                            
                            // 将新工作簿写入到新文件
                            xlsx.writeFile(newWorkbook, newExcelPath);
                            console.log(`成功将数据写入新Excel文件: ${newExcelPath}，数据从第二列开始插入`);
                        } else {
                            console.log('没有商品详情数据可填写');
                        }
    
                        // 处理商品图片
                        console.log('开始处理商品图片...');
                        try {
                            if (products && products.length > 0) {
                                // await processProductImages(products.slice(0, 5), user_id);
                                await processProductImages(products, user_id);
                            } else {
                                console.log('没有商品图片数据可处理');
                            }
                        } catch (imgErr) {
                            console.error('图片处理错误:', imgErr);
                        }
                        
                    } catch (excelErr) {
                        console.error('Excel处理错误:', excelErr);
                    }
                    
                } catch (error) {
                    console.error('获取分类名称失败:', error.message);
                    categoryNames = [['热销推荐', '主食', '小吃', '饮品']];
                    console.log(`使用默认分类名称: ${JSON.stringify(categoryNames)}`);
                }}
            else null;

        }
        // 发送浏览器初始化状态
       
        // browser = await launchBrowser(config.puppeteerConfig);
        browser = await launchBrowser_adsPower_lianjie_local(adsPowerUserId,BASE_URL);
        // page = await setupPage(browser, cookies);
        page = await setupPage_adsPower(browser, cookies);
        

        console.log('rowscheck:', rows);
        
        const sortedData_new = matchAndReplace(sortedData, rows[0])
        let cityname = rows[0].cityname;
        console.log('cityname:', cityname);
        console.log('task_name:', task_name);
        console.log('sortedData_new:', sortedData_new);

        // 处理非循环事件
        for (const [index, event] of sortedData_new.entries()) {
            try {
                const { type, time } = event;
                console.log('正在处理事件:', event);


                await new Promise(resolve => setTimeout(resolve, 2000));
                await page.bringToFront();

                if (type === 'loop' && event.loopEvents) {
                    console.log('处理循环事件的 loopEvents');
                    event.loopEvents = matchAndReplace(event.loopEvents, rows[0]);
                    console.log('处理后的 loopEvents:', event.loopEvents);
                }

                page = await handleEvent(event, page, browser, index, sortedData_new, task_name, cityname, user_id,categoryNames);

                const currentTime = new Date(time).getTime();
                const nextTime = sortedData_new[index + 1]
                    ? new Date(sortedData_new[index + 1].time).getTime()
                    : currentTime;
                const waitTime = Math.max(2000, Math.min(nextTime - currentTime, 120000));
                await new Promise(resolve => setTimeout(resolve, waitTime));

            } catch (error) {
                console.error(`处理非循环事件 ${index} 时出错:`, error);
            }
        }

        // if (page && !page.isClosed()) {
        //     await page.close();
        //     console.log('adsPower页面已关闭');
        // }

        // 发送完成状态
        res.json({
            status: 'success',
            message: '任务执行完成'
          });



        

    } catch (error) {
        console.error('任务执行过程中发生错误:', error);
        res.status(500).json({
            status: 'error',
            message: '任务执行失败',
            error: error.message
        });
    }
    finally {
        // 确保资源被清理
        try {
            // await new Promise(resolve => setTimeout(resolve, 600000));
            await page.close();
            // await browser.close();
        } catch (cleanupError) {
            console.error('清理资源时出错:', cleanupError);
        }
    }
}




export async function handler_run(req, res) {
    // 添加未捕获异常的全局处理
    process.on('uncaughtException', (error) => {
        console.error('未捕获的异常:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('未处理的Promise拒绝:', reason);
    });

    let browser, page;
    
    try {
        console.log('开始处理任务请求');
        const environment = process.env.ENVIRONMENT;
        let config;
        if (environment === 'cloud') {
            config = loadConfig('config/config.json');
        } else {
            config = loadConfig('config/config_off.json');
        }

        const sortedData = req.body.sortedData;
        console.log('req.body.row:', req.body.row);
        const rows = Array.isArray(req.body.row) ? req.body.row : [req.body.row];
        const task_name = req.body.task_name;

        console.log('task_name:', task_name);
        const leixing = req.body.leixing;
        const adsPowerUserId = req.body.adsPowerUserId || 'kn8o287';
        const BASE_URL = req.body.BASE_URL;
        const adsPowerId = req.body.adsPowerId || '10.128.0.3';

        // 初始化响应头
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked'
        });
        

        // 发送初始状态
        res.write(JSON.stringify({
            status: 'initializing',
            message: '开始执行代码'
        }) + '\n');

        //获取执行代码
        await taskExecutor(task_name);
        await eventHandler(task_name);

        const handleEvent = await importHandleEvent(task_name);
        console.log('task_name_0:', task_name);
        console.log('leixing:', leixing);

        // 发送状态更新
        res.write(JSON.stringify({
            status: 'loading',
            message: '正在加载Cookie'
        }) + '\n');

        let cookies = [];
        const cookieFilePath = path.join(process.cwd(), `cookie_${task_name}.json`);
        try {
            const cookieFileContent = await fs.readFile(cookieFilePath, 'utf-8');
            cookies = JSON.parse(cookieFileContent);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Cookie 文件不存在: ${cookieFilePath}，将从数据库获取`);
                const TaskList = await findTaskcookies(task_name);
                TaskList.sort((a, b) => b.id - a.id);
                const latestTask = TaskList.length > 0 ? TaskList[0] : null;

                if (latestTask && latestTask.cookies) {
                    try {
                        // 检查cookies类型
                        if (typeof latestTask.cookies === 'string') {
                            try {
                                // 先尝试解析一次
                                cookies = JSON.parse(latestTask.cookies);
                                console.log('第一次解析后的类型:', typeof cookies);
                                
                                // 如果得到的仍然是字符串，可能是字符串形式的JSON，再解析一次
                                if (typeof cookies === 'string') {
                                    try {
                                        cookies = JSON.parse(cookies);
                                        console.log('第二次解析后的类型:', typeof cookies);
                                    } catch (e) {
                                        console.log('第二次解析失败，使用原始字符串:', e);
                                    }
                                }
                                
                                // 确保cookies是数组
                                if (!Array.isArray(cookies)) {
                                    console.log('解析结果不是数组，将其转换为数组');
                                    cookies = [cookies];
                                }
                            } catch (parseError) {
                                console.error('解析 task_cookies 字符串失败:', parseError);
                                cookies = [];
                            }
                        } else if (typeof latestTask.cookies === 'object') {
                            // 如果已经是对象，直接使用
                            console.log('cookies已经是对象类型');
                            cookies = latestTask.cookies;
                            if (!Array.isArray(cookies)) {
                                console.log('cookies对象不是数组格式，将其转换为数组');
                                cookies = [cookies];
                            }
                        } else {
                            console.error('意外的cookies类型:', typeof latestTask.cookies);
                            cookies = [];
                        }
                        
                        console.log('成功解析cookies，数量:', Array.isArray(cookies) ? cookies.length : 0);
                    } catch (parseError) {
                        console.error('处理cookies时发生错误:', parseError);
                        cookies = [];
                    }
                } else {
                    console.log('没有找到cookies或latestTask为空');
                    cookies = [];
                }

                await fs.writeFile(cookieFilePath, JSON.stringify(cookies, null, 2));
                console.log(`Cookies 已保存到文件: ${cookieFilePath}`);
            } else {
                console.error('读取 cookie 文件时发生错误:', error);
                cookies = [];
            }
        }

        // 发送浏览器初始化状态
        res.write(JSON.stringify({
            status: 'browser_initializing',
            message: '正在初始化浏览器'
        }) + '\n');
        browser = await launchBrowser_adsPower_lianjie_local(adsPowerUserId,BASE_URL);
        page = await setupPage_adsPower(browser, cookies);

        // 发送浏览器就绪状态
        res.write(JSON.stringify({
            status: 'browser_ready',
            message: '浏览器初始化完成'
        }) + '\n');

        const monitorResults = {
            clicks: [],
            navigations: [],
            inputs: [],
            scrolls: [],
            keydowns: [],
        };

        const dataProcessor = new DataProcessor(monitorResults);
        dataProcessor.addMonitor(page);
        console.log('rowscheck:', rows);
        
        const sortedData_new = matchAndReplace(sortedData, rows[0])
        let cityname = rows[0].cityname;
        console.log('cityname:', cityname);
        console.log('task_name:', task_name);
        console.log('sortedData_new:', sortedData_new);

        // 处理非循环事件
        for (const [index, event] of sortedData_new.entries()) {
            if (event.type !== 'loop_new') {
                try {
                    const { type, time } = event;
                    console.log('正在处理事件:', event);

                    // 发送事件处理状态
                    res.write(JSON.stringify({
                        status: 'processing',
                        progress: `${index + 1}/${sortedData_new.length}`,
                        message: `正在处理事件: ${type}`
                    }) + '\n');

                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await page.bringToFront();

                    if (type === 'loop' && event.loopEvents) {
                        console.log('处理循环事件的 loopEvents');
                        event.loopEvents = matchAndReplace(event.loopEvents, rows[0]);
                        console.log('处理后的 loopEvents:', event.loopEvents);
                    }

                    page = await handleEvent(event, page, browser, index, sortedData_new, task_name, cityname);

                    const currentTime = new Date(time).getTime();
                    const nextTime = sortedData_new[index + 1]
                        ? new Date(sortedData_new[index + 1].time).getTime()
                        : currentTime;
                    const waitTime = Math.max(2000, Math.min(nextTime - currentTime, 120000));
                    await new Promise(resolve => setTimeout(resolve, waitTime));

                } catch (error) {
                    console.error(`处理非循环事件 ${index} 时出错:`, error);
                    res.write(JSON.stringify({
                        status: 'event_error',
                        message: `事件处理错误: ${error.message}`,
                        eventIndex: index
                    }) + '\n');
                }
            }
        }

        // 处理循环事件
        for (const [index, event] of sortedData.entries()) {
            if (event.type === 'loop_new') {
                for (const row of rows) {
                    try {
                        console.log('处理循环事件，数据行:', row);
                        let cityname = row.cityname;
                        console.log('cityname:', cityname);

                        // 发送循环事件状态
                        res.write(JSON.stringify({
                            status: 'processing_loop',
                            message: `正在处理循环事件: ${cityname}`
                        }) + '\n');

                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const loopEvents_new = matchAndReplace(event.loopEvents, row)
                        
                        for (const loopEvent of loopEvents_new) {
                            try {
                                console.log('执行循环子事件:', loopEvent);
                                const { type, time } = loopEvent;
                                await page.bringToFront();
                                page = await handleEvent(loopEvent, page, browser, index, sortedData, task_name, cityname);
                                
                                const currentTime = new Date(time).getTime();
                                const nextTime = loopEvent[index + 1]
                                    ? new Date(loopEvent[index + 1].time).getTime()
                                    : currentTime;
                                const waitTime = Math.max(2000, Math.min(nextTime - currentTime, 120000));
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                            } catch (error) {
                                console.error(`处理循环子事件时出错:`, error);
                                res.write(JSON.stringify({
                                    status: 'loop_event_error',
                                    message: `循环事件处理错误: ${error.message}`
                                }) + '\n');
                            }
                        }
                    } catch (error) {
                        console.error(`处理行 ${JSON.stringify(row)} 的循环事件时出错:`, error);
                    }
                }
            }
        }


        // 正常完成时发送成功响应
        res.write(JSON.stringify({
            status: 'success',
            message: '任务执行完成'
        }) + '\n');
        res.end();

    } catch (error) {
        console.error('任务执行过程中发生错误:', error);
        if (!res.writableEnded) {
            if (!res.headersSent) {
                res.status(500).json({
                    status: 'error',
                    message: '任务执行失败',
                    error: error.message
                });
            } else {
                res.write(JSON.stringify({
                    status: 'error',
                    message: '任务执行失败',
                    error: error.message
                }) + '\n');
                res.end();
            }
        }
    } finally {
        // 确保资源被清理
        try {
        // 清理资源
        if (page && !page.isClosed()) {
            await page.close();
            console.log('adsPower页面已关闭');
        }
        
        } catch (cleanupError) {
            console.error('清理资源时出错:', cleanupError);
        }
    }
}



export async function handler_run_test(params) {

    const environment = process.env.ENVIRONMENT;
    let config;
    if (environment === 'cloud') {
        config = loadConfig('config/config.json');
    } else {
        config = loadConfig('config/config_off.json');
    }
    const sortedData = params.sortedData;
    const row = params.row;
    const task_name = params.task_name;
    
    const handleEvent = await importHandleEvent(task_name);
    // const task_name = 'douyin';
    console.log('task_name_0:', task_name);
    const TaskList = await findTaskList(task_name);
    TaskList.sort((a, b) => b.id - a.id);
    const latestTask = TaskList[0];
    const jsonString = latestTask ? JSON.parse(latestTask.task_cookies) : "";
    const cookies = latestTask ? JSON.parse(jsonString) : [];

    // console.log('cookies', cookies)


    // const browser = await launchBrowser(config.puppeteerConfig);
    // let page = await setupPage(browser, cookies);
    const config_adsPower = {
        adsPowerUserId: 'kn8o287', // 替换为您的AdsPower用户ID
        adsPowerId: '35.225.115.200', // 替换为您的AdsPower用户ID
        // ... 其他配置项 ...
    };
    const browser = await launchBrowser_adsPower(config_adsPower);
    let page = await setupPage_adsPower(browser, cookies);


    const sortedData_new = matchAndReplace(sortedData, row);
    console.log('sortedData_new_run:', sortedData_new);

    const monitorResults = {
        clicks: [],
        navigations: [],
        inputs: [],
        scrolls: [],
        keydowns: [],
    };

    const dataProcessor = new DataProcessor(monitorResults);
    dataProcessor.addMonitor(page);
    let cityname = row.cityname
    console.log('cityname_0:', cityname);

    // 获取定义的 handleEvent 函数
    for (const [index, event] of sortedData_new.entries()) {
        const { type, time } = event;
        console.log('event:', event);
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('event:', event);
        page = await handleEvent(event, page, browser, index, sortedData_new, task_name, cityname);
        const currentTime = new Date(time).getTime();
        const nextTime = sortedData[sortedData.indexOf(event) + 1] ? new Date(sortedData[sortedData.indexOf(event) + 1].time).getTime() : currentTime;
        const waitTime = Math.min(nextTime - currentTime, 2000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    await new Promise(resolve => setTimeout(resolve, 200000));
    // await browser.close();
    await closeBrowser_adsPower(browser, config_adsPower.adsPowerUserId);
}
