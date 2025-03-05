// test_login.js
// 测试自定义登录成功选择器功能

import fetch from 'node-fetch';
import fs from 'fs/promises';

// 测试参数
const testloginCases = [
  {
    name: '美团外卖商家登录',
    data: {
      url: 'https://waimaie.meituan.com/',
      task_name: 'waimai_meituan',
      user_id: '123456',
      tuiguang_phonenumber: '1234567890',
      successSelectors: [
        '.menu-container_1_lOTR', 
        '.txt_2Yyf3g',
        '.menu-container_1_lOTR .txt_2Yyf3g'
      ]
    }
  },
  {
    name: '京东外卖商家登录',
    data: {
      url: 'https://store.jddj.com/',
      task_name: 'waimai_jingdong',
      user_id: 'f7e2ab3b-de08-41ee-82ad-d23d1a337936',
      tuiguang_phonenumber: '1234567890',
      successSelectors: [
        '.menu-container_1_lOTR', 
        '.txt_2Yyf3g',
        '.menu-container_1_lOTR .txt_2Yyf3g',
        '.dj-dropdown-group',
        '.dj-button-content',
        '.dj-dropdown-inner .dj-button--text',
        '.dj-dropdown-group .dj-button-content'
      ]
    }
  },
];


// 任务测试用例结构 - 不包含具体事件数据
const testrunCases = [
  {
    name: '美团外卖自动化任务',
    data: {
      // sortedData将从test.json动态加载
      sortedData: [],
      // 提供数据行
      row: {
        "cityname": "上海",
        "storename": "测试店铺",
        "product": "测试产品"
      },
      // 任务名称
      user_id: '用户-i6rdm9',
      tuiguang_phonenumber: '1234567890',
      task_name: 'waimai_meituan',
      adsPowerUserId: 'knibk1h',
      BASE_URL: 'https://waimaie.meituan.com/',
    }
  },
  {
    name: '京东外卖自动化任务',
    data: {
      // sortedData将从test.json动态加载
      sortedData: [],
      // 提供数据行
      row: {
        "cityname": "上海",
        "storename": "测试店铺",
        "product": "测试产品"
      },
      // 任务名称
      user_id: 'f7e2ab3b-de08-41ee-82ad-d23d1a337936',
      tuiguang_phonenumber: '1234567890',
      task_name: 'waimai_jingdong'
    }
  },
];

// 从test.json加载事件数据
async function loadTestCase() {
  try {
    // 从test.json加载事件数据
    const testData = await fs.readFile('./test_meituan.json', 'utf-8');
    const events = JSON.parse(testData);
    
    if (Array.isArray(events) && events.length > 0) {
      // 更新测试用例的事件数据
      testrunCases[0].data.sortedData = events;
      console.log(`成功从test.json加载了${events.length}个测试事件`);
    } else {
      console.warn('test.json文件中没有找到有效的事件数据');
    }
  } catch (error) {
    console.error('加载test.json失败:', error.message);
    console.log('将使用默认的测试数据');
    
  }
}

// 测试函数
async function testLogin(testCase) {
  console.log(`正在测试: ${testCase.name}`);
  
  try {
    const response = await fetch('http://localhost:8082/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.data)
    });
    
    const result = await response.json();
    console.log(`测试结果: ${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    console.error(`测试失败: ${error.message}`);
  }
}


async function testrun(testCase) {
  console.log(`正在测试: ${testCase.name}`);
  console.log(`测试数据: ${JSON.stringify(testCase.data, null, 2)}`);
  
  try {
    const response = await fetch('http://localhost:8082/scrape_base', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.data)
    });
    
    const result = await response.json();
    console.log(`测试结果: ${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    console.error(`测试失败: ${error.message}`);
  }
}

// 运行测试
async function runTests() {
  // 加载测试数据
  await loadTestCase();
  
  // // 登录测试
  // await testLogin(testloginCases[1]);
  
  // 任务执行测试
  await testrun(testrunCases[0]);
}

// 执行测试
runTests().catch(console.error);

console.log('测试文件已准备好。请修改测试参数后运行此文件测试登录和自动化功能。');
console.log('使用方法: node test_login.js');
