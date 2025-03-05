(async () => {
    try {
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
        for (let i = 0; i < 2; i++) {
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
                    for (let i = 0; i < visibleModalContents.length; i++) {
                        const modal = visibleModalContents[i];
                        // 检查模态框标题
                        const modalTitle = modal.querySelector('.ivu-modal-header-inner');
                        const titleText = modalTitle ? modalTitle.textContent : '无标题';
                        console.log(`模态框 ${i+1} 标题:`, titleText);
                        
                        // 检查模态框内容
                        const modalHTML = modal.innerHTML.substring(0, 100) + '...'; // 只显示前100个字符
                        console.log(`模态框 ${i+1} 内容预览:`, modalHTML);
                        
                        // 检查表格数量
                        const tables = modal.querySelectorAll('table');
                        console.log(`模态框 ${i+1} 包含 ${tables.length} 个表格`);
                        
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
                                        console.log(`模态框 ${i+1} 在表格单元格中找到侵权词/敏感词:`, cell.textContent);
                                        break;
                                    }
                                }
                                if (sensitiveHeader) break;
                            }
                        }
                        
                        // 方法3：检查模态框标题是否为“提示”，并且内容中有表格
                        if (!sensitiveHeader && modalTitle && modalTitle.textContent === '提示') {
                            const hasTables = modal.querySelectorAll('table').length > 0;
                            if (hasTables) {
                                console.log(`模态框 ${i+1} 找到标题为“提示”的模态框，并且包含表格`);
                                sensitiveHeader = modalTitle; // 使用模态框标题作为标记
                            }
                        }
                        
                        if (sensitiveHeader) {
                            foundModals.push({
                                index: i,
                                title: titleText,
                                modal: modal,
                                header: sensitiveHeader
                            });
                            console.log(`模态框 ${i+1} 可能包含侵权词/敏感词的模态框`);
                        }
                    }
                    
                    console.log(`共找到 ${foundModals.length} 个可能包含侵权词/敏感词的模态框`);
                    
                    // 如果找到了多个模态框，优先选择标题为“提示”的
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
                            console.log(`根据站点序号 ${currentSiteIndex+1} 选择第 ${modalIndex+1} 个"提示"模态框（全局索引 ${promptModals[modalIndex].index+1}）`);
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
                        
                        // 如果是“提示”模态框，使用特定的选择器
                        if (isPromptModal) {
                            console.log('检测到“提示”模态框，使用特定选择器');
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
                                // 检查模态框标题是否为“提示”，如果是，则可能是侵权词模态框
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
                                    
                                    // 检查是否包含“侵权词”或“敏感词”字样
                                    if (sensitiveWordText === '侵权词/敏感词' || 
                                        sensitiveWordText === '侵权词' || 
                                        sensitiveWordText === '敏感词') {
                                        console.log(`跳过表头内容: ${sensitiveWordText}`);
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
                                console.log(`从站点 ${currentSiteName} 提取到 ${siteWords.length} 个侵权词/敏感词`);
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
    } catch (error) {
        console.error('执行过程中发生错误:', error);
        return [];
    }
})();