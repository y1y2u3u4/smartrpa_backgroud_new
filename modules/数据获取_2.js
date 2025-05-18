import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

// 修改为未等视频的路径
const dirPath = '/Users/xyx/Downloads/未等视频';
const targetDir = '/Users/xyx/Downloads/未等视频';

// 读取目录中的文件
const files = fs.readdirSync(dirPath);

let fileData = [];

// 过滤出所有MP4文件并按修改时间排序
const mp4Files = files
  .filter(file => {
    const filePath = path.join(dirPath, file);
    return fs.statSync(filePath).isFile() && path.extname(file).toLowerCase() === '.mp4';
  })
  .map(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    return {
      originalName: file,
      path: filePath,
      mtime: stats.mtime
    };
  })
  .sort((a, b) => a.mtime - b.mtime); // 按修改时间排序

// 重命名文件并收集信息
mp4Files.forEach((file, index) => {
  // 生成新文件名：视频1.mp4, 视频2.mp4, ...
  const newFileName = `视频${index + 1}.mp4`;
  const newFilePath = path.join(targetDir, newFileName);

  // 重命名文件
  fs.renameSync(file.path, newFilePath);

  // 获取新文件的状态
  const stats = fs.statSync(newFilePath);

  // 将文件大小转换为MB，保留一位小数
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  // 获取修改时间
  const modifiedTime = new Date(stats.mtime);
  const formattedTime = `${modifiedTime.getHours().toString().padStart(2, '0')}:${modifiedTime.getMinutes().toString().padStart(2, '0')}`;

  // 添加文件信息到数组
  fileData.push({
    name: newFileName,
    originalName: file.originalName,
    size: `${fileSizeMB} MB`,
    type: 'MPEG-4 影片',
    modifiedTime: formattedTime
  });

  console.log(`重命名: ${file.originalName} -> ${newFileName}`);
});

// 创建Excel工作表
const worksheet = xlsx.utils.json_to_sheet(fileData.map(file => ({
  '名称': file.name,
  '原始名称': file.originalName,
  '大小': file.size,
  '类型': file.type,
  '修改时间': file.modifiedTime
})));

// 设置列宽
const maxWidth = Math.max(
  ...fileData.map(file => file.name.length),
  ...fileData.map(file => file.originalName.length)
);
worksheet['!cols'] = [
  { wch: 10 },       // 名称列
  { wch: maxWidth }, // 原始名称列
  { wch: 10 },       // 大小列
  { wch: 15 },       // 类型列
  { wch: 10 }        // 修改时间列
];

// 创建工作簿并添加工作表
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, '视频文件列表');

// 保存Excel文件
const excelFilePath = path.join(targetDir, '视频文件列表.xlsx');
xlsx.writeFile(workbook, excelFilePath);

console.log(`Excel文件已保存到: ${excelFilePath}`);
console.log(`共处理 ${fileData.length} 个视频文件`);