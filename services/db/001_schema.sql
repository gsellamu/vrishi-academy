-- VRishi Academy database schema v1.0
-- Target: academy database (created by academy.ps1 db-init)
-- Run: psql -h localhost -p 5431 -U academy -d academy -f 001_schema.sql
-- Or:  docker exec -i jeethhypno-postgres psql -U academy -d academy < 001_schema.sql

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE suggestibility_mode AS ENUM ('literal', 'inferred', 'blended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  role user_role NOT NULL DEFAULT 'student',
  hmi_student_id VARCHAR(50),
  aha_number VARCHAR(50),
  semester INTEGER DEFAULT 1 CHECK (semester >= 1 AND semester <= 4),
  graduation_target DATE,
  mentor_name VARCHAR(255),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- ============================================================
-- REFRESH TOKENS (JWT refresh rotation)
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE,
  replaced_by UUID REFERENCES refresh_tokens(id)
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id) WHERE NOT revoked;
CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(token_hash);

-- ============================================================
-- DRILL ATTEMPTS (replaces localStorage lab:attempts)
-- ============================================================
CREATE TABLE IF NOT EXISTS drill_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drill_id VARCHAR(50) NOT NULL,
  sequence_id VARCHAR(50),
  preset_id VARCHAR(50),
  mode suggestibility_mode NOT NULL DEFAULT 'inferred',
  minutes_planned INTEGER NOT NULL CHECK (minutes_planned >= 1 AND minutes_planned <= 120),
  duration_s INTEGER NOT NULL CHECK (duration_s >= 0),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  checks JSONB NOT NULL DEFAULT '{}',
  missed JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  ai_debrief TEXT,
  ai_debrief_model VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drill_user_date ON drill_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drill_drill ON drill_attempts(drill_id, user_id);

-- ============================================================
-- SESSION RUNS (studio WS sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  orchestrator_session_id VARCHAR(50),
  profile VARCHAR(20) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  persona VARCHAR(50) NOT NULL,
  ep_type VARCHAR(20),
  vak VARCHAR(20),
  turns_total INTEGER NOT NULL CHECK (turns_total >= 0),
  awaits_total INTEGER NOT NULL CHECK (awaits_total >= 0),
  nods_counted INTEGER DEFAULT 0,
  stages_seen JSONB DEFAULT '[]',
  tonalities_seen JSONB DEFAULT '[]',
  nlp_types_seen JSONB DEFAULT '[]',
  nlp_coverage_pct REAL DEFAULT 0 CHECK (nlp_coverage_pct >= 0 AND nlp_coverage_pct <= 100),
  duration_s INTEGER NOT NULL CHECK (duration_s >= 0),
  enrichment_stats JSONB DEFAULT '{}',
  ai_debrief TEXT,
  ai_debrief_model VARCHAR(50),
  ai_debrief_generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_user_date ON session_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_plan ON session_runs(plan, user_id);

-- ============================================================
-- SESSION TURNS (for replay and detailed grading)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_turns (
  id BIGSERIAL PRIMARY KEY,
  session_run_id UUID NOT NULL REFERENCES session_runs(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  turn_type VARCHAR(20) NOT NULL,
  stage VARCHAR(50),
  name VARCHAR(50),
  text TEXT,
  prosody JSONB,
  nlp JSONB,
  persona_reply TEXT,
  persona_source VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_turns_run ON session_turns(session_run_id, idx);

-- ============================================================
-- GAP PROGRESS (HMI graduation tracker per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS gap_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contacts_done INTEGER DEFAULT 0 CHECK (contacts_done >= 0),
  contacts_need INTEGER DEFAULT 24 CHECK (contacts_need >= 0),
  conferences_done INTEGER DEFAULT 0 CHECK (conferences_done >= 0),
  conferences_need INTEGER DEFAULT 24 CHECK (conferences_need >= 0),
  electives_done REAL DEFAULT 0 CHECK (electives_done >= 0),
  electives_need REAL DEFAULT 135 CHECK (electives_need >= 0),
  workshops_done INTEGER DEFAULT 0 CHECK (workshops_done >= 0),
  workshops_need INTEGER DEFAULT 24 CHECK (workshops_need >= 0),
  hard_stop DATE DEFAULT '2026-12-10',
  notes TEXT,
  ai_pace_advice TEXT,
  ai_pace_model VARCHAR(50),
  ai_pace_generated_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- GAP HISTORY (audit trail for all gap changes)
-- ============================================================
CREATE TABLE IF NOT EXISTS gap_history (
  id BIGSERIAL PRIMARY KEY,
  gap_progress_id UUID NOT NULL REFERENCES gap_progress(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  field_changed VARCHAR(50) NOT NULL,
  old_value VARCHAR(100),
  new_value VARCHAR(100),
  changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gap_hist ON gap_history(gap_progress_id, changed_at DESC);

-- ============================================================
-- USER PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_profile VARCHAR(20) DEFAULT 'p1',
  default_plan VARCHAR(50) DEFAULT 'vocational',
  default_persona VARCHAR(50) DEFAULT 'maya',
  default_mode suggestibility_mode DEFAULT 'inferred',
  show_nlp BOOLEAN DEFAULT TRUE,
  show_prosody BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'dark',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AI COACHING LOGS (every AI interaction stored for traceability)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_coaching_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_type VARCHAR(30) NOT NULL,
  context_id UUID,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model VARCHAR(50) DEFAULT 'gemma3:4b',
  latency_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_coach_user ON ai_coaching_logs(user_id, created_at DESC);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(100),
  detail JSONB,
  ip VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_gap_updated ON gap_progress;
CREATE TRIGGER trg_gap_updated BEFORE UPDATE ON gap_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_prefs_updated ON user_preferences;
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEWS (analytics helpers)
-- ============================================================
CREATE OR REPLACE VIEW v_drill_stats AS
SELECT
  user_id,
  drill_id,
  COUNT(*) AS attempts,
  ROUND(AVG(score)::numeric, 1) AS avg_score,
  MAX(score) AS best_score,
  MIN(score) AS worst_score,
  ROUND(AVG(duration_s)::numeric, 0) AS avg_duration_s,
  MAX(created_at) AS last_attempt
FROM drill_attempts
GROUP BY user_id, drill_id;

CREATE OR REPLACE VIEW v_session_stats AS
SELECT
  user_id,
  plan,
  COUNT(*) AS runs,
  ROUND(AVG(duration_s)::numeric, 0) AS avg_duration_s,
  ROUND(AVG(nlp_coverage_pct)::numeric, 1) AS avg_nlp_coverage,
  ROUND(AVG(nods_counted)::numeric, 1) AS avg_nods,
  MAX(created_at) AS last_run
FROM session_runs
GROUP BY user_id, plan;

CREATE OR REPLACE VIEW v_daily_activity AS
SELECT
  user_id,
  DATE(created_at) AS day,
  COUNT(*) FILTER (WHERE TRUE) AS total_activities,
  COUNT(*) FILTER (WHERE source = 'drill') AS drill_count,
  COUNT(*) FILTER (WHERE source = 'session') AS session_count
FROM (
  SELECT user_id, created_at, 'drill' AS source FROM drill_attempts
  UNION ALL
  SELECT user_id, created_at, 'session' AS source FROM session_runs
) combined
GROUP BY user_id, DATE(created_at);

COMMIT;
