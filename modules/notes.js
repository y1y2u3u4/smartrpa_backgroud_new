import { getDb, getDb_test } from "./db.js";

export const insertNote = async (notes) => {
  const db = getDb();
  const res = await db.query(
    `INSERT INTO notes 
        (user_email, description, note_name, note_url,note_lyric, created_at, status,keyword,styles)
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7,$8,$9)
    `,
    [
      notes.user_email,
      notes.description || '',
      notes.note_name || '',
      notes.note_url || '',
      notes.note_lyric || '',
      notes.created_at,
      `${notes.status || '0'}`,
      notes.keyword || '',
      notes.styles || '',
    ]
  );

  const isSuccess = res && res.rowCount && res.rowCount > 0;
  if (isSuccess) {
    console.log('Insert successful');
  } else {
    console.log('Insert failed');
  }

  return isSuccess;

  // return res;
}

export const inserttask_waimai = async (tasks) => {
  const db = getDb();
  const res = await db.query(
    `INSERT INTO tasks_waimai
        (user_id, tuiguang_phonenumber,task_name,task_description,run_output, created_at, status)
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      tasks.user_id,
      tasks.tuiguang_phonenumber,
      tasks.task_name || '',
      tasks.task_description || '',
      tasks.run_output || '',
      tasks.created_at,
      `${tasks.status || '0'}`,
    ]
  );

  const isSuccess = res && res.rowCount && res.rowCount > 0;
  if (isSuccess) {
    console.log('Insert successful');
  } else {
    console.log('Insert failed');
  }

  return isSuccess;

  // return res;
}



export const inserttask = async (tasks) => {
  const db = getDb();
  const res = await db.query(
    `INSERT INTO tasks
        (user_email, description, type,task_name, task_url,task_cookies, run_code,run_sop,run_output,log_detail, created_at, status)
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7,$8,$9,$10,$11,$12)
    `,
    [
      tasks.user_email,
      tasks.description || '',
      tasks.type || '',
      tasks.task_name || '',
      tasks.task_url || '',
      tasks.task_cookies || '',
      tasks.run_code || '',
      tasks.run_sop || '',
      tasks.run_output || '',
      tasks.log_detail || '',
      tasks.created_at,
      `${tasks.status || '0'}`,
    ]
  );

  const isSuccess = res && res.rowCount && res.rowCount > 0;
  if (isSuccess) {
    console.log('Insert successful');
  } else {
    console.log('Insert failed');
  }

  return isSuccess;

  // return res;
}


export const updatetask_status = async (user_id, task_status) => {
  const db = getDb();
  const res = await db.query(
    `UPDATE tasks_queue
     SET task_status = $2
     WHERE user_id = $1
    `,
    [
      user_id,
      `${task_status || '0'}`,
    ]
  );

  const isSuccess = res && res.rowCount && res.rowCount > 0;
  if (isSuccess) {
    console.log('更新成功');
  } else {
    console.log('更新失败，可能没有找到对应的记录');
  }

  return isSuccess;
}





export const inserttask_cookie = async (tasks) => {
  const db = getDb();
  const res = await db.query(
    `INSERT INTO task_cookie
        (user_id, tuiguang_phonenumber, task_name, cookies, created_at)
        VALUES 
        ($1, $2, $3, $4, $5)
    `,
    [
      tasks.user_id,
      tasks.tuiguang_phonenumber,
      tasks.task_name || '',
      tasks.cookies || '',
      tasks.created_at,
    ]
  );

  const isSuccess = res && res.rowCount && res.rowCount > 0;
  if (isSuccess) {
    console.log('Insert successful');
  } else {
    console.log('Insert failed');
  }

  return isSuccess;

  // return res;
}



export const inserttask_runcode = async (tasks) => {
  const db = getDb();
  const res = await db.query(
    `INSERT INTO task_runcode
        (user_email,task_name, run_code,run_sop, created_at, status)
        VALUES 
        ($1, $2, $3, $4, $5, $6)
    `,
    [
      tasks.user_email,
      tasks.task_name || '',
      tasks.run_code || '',
      tasks.run_sop || '',
      tasks.created_at,
      `${tasks.status || '0'}`,
    ]
  );

  const isSuccess = res && res.rowCount && res.rowCount > 0;
  if (isSuccess) {
    console.log('Insert successful');
  } else {
    console.log('Insert failed');
  }

  return isSuccess;

  // return res;
}





export const findNoteList = async () => {
  const db = getDb();
  // console.log('user_email', user_email);
  const res = await db.query(
    `SELECT * FROM notes WHERE user_email = $1`,
    [user_email]
  );

  // const res = await db.query(
  //   `SELECT * FROM notes WHERE user_email='512218557@qq.com'`,
  // );

  if (res.rowCount === 0) {
    return [];
  }
  // console.log('res', res);
  return res.rows;
  }

export const findTaskList = async (task_name) => {
  const db = getDb();
  // console.log('user_email', user_email);
  const res = await db.query(
    `SELECT * FROM tasks WHERE task_name = $1 AND run_code IS NOT NULL AND run_sop IS NOT NULL`,
    [task_name]
  );

  // const res = await db.query(
  //   `SELECT * FROM notes WHERE user_email='512218557@qq.com'`,
  // );

  if (res.rowCount === 0) {
    return [];
  }
  // console.log('res', res);
  return res.rows;
}


export const findTaskcookies = async (task_name, user_id) => {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError;

  while (retryCount < maxRetries) {
    try {
      let db;
      try {
        db = getDb();
      } catch (err) {
        console.error('获取数据库连接失败，重试中...', err.message);
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        continue;
      }
      
      console.log(`尝试查询 task_cookie (第${retryCount + 1}次): ${task_name}, ${user_id}`);
      const res = await db.query(
        `SELECT * FROM task_cookie WHERE task_name = $1 AND user_id = $2`,
        [task_name, user_id]
      );

      console.log(`查询成功: 找到 ${res.rowCount} 条记录`);
      if (res.rowCount === 0) {
        return [];
      }
      return res.rows;
    } catch (err) {
      lastError = err;
      console.error(`数据库查询失败 (第${retryCount + 1}次): ${err.message}`);
      retryCount++;
      // 指数退避策略，每次重试等待时间增加
      await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
    }
  }

  console.error(`达到最大重试次数 (${maxRetries})，无法完成查询: ${lastError.message}`);
  throw new Error(`数据库连接失败，请稍后再试: ${lastError.message}`);
}

export const findTaskCategoryNames = async (task_name, user_id, task_description) => {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError;

  while (retryCount < maxRetries) {
    try {
      let db;
      try {
        db = getDb();
      } catch (err) {
        console.error('获取数据库连接失败，重试中...', err.message);
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        continue;
      }
      
      console.log(`尝试查询商品分类和商品数据 (第${retryCount + 1}次): ${task_name}, ${user_id}, ${task_description}`);
      const res = await db.query(
        `SELECT run_output FROM tasks_waimai WHERE task_name = $1 AND user_id = $2 AND task_description = $3 ORDER BY id DESC LIMIT 1`,
        [task_name, user_id, task_description]
      );

      console.log(`查询成功: 找到 ${res.rowCount} 条记录`);
      if (res.rowCount === 0) {
        // 默认返回值
        return {
          categoryNames: [['热销推荐', '主食', '小吃', '饮品']], 
          products: [], 
          allData: null
        };
      }
      
      try {
        // 解析 run_output 中的 JSON 数据
        const runOutput = JSON.parse(res.rows[0].run_output);
        console.log('解析run_output成功');
        
        // 初始化返回对象
        const result = {
          categoryNames: [], 
          products: [], 
          allData: runOutput 
        };
        
        // 提取分类数据
        if (runOutput && runOutput.categories && Array.isArray(runOutput.categories)) {
          console.log(`找到分类数据: ${runOutput.categories.length} 个分类`);
          
          // 获取所有分类名称
          const categoryNames = runOutput.categories.map(category => category.name);
          console.log(`提取的分类名称: ${JSON.stringify(categoryNames)}`);
          
          // 将分类名称保存到结果中
          result.categoryNames = [categoryNames];
        } else {
          console.log('未在run_output中找到有效的categories字段，使用默认分类');
          result.categoryNames = [['热销推荐', '主食', '小吃', '饮品']];
        }
        
        // 提取商品数据
        if (runOutput && runOutput.products && Array.isArray(runOutput.products)) {
          console.log(`找到商品数据: ${runOutput.products.length} 个商品`);
          
          // 将全部商品数据保存到结果中
          result.products = runOutput.products;
          
          // 打印前几个商品的信息作为示例
          const sampleProducts = runOutput.products.slice(0, 3);
          console.log(`商品示例: ${JSON.stringify(sampleProducts)}`);
        } else {
          console.log('未在run_output中找到有效的products字段');
        }
        
        // 返回完整的结果对象
        return result;
        
      } catch (parseErr) {
        console.error('解析run_output失败:', parseErr.message);
        return {
          categoryNames: [['热销推荐', '主食', '小吃', '饮品']], 
          products: [], 
          allData: null
        };
      }
    } catch (err) {
      lastError = err;
      console.error(`数据库查询失败 (第${retryCount + 1}次): ${err.message}`);
      retryCount++;
      // 指数退避策略，每次重试等待时间增加
      await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
    }
  }

  console.error(`达到最大重试次数 (${maxRetries})，无法完成查询: ${lastError?.message || '未知错误'}`);
  console.log('使用默认分类');
  return {
    categoryNames: [['热销推荐', '主食', '小吃', '饮品']], 
    products: [], 
    allData: null
  };
}

export const findTaskinfo = async (task_name, user_id, task_description) => {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError;

  while (retryCount < maxRetries) {
    try {
      let db;
      try {
        db = getDb();
      } catch (err) {
        console.error('获取数据库连接失败，重试中...', err.message);
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        continue;
      }
      
      console.log(`尝试查询店铺位置信息 (第${retryCount + 1}次): ${task_name}, ${user_id}, ${task_description}`);
      const res = await db.query(
        `SELECT run_output FROM tasks_waimai WHERE task_name = $1 AND user_id = $2 AND task_description = $3 ORDER BY id DESC LIMIT 1`,
        [task_name, user_id, task_description]
      );

      console.log(`查询成功: 找到 ${res.rowCount} 条记录`);
      if (res.rowCount === 0) {
        console.log('未找到记录，返回空地址');
        return '暂无地址信息';
      }
      
      try {
        // 解析 run_output 中的 JSON 数据
        const runOutput = JSON.parse(res.rows[0].run_output);
        console.log('解析run_output成功');
        
        // 提取店铺位置信息
        if (runOutput && runOutput.storeInfo && runOutput.storeInfo.address) {
          const address = runOutput.storeInfo.address;
          console.log(`找到店铺位置信息: ${address}`);
          return address;
        } else {
          console.log('未在run_output中找到有效的店铺地址信息');
          return '暂无地址信息';
        }
      } catch (parseErr) {
        console.error('解析run_output失败:', parseErr.message);
        return '解析错误，无法获取地址信息';
      }
    } catch (err) {
      lastError = err;
      console.error(`数据库查询失败 (第${retryCount + 1}次): ${err.message}`);
      retryCount++;
      // 指数退避策略，每次重试等待时间增加
      await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
    }
  }

  console.error(`达到最大重试次数 (${maxRetries})，无法完成查询: ${lastError?.message || '未知错误'}`);
  console.log('查询失败，返回空地址信息');
  return '查询失败，无法获取地址信息';
}


export const findTaskDetail = async (task_name, user_id, task_description) => {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError;

  while (retryCount < maxRetries) {
    try {
      let db;
      try {
        db = getDb();
      } catch (err) {
        console.error('获取数据库连接失败，重试中...', err.message);
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        continue;
      }
      
      console.log(`尝试查询商品分类数据 (第${retryCount + 1}次): ${task_name}, ${user_id}, ${task_description}`);
      const res = await db.query(
        `SELECT run_output FROM tasks_waimai WHERE task_name = $1 AND user_id = $2 AND task_description = $3 ORDER BY id DESC LIMIT 1`,
        [task_name, user_id, task_description]
      );

      console.log(`查询成功: 找到 ${res.rowCount} 条记录`);
      if (res.rowCount === 0) {
        return [['热销推荐', '主食', '小吃', '饮品']]; // 默认分类，如果没有找到记录
      }
      
      try {
        // 解析 run_output 中的 JSON 数据
        const runOutput = JSON.parse(res.rows[0].run_output);
        console.log('解析run_output成功');
        
        // 直接获取完整的parsedExcelData
        if (runOutput && runOutput.parsedExcelData && Array.isArray(runOutput.parsedExcelData)) {
          console.log(`找到商品数据，共 ${runOutput.parsedExcelData.length} 条记录`);
          
          // 直接返回完整的parsedExcelData
          return runOutput.parsedExcelData;
        } else {
          console.log('未在run_output中找到有效的parsedExcelData字段，使用默认值');
          return []; // 返回空数组，表示没有数据
        }
      } catch (parseErr) {
        console.error('解析run_output失败:', parseErr.message);
        return []; // 返回空数组，保持返回格式一致
      }
    } catch (err) {
      lastError = err;
      console.error(`数据库查询失败 (第${retryCount + 1}次): ${err.message}`);
      retryCount++;
      // 指数退避策略，每次重试等待时间增加
      await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
    }
  }

  console.error(`达到最大重试次数 (${maxRetries})，无法完成查询: ${lastError.message}`);
  console.log('使用默认分类');
  return [];
}


export const findTaskruncode = async (task_name) => {
  const db = getDb();
  // console.log('user_email', user_email);
  const res = await db.query(
    `SELECT * FROM task_runcode WHERE task_name = $1 AND run_code IS NOT NULL AND run_sop IS NOT NULL`,
    [task_name]
  );

  // const res = await db.query(
  //   `SELECT * FROM notes WHERE user_email='512218557@qq.com'`,
  // );

  if (res.rowCount === 0) {
    return [];
  }
  // console.log('res', res);
  return res.rows;
}




export const findTaskList_email = async (user_email) => {
  const db = getDb();
  // console.log('user_email', user_email);
  const res = await db.query(
    `SELECT * FROM tasks WHERE user_email = $1`,
    [user_email]
  );

  // const res = await db.query(
  //   `SELECT * FROM notes WHERE user_email='512218557@qq.com'`,
  // );

  if (res.rowCount === 0) {
    return [];
  }
  // console.log('res', res);
  return res.rows;
}



export const findTaskList_taskname = async (task_name) => {
  const db = getDb();
  await db.query('SET statement_timeout = 300000');
  const res = await db.query(
    `SELECT * FROM tasks WHERE task_name = $1`,
    [task_name]
  );
  

  // const res = await db.query(
  //   `SELECT * FROM notes WHERE user_email='512218557@qq.com'`,
  // );

  if (res.rowCount === 0) {
    return [];
  }
  // console.log('res', res);
  return res.rows;
}


export const findTaskList_taskname_llm = async (task_name) => {
  const db = getDb();
  await db.query('SET statement_timeout = 300000');
  const res = await db.query(
    `SELECT * FROM tasks_llm WHERE taskname = $1`,
    [task_name]
  );
  

  // const res = await db.query(
  //   `SELECT * FROM notes WHERE user_email='512218557@qq.com'`,
  // );

  if (res.rowCount === 0) {
    return [];
  }
  // console.log('res', res);
  return res.rows;
}





export const findTaskList_taskname_test_shop_name = async (task_name) => {
  const db = getDb_test();
  await db.query('SET statement_timeout = 300000');
  const res = await db.query(
    `SELECT * FROM ozon_analytics WHERE shop_name = $1`,
    [task_name]
  );

  // const res = await db.query(
  //   `SELECT * FROM notes WHERE user_email='512218557@qq.com'`,
  // );

  if (res.rowCount === 0) {
    return [];
  }
  // console.log('res', res);
  return res.rows;
}


export const findTaskList_taskname_test = async () => {
  const db = getDb_test();
  await db.query('SET statement_timeout = 300000');
  const res = await db.query(
    `SELECT * FROM ozon_analytics`,
  );

  // const res = await db.query(
  //   `SELECT * FROM notes WHERE user_email='512218557@qq.com'`,
  // );

  if (res.rowCount === 0) {
    return [];
  }
  // console.log('res', res);
  return res.rows;
}



export const findTaskList_taskname_limit = async (task_name, offset = 0, limit = 100) => {
  const db = getDb();
  await db.query('SET statement_timeout = 500000');
  const res = await db.query(
    `SELECT * FROM tasks WHERE task_name = $1 
    AND created_at >= '2024-11-11 00:00:00'
    LIMIT $2 OFFSET $3`,
    [task_name, limit, offset]
  );

  if (res.rowCount === 0) {
    return [];
  }
  return res.rows;

}


export const findTaskList_taskname_limit_llm = async (task_name, offset = 0, limit = 100) => {
  const db = getDb();
  await db.query('SET statement_timeout = 500000');
  const res = await db.query(
    `SELECT * FROM tasks_llm WHERE taskname = $1 
    AND created_at >= '2024-11-11 00:00:00'
    LIMIT $2 OFFSET $3`,
    [task_name, limit, offset]
  );

  if (res.rowCount === 0) {
    return [];
  }
  return res.rows;

}




export const getMusicCount = async () => {
  const db = getDb();
  const res = await db.query(`SELECT count(1) as count FROM music`);
  if (res.rowCount === 0) {
    return 0;
  }

const { rows } = res;
const row = rows[0];

return row.count;
}

export const getUserMusicCount = async ()=>{
  const db = getDb();
  const res = await db.query(
    `SELECT count(1) as count FROM music WHERE user_email = $1`,
    [user_email]
  );

  if (res.rowCount === 0) {
    return 0;
  }

  const { rows } = res;
  const row = rows[0];

  return row.count;
}
