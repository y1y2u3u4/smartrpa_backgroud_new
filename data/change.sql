
-- DROP TABLE IF EXISTS task_cookie;
CREATE TABLE task_cookie (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tuiguang_phonenumber VARCHAR(255),
    task_name TEXT,
    cookies TEXT,
    created_at timestamptz
);


-- DROP TABLE IF EXISTS tasks_waimai;
CREATE TABLE tasks_waimai (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tuiguang_phonenumber VARCHAR(255),
    task_name TEXT,
    task_description TEXT,
    run_output TEXT,
    created_at timestamptz,
    status SMALLINT
);


DROP TABLE IF EXISTS tasks_queue;
CREATE TABLE tasks_queue (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    ads_power_user_id VARCHAR(255),
    tuiguang_phonenumber VARCHAR(255),
    workflow_files TEXT[], -- 存储工作流文件名数组
    status VARCHAR(50), -- 使用文本类型而不是SMALLINT，因为前端使用'pending'等字符串
    created_at timestamptz,
    updated_at timestamptz,
    priority SMALLINT DEFAULT 1,
    metadata JSONB, -- 使用JSONB存储元数据
    task_status TEXT, -- 保留原有字段
    task_progress TEXT -- 保留原有字段
);


-- psql "postgresql://postgres.hhejytvevukefsbykjrh:kuDIxBBAcevPe8QC@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

-- \i /Users/zhanggongqing/project/smartrpa_backgroud_new/data/change.sql
-- \q