// modules/puppeteerManager.js
import puppeteer from 'puppeteer';


export async function launchBrowser(config) {
    return await puppeteer.launch({
        headless: config.headless,
        executablePath: config.executablePath,
        defaultViewport: config.viewport,
        args: config.args,
    });
}

// import puppeteer from "puppeteer-core";
// export async function launchBrowser(config) {
//     const launchArgs = JSON.stringify({
//         stealth: true,
//         headless: false,
//         args: [
//             '--disable-setuid-sandbox',
//             '--window-size=1280,800',
//         ],
//         ignoreDefaultArgs: true,
//     });
//     return  await puppeteer.connect({
//         browserWSEndpoint: `wss://production-sfo.browserless.io/?token=QXoknERUGOQhXNe91655221066b3ab5962bd3b2a1a&proxy=residential&proxyCountry=us&timeout=1000000&launch=${launchArgs}`,
//     });
// }


export async function setupPage(browser, cookies) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
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
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (contextType) {
            if (contextType === '2d') {
                return {
                    ...getContext.call(this, contextType),
                    fillText: function () { },
                    strokeText: function () { },
                };
            }
            return getContext.call(this, contextType);
        };
    });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    return page;
}

