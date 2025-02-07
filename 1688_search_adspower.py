"""
使用AdsPower指纹浏览器搜索1688商品。

@dev 你需要设置OPENAI_API_KEY环境变量，并提供正确的AdsPower user_id。
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio

from langchain_openai import ChatOpenAI

from browser_use import Agent
from browser_use.browser.browser import BrowserConfig

# 配置AdsPower浏览器
browser_config = BrowserConfig(
    adspower_user_id='kn8o287',  # 替换为你的AdsPower user_id
    adspower_api_host='local.adspower.net:50325',  # 根据需要修改API主机地址
)

llm = ChatOpenAI(model='gpt-4')
agent = Agent(
    task='访问1688.com，搜索电脑，按照最佳评分排序，并给出第一个结果的价格',
    llm=llm,
    browser_config=browser_config,
)

async def main():
    await agent.run(max_steps=20)
    agent.create_history_gif()

if __name__ == "__main__":
    asyncio.run(main())
