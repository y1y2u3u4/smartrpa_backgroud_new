import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const dirPath = '/Users/xyx/Downloads/RUNWAY-1107-Photo';
const targetDir = '/Users/xyx/Downloads/RUNWAY-1107-Photo';
const files = fs.readdirSync(dirPath);

let fileNames = [];

files.forEach((subDir) => {
  const subDirPath = path.join(dirPath, subDir);
  if (fs.statSync(subDirPath).isDirectory()) {
    const subSubDirs = fs.readdirSync(subDirPath);
    subSubDirs.forEach((subSubDir) => {
      const subSubDirPath = path.join(subDirPath, subSubDir);
      if (fs.statSync(subSubDirPath).isDirectory()) {
        const subFiles = fs.readdirSync(subSubDirPath);
        subFiles.forEach((file, index) => {
          const filePath = path.join(subSubDirPath, file);
          const fileExt = path.extname(file);
          const newFileName = `${subDir}_${subSubDir}_${index + 1}${fileExt}`;
          const newFilePath = path.join(targetDir, newFileName);
          fs.renameSync(filePath, newFilePath);
          fileNames.push(newFileName);
        });
      }
    });
  }
});

// 创建 Excel 文件
const worksheet = xlsx.utils.aoa_to_sheet(fileNames.map(name => [name]));
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'FileNames');

// 保存 Excel 文件
xlsx.writeFile(workbook, path.join(targetDir, 'file_names.xlsx'));