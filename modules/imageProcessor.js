// imageProcessor.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { PassThrough } from 'stream';

// 统一API URL
const API_URL = "https://5j228yiaf1nvlh-8000.proxy.runpod.net";

/**
 * 检测单张图片是否含有水印
 * @param {Buffer} imageBuffer - 图片二进制数据
 * @returns {Promise<boolean>} - 是否需要去除水印
 */
export async function detectSingleImageWatermark(imageBuffer) {
    try {
        const endpoint = `${API_URL}/ocr/detect/`;
        
        console.log(`正在请求OCR检测API: ${endpoint}`);
        
        const formData = new FormData();
        const bufferStream = new PassThrough();
        bufferStream.end(imageBuffer);
        formData.append('image', bufferStream, {filename: 'image.jpg'});
        
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('OCR检测结果:', result.status);
            const detection = result.detection_result;
            console.log(`检测到美团水印: ${detection.has_meituan_watermark}`);
            console.log(`检测到参考水印: ${detection.has_reference_watermark}`);
            console.log(`需要去除水印: ${detection.needs_watermark_removal}`);
            return detection.needs_watermark_removal;
        } else {
            console.error(`OCR检测请求失败: ${response.status}`);
            return false; // 默认不需要去除水印
        }
    } catch (error) {
        console.error('水印检测失败:', error);
        return false; // 出错时默认不需要去除水印
    }
}

// 全局变量，存储是否检测到水印的状态
let globalWatermarkDetected = false;

/**
 * 随机选择3张图片检测水印
 * @param {Array} products - 所有商品
 * @returns {Promise<boolean>} - 是否需要去除水印
 */
export async function detectWatermark(products) {
    // 如果已经检测到水印，直接返回
    if (globalWatermarkDetected) {
        console.log('已经检测到水印，跳过再次检测');
        return true;
    }
    
    try {
        console.log(`开始随机选择3张图片检测水印...`);
        // 如果产品少于3个，则全部检测
        const sampleSize = Math.min(3, products.length);
        if (sampleSize === 0) {
            console.log('没有可用的图片来检测水印');
            return false;
        }
        
        // 随机选择3个商品
        let shuffled = [...products];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const samples = shuffled.slice(0, sampleSize);
        console.log(`随机选择了 ${sampleSize} 张图片进行水印检测`);
        
        // 下载并检测这些图片
        for (let i = 0; i < samples.length; i++) {
            const product = samples[i];
            console.log(`检测第 ${i+1}/${sampleSize} 张图片...`);
            
            // 获取图片URL
            const possibleImageFields = ['image', '图片URL', '主图链接', '图片地址'];
            let imageUrl = '';
            for (const field of possibleImageFields) {
                if (product[field]) {
                    imageUrl = product[field].split('@')[0];
                    break;
                }
            }
            
            if (!imageUrl) {
                console.log('找不到图片URL，跳过');
                continue;
            }
            
            try {
                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const imageBuffer = Buffer.from(imageResponse.data);
                
                // 检测单张图片
                const hasWatermark = await detectSingleImageWatermark(imageBuffer);
                if (hasWatermark) {
                    console.log(`在第 ${i+1} 张图片中检测到水印，所有图片都将进行去水印处理`);
                    globalWatermarkDetected = true;
                    return true;
                }
            } catch (error) {
                console.error(`下载或检测图片失败:`, error);
                continue;
            }
        }
        
        console.log('随机抽查中未检测到水印，不需要去水印处理');
        return false;
    } catch (error) {
        console.error('水印检测过程出错:', error);
        return false;
    }
}

/**
 * 去除图片水印
 * @param {Buffer} imageBuffer - 图片二进制数据
 * @returns {Promise<Buffer>} - 处理后的图片数据
 */
export async function removeWatermark(imageBuffer) {
    try {
        console.log('开始使用图像处理API去除水印...');
        
        const formData = new FormData();
        const bufferStream = new PassThrough();
        bufferStream.end(imageBuffer);
        formData.append('images', bufferStream, {filename: 'input_image.jpg'});
        formData.append('model', 'lama');
        formData.append('device', 'cpu');
        formData.append('concat', 'true');
        formData.append('resize', 'false');
        
        console.log('发送去水印请求...');
        
        const processResponse = await fetch(`${API_URL}/process/`, {
            method: 'POST',
            body: formData
        });
        
        if (!processResponse.ok) {
            const errorText = await processResponse.text();
            throw new Error(`图像处理请求失败: ${processResponse.status} - ${errorText}`);
        }
        
        const processResult = await processResponse.json();
        console.log('图像处理任务创建成功:', processResult);
        
        const jobId = processResult.job_id;
        if (!jobId) {
            throw new Error('未获取到任务ID');
        }
        console.log('获取到任务ID:', jobId);
        
        if (!processResult.output_files || processResult.output_files.length === 0) {
            throw new Error('未获取到处理后的图像路径');
        }
        
        const outputFilePath = processResult.output_files[0];
        console.log('获取到输出文件路径:', outputFilePath);
        
        let outputUrl = `${API_URL}${outputFilePath}`;
        console.log('获取到输出URL:', outputUrl);
        
        // 调整图像尺寸为800x800
        console.log('调整图像大小为800x800...');
        const resizeFormData = new FormData();
        resizeFormData.append('width', '800');
        resizeFormData.append('height', '800');
        
        const resizeResponse = await fetch(`${API_URL}/resize/${jobId}`, {
            method: 'POST',
            body: resizeFormData
        });
        
        if (resizeResponse.ok) {
            const resizeResult = await resizeResponse.json();
            console.log('调整大小成功:', resizeResult);
            
            if (resizeResult.resized_files && resizeResult.resized_files.length > 0) {
                console.log('更新为调整大小后的URL');
                outputUrl = `${API_URL}${resizeResult.resized_files[0]}`;
                console.log('新URL:', outputUrl);
            }
        } else {
            console.warn(`调整图像大小失败: ${resizeResponse.status}`);
            console.warn('将使用未调整大小的图像');
        }
        
        // 下载处理后的图像
        const processedImageResponse = await fetch(outputUrl);
        if (!processedImageResponse.ok) {
            throw new Error(`下载处理后的图片失败: ${processedImageResponse.status}`);
        }
        
        const processedBuffer = await processedImageResponse.buffer();
        console.log(`处理后图片下载完成，大小: ${processedBuffer.length} 字节`);
        
        // 清理任务
        try {
            await fetch(`${API_URL}/jobs/${jobId}`, { method: 'DELETE' });
            console.log('已删除完成的任务');
        } catch (err) {
            console.warn('无法删除任务:', err);
        }
        
        return processedBuffer;
    } catch (error) {
        console.error('去除水印过程中出错:', error);
        throw error;
    }
}

/**
 * 处理单个商品图片
 * @param {Object} product - 商品信息
 * @returns {Promise<Object|null>} - 处理结果，包含id和图片数据
 */
export async function processProductImage(product) {
    const productId = product.商品ID;
    
    // 尝试从多个可能的图片URL字段获取
    const possibleImageFields = ['image', '图片URL', '主图链接', '图片地址'];
    let mainImageUrl = '';
    
    for (const field of possibleImageFields) {
        if (product[field]) {
            mainImageUrl = product[field].split('@')[0]; // 移除可能的参数
            break;
        }
    }
    
    if (!mainImageUrl) {
        console.log(`商品 ${productId} 没有图片URL，跳过处理`);
        return null;
    }
    
    console.log(`开始处理商品 ${productId} 的图片，原始URL:`, mainImageUrl);
    
    try {
        // 下载原始图片
        console.log(`正在下载原始图片...`);
        const imageResponse = await axios.get(mainImageUrl, { responseType: 'arraybuffer' });
        const originalBuffer = Buffer.from(imageResponse.data);
        console.log(`原始图片下载完成，大小: ${originalBuffer.length} 字节`);
        
        let processedBuffer;
        // 基于全局水印状态决定是否去水印
        if (globalWatermarkDetected) {
            // 去除水印
            console.log(`全局水印状态为有水印，正在调用水印去除API...`);
            processedBuffer = await removeWatermark(originalBuffer);
            console.log(`水印去除完成，处理后图片大小: ${processedBuffer.length} 字节`);
        } else {
            console.log(`未检测到水印，直接调整图片大小...`);
            try {
                // 即使没有水印也调整图片大小为800x800
                const formData = new FormData();
                const bufferStream = new PassThrough();
                bufferStream.end(originalBuffer);
                formData.append('images', bufferStream, {filename: 'input_image.jpg'});
                
                // 创建一个任务来获取jobId
                const processResponse = await fetch(`${API_URL}/process/`, {
                    method: 'POST',
                    body: formData
                });
                
                if (processResponse.ok) {
                    const processResult = await processResponse.json();
                    const jobId = processResult.job_id;
                    
                    // 只调整大小，不做其他处理
                    const resizeFormData = new FormData();
                    resizeFormData.append('width', '800');
                    resizeFormData.append('height', '800');
                    
                    const resizeResponse = await fetch(`${API_URL}/resize/${jobId}`, {
                        method: 'POST',
                        body: resizeFormData
                    });
                    
                    if (resizeResponse.ok) {
                        const resizeResult = await resizeResponse.json();
                        console.log('调整大小成功:', resizeResult);
                        
                        // 使用resized_files数组中的第一个文件路径
                        let outputUrl;
                        if (resizeResult.resized_files && resizeResult.resized_files.length > 0) {
                            outputUrl = `${API_URL}${resizeResult.resized_files[0]}`;
                            console.log('调整大小后的图片URL:', outputUrl);
                        } else {
                            console.warn('未找到调整大小后的文件路径，使用默认输出路径');
                            outputUrl = `${API_URL}${resizeResult.output_url || '/output/${jobId}/resized.png'}`;
                        }
                        
                        // 下载调整大小后的图片
                        const processedImageResponse = await fetch(outputUrl);
                        processedBuffer = await processedImageResponse.buffer();
                        console.log(`图片大小调整完成，新大小: ${processedBuffer.length} 字节`);
                        
                        // 清理任务
                        await fetch(`${API_URL}/jobs/${jobId}`, { method: 'DELETE' });
                    } else {
                        console.log(`调整大小失败，使用原始图片`); 
                        processedBuffer = originalBuffer;
                    }
                } else {
                    console.log(`处理请求失败，使用原始图片`);
                    processedBuffer = originalBuffer;
                }
            } catch (resizeErr) {
                console.error(`调整图片大小失败:`, resizeErr);
                processedBuffer = originalBuffer;
            }
        }
        
        return {
            id: productId,
            buffer: processedBuffer
        };
    } catch (err) {
        console.error(`处理商品 ${productId} 图片失败:`, err);
        
        // 根据水印状态决定是否使用原始图像作为备份
        if (globalWatermarkDetected) {
            // 存在水印的情况下，直接跳过，不使用原始图像
            console.log(`检测到有水印，跳过使用原始图片作为备份`);
            return null;
        } else {
            // 没有水印的情况下，可以使用原始图像
            try {
                console.log(`未检测到水印，使用原始图片作为备份`);
                const imageResponse = await axios.get(mainImageUrl, { responseType: 'arraybuffer' });
                const originalBuffer = Buffer.from(imageResponse.data);
                return {
                    id: productId,
                    buffer: originalBuffer
                };
            } catch (backupErr) {
                console.error(`无法使用原始图片作为备份:`, backupErr);
                return null;
            }
        }
    }
}

/**
 * 处理所有商品图片并打包为zip
 * @param {Array} products - 商品列表
 * @param {string} user_id - 用户ID
 * @returns {Promise<string>} - ZIP文件路径
 */
export async function processProductImages(products, user_id) {
    console.log(`开始处理 ${products.length} 个商品的图片...`);
    
    try {
        // 首先随机选择3张图片检测是否有水印
        await detectWatermark(products);
        
        // 创建临时文件夹来存储处理后的图片
        const tempDirName = `商品图片_${user_id}_temp`;
        const tempDirPath = path.join(process.cwd(), tempDirName);
        
        // 确保临时文件夹存在
        if (!fs.existsSync(tempDirPath)) {
            fs.mkdirSync(tempDirPath, { recursive: true });
        } else {
            // 清空文件夹内容
            fs.readdirSync(tempDirPath).forEach(file => {
                const filePath = path.join(tempDirPath, file);
                fs.unlinkSync(filePath);
            });
        }
        
        const totalImages = products.length;
        let completedCount = 0;
        
        // 设置并发限制
        const concurrencyLimit = 5;
        
        // 分批处理所有产品图片并保存到临时文件夹
        for (let i = 0; i < products.length; i += concurrencyLimit) {
            const batch = products.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(product => processProductImage(product));
            
            // 等待当前批次的所有处理完成
            const results = await Promise.allSettled(batchPromises);
            
            // 处理结果，保存到临时文件夹
            for (const result of results) {
                completedCount++;
                console.log(`进度: ${completedCount}/${totalImages} (${Math.round((completedCount / totalImages) * 100)}%)`);
                
                if (result.status === 'fulfilled' && result.value) {
                    const { id, buffer } = result.value;
                    if (buffer) {
                        // 保存图片到临时文件夹
                        const imgFilePath = path.join(tempDirPath, `${id}-1.jpg`);
                        fs.writeFileSync(imgFilePath, buffer);
                        console.log(`商品 ${id} 图片处理完成并保存到文件夹！`);
                    }
                }
            }
        }
        
        // 将临时文件夹压缩为ZIP文件
        console.log(`正在将文件夹 ${tempDirPath} 压缩为ZIP文件...`);
        
        // 获取所有图片文件
        const imageFiles = fs.readdirSync(tempDirPath)
            .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
            .map(file => ({ 
                name: file, 
                path: path.join(tempDirPath, file),
                size: fs.statSync(path.join(tempDirPath, file)).size
            }));
        
        // 文件大小限制 (28MB = 28 * 1024 * 1024 bytes)
        const MAX_ZIP_SIZE = 28 * 1024 * 1024;
        
        // 分组图片到不同的压缩包
        const fileGroups = [];
        let currentGroup = [];
        let currentSize = 0;
        
        // 按文件大小分组
        for (const file of imageFiles) {
            // 如果单个文件大小超过限制，需要压缩或设置警告
            if (file.size > MAX_ZIP_SIZE) {
                console.warn(`警告: 文件 ${file.name} 大小为 ${(file.size / (1024 * 1024)).toFixed(2)}MB，超过了28MB的限制。请考虑压缩或过滤此文件。`);
                // 将大文件单独分组
                fileGroups.push([file]);
                continue;
            }
            
            // 如果当前组加上新文件会超过限制，创建新组
            if (currentSize + file.size > MAX_ZIP_SIZE) {
                fileGroups.push([...currentGroup]); // 保存当前组
                currentGroup = [file];              // 开始新组
                currentSize = file.size;
            } else {
                // 添加文件到当前组
                currentGroup.push(file);
                currentSize += file.size;
            }
        }
        
        // 保存最后一组
        if (currentGroup.length > 0) {
            fileGroups.push(currentGroup);
        }
        
        // 创建多个ZIP文件
        const zipPaths = [];
        
        if (fileGroups.length === 1) {
            // 只有一组，创建单个ZIP
            const zip = new AdmZip();
            // 添加全部文件
            fileGroups[0].forEach(file => {
                zip.addLocalFile(file.path);
            });
            
            // 保存zip文件
            const zipPath = path.join(process.cwd(), `商品图片_${user_id}_part1.zip`);
            zip.writeZip(zipPath);
            zipPaths.push(zipPath);
            
            console.log(`创建了一个ZIP文件：${zipPath}，包含 ${fileGroups[0].length} 个文件`);
        } else {
            // 多组，创建多个ZIP
            console.log(`由于文件总大小超过28MB，需要创建 ${fileGroups.length} 个ZIP文件`);
            
            for (let i = 0; i < fileGroups.length; i++) {
                const zip = new AdmZip();
                // 添加组中文件
                fileGroups[i].forEach(file => {
                    zip.addLocalFile(file.path);
                });
                
                // 保存分组的zip文件
                const zipPath = path.join(process.cwd(), `商品图片_${user_id}_part${i+1}.zip`);
                zip.writeZip(zipPath);
                zipPaths.push(zipPath);
                
                const groupSize = fileGroups[i].reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
                console.log(`创建了ZIP文件 #${i+1}：${zipPath}，包含 ${fileGroups[i].length} 个文件，大小约 ${groupSize.toFixed(2)}MB`);
            }
        }
        
        // 打印最终处理结果
        if (fileGroups.length === 1) {
            console.log(`所有图片处理完成，已保存到: ${zipPaths[0]}`);
        } else {
            console.log(`所有图片处理完成，已分成 ${fileGroups.length} 个文件保存`);
        }
        
        // 返回所有创建的ZIP文件路径
        return {
            zipPaths,
            totalParts: fileGroups.length
        };
    } catch (error) {
        console.error('处理图片时出错:', error);
        throw error;
    }
}
