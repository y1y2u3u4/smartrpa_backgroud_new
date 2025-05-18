import puppeteer from 'puppeteer';
import express from 'express';

const app = express();
app.use(express.json());

async function handler(req, res) {
    const url = req.body.url;
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
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/chromium',
        defaultViewport: {
            width: 1300,
            height: 900
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });
    let page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.evaluateOnNewDocument(() => {
        delete navigator.__proto__.webdriver;
        window.navigator.chrome = {
            runtime: {},
        };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
    })
    await page.goto(url);

    console.log('monitorResults_done');
    res.end()
    await browser.close();

}


app.post('/scrape', handler);

const port = parseInt(process.env.PORT) || 8081;
app.listen(port, () => {
    console.log(`SmartRPA: listening on port ${port}`);
});