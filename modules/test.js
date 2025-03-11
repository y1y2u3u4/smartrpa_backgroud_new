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
