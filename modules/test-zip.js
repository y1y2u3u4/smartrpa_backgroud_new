import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试压缩函数
function testZipImages() {
    // 源文件夹路径
    const sourcePath = '/Users/zhanggongqing/project/smartrpa_backgroud_new/商品图片_N多寿司（焦作学生路519店）_part1/1';
    // 临时文件夹路径
    const tempFolderPath = '/Users/zhanggongqing/project/smartrpa_backgroud_new/temp_images_folder';
    // 输出ZIP文件路径
    const outputPath = '/Users/zhanggongqing/project/smartrpa_backgroud_new/测试压缩_文件夹.zip';
    
    console.log(`开始准备文件...`);
    
    // 检查源文件夹是否存在
    if (!fs.existsSync(sourcePath)) {
        console.error(`源文件夹不存在: ${sourcePath}`);
        return;
    }
    
    // 创建临时文件夹（如果不存在）
    if (!fs.existsSync(tempFolderPath)) {
        fs.mkdirSync(tempFolderPath, { recursive: true });
    } else {
        // 清空临时文件夹
        const files = fs.readdirSync(tempFolderPath);
        for (const file of files) {
            fs.unlinkSync(path.join(tempFolderPath, file));
        }
    }
    
    // 复制图片到临时文件夹
    const sourceFiles = fs.readdirSync(sourcePath);
    for (const file of sourceFiles) {
        if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
            const sourcePath_file = path.join(sourcePath, file);
            const destPath = path.join(tempFolderPath, file);
            fs.copyFileSync(sourcePath_file, destPath);
            console.log(`复制文件: ${file}`);
        }
    }
    
    console.log(`所有文件已复制到临时文件夹: ${tempFolderPath}`);
    
    // 使用zip命令压缩整个文件夹
    const command = `zip -r "${outputPath}" "${tempFolderPath}"`;
    
    console.log(`执行命令: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`执行出错: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`错误输出: ${stderr}`);
            return;
        }
        
        console.log(`命令输出: ${stdout}`);
        console.log(`压缩完成! 文件已保存到: ${outputPath}`);
        
        // 获取文件大小
        const stats = fs.statSync(outputPath);
        const sizeInMB = stats.size / (1024 * 1024);
        console.log(`ZIP文件大小: ${sizeInMB.toFixed(2)}MB`);
        
        // 可选：删除临时文件夹
        // fs.rmSync(tempFolderPath, { recursive: true, force: true });
        // console.log(`临时文件夹已删除`);
    });
}

// 运行测试
testZipImages();