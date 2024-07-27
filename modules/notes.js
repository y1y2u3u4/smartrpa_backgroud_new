import { getDb } from "./db.js";

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
