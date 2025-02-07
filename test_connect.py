"""测试与AdsPower浏览器的连接"""

import asyncio
import logging
from playwright.async_api import async_playwright
import aiohttp

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def main():
    try:
        # 获取浏览器信息
        user_id = 'kn8o287'
        url = f'http://local.adspower.net:50325/api/v1/browser/start?user_id={user_id}'
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                data = await response.json()
                logger.info(f'启动响应: {data}')
                
                if data['code'] == 0 and data['data'].get('ws', {}).get('puppeteer'):
                    ws_url = data['data']['ws']['puppeteer']
                    logger.info(f'获取到WebSocket URL: {ws_url}')
                    
                    try:
                        async with async_playwright() as p:
                            # 使用connect_over_cdp连接到浏览器
                            browser = await p.chromium.connect_over_cdp(ws_url)
                            
                            # 获取默认上下文或创建新的上下文
                            contexts = browser.contexts
                            if contexts:
                                context = contexts[0]
                                logger.info('使用已存在的上下文')
                            else:
                                context = await browser.new_context()
                                logger.info('创建新的上下文')
                            
                            # 创建新页面
                            page = await context.new_page()
                            logger.info('创建新页面成功')
                            
                            # 测试访问网页
                            await page.goto('https://www.baidu.com')
                            logger.info('页面加载成功')
                            
                            # 等待一段时间以便观察
                            await asyncio.sleep(5)
                            
                            # 关闭页面和浏览器
                            await page.close()
                            await browser.close()
                            
                    except Exception as e:
                        logger.error(f'浏览器操作错误: {str(e)}')
                        raise
                else:
                    raise RuntimeError('无法获取浏览器WebSocket URL')
                    
    except Exception as e:
        logger.error(f'发生错误: {str(e)}')
        raise

if __name__ == "__main__":
    asyncio.run(main())
