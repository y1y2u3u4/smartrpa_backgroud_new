
// import puppeteer from 'puppeteer-core';
// import express from 'express';
import puppeteer from 'puppeteer';
import express from 'express';


const app = express();
app.use(express.json());

// const chromiumExecutablePath = argv['chromium-executable-path'] || process.env.SCREENSHOTER_CHROMIUM_EXECUTABLE_PATH || null;
async function handler(req, res) {
    const url = req.body.url;
    console.log(`Received request to scrape: ${url}`);
    // const browser = await puppeteer.launch({
    //     headless: false,
    //     defaultViewport: {
    //         width: 1300,
    //         height: 900
    //     },
    //     args: [
    //         '--no-sandbox',
    //         '--disable-setuid-sandbox',
    //         '--disable-blink-features=AutomationControlled'
    //     ]
    // });
    // const browser = await puppeteer.launch({
    //     headless: true,
    //     executablePath: '/usr/bin/google-chrome',
    //     defaultViewport: {
    //         width: 1300,
    //         height: 900
    //     },
    //     args: [
    //         '--no-sandbox',
    //         '--disable-setuid-sandbox',
    //         '--disable-blink-features=AutomationControlled'
    //     ]
    // });
    console.log('DISPLAY environment variable:', process.env.DISPLAY);
    console.log('Launching browser...');
    const proxyServer = 'http://u11098.5.tn.16yun.cn:6441';

    const username = '16MJEZQP';
    const password = '245559';

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/chromium',
        // executablePath: '/usr/bin/google-chrome',
        defaultViewport: {
            width: 1300,
            height: 900
        },
        args: [
            '--proxy-server=' + proxyServer + '',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1280,800',
            '--start-maximized',
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });
    console.log('Browser launched, opening new page...');
    let page = await browser.newPage();
    await page.authenticate({ username, password });
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
    });
    await page.setViewport({ width: 1280, height: 720 });
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
    console.log('Setting user agent...');
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
    })
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.mouse.move(100, 100);
    await page.keyboard.press('Enter');
    console.log('monitorResults_done');
    res.end()
    // await browser.close();

}


app.post('/scrape', handler);

// const port = parseInt(process.env.PORT) || 8081;
const port = 8082;
app.listen(port, () => {
    console.log(`SmartRPA: listening on port ${port}`);
});