// modules/puppeteerManager.js
//原生的情况下需要完整的puppeteer
import puppeteer from 'puppeteer';
import puppeteer_core  from 'puppeteer-core';
import axios from 'axios';
import { exec } from 'child_process'

export async function launchBrowser(config) {
    return await puppeteer.launch({
        headless: config.headless,
        executablePath: config.executablePath,
        defaultViewport: config.viewport,
        args: config.args,
        protocolTimeout: 120000, // 增加协议超时设置为120秒，解决evaluate超时问题
    });
}



// export async function launchBrowser(config, display = null) {
//     // 构建环境变量对象
//     const env = { ...process.env };
    
//     // 如果提供了显示器编号，则使用该显示器
//     if (display) {
//         env.DISPLAY = `:${display}`;
//     }
    
//     return await puppeteer.launch({
//         headless: config.headless,
//         executablePath: config.executablePath,
//         defaultViewport: config.viewport,
//         args: config.args,
//         protocolTimeout: 120000,
//         env: env  // 设置环境变量
//     });
// }



export async function launchBrowser_adsPower_bendi(adsPowerUserId) {
    console.log('config:', adsPowerUserId);
    try {
        // const response = await axios.get(`http://${config.adsPowerId}:50325/api/v1/browser/start?user_id=${config.adsPowerUserId}`);
        const response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/start?user_id=${adsPowerUserId}}`);
        console.log('response:', response);
        if (response && response.data.code === 0 && response.data.data.ws && response.data.data.ws.puppeteer) {
            console.log('成功获取 WebSocket 端点，正在连接...');
            const wsEndpoint = response.data.data.ws.puppeteer;
            console.log('wsEndpoint:', wsEndpoint);
            const modifiedWsEndpoint = wsEndpoint.replace(/\[::1\]|127\.0\.0\.1/, '10.128.0.3');
            console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

            return await puppeteer_core.connect({
                browserWSEndpoint: wsEndpoint,
                defaultViewport: null,
            });
        } else {
            throw new Error('AdsPower启动浏览器失败');
        }
    } catch (error) {
        console.error('启动浏览器时出错:', error);
        throw error;
    }
}




// export async function launchBrowser_adsPower(config) {
//     console.log('config:', config);
//     try {
//         try {
//         const response = await axios.get(`http://10.128.0.3:50325/api/v1/browser/start`, {
//             params: {
//                 user_id: config.adsPowerUserId,
//                 launch_args: JSON.stringify([
//                     "--remote-debugging-port=52918", // 固定 DevTools 端口
//                     // "--remote-debugging-address=0.0.0.0", // 允许远程调试
//                 ])
//             },
//             timeout: 60000 
//         });
//         console.log('response:', response);
//         } catch (error) {
//             console.error('Error details:', error);
//             if (error.response) {
//                 console.error('Error response:', error.response.data);
//             } else if (error.request) {
//                 console.error('No response received. Request details:', error.request);
//             } else {
//                 console.error('Error setting up request:', error.message);
//             }
//         }
//         if (response.data.code === 0 && response.data.data.ws && response.data.data.ws.puppeteer_core) {
//             console.log('成功获取 WebSocket 端点，正在连接...');
//             const wsEndpoint = response.data.data.ws.puppeteer_core;
//             console.log('wsEndpoint:', wsEndpoint);
//             const adsPowerId = config.adsPowerId; 
//             const modifiedWsEndpoint = wsEndpoint.replace(/\[::1\]|127\.0\.0\.1/, '10.128.0.3');
//             console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

//             return await puppeteer_core.connect({
//                 browserWSEndpoint: wsEndpoint,
//                 defaultViewport: null,
//             });
//         } else {
//             throw new Error('AdsPower启动浏览器失败');
//         }
//     } catch (error) {
//         console.error('启动浏览器时出错:', error);
//         throw error;
//     }
// }



// export async function launchBrowser_adsPower(config) {
//     console.log('config:', config);
//     console.log('成功获取 WebSocket 端点，正在连接...');
//     const modifiedWsEndpoint = "ws://0.tcp.ngrok.io:12190/devtools/browser/b5517467-b685-46df-82a1-3bc3a5519dd3"
//     console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

//     return await puppeteer.connect({
//         browserWSEndpoint: modifiedWsEndpoint,
//         defaultViewport: null,
//     });
// }




export async function launchBrowser_adsPower(adsPowerUserId) {
    console.log('config:', adsPowerUserId);
    try {
        let response;
        try {
            // response = await axios.get(`http://${config.adsPowerId}:50325/api/v1/browser/start`, {
            response = await axios.get(`http://10.128.0.3:50325/api/v1/browser/start`, {
                params: {
                    user_id: adsPowerUserId,
                    launch_args: JSON.stringify([
                        "--remote-debugging-port=52918",
                    ])
                },
                timeout: 60000
            });
            console.log('response:', response);
        } catch (error) {
            console.error('Error details:', error);
            if (error.response) {
                console.error('Error response:', error.response.data);
            } else if (error.request) {
                console.error('No response received. Request details:', error.request);
            } else {
                console.error('Error setting up request:', error.message);
            }
            throw error; // 重新抛出错误，以便外层 catch 块处理
        }
        console.log('完整的响应数据:', JSON.stringify(response.data, null, 2));

        if (response && response.data.code === 0 && response.data.data.ws && response.data.data.ws.puppeteer) {
            console.log('成功获取 WebSocket 端点，正在连接...');
            const wsEndpoint = response.data.data.ws.puppeteer;
            console.log('wsEndpoint:', wsEndpoint);
            const modifiedWsEndpoint = wsEndpoint.replace(/\[::1\]|127\.0\.0\.1/, '10.128.0.3');
            console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

            return await puppeteer_core.connect({
                browserWSEndpoint: modifiedWsEndpoint,
                defaultViewport: null,
            });
        } else {
            throw new Error('AdsPower启动浏览器失败');
        }
    } catch (error) {
        console.error('启动浏览器时出错:', error);
        throw error;
    }
}

//查询并链接浏览器
export async function launchBrowser_adsPower_lianjie(adsPowerUserId, adsPowerId = '10.128.0.3') {
    console.log('config:', adsPowerUserId);
    let response;
    try {
        response = await axios.get(`http://${adsPowerId}:50325/api/v1/browser/active`, {
        // response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/active`, {
            params: {
                user_id: adsPowerUserId
            },
            timeout: 60000
        });
        console.log('查询响应:', response.data);

        let wsEndpoint;
        if (response.data.code === 0 && response.data.data.status === 'Active') {
            console.log('浏览器已经处于活动状态，直接连接');
            wsEndpoint = response.data.data.ws.puppeteer;
        } else {
            console.log('浏览器未启动，尝试启动浏览器');
            // 启��浏览器
            response = await axios.get(`http://${adsPowerId}:50325/api/v1/browser/start`, {
            // response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/start`, {
                params: {
                    user_id: adsPowerUserId,
                    launch_args: JSON.stringify([
                        "--remote-debugging-port=52918",
                    ])
                },
                timeout: 60000
            });
            console.log('启动响应:', response.data);

            if (response.data.code === 0 && response.data.data.ws && response.data.data.ws.puppeteer) {
                wsEndpoint = response.data.data.ws.puppeteer;
            } else {
                throw new Error('AdsPower启动浏览器失败');
            }
        }


        console.log('成功获取 WebSocket 端点，正在连接...');
        console.log('wsEndpoint:', wsEndpoint);
        const modifiedWsEndpoint = wsEndpoint.replace(/\[::1\]|127\.0\.0\.1/, '10.128.0.3');
        console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

        return await puppeteer_core.connect({
            browserWSEndpoint: modifiedWsEndpoint,
            // browserWSEndpoint: wsEndpoint,
            defaultViewport: null,
        });
    } catch (error) {
        console.error('启动浏览器时出错:', error);
        throw error;
    }
}


export async function launchBrowser_adsPower_lianjie_linux(adsPowerUserId, adsPowerId = '213.173.105.83') {
    console.log('config:', adsPowerUserId);
    let response;
    try {
        response = await axios.get(`https://7v6hf541n4giwb-50325.proxy.runpod.net/api/v1/browser/active`, {
        // response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/active`, {
            params: {
                user_id: adsPowerUserId
            },
            timeout: 60000
        });
        console.log('查询响应:', response.data);

        let wsEndpoint;
        if (response.data.code === 0 && response.data.data.status === 'Active') {
            console.log('浏览器已经处于活动状态，直接连接');
            wsEndpoint = response.data.data.ws.puppeteer;
        } else {
            console.log('浏览器未启动，尝试启动浏览器');
            
            // 启��浏览器
            response = await axios.get(`https://7v6hf541n4giwb-50325.proxy.runpod.net/api/v1/browser/start`, {
            // response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/start`, {
                params: {
                    user_id: adsPowerUserId,
                    launch_args: JSON.stringify([
                        "--remote-debugging-port=52918",
                    ])
                },
                timeout: 60000
            });
            console.log('启动响应:', response.data);

            if (response.data.code === 0 && response.data.data.ws && response.data.data.ws.puppeteer) {
                wsEndpoint = response.data.data.ws.puppeteer;
            } else {
                throw new Error('AdsPower启动浏览器失败');
            }
        }


        console.log('成功获取 WebSocket 端点，正在连接...');
        console.log('wsEndpoint:', wsEndpoint);
        // const modifiedWsEndpoint = wsEndpoint.replace(/\[::1\]|127\.0\.0\.1/, '172.17.0.30');
        const modifiedWsEndpoint = wsEndpoint.replace(/ws:\/\/(\[::1\]|127\.0\.0\.1|172\.17\.0\.30):[0-9]+/, 'wss://12055e86e453.ngrok.app');
        console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

        return await puppeteer_core.connect({
            browserWSEndpoint: modifiedWsEndpoint,
            // browserWSEndpoint: wsEndpoint,
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
            // Linux专用优化参数
            _connectionOptions: {
                timeout: 60000,
                transportOptions: {
                pollingInterval: 500,  // 缩短轮询间隔
                maxPayload: 1024 * 1024 * 5 // 增大传输缓冲区
                }
            }
        });
    } catch (error) {
        console.error('启动浏览器时出错:', error);
        throw error;
    }
}



// RunPod 配置
const RUNPOD_CONFIG = {
    BASE_URL: 'q9p2c49e1pdbfb',
    API_PORT: '50325',
    DEBUG_PORT: '52919'
};

export async function launchBrowser_adsPower_lianjie_linux_api(adsPowerUserId, BASE_URL,API_PORT=50325,DEBUG_PORT=52919) {
    console.log('config:', adsPowerUserId);
    let response;
    try {
        response = await axios.get(`https://${BASE_URL}-${API_PORT}.proxy.runpod.net/api/v1/browser/active`, {
            params: {
                user_id: adsPowerUserId
            },
            timeout: 60000
        });
        console.log('查询响应:', response.data);

        let wsEndpoint;
        if (response.data.code === 0 && response.data.data.status === 'Active') {
            console.log('浏览器已经处于活动状态，直接连接');
            wsEndpoint = response.data.data.ws.puppeteer;
        } else {
            console.log('浏览器未启动，尝试启动浏览器');
            // 启��浏览器
            response = await axios.get(`https://${BASE_URL}-${API_PORT}.proxy.runpod.net/api/v1/browser/start`, {
                params: {
                    user_id: adsPowerUserId,
                    launch_args: JSON.stringify([
                        "--remote-debugging-port=52918",
                        "--headless=1",
                    ])
                },
                timeout: 60000
            });
            console.log('启动响应:', response.data);

            if (response.data.code === 0 && response.data.data.ws && response.data.data.ws.puppeteer) {
                wsEndpoint = response.data.data.ws.puppeteer;
            } else {
                throw new Error('AdsPower启动浏览器失败');
            }
        }


        console.log('成功获取 WebSocket 端点，正在连接...');
        console.log('wsEndpoint:', wsEndpoint);
        // 先尝试获取连接信息
        try {
            const response = await axios.get(`https://${BASE_URL}-${DEBUG_PORT}.proxy.runpod.net/json/version`);
            console.log('获取调试信息:', response.data);
            if (response.data.webSocketDebuggerUrl) {
                // 使用wss协议
                const debuggerUrl = response.data.webSocketDebuggerUrl;
                const path = debuggerUrl.split('/').slice(3).join('/');
                wsEndpoint = `wss://${BASE_URL}-${DEBUG_PORT}.proxy.runpod.net/${path}`;
                console.log('使用新的wsEndpoint:', wsEndpoint);
                // 如果获取失败，尝试直接替换
                const path2 = wsEndpoint.split('/').slice(3).join('/');
                const modifiedWsEndpoint = `wss://${BASE_URL}-${DEBUG_PORT}.proxy.runpod.net/${path2}`;
                console.log('modifiedWsEndpoint:', modifiedWsEndpoint);
                return await puppeteer_core.connect({
                    browserWSEndpoint: modifiedWsEndpoint,
                    defaultViewport: null
                });
            }
        } catch (error) {
            console.log('获取调试信息失败，尝试直接连接:', error.message);
        }

        // 如果获取失败，尝试直接替换
        const path = wsEndpoint.split('/').slice(3).join('/');
        const modifiedWsEndpoint = `wss://${BASE_URL}-${DEBUG_PORT}.proxy.runpod.net/${path}`;
        console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

        return await puppeteer_core.connect({
            browserWSEndpoint: modifiedWsEndpoint,
            // browserWSEndpoint: wsEndpoint,
            defaultViewport: null,
        });
    } catch (error) {
        console.error('启动浏览器时出错:', error);
        throw error;
    }
}





export async function launchBrowser_adsPower_lianjie_local(adsPowerUserId, adsPowerId = '10.128.0.3') {
    console.log('config:', adsPowerUserId);
    let response;
    try {
        response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/active`, {
            // response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/active`, {
            params: {
                user_id: adsPowerUserId
            },
            timeout: 800000
        });
        console.log('查询响应:', response.data);

        let wsEndpoint;
        if (response.data.code === 0 && response.data.data.status === 'Active') {
            console.log('浏览器已经处于活动状态，直接连接');
            wsEndpoint = response.data.data.ws.puppeteer;
        } else {
            console.log('浏览器未启动，尝试启动浏览器');
            // 启动浏览器
            response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/start`, {
                // response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/start`, {
                params: {
                    user_id: adsPowerUserId,
                    launch_args: JSON.stringify([
                        "--remote-debugging-port=52918",
                    ])
                },
                timeout: 60000
            });
            console.log('启动响应:', response.data);

            if (response.data.code === 0 && response.data.data.ws && response.data.data.ws.puppeteer) {
                wsEndpoint = response.data.data.ws.puppeteer;
            } else {
                throw new Error('AdsPower启动浏览器失败');
            }
        }


        console.log('成功获取 WebSocket 端点，正在连接...');
        console.log('wsEndpoint:', wsEndpoint);
        const modifiedWsEndpoint = wsEndpoint.replace(/\[::1\]|127\.0\.0\.1/, '10.128.0.3');
        console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

        return await puppeteer_core.connect({
            browserWSEndpoint: wsEndpoint,
            defaultViewport: null,
        });
    } catch (error) {
        console.error('启动浏览器时出错:', error);
        throw error;
    }
}



export async function launchBrowser_adsPower_lianjie_local_api(adsPowerUserId, adsPowerId = '10.128.0.3') {
    console.log('config:', adsPowerUserId);
    const API_KEY = 'b996c078e3bfdb1dcc0cd3f26ea4c949';
    const API_PORT = 50325;
    let response;

    try {
        // 启动AdsPower Global（如果尚未启动）
        const platform = process.platform;
        let startCommand;
        if (platform === 'darwin') {
            startCommand = '"/Applications/AdsPower Global.app/Contents/MacOS/AdsPower Global" --args --headless=true ';
        } else if (platform === 'win32') {
            startCommand = '"AdsPower Global.exe" --headless=true ';
        } else if (platform === 'linux') {
            startCommand = 'adspower_global --headless=true ';
        }
        startCommand += `--api-key=${API_KEY} --api-port=${API_PORT}`;
        
        try {
            await exec(startCommand);
            console.log('AdsPower Global 启动成功');
            // 等待服务启动
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            console.log('AdsPower Global 可能已经在运行:', error.message);
        }

        response = await axios.get(`http://local.adspower.net:${API_PORT}/api/v1/browser/active`, {
            // response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/active`, {
            params: {
                user_id: adsPowerUserId
            },
            timeout: 60000
        });
        console.log('查询响应:', response.data);

        let wsEndpoint;
        if (response.data.code === 0 && response.data.data.status === 'Active') {
            console.log('浏览器已经处于活动状态，直接连接');
            wsEndpoint = response.data.data.ws.puppeteer;
        } else {
            console.log('浏览器未启动，尝试启动浏览器');
            // 启动浏览器
            response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/start`, {
                // response = await axios.get(`http://local.adspower.net:50325/api/v1/browser/start`, {
                params: {
                    user_id: adsPowerUserId,
                    launch_args: JSON.stringify([
                        "--remote-debugging-port=52918",
                        "--headless=1",
                    ])
                },
                timeout: 60000
            });
            console.log('启动响应:', response.data);

            if (response.data.code === 0 && response.data.data.ws && response.data.data.ws.puppeteer) {
                wsEndpoint = response.data.data.ws.puppeteer;
            } else {
                throw new Error('AdsPower启动浏览器失败');
            }
        }


        console.log('成功获取 WebSocket 端点，正在连接...');
        console.log('wsEndpoint:', wsEndpoint);
        const modifiedWsEndpoint = wsEndpoint.replace(/\[::1\]|127\.0\.0\.1/, '10.128.0.3');
        console.log('modifiedWsEndpoint:', modifiedWsEndpoint);

        return await puppeteer_core.connect({
            browserWSEndpoint: wsEndpoint,
            defaultViewport: null,
        });
    } catch (error) {
        console.error('启动浏览器时出错:', error);
        throw error;
    }
}






export async function setupPage(browser, cookies) {
    const page = await browser.newPage();
    // await page.setViewport({ width: 1280, height: 720 });
    // console.log('cookies_check:', cookies);
    await page.setCookie(...cookies);

    await page.evaluateOnNewDocument(() => {
        // 清除webdriver痕迹
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        // 伪装chrome对象
        window.navigator.chrome = {
            runtime: {},
        };
        // 伪装权限查询
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
        // 伪装插件数量
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3],
        });
        // 伪装语言
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        // 伪装 WebGL
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) {
                return 'Intel Inc.';
            }
            if (parameter === 37446) {
                return 'Intel Iris OpenGL Engine';
            }
            return getParameter(parameter);
        };
        // 伪装 Canvas
        // const getContext = HTMLCanvasElement.prototype.getContext;
        // HTMLCanvasElement.prototype.getContext = function (contextType) {
        //     if (contextType === '2d') {
        //         return {
        //             ...getContext.call(this, contextType),
        //             fillText: function () { },
        //             strokeText: function () { },
        //         };
        //     }
        //     return getContext.call(this, contextType);
        // };
        // 添加更多浏览器特征
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(screen, 'colorDepth', { get: () => 24 });

        // 模拟更真实的 navigator.platform
        Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });

        // 模拟更真实的 navigator.vendor
        Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });

        // 模拟更真实的 navigator.productSub
        Object.defineProperty(navigator, 'productSub', { get: () => '20030107' });

        // 模拟更真实的 navigator.maxTouchPoints
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

        // 模拟更真实的 navigator.connection
        Object.defineProperty(navigator, 'connection', {
            get: () => ({
                effectiveType: '4g',
                rtt: 50,
                downlink: 10,
                saveData: false
            })
        });


    });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    
    return page;
}


// export async function setupPage_adsPower(browser, cookies) {
//     const page = await browser.newPage();
//     await page.setViewport({ width: 1280, height: 720 });
//     await page.setCookie(...cookies);

//     return page;
// }


export async function setupPage_adsPower(browser, cookies) {
    try {
        // 获取所有页面
        
        const pages = await browser.pages();
        console.log(`当前打开的页面数量: ${pages.length}`);

        // 如果页面数量超过限制
        if (pages.length > 25) {
            console.log('当前页面数量超过20，正在关闭多余页面');
            
            // 保留最后20个页面，关闭其他页面
            for (let i = 0; i < pages.length - 5; i++) {
                try {
                    const page = pages[i];
                    if (page && !page.isClosed()) {  // 检查页面是否存在且未关闭
                        await page.close().catch(e => {
                            console.log(`关闭页面 ${i} 时出错:`, e.message);
                        });
                    }
                } catch (err) {
                    console.log(`处理页面 ${i} 时出错:`, err.message);
                    continue;  // 继续处理下一个页面
                }
            }
        }

        // 创建新页面
        
        const page = await browser.newPage().catch(e => {
            console.error('创建新页面失败:', e);
            throw e;
        });
        await page.setCookie(...cookies);
        

        // 设置页面视口
        // await page.setViewport({
        //     width: 1920,
        //     height: 1080
        // }).catch(e => {
        //     console.log('设置视口大小失败:', e.message);
        // });

        return page;

    } catch (error) {
        console.error('setupPage_adsPower 执行失败:', error);
        throw error;
    }
}



export async function closePage_adsPower(page) {
    if (page && !page.isClosed()) {
        await page.close();
    }
}

export async function closePage(page) {
    if (page && !page.isClosed()) {
        try {
            await page.close();
        } catch (error) {
            console.error('关闭页面时出错:', error.message);
        }
    }
}

export async function checkPageStatus(page) {
    if (!page || page.isClosed()) {
        throw new Error('页面已关闭或无效');
    }
    return true;
}

export async function closeBrowser_adsPower(browser, adsPowerUserId) {
    // await browser.disconnect();
    try {
        await axios.get(`http://10.128.0.3:50325/api/v1/browser/stop?user_id=${adsPowerUserId}`);
    } catch (error) {
        console.error('关闭AdsPower浏览器时出错:', error);
    }
}




// curl "http://local.adspower.net:50325/api/v1/browser/stop?user_id=kn8o287";
// curl "http://local.adspower.net:50325/api/v1/browser/start?user_id=kn8o287";

// curl "http://local.adspower.net:50325/api/v1/browser/active?user_id=kn8o287";
// const adsPowerUserIds = ['kn8o287', 'knibk1e', 'knibk1h', 'knibk1k', 'knibk1k'];

// curl "http://34.134.74.48:50325/api/v1/browser/start?user_id=kn8o287";
// curl "http://34.134.74.48:50325/api/v1/browser/active?user_id=kn8o287";

// curl "http://34.41.182.90:50325/api/v1/browser/start?user_id=knibk1e";
// curl "http://34.134.74.48:50325/api/v1/browser/active?user_id=knibk1e";








// export async function setupMultipleBrowsers(adsPowerUserIds, cookies) {
//     const browsers = [];
//     for (const userId of adsPowerUserIds) {
//         const browser = await launchBrowser_adsPower(userId);
//         const page = await setupPage_adsPower(browser, cookies);
//         browsers.push({ browser, page });
//     }
//     return browsers;
// }

// // 使用示例
// const browserInstances = await setupMultipleBrowsers(adsPowerUserIds, cookies);
// await Promise.all(browserInstances.map(({ browser, page }) => someOperation(browser, page)));
// // 完成后记得关闭所有浏览器
// for (const { browser, page } of browserInstances) {
//     await closePage_adsPower(page);
//     await closeBrowser_adsPower(browser, adsPowerUserId);
// }


// export async function setupMultiplePages(browser, cookies, pageCount = 3) {
//     const pages = [];
//     for (let i = 0; i < pageCount; i++) {
//         const page = await browser.newPage();
//         await page.setCookie(...cookies);
//         pages.push(page);
//     }
//     return pages;
// }

// // 使用示例
// const pages = await setupMultiplePages(browser, cookies);
// // 现在您可以并行操作这些页面
// await Promise.all(pages.map(page => someOperation(page)));
