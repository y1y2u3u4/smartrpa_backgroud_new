
-- DROP TABLE IF EXISTS task_cookie;
CREATE TABLE task_cookie (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tuiguang_phonenumber VARCHAR(255),
    task_name TEXT,
    cookies TEXT,
    created_at timestamptz
);


DROP TABLE IF EXISTS tasks_waimai;
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




-- psql "postgresql://postgres.hhejytvevukefsbykjrh:kuDIxBBAcevPe8QC@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

-- \i /Users/zhanggongqing/project/smartrpa_backgroud_new/data/change.sql
-- \q