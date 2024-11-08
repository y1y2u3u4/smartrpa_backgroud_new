// modules/configManager.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 查找项目根目录的函数
function findRootDir(currentDir) {
    // 检查当前目录是否包含 package.json 文件（通常表示项目根目录）
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
    }

    // 如果到达了文件系统的根目录，则停止搜索
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
        throw new Error('无法找到项目根目录');
    }

    // 递归搜索父目录
    return findRootDir(parentDir);
}

// 获取项目根目录


export function loadConfig(configPath) {
    const rootDir = findRootDir(__dirname);
    const fullPath = path.join(rootDir, configPath);
    // const fullPath = path.join(process.cwd(), configPath);
    const configString = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(configString);
}