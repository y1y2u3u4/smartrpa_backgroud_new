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





export const inserttask_cookie = async (tasks) => {
  const db = getDb();
  const res = await db.query(
    `INSERT INTO task_cookie
        (user_email, task_name, cookies, created_at)
        VALUES 
        ($1, $2, $3, $4)
    `,
    [
      tasks.user_email,
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


export const findTaskcookies = async (task_name) => {
  const db = getDb();
  // console.log('user_email', user_email);
  const res = await db.query(
    `SELECT * FROM task_cookie WHERE task_name = $1`,
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
