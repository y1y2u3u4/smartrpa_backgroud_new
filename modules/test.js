else if (this.element.leixing === '自定义4') {
    // 等待表格元素出现
    await page.waitForFunction(() => {
        return document.querySelector('.vxe-table--header') !== null;
    }, { timeout: 30000 }).catch(error => {
        console.log('等待表格元素超时:', error);
    });

    // 先获取表格数据
    const tableData = await page.evaluate(() => {
        const results = [];
        
        // 获取表头信息
        const headers = [];
        const headerCells = document.querySelectorAll('.vxe-header--column .vxe-cell--title');
        headerCells.forEach(cell => {
            // 去除表头中的提示图标和弹窗内容
            const headerText = cell.textContent.replace(/\s+/g, ' ').trim();
            // 使用正则表达式移除图标后的文本
            const cleanHeader = headerText.replace(/\s+[\s\S]*$/, '').trim();
            headers.push(cleanHeader);
        });
        
        // 获取表格内容
        const rows = document.querySelectorAll('.vxe-body--row');
        rows.forEach(row => {
            const rowData = {};
            const cells = row.querySelectorAll('.vxe-body--column');
            
            cells.forEach((cell, index) => {
                if (index < headers.length) {
                    // 跳过复选框和序号列
                    if (index > 1) {
                        const header = headers[index];
                        
                        // 处理不同类型的单元格内容
                        if (header === '商品图') {
                            const img = cell.querySelector('img');
                            rowData[header] = img ? img.src : '';
                        } else if (header === '尺寸 （长*宽*高 CM）') {
                            const text = cell.textContent.trim();
                            // 尝试解析尺寸格式 (长x宽x高)
                            const dimensions = text.split('*').map(dim => parseFloat(dim) || 0);
                            if (dimensions.length === 3) {
                                rowData['长'] = dimensions[0];
                                rowData['宽'] = dimensions[1];
                                rowData['高'] = dimensions[2];
                            }
                            rowData[header] = text;
                        } else if (header === '重量') {
                            const text = cell.textContent.trim();
                            // 提取数字部分
                            const weightMatch = text.match(/(\d+\.?\d*)/);
                            rowData[header] = weightMatch ? parseFloat(weightMatch[1]) : 0;
                        } else if (header === '商品费/包邮价') {
                            const text = cell.textContent.trim();
                            // 提取价格数字
                            const priceMatch = text.match(/(\d+\.?\d*)/);
                            rowData[header] = priceMatch ? parseFloat(priceMatch[1]) : 0;
                        } else {
                            rowData[header] = cell.textContent.trim();
                        }
                    }
                }
            });
            
            // 只添加非空对象
            if (Object.keys(rowData).length > 0) {
                results.push(rowData);
            }
        });
        
        // 如果没有找到行数据，尝试获取表格的其他信息
        if (results.length === 0) {
            // 获取表格的基本信息
            const tableInfo = {
                tableFound: true,
                headerCount: headers.length,
                headers: headers.filter(h => h !== ''),
                tableWidth: document.querySelector('.vxe-table--header')?.style.width || '',
                message: '找到表格但没有数据行'
            };
            results.push(tableInfo);
        }
        
        return results;
    });

    console.log('提取的表格数据:', tableData);

    // 点击"查看详情"按钮
    try {
        // 等待"查看详情"按钮出现
        await page.waitForSelector('button.el-button--text span', { timeout: 10000 });
        
        // 查找包含"查看详情"文本的按钮
        const detailButtons = await page.$$('button.el-button--text span');
        let clicked = false;
        
        for (const button of detailButtons) {
            const text = await page.evaluate(el => el.textContent.trim(), button);
            if (text === '查看详情') {
                console.log('找到"查看详情"按钮，点击中...');
                await button.click();
                clicked = true;
                break;
            }
        }
        
        if (!clicked) {
            console.log('未找到"查看详情"按钮');
        } else {
            // 等待弹窗出现
            await page.waitForSelector('.el-dialog', { timeout: 10000 });
            console.log('弹窗已出现，正在提取信息...');
            
            // 等待内容加载完成
            console.log('等待5秒让内容初步加载...');
            await page.waitForTimeout(5000);
            
            // 检查DOM是否稳定
            console.log('检查DOM是否稳定...');
            let lastDOMSize = 0;
            let stableCount = 0;
            const maxStabilityChecks = 5;
            
            for (let i = 0; i < maxStabilityChecks; i++) {
                const currentSize = await page.evaluate(() => document.body.innerHTML.length);
                console.log(`DOM大小检查 ${i+1}/${maxStabilityChecks}: ${currentSize} (上次: ${lastDOMSize})`);
                
                if (currentSize === lastDOMSize) {
                    stableCount++;
                    if (stableCount >= 3) {
                        console.log('DOM已稳定，继续处理');
                        break;
                    }
                } else {
                    stableCount = 0;
                }
                
                lastDOMSize = currentSize;
                await page.waitForTimeout(1000);
            }
            
            // 检查图片加载状态
            const imagesLoaded = await page.evaluate(() => {
                const allImages = document.querySelectorAll('.el-dialog__body .el-image img');
                console.log(`找到 ${allImages.length} 张图片`);
                
                let loadedImages = 0;
                allImages.forEach(img => {
                    if (img.complete) {
                        loadedImages++;
                    }
                });
                console.log(`已加载完成 ${loadedImages}/${allImages.length} 张图片`);
                
                return {
                    total: allImages.length,
                    loaded: loadedImages
                };
            });
            
            // 如果图片未全部加载完成，额外等待
            if (imagesLoaded.loaded < imagesLoaded.total && imagesLoaded.total > 0) {
                const waitTime = Math.min(10000, imagesLoaded.total * 1000);
                console.log(`部分图片尚未加载完成 (${imagesLoaded.loaded}/${imagesLoaded.total})，额外等待${waitTime/1000}秒...`);
                await page.waitForTimeout(waitTime);
            }
            
            // 再次检查图片加载状态
            const finalImagesLoaded = await page.evaluate(() => {
                const allImages = document.querySelectorAll('.el-dialog__body .el-image img');
                let loadedImages = 0;
                allImages.forEach(img => {
                    if (img.complete) {
                        loadedImages++;
                    }
                });
                console.log(`最终加载完成 ${loadedImages}/${allImages.length} 张图片`);
                return {
                    total: allImages.length,
                    loaded: loadedImages
                };
            });
            
            console.log(`图片加载状态: ${finalImagesLoaded.loaded}/${finalImagesLoaded.total} 已加载`);
            
            // 额外等待确保所有内容加载完成
            const extraWaitTime = finalImagesLoaded.total > 0 ? 3000 : 1000;
            console.log(`额外等待${extraWaitTime/1000}秒确保所有内容加载完成...`);
            await page.waitForTimeout(extraWaitTime);
            
            // 提取弹窗信息
            const detailData = await page.evaluate(() => {
                const dialogInfo = {};
                
                // 获取弹窗标题
                const dialogTitle = document.querySelector('.el-dialog__title');
                if (dialogTitle) {
                    dialogInfo.title = dialogTitle.textContent.trim();
                }
                
                // 获取基本信息表格数据
                const infoTable = document.querySelector('.el-dialog__body table');
                if (infoTable) {
                    const tableData = {};
                    const rows = infoTable.querySelectorAll('tr');
                    
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 2) {
                            const key = cells[0].textContent.trim();
                            
                            // 特殊处理尺寸信息
                            if (key === '尺寸(cm)') {
                                const dimensionSpans = cells[1].querySelectorAll('span');
                                const dimensions = {};
                                
                                dimensionSpans.forEach(span => {
                                    const text = span.textContent.trim();
                                    const match = text.match(/(长|宽|高)：(\d+\.?\d*)/);
                                    if (match) {
                                        dimensions[match[1]] = parseFloat(match[2]);
                                    }
                                });
                                
                                tableData[key] = dimensions;
                            } 
                            // 特殊处理重量信息
                            else if (key === '重量(g)') {
                                const weightSpans = cells[1].querySelectorAll('span');
                                const weights = {};
                                
                                weightSpans.forEach(span => {
                                    const text = span.textContent.trim();
                                    if (text.includes('毛重')) {
                                        const match = text.match(/毛重：(\d+\.?\d*)/);
                                        if (match) {
                                            weights.grossWeight = parseFloat(match[1]);
                                        }
                                    } else if (text.includes('出库平均重量')) {
                                        const match = text.match(/出库平均重量：(\d+\.?\d*)/);
                                        if (match) {
                                            weights.averageWeight = parseFloat(match[1]);
                                        }
                                    }
                                });
                                
                                tableData[key] = weights;
                            }
                            // 特殊处理关键词
                            else if (key === 'Key Words') {
                                const keywordButtons = cells[1].querySelectorAll('button.el-button--mini span');
                                const keywords = [];
                                
                                keywordButtons.forEach(button => {
                                    const keyword = button.textContent.trim();
                                    if (keyword && !keyword.includes('复制')) {
                                        keywords.push(keyword);
                                    }
                                });
                                
                                tableData[key] = keywords;
                            }
                            // 特殊处理商品属性
                            else if (key === '商品属性') {
                                const attributeDivs = cells[1].querySelectorAll('div div');
                                const attributes = [];
                                
                                attributeDivs.forEach(div => {
                                    const attribute = div.textContent.trim();
                                    if (attribute) {
                                        attributes.push(attribute);
                                    }
                                });
                                
                                tableData[key] = attributes;
                            }
                            // 特殊处理规格和包装清单
                            else if (key === 'Specification' || key === 'Package List') {
                                const contentDiv = cells[1].querySelector('div');
                                if (contentDiv) {
                                    tableData[key] = contentDiv.innerHTML.trim();
                                } else {
                                    tableData[key] = cells[1].textContent.trim();
                                }
                            }
                            // 处理其他普通字段
                            else {
                                tableData[key] = cells[1].textContent.trim();
                            }
                        }
                    });
                    
                    dialogInfo.basicInfo = tableData;
                }
                
                // 获取图片信息
                const imageGroups = {};
                
                // 通用函数：提取指定类型的图片
                function extractImagesByType(typeText) {
                    const images = [];
                    // 查找所有h5标题元素
                    const allH5Elements = document.querySelectorAll('.el-dialog__body h5[style="margin-right: 10px;"]');
                    
                    // 遍历所有h5元素，寻找包含指定类型文本的元素
                    for (const h5 of allH5Elements) {
                        if (h5.textContent.includes(typeText)) {
                            // 找到父元素下的所有图片
                            const imgElements = h5.parentElement.querySelectorAll('.el-image img');
                            
                            imgElements.forEach(img => {
                                if (img.src) {
                                    images.push(img.src);
                                }
                            });
                            
                            break;
                        }
                    }
                    
                    return images;
                }
                
                // 提取所有图片类型
                const imageTypes = ['主图', '细节图', '全家福', '场景图', '尺寸图', '其它图'];
                
                // 遍历所有图片类型并提取
                imageTypes.forEach(type => {
                    const images = extractImagesByType(type);
                    if (images.length > 0) {
                        // 将类型名称转换为camelCase作为键名
                        const key = type === '主图' ? 'mainImages' :
                                   type === '细节图' ? 'detailImages' :
                                   type === '全家福' ? 'familyImages' :
                                   type === '场景图' ? 'sceneImages' :
                                   type === '尺寸图' ? 'dimensionImages' : 
                                   type === '其它图' ? 'otherImages' :
                                   type.replace(/[\u4e00-\u9fa5]+/g, match => match.charAt(0).toLowerCase() + match.slice(1)) + 'Images';
                        
                        imageGroups[key] = images;
                    }
                });
                
                // 尝试使用data-v属性查找其它图
                if (!imageGroups['otherImages']) {
                    const otherImages = [];
                    const otherImageElements = document.querySelectorAll('div[data-v-15c51896] h5[data-v-15c51896][style="margin-right: 10px;"]');
                    
                    otherImageElements.forEach(h5 => {
                        if (h5.textContent.includes('其它图')) {
                            // 找到父元素下的所有图片
                            const imgElements = h5.parentElement.querySelectorAll('.el-image img');
                            
                            imgElements.forEach(img => {
                                if (img.src) {
                                    otherImages.push(img.src);
                                }
                            });
                        }
                    });
                    
                    if (otherImages.length > 0) {
                        imageGroups['otherImages'] = otherImages;
                    }
                }
                
                dialogInfo.images = imageGroups;
                
                return dialogInfo;
            });
            
            console.log('提取的弹窗详情数据:', detailData);
            
            // 合并表格数据和弹窗数据
            this.data = {
                tableData: tableData,
                detailData: detailData
            };
            
            // 关闭弹窗
            console.log('数据提取完成，准备关闭弹窗...');
            
            // 根据图片数量决定等待时间
            const hasImages = detailData.images && Object.keys(detailData.images).length > 0;
            const totalImages = hasImages ? Object.values(detailData.images).flat().length : 0;
            const waitTime = totalImages > 0 ? Math.min(10000, totalImages * 500) : 2000;
            
            console.log(`等待${waitTime/1000}秒后关闭弹窗...`);
            await page.waitForTimeout(waitTime);
            
            // 尝试多种方法关闭弹窗
            const closeSuccess = await page.evaluate(() => {
                try {
                    console.log('尝试关闭弹窗...');
                    
                    // 方法1：使用更精确的选择器 - 通过footer中的关闭按钮
                    const footerCloseButton = document.querySelector('div.footer button.el-button.el-button--default.el-button--small span');
                    if (footerCloseButton && footerCloseButton.textContent.trim() === '关闭') {
                        console.log('找到footer中的关闭按钮，点击中...');
                        footerCloseButton.click();
                        console.log('通过footer中的关闭按钮关闭弹窗');
                        return true;
                    }
                    
                    // 方法2：使用data-v属性的选择器
                    const dataVCloseButton = document.querySelector('button[data-v-15c51896].el-button.el-button--default.el-button--small span');
                    if (dataVCloseButton && dataVCloseButton.textContent.trim() === '关闭') {
                        console.log('找到带data-v属性的关闭按钮，点击中...');
                        dataVCloseButton.click();
                        console.log('通过带data-v属性的关闭按钮关闭弹窗');
                        return true;
                    }
                    
                    // 方法3：使用一般的选择器
                    const closeButton = document.querySelector('button.el-button.el-button--default.el-button--small span');
                    if (closeButton && closeButton.textContent.trim() === '关闭') {
                        console.log('找到关闭按钮，点击中...');
                        closeButton.click();
                        console.log('通过关闭按钮关闭弹窗');
                        return true;
                    }
                    
                    // 方法4：使用更精确的选择器点击关闭按钮
                    const closeButtons = document.querySelectorAll('button.el-dialog__headerbtn');
                    if (closeButtons && closeButtons.length > 0) {
                        closeButtons[closeButtons.length - 1].click();
                        console.log('通过点击关闭按钮关闭弹窗');
                        return true;
                    }
                    
                    // 方法5：尝试点击图标
                    const closeIcons = document.querySelectorAll('i.el-dialog__close.el-icon.el-icon-close');
                    if (closeIcons && closeIcons.length > 0) {
                        closeIcons[closeIcons.length - 1].click();
                        console.log('通过点击关闭图标关闭弹窗');
                        return true;
                    }
                    
                    // 方法6：直接修改DOM
                    const dialog = document.querySelector('.el-dialog__wrapper');
                    if (dialog) {
                        // 直接修改样式使其隐藏
                        dialog.style.display = 'none';
                        
                        // 移除body上的相关类
                        document.body.classList.remove('el-popup-parent--hidden');
                        document.body.style.overflow = 'auto';
                        document.body.style.paddingRight = '0px';
                        
                        // 移除遮罩
                        const modal = document.querySelector('.v-modal');
                        if (modal) {
                            modal.style.display = 'none';
                        }
                        
                        console.log('通过修改DOM关闭弹窗');
                        return true;
                    }
                    
                    // 方法7：模拟ESC键
                    const escEvent = new KeyboardEvent('keydown', {
                        key: 'Escape',
                        code: 'Escape',
                        keyCode: 27,
                        which: 27,
                        bubbles: true,
                        cancelable: true
                    });
                    document.dispatchEvent(escEvent);
                    console.log('通过ESC键关闭弹窗');
                    
                    return true;
                } catch (error) {
                    console.error('关闭弹窗时出错:', error);
                    return false;
                }
            });
            
            if (closeSuccess) {
                console.log('弹窗已关闭');
            } else {
                console.log('关闭弹窗失败，尝试使用Puppeteer的keyboard.press方法');
                await page.keyboard.press('Escape');
            }
            
            // 等待弹窗消失
            await page.waitForTimeout(1000);
        }
    } catch (error) {
        console.log('处理"查看详情"按钮或提取弹窗信息时出错:', error);
        // 如果获取弹窗信息失败，至少返回表格数据
        this.data = tableData;
    }

    if (this.data) {
        console.log(`处理数据，准备输出`);
        outputHandler.handle(this.data, 'output', this.task_name, this.cityname);
    } else {
        console.log('未找到任何数据');
    }
}