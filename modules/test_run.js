// 提取表格数据的函数
function extractTableData() {
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
}

// 等待图片加载完成的函数
function waitForImagesLoaded(maxWaitTime = 20000) {
    console.log('等待图片加载完成...');
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        // 检查图片加载状态的函数
        const checkImages = () => {
            const allImages = document.querySelectorAll('.el-dialog__body .el-image img');
            console.log(`找到 ${allImages.length} 张图片`);
            
            if (allImages.length === 0) {
                // 如果没有找到图片，等待一段时间后再次检查
                if (Date.now() - startTime < maxWaitTime) {
                    console.log('未找到图片，继续等待...');
                    setTimeout(checkImages, 1000);
                } else {
                    console.log('等待图片超时，继续执行');
                    resolve({total: 0, loaded: 0});
                }
                return;
            }
            
            let loadedImages = 0;
            let totalImages = allImages.length;
            
            allImages.forEach(img => {
                if (img.complete) {
                    loadedImages++;
                }
            });
            
            console.log(`已加载完成 ${loadedImages}/${totalImages} 张图片`);
            
            // 如果所有图片都已加载完成，或者已经等待足够长时间
            if (loadedImages === totalImages || Date.now() - startTime >= maxWaitTime) {
                console.log(loadedImages === totalImages ? '所有图片加载完成' : '图片加载超时，继续执行');
                resolve({total: totalImages, loaded: loadedImages});
            } else {
                // 继续等待
                setTimeout(checkImages, 1000);
            }
        };
        
        // 开始检查图片
        checkImages();
    });
}

// 点击"查看详情"按钮并提取弹窗信息
async function clickDetailAndExtractInfo() {
    try {
        // 查找包含"查看详情"文本的按钮
        const detailButtons = document.querySelectorAll('button.el-button--text span');
        let detailButton = null;
        
        for (const button of detailButtons) {
            if (button.textContent.trim() === '查看详情') {
                console.log('找到"查看详情"按钮');
                detailButton = button;
                break;
            }
        }
        
        if (!detailButton) {
            console.log('未找到"查看详情"按钮');
            return null;
        }
        
        // 点击按钮前先提取表格数据
        const tableData = extractTableData();
        console.log('提取的表格数据:', tableData);
        
        // 点击"查看详情"按钮
        console.log('点击"查看详情"按钮...');
        detailButton.click();
        
        // 等待弹窗出现
        console.log('等待弹窗出现...');
        return new Promise(resolve => {
            // 检查弹窗是否已出现
            const checkDialog = async () => {
                const dialog = document.querySelector('.el-dialog');
                if (dialog) {
                    console.log('弹窗已出现，等待内容加载...');
                    
                    // 等待图片加载完成
                    await waitForImagesLoaded();
                    
                    // 提取弹窗信息
                    const dialogInfo = extractDialogInfo();
                    resolve({
                        tableData: tableData,
                        detailData: dialogInfo
                    });
                } else {
                    console.log('弹窗尚未出现，继续等待...');
                    setTimeout(checkDialog, 500);
                }
            };
            
            checkDialog();
        });
    } catch (error) {
        console.error('处理"查看详情"按钮或提取弹窗信息时出错:', error);
        return null;
    }
}

// 提取弹窗信息
function extractDialogInfo() {
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
    
    // 提取指定类型的图片
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
}

// 关闭弹窗的函数
function closeDialog() {
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
}

// 执行主函数并输出结果
(async function main() {
    console.log('开始提取数据...');
    const result = await clickDetailAndExtractInfo();
    console.log('提取的完整数据:', result);
    
    // 关闭弹窗前确保数据已完全提取
    if (result && result.detailData) {
        // 检查是否有图片数据
        const hasImages = result.detailData.images && 
                         (Object.keys(result.detailData.images).length > 0);
        
        // 额外等待时间，确保弹窗完全加载
        const waitTime = hasImages ? 10000 : 1000;
        console.log(`数据提取完成，等待${waitTime/1000}秒后关闭弹窗...`);
        
        setTimeout(() => {
            console.log('准备关闭弹窗...');
            closeDialog();
        }, waitTime);
    } else {
        console.log('未提取到数据，不执行关闭操作');
    }
    
    return result;
})();