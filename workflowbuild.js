const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const HttpProxyAgent = require('http-proxy-agent');


// 检查是否安装了 Git
try {
    execSync('git --version', { stdio: 'inherit' });
    console.log('Git 已经安装');
} catch (error) {
    console.log('下载并安装 Git...');
    execSync('powershell -Command "Start-BitsTransfer -Source \'https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.1/Git-2.42.0-64-bit.exe\' -Destination \'GitInstaller.exe\'"', { stdio: 'inherit' });
    execSync('start /wait GitInstaller.exe /VERYSILENT /NORESTART', { stdio: 'inherit' });
    console.log('Git 安装完成');
}

// 检查是否安装了 Node.js
try {
    execSync('node --version', { stdio: 'inherit' });
    console.log('Node.js 已经安装');
} catch (error) {
    console.log('下载并安装 Node.js...');
    execSync('powershell -Command "Start-BitsTransfer -Source \'https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi\' -Destination \'NodeInstaller.msi\'"', { stdio: 'inherit' });
    execSync('msiexec /i NodeInstaller.msi /quiet /norestart', { stdio: 'inherit' });
    console.log('Node.js 安装完成');
}

// 继续执行你原有的 Git 克隆、依赖安装等步骤

// 定义代理地址
const proxy = 'http://proxy_host:proxy_port';
const agent = new HttpProxyAgent(proxy);

// 设置环境变量，代理针对所有网络请求
process.env.HTTP_PROXY = proxy;
process.env.HTTPS_PROXY = proxy;

// 设置环境变量
process.env.NODE_ENV = 'production';
process.env.API_KEY = 'your_api_key_here';
process.env.DB_HOST = 'localhost';
process.env.PORT = '8080';

// 使用 Git 克隆仓库
const repoUrl = '<repository_url>';
try {
    execSync(`git clone ${repoUrl}`, { stdio: 'inherit' });
    console.log('Git 仓库克隆成功');
} catch (err) {
    console.error('Git 克隆失败:', err);
}

// 进入项目目录
const projectName = '<project_name>';
process.chdir(projectName);

// 安装项目依赖
execSync('npm install', { stdio: 'inherit' });

// 启动 Node.js 服务器
const server = execSync('node server.js', { stdio: 'inherit' });

// 检查服务器是否启动成功
setTimeout(() => {
    https.get(`http://localhost:${process.env.PORT}`, { agent }, (res) => {
        console.log(`服务器运行状态: ${res.statusCode}`);
        res.on('data', (chunk) => {
            console.log(`响应数据: ${chunk}`);
        });
    }).on('error', (e) => {
        console.error(`服务器启动失败: ${e.message}`);
    });

    // 清理代理设置
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;

    console.log('工作流完成');
}, 5000);


// npm install - g pkg

// pkg workflowbuild.js--output workflow.exe

// pkg workflowbuild.js--output workflow--targets node16 - win - x64, node16 - linux - x64, node16 - macos - x64

// ngrok http 8082 --region ap