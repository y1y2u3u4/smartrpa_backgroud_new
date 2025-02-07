import requests
from bs4 import BeautifulSoup
import json
import pandas as pd
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def get_brand_info(url):
    # 设置请求头，模拟浏览器访问
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # 发送GET请求
        response = requests.get(url, headers=headers, timeout=10)
        response.encoding = 'utf-8'  # 设置编码
        
        # 检查请求是否成功
        if response.status_code == 200:
            # 使用BeautifulSoup解析HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 找到所有品牌信息区块
            brand_blocks = soup.find_all('div', class_='lstPhotob')
            
            brands_data = []
            
            for block in brand_blocks:
                brand_info = {}
                
                # 获取品牌名称
                brand_name_div = block.find('div', class_='conLogo')
                if brand_name_div:
                    brand_info['brand_name'] = brand_name_div.text.strip()
                
                # 获取品牌标题
                title_div = block.find('div', class_='titH3')
                if title_div:
                    brand_info['title'] = title_div.text.strip()
                
                # 获取品牌链接
                brand_link = block.find('a', href=True)
                if brand_link:
                    brand_info['brand_url'] = brand_link['href']
                
                # 获取企业信息
                company_info = block.find('li', {'class': None})
                if company_info:
                    company_name = company_info.find('span', class_='sp-b')
                    if company_name:
                        brand_info['company'] = company_name.text.strip()
                
                # 获取品牌简介
                intro = block.find('li', class_='liH01')
                if intro:
                    intro_text = intro.find('span', class_='sp-b')
                    if intro_text:
                        brand_info['introduction'] = intro_text.text.strip()
                
                # 获取联系信息
                contact_info = block.find('div', class_='txtCon')
                if contact_info:
                    contact_text = contact_info.text.strip()
                    # 拆分地区和联系方式
                    location = ""
                    phone = ""
                    if "所在地区：" in contact_text:
                        location = contact_text.split("所在地区：")[1].split("联系电话：")[0].strip()
                    if "联系电话：" in contact_text:
                        phone = contact_text.split("联系电话：")[1].strip()
                    
                    brand_info['location'] = location
                    brand_info['phone'] = phone
                
                brands_data.append(brand_info)
            
            return brands_data
            
        else:
            print(f"请求失败，状态码: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"发生错误: {str(e)}")
        return None

def save_to_csv(data, csv_path):
    """保存数据到CSV文件"""
    df = pd.DataFrame(data)
    
    if os.path.exists(csv_path):
        # 如果文件已存在，追加数据
        df.to_csv(csv_path, mode='a', header=False, index=False, encoding='utf-8-sig')
    else:
        # 如果文件不存在，创建新文件
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')

def process_page(page_num, output_path, batch_data):
    """处理单个页面的数据"""
    url = f"http://brand.efu.com.cn/list-0-0-0-0-0-0-{page_num}.html"
    print(f"正在处理第 {page_num} 页")
    
    try:
        brands = get_brand_info(url)
        if brands:
            batch_data.extend(brands)
            print(f"第 {page_num} 页处理完成")
            return True
    except Exception as e:
        print(f"处理第 {page_num} 页时发生错误: {str(e)}")
    
    return False

def main():
    # 创建输出目录
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output')
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, 'brand_data.csv')
    
    # 设置并发数
    max_workers = 5  # 可以根据需要调整并发数
    batch_size = 10  # 每10页保存一次
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        batch_data = []
        futures = []
        
        # 提交所有任务
        for page in range(1, 901):
            future = executor.submit(process_page, page, output_path, batch_data)
            futures.append(future)
            
            # 每处理batch_size个页面，保存一次数据
            if len(futures) >= batch_size:
                # 等待当前批次完成
                for f in futures:
                    f.result()
                
                # 保存数据
                if batch_data:
                    save_to_csv(batch_data, output_path)
                    print(f"已保存{len(batch_data)}条数据到CSV文件")
                    batch_data = []  # 清空批次数据
                
                futures = []  # 清空futures列表
                time.sleep(1)  # 短暂暂停，避免请求过快
        
        # 处理剩余的页面
        if futures:
            for f in futures:
                f.result()
            
            if batch_data:
                save_to_csv(batch_data, output_path)
                print(f"已保存最后{len(batch_data)}条数据到CSV文件")

if __name__ == "__main__":
    main()