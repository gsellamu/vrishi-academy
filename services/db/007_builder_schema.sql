-- 007_builder_schema.sql
-- Builder Studio: workspace context files + session history for Claude API integration.
-- Supports the context-aware AI assistant (academy-builder-svc :8606).

-- Workspace files: CLAUDE.md, memory.md, prompts, etc.
CREATE TABLE IF NOT EXISTS builder_workspace_files (
    filename    VARCHAR(255) PRIMARY KEY,
    content     TEXT NOT NULL,
    category    VARCHAR(50) DEFAULT 'context',  -- context | prompt | template
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Builder chat sessions (claude --continue equivalent)
CREATE TABLE IF NOT EXISTS builder_sessions (
    session_id  VARCHAR(255) PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(500),
    messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
    model       VARCHAR(100) DEFAULT 'claude-sonnet-4-6',
    token_count INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Client data files (structured JSON per client)
CREATE TABLE IF NOT EXISTS builder_clients (
    client_id   VARCHAR(50) PRIMARY KEY,
    data        JSONB NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Generated documents registry
CREATE TABLE IF NOT EXISTS builder_documents (
    id          SERIAL PRIMARY KEY,
    client_id   VARCHAR(50) REFERENCES builder_clients(client_id) ON DELETE CASCADE,
    doc_type    VARCHAR(50) NOT NULL,  -- avs | treatment_plan | sb577 | recording_consent
    session_num INTEGER,
    html_key    VARCHAR(500),  -- MinIO object key
    pdf_key     VARCHAR(500),  -- MinIO object key
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_builder_sessions_user ON builder_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_docs_client ON builder_documents(client_id);
