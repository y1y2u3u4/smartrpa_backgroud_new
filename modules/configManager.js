// modules/configManager.js
import fs from 'fs';
import path from 'path';

export function loadConfig(configPath) {
    const fullPath = path.join(process.cwd(), configPath);
    const configString = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(configString);
}