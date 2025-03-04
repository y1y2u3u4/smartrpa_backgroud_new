import pkg from 'pg';
const { Pool } = pkg;

let globalPool;
export const getDb = () => {
  if (!globalPool) {
    const POSTGRES_URL = "postgresql://postgres.hhejytvevukefsbykjrh:kuDIxBBAcevPe8QC@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
        
    // globalPool = new Pool({ connectionString: process.env.POSTGRES_URL });
    globalPool = new Pool({ 
      connectionString: POSTGRES_URL,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000, // 连接最大空闲时间
      connectionTimeoutMillis: 10000, // 连接超时
      ssl: { rejectUnauthorized: false } // 允许自签名证书
    });
    console.log('Create new pool', POSTGRES_URL);
    globalPool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      // 尝试在错误后重新创建连接池
      globalPool = null;
    });
  }

  return globalPool;
}



export const getDb_test = () => {
  if (!globalPool) {
    const POSTGRES_URL = "postgres://postgres.ienodkjngoywicwsoixg:7Lq9FHIAert45th5@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
    // globalPool = new Pool({ connectionString: process.env.POSTGRES_URL });
    globalPool = new Pool({ 
      connectionString: POSTGRES_URL,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000, // 连接最大空闲时间
      connectionTimeoutMillis: 10000, // 连接超时
      ssl: { rejectUnauthorized: false } // 允许自签名证书
    });
    console.log('Create new pool', POSTGRES_URL);
    globalPool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      globalPool = null;
    });
  }

  return globalPool;
}
