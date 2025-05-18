// sessionManager.js
import { spawn } from 'child_process';
import crypto from 'crypto';
import * as fs from 'fs';
import os from 'os';

// 检测操作系统
const isMacOS = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

// 设置环境
const isDevelopment = process.env.NODE_ENV !== 'production';

// 会话存储
const sessions = new Map();
// 已使用的显示器编号
const usedDisplays = new Set([99]); // 99是默认的显示器
// 已使用的VNC端口
const usedVncPorts = new Set([5900]); // 5900是默认的VNC端口
// 已使用的noVNC端口
const usedNoVncPorts = new Set([6080]); // 6080是默认的noVNC端口

// 生成唯一会话ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// 分配新的显示器编号
function allocateDisplay() {
  let displayNum = 100;
  while (usedDisplays.has(displayNum)) {
    displayNum++;
  }
  usedDisplays.add(displayNum);
  return displayNum;
}

// 分配新的VNC端口
function allocateVncPort() {
  let port = 5901;
  while (usedVncPorts.has(port)) {
    port++;
  }
  usedVncPorts.add(port);
  return port;
}

// 分配新的noVNC端口
function allocateNoVncPort() {
  let port = 6081;
  while (usedNoVncPorts.has(port)) {
    port++;
  }
  usedNoVncPorts.add(port);
  return port;
}

// 创建会话
async function createSession(userId) {
  const sessionId = generateSessionId();
  const displayNum = allocateDisplay();
  
  let xvfbProcess = null;
  let vncProcess = null;
  let noVncProcess = null;
  let passwordFile = null;
  let vncPort = allocateVncPort();
  let noVncPort = allocateNoVncPort();
  let vncPassword = crypto.randomBytes(8).toString('hex');
  
  // 如果是macOS或开发环境，使用模拟模式
  if (isMacOS && isDevelopment) {
    console.log(`开发模式: macOS不启动Xvfb/VNC服务，使用模拟模式`);
    
    // 在开发环境中模拟 noVNC 连接
    try {
      // 使用一个测试端口模拟模拟 noVNC 服务
      console.log(`开发模式: 模拟 noVNC 服务在端口 ${noVncPort}`);
      
      // 模拟端口上创建一个简单的HTTP服务器来充当WebSocket服务
      const http = await import('http');
      noVncProcess = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end(`这是一个模拟的noVNC服务器响应`);
      }).listen(noVncPort, '127.0.0.1', () => {
        console.log(`开发模式: 模拟服务器启动在端口 ${noVncPort}`);
      });
    } catch (error) {
      console.error(`开发模式: 启动模拟服务失败:`, error);
    }
  }
  // Linux生产环境则正常启动服务
  else if (isLinux || !isDevelopment) {
    try {
      // 启动专用的Xvfb实例
      xvfbProcess = spawn('Xvfb', [
        `:${displayNum}`,
        '-screen', '0', '1920x1080x24',
        '-ac'
      ]);
      
      // 等待Xvfb启动
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 将密码写入临时文件
      passwordFile = `/tmp/vncpass_${sessionId}`;
      const passProcess = spawn('x11vnc', ['-storepasswd', vncPassword, passwordFile]);
      await new Promise((resolve, reject) => {
        passProcess.on('close', code => {
          if (code === 0) resolve();
          else reject(new Error(`生成VNC密码失败，退出码: ${code}`));
        });
      });
      
      // 启动专用的VNC服务
      vncProcess = spawn('x11vnc', [
        '-display', `:${displayNum}`,
        '-rfbport', `${vncPort}`,
        '-rfbauth', passwordFile,
        '-forever',
        '-shared'
      ]);
      
      // 启动专用的noVNC服务
      noVncProcess = spawn('/opt/novnc/utils/launch.sh', [
        '--vnc', `localhost:${vncPort}`,
        '--listen', `${noVncPort}`
      ]);
      
      // 等待VNC服务启动
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`启动服务失败:`, error);
      // 将进程设为null以避免终止不存在的进程
      xvfbProcess = null;
      vncProcess = null;
      noVncProcess = null;
    }
  }
  
  // 记录会话信息
  const session = {
    id: sessionId,
    userId,
    displayNum,
    vncPort,
    noVncPort,
    vncPassword,
    passwordFile,
    xvfbProcess,
    vncProcess,
    noVncProcess,
    createdAt: new Date(),
    lastAccessedAt: new Date()
  };
  
  sessions.set(sessionId, session);
  console.log(`创建会话成功: 用户ID=${userId}, 会话ID=${sessionId}, 显示器=${displayNum}, VNC端口=${vncPort}, noVNC端口=${noVncPort}, VNC密码=${vncPassword}`);
  
  // 添加模拟标志以进行调试
  const isSimulated = (isMacOS && isDevelopment) ? true : false;
  
  return {
    sessionId,
    displayNum,
    vncPort,
    noVncPort,
    vncPassword,
    vncUrl: `/novnc/vnc_session.html?port=${noVncPort}&password=${vncPassword}`,
    isSimulated,
    debugInfo: {
      os: os.platform(),
      nodeEnv: process.env.NODE_ENV || 'development',
      isDevelopment,
      isMacOS,
      isLinux,
      timestamp: new Date().toISOString()
    }
  };
}

// 获取会话
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastAccessedAt = new Date();
  }
  return session;
}

// 结束会话
function terminateSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  // 结束Xvfb进程
  if (session.xvfbProcess) {
    try {
      session.xvfbProcess.kill();
      console.log(`终止Xvfb进程成功: 显示器=${session.displayNum}`);
    } catch (error) {
      console.error('终止Xvfb进程出错:', error);
    }
  }
  
  // 结束VNC进程
  if (session.vncProcess) {
    try {
      session.vncProcess.kill();
      console.log(`终止VNC进程成功: 端口=${session.vncPort}`);
    } catch (error) {
      console.error('终止VNC进程出错:', error);
    }
  }
  
  // 结束noVNC进程
  if (session.noVncProcess) {
    try {
      session.noVncProcess.kill();
      console.log(`终止noVNC进程成功: 端口=${session.noVncPort}`);
    } catch (error) {
      console.error('终止noVNC进程出错:', error);
    }
  }
  
  // 删除密码文件
  if (session.passwordFile) {
    try {
      fs.unlinkSync(session.passwordFile);
    } catch (error) {
      console.error('删除VNC密码文件出错:', error);
    }
  }
  
  // 释放资源
  usedDisplays.delete(session.displayNum);
  usedVncPorts.delete(session.vncPort);
  usedNoVncPorts.delete(session.noVncPort);
  
  // 删除会话
  sessions.delete(sessionId);
  console.log(`终止会话成功: 会话ID=${sessionId}`);
  return true;
}

// 定期清理过期会话
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    const inactiveTime = now - session.lastAccessedAt;
    if (inactiveTime > 30 * 60 * 1000) { // 30分钟无活动则清理
      console.log(`会话过期自动清理: 会话ID=${sessionId}, 不活跃时间=${inactiveTime/1000/60}分钟`);
      terminateSession(sessionId);
    }
  }
}, 5 * 60 * 1000); // 每5分钟检查一次

export {
  createSession,
  getSession,
  terminateSession
};