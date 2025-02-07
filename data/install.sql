
-- DROP TABLE IF EXISTS note_styles;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(255),
    avatar_url VARCHAR(255),
    created_at timestamptz
);
DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255),
    task_name TEXT,
    task_url TEXT,
    task_cookies TEXT,
    run_code TEXT,
    run_sop TEXT,
    run_output TEXT,
    log_detail TEXT,
    created_at timestamptz,
    status SMALLINT
);

CREATE TABLE sops (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255),
    sop_name TEXT,
    sop_url TEXT,
    sop_lyric TEXT,
    created_at timestamptz,
    status SMALLINT
);

CREATE TABLE codes (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255),
    code_name TEXT,
    code_url TEXT,
    code_lyric TEXT,
    created_at timestamptz,
    status SMALLINT
);

-- DROP TABLE IF EXISTS note_styles;


CREATE TABLE tools (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(255),
    tool_name TEXT,
    tool_url TEXT,
    tool_lyric TEXT,
    created_at timestamptz,
    status SMALLINT
);




CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(255) UNIQUE NOT NULL,
    created_at timestamptz,
    user_email VARCHAR(255) NOT NULL,
    amount INT NOT NULL,
    plan VARCHAR(50),
    expired_at timestamptz,
    order_status SMALLINT NOT NULL,
    paied_at timestamptz,
    checkout_session_id VARCHAR(255),
    credits INT NOT NULL,
    paid_order_id VARCHAR(255) UNIQUE
);



-- psql "postgresql://postgres.hhejytvevukefsbykjrh:LTzFuL10npCShwcv@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

-- \i /Users/zgq/1.project/Doraemon/SmartRPA_background/data/install.sql
-- \q