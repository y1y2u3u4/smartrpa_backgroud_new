import WebSocket from 'ws';

const wsEndpoint = 'wss://lh3byuf78xx3lk-52919.proxy.runpod.net/devtools/browser/29942ad8-fa30-4b53-89c7-881cac5f4353';

console.log('开始测试 WebSocket 连接...');
console.log('连接地址:', wsEndpoint);

const ws = new WebSocket(wsEndpoint, {
    timeout: 30000,
    handshakeTimeout: 30000,
    rejectUnauthorized: false,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36'
    }
});

ws.on('open', () => {
    console.log('连接成功！');
    // 发送一个简单的CDP命令
    ws.send(JSON.stringify({
        id: 1,
        method: 'Browser.getVersion'
    }));
});

ws.on('message', (data) => {
    console.log('收到消息:', data.toString());
    ws.close();
});

ws.on('error', (error) => {
    console.error('连接错误:', {
        message: error.message,
        code: error.code,
        name: error.name
    });
});

ws.on('close', (code, reason) => {
    console.log('连接关闭:', code, reason.toString());
});

// 30秒后如果还没有关闭就强制关闭
setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
        console.log('30秒超时，强制关闭连接');
        ws.close();
    }
}, 30000);