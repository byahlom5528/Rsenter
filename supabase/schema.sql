-- =========================================================================
-- DATABASE SCHEMA: Role Onboarding Web Application (מערכת כניסה לתפקיד)
-- PostgreSQL / Supabase Schema
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personal_id VARCHAR(7) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_roles JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TASKS TABLE (Sequential Onboarding Tasks)
CREATE TYPE task_type_enum AS ENUM ('simple_check', 'media_question', 'text_question');

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('simple_check', 'media_question', 'text_question')),
    media_url TEXT,
    question_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_role_step UNIQUE (role_id, step_order)
);

-- 4. USER TASK PROGRESS TABLE
CREATE TABLE IF NOT EXISTS user_task_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    answer_text TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_task UNIQUE (user_id, task_id)
);

-- 5. BACKPACK RESOURCES TABLE (Knowledge Library)
CREATE TABLE IF NOT EXISTS backpack_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    file_url TEXT,
    external_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ORG NODES TABLE (Hierarchical Structure Tree)
CREATE TABLE IF NOT EXISTS org_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES org_nodes(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    holder_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    interface_details TEXT NOT NULL,
    role_interfaces JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for high performance queries
CREATE INDEX IF NOT EXISTS idx_users_personal_id ON users(personal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_role_step ON tasks(role_id, step_order);
CREATE INDEX IF NOT EXISTS idx_user_task_progress_user ON user_task_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_org_nodes_parent ON org_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_backpack_category ON backpack_resources(category);

-- Row Level Security (RLS) policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE backpack_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;

-- Allow read/write for demo/application operation
CREATE POLICY "Public full access roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access user_task_progress" ON user_task_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access backpack_resources" ON backpack_resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access org_nodes" ON org_nodes FOR ALL USING (true) WITH CHECK (true);
