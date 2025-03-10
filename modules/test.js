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
            const category = categories[i];
            console.log(`正在处理分类: ${category.name}, 预计商品数: ${category.count}`);
            
            // 2.1 点击分类
            await frameToUse.evaluate((index) => {
                const tags = document.querySelectorAll('.tag-item_1KIyLi');
                if (tags[index]) {
                    tags[index].click();
                }
            }, i);
            
            // 等待加载
            await frameToUse.waitForTimeout(3000);
            
            // 2.2 执行滚动加载
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
            
            // 2.3 获取总页数
            const totalPages = await frameToUse.evaluate(() => {
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
            
            // 2.4 逐页处理
            let currentCategory = category.name;
            for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
                console.log(`正在处理分类 ${category.name} 的第 ${currentPage}/${totalPages} 页...`);
                
                // 如果不是第一页，点击翻页
                if (currentPage > 1) {
                    const pageChanged = await frameToUse.evaluate((page) => {
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
                    
                    if (!pageChanged) {
                        console.log('无法翻页，停止处理');
                        break;
                    }
                    
                    // 等待页面加载
                    await frameToUse.waitForTimeout(2500);
                    
                    // 执行滚动
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
                }
                
                // 2.5 提取当前页商品数据
                const pageProducts = await frameToUse.evaluate(() => {
                    console.log('开始提取商品数据...');
                    
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
                                category:currentCategory,
                                name,
                                price,
                                image: imgSrc
                            };
                        } catch (error) {
                            console.log(`提取商品 ${index+1} 数据时出错: ${error.message}`);
                            return {
                                name: '提取错误',
                                error: error.message
                            };
                        }
                    });
                });

                console.log(`从分类 ${category.name} 第 ${currentPage} 页提取到 ${pageProducts.length} 个商品`);
                                
                // 添加到总结果
                allProducts.push(...pageProducts);
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