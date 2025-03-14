// imageProcessor.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { PassThrough } from 'stream';
import archiver from 'archiver';

// 统一API URL
const API_URL = "https://wpgcqdnchg0vk0-8000.proxy.runpod.net";

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
    const spuId = product.spu_id;
    const skuId = product.sku_id;
    console.log('处理前的spu_id:', spuId);
    
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
        console.log(`商品 ${spuId} 没有图片URL，跳过处理`);
        return null;
    }
    
    console.log(`开始处理商品 ${spuId} 的图片，原始URL:`, mainImageUrl);
    
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
            // 添加重试机制
            let retryCount = 0;
            const maxRetries = 3;
            let success = false;

            while (retryCount < maxRetries && !success) {
                try {
                    processedBuffer = await removeWatermark(originalBuffer);
                    console.log(`水印去除完成，处理后图片大小: ${processedBuffer.length} 字节`);
                    success = true;
                } catch (error) {
                    retryCount++;
                    console.error(`水印去除失败(尝试 ${retryCount}/${maxRetries}): ${error.message}`);
                    if (retryCount < maxRetries) {
                        console.log(`等待2秒后重试...`);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
                    } else {
                        console.error(`水印去除失败，已达到最大重试次数，使用原始图片`);
                    }
                }
            }
            // processedBuffer = await removeWatermark(originalBuffer);
            // console.log(`水印去除完成，处理后图片大小: ${processedBuffer.length} 字节`);
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
            spu_id: spuId,
            sku_id: skuId,
            buffer: processedBuffer
        };
    } catch (err) {
        console.error(`处理商品 ${spuId} 图片失败:`, err);
        
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
                    spu_id: spuId,
                    sku_id: skuId,
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
        
        // // 创建临时文件夹来存储处理后的图片
        const tempDirName = `商品图片_${user_id}_temp`;
        const tempDirPath = path.join(process.cwd(), tempDirName);
        
        // 确保临时文件夹存在
        if (!fs.existsSync(tempDirPath)) {
            fs.mkdirSync(tempDirPath, { recursive: true });
        }

        const existingImages = {};
        if (fs.existsSync(tempDirPath)) {
            // 检查spu_id文件夹
            const spuDirPath = path.join(tempDirPath, 'spu_id');
            if (fs.existsSync(spuDirPath)) {
                fs.readdirSync(spuDirPath).forEach(file => {
                    // 提取spu_id部分，通常格式为 "spu_id-1.jpg"
                    const spuId = file.split('-')[0];
                    if (spuId) {
                        existingImages[spuId] = true;
                    }
                });
            }
            
            // 如果还需要检查其他文件夹，可以在这里添加
        }
        // 设置并发限制
        const concurrencyLimit = 10;
        
        // 分批处理所有产品图片并保存到临时文件夹
        // 使用Set跟踪已处理的id
        const processedIds = new Set();
        // 创建一个映射表用于存储id和sku_id的关系
        const idToSkuMap = new Map();
        // 首先建立id到sku_id的映射关系并去重产品列表
        console.log("产品对象示例:", products[0]);
        
        const uniqueProducts = [];
        products.forEach(product => {
            const spuId = product.spu_id;
            const skuId = product.sku_id;
            
            if (spuId) {
                // 对于spu_id，我们只处理一次图片
                if (!processedIds.has(spuId)) {
                    processedIds.add(spuId);
                    uniqueProducts.push(product);
                } else {
                    console.log(`预先跳过重复的商品ID: ${spuId}`);
                }
                
                // 但我们会记录所有与该spu_id关联的sku_id
                if (!idToSkuMap.has(spuId)) {
                    idToSkuMap.set(spuId, [skuId]);
                } else if (skuId && !idToSkuMap.get(spuId).includes(skuId)) {
                    idToSkuMap.get(spuId).push(skuId);
                }
            } else {
                console.log("警告: 发现没有spu_id的产品", product);
            }
        });
        // 重置计数器和已处理ID集合
        processedIds.clear();
        const totalImages = uniqueProducts.length;
        console.log(`去重后商品数量: ${totalImages}`);
        let completedCount = 0;

        for (let i = 0; i < uniqueProducts.length; i += concurrencyLimit) {
            const batch = uniqueProducts.slice(i, i + concurrencyLimit);
            // 过滤掉已经存在图片的商品
            const filteredBatch = batch.filter(product => {
                if (existingImages[product.spu_id]) {
                    console.log(`商品 ${product.spu_id} 的图片已存在，跳过处理`);
                    completedCount++; // 增加完成计数
                    return false;
                }
                return true;
            });
            const batchPromises = filteredBatch.map(product => processProductImage(product));        
            // 等待当前批次的所有处理完成
            const results = await Promise.allSettled(batchPromises);
            
            // 处理结果，保存到临时文件夹
            for (const result of results) {
                completedCount++;
                console.log(`进度: ${completedCount}/${totalImages} (${Math.round((completedCount / totalImages) * 100)}%)`);
                
                if (result.status === 'fulfilled' && result.value) {
                    const { spu_id, sku_id, buffer } = result.value;
                    if (buffer) {
                        // 记录已处理的spu_id
                        processedIds.add(spu_id);
                        
                        // 保存图片到spu_id文件夹
                        const idDirPath = path.join(tempDirPath, 'spu_id');
                        if (!fs.existsSync(idDirPath)) {
                            fs.mkdirSync(idDirPath, { recursive: true });
                        }
                        const idImgFilePath = path.join(idDirPath, `${spu_id}-1.jpg`);
                        console.log(`正在保存商品 ${spu_id} 的图片到 ${idImgFilePath}`);
                        fs.writeFileSync(idImgFilePath, buffer);
                        
                        // 获取对应的sku_id列表
                        const skuIds = idToSkuMap.get(spu_id) || [];
                        if (skuIds.length > 0) {
                            // 保存图片到每个sku_id文件夹
                            const skuDirPath = path.join(tempDirPath, 'sku_id');
                            if (!fs.existsSync(skuDirPath)) {
                                fs.mkdirSync(skuDirPath, { recursive: true });
                            }
                            
                            for (const skuId of skuIds) {
                                if (skuId) {  // 确保skuId不为空
                                    const skuImgFilePath = path.join(skuDirPath, `${skuId}-1.jpg`);
                                    console.log(`正在复制商品 ${spu_id} 的图片到 sku_id: ${skuId} 路径 ${skuImgFilePath}`);
                                    fs.copyFileSync(idImgFilePath, skuImgFilePath);
                                }
                            }
                            
                            console.log(`商品 ${spu_id}(sku_ids: ${skuIds.join(', ')}) 图片处理完成并保存到文件夹！`);
                        } else {
                            console.log(`警告：商品 ${spu_id} 没有对应的 sku_id！`);
                        }
                    }
                }
            }
        }
                


        // 将临时文件夹压缩为ZIP文件
        console.log(`正在将spu_id和sku_id文件夹压缩为ZIP文件...`);

        // 处理两个不同的文件夹
        const folders = [
            { name: 'spu_id', path: path.join(tempDirPath, 'spu_id') },
            { name: 'sku_id', path: path.join(tempDirPath, 'sku_id') }
        ];

        const allZipPaths = [];
        let totalParts = 0;

        // 分别处理每个文件夹
        for (const folder of folders) {
            if (!fs.existsSync(folder.path)) {
                console.log(`文件夹 ${folder.path} 不存在，跳过处理`);
                continue;
            }

            // 获取所有图片文件
            const imageFiles = fs.readdirSync(folder.path)
                .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'))
                .map(file => ({ 
                    name: file, 
                    path: path.join(folder.path, file),
                    size: fs.statSync(path.join(folder.path, file)).size
                }));

            if (imageFiles.length === 0) {
                console.log(`文件夹 ${folder.path} 中没有图片文件，跳过处理`);
                continue;
            }

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

            for (let i = 0; i < fileGroups.length; i++) {
                // 创建ZIP文件名
                const zipFileName = `product_images_${folder.name}_${user_id}_part${i+1}.zip`;
                const zipPath = path.join(process.cwd(), zipFileName);
                
                // 图片应该放入的文件夹名称 - 使用纯数字作为文件夹名，避免中文字符
                // const folderName = `商品图片_${folder.name}_${user_id}_part${i+1}`;
                // const folderName = `${folder.name}_part${i+1}`;
                const folderName = `${i+1}`;
                // 创建一个临时工作目录
                const workDir = path.join(process.cwd(), `work_dir_${folder.name}_${i+1}`);
                if (fs.existsSync(workDir)) {
                    fs.rmSync(workDir, { recursive: true, force: true });
                }
                fs.mkdirSync(workDir, { recursive: true });
                
                // 在工作目录中创建一个与ZIP同名的目录，作为父目录
                const parentDir = path.join(workDir, folderName);
                fs.mkdirSync(parentDir);
                
                // 使用原始文件名复制图片到父目录
                for (let j = 0; j < fileGroups[i].length; j++) {
                    const file = fileGroups[i][j];
                    // 使用类似原始的文件名格式，但确保不含特殊字符
                    const originalName = file.name;
                    // 提取文件名和扩展名
                    const fileExtension = path.extname(originalName) || '.jpg';
                    const fileBaseName = path.basename(originalName, fileExtension);
                    // 生成安全的文件名
                    const safeFileName = fileBaseName + fileExtension;
                    
                    // 复制文件到父目录
                    fs.copyFileSync(file.path, path.join(parentDir, safeFileName));
                }
                
                try {
                    // 删除可能存在的.DS_Store文件
                    const dsStorePath = path.join(parentDir, '.DS_Store');
                    if (fs.existsSync(dsStorePath)) {
                        fs.unlinkSync(dsStorePath);
                    }
                    
                    // 确保之前的同名文件已删除
                    if (fs.existsSync(zipPath)) {
                        fs.unlinkSync(zipPath);
                    }
                    
                    // 使用Mac自带的zip命令创建ZIP文件
                    const { execSync } = await import('child_process');
                    
                    // 注意：我们在workDir目录下运行命令，这样ZIP文件会包含文件夹结构
                    execSync(`cd "${workDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
                    
                    // 验证ZIP文件是否正确创建
                    if (fs.existsSync(zipPath)) {
                        try {
                            // 显示ZIP文件内容以进行调试
                            const listCommand = `unzip -l "${zipPath}" | head -20`;
                            const zipContents = execSync(listCommand, { encoding: 'utf8' });
                            console.log(`ZIP文件内容预览:\n${zipContents}`);
                        } catch (verifyErr) {
                            console.warn(`无法验证ZIP内容: ${verifyErr.message}`);
                        }
                        
                        zipPaths.push(zipPath);
                        allZipPaths.push(zipPath);
                        totalParts++;
                        
                        const groupSize = fileGroups[i].reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
                        console.log(`创建了ZIP文件 ${folder.name} #${i+1}：${zipPath}，包含 ${fileGroups[i].length} 个文件，大小约 ${groupSize.toFixed(2)}MB`);
                    } else {
                        throw new Error('ZIP文件未成功创建');
                    }
                    
                } catch (err) {
                    console.error(`压缩文件时出错: ${err.message}`);
                } finally {
                    // 删除临时工作目录
                    fs.rmSync(workDir, { recursive: true, force: true });
                }
            }
            
            // 打印当前文件夹处理结果
            if (fileGroups.length === 1) {
                console.log(`${folder.name}文件夹的所有图片处理完成，已保存到: ${zipPaths[0]}`);
            } else {
                console.log(`${folder.name}文件夹的所有图片处理完成，已分成 ${fileGroups.length} 个文件保存`);
            }
        }

        // 打印最终处理结果
        if (allZipPaths.length === 0) {
            console.log(`没有图片需要处理`);
        } else if (allZipPaths.length === 1) {
            console.log(`所有图片处理完成，已保存到: ${allZipPaths[0]}`);
        } else {
            console.log(`所有图片处理完成，已创建 ${allZipPaths.length} 个ZIP文件`);
        }

        // 返回所有创建的ZIP文件路径
        return {
            zipPaths: allZipPaths,
            totalParts: totalParts
        };        
    } catch (error) {
        console.error('处理图片时出错:', error);
        throw error;
    }
}



