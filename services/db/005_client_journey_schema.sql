-- VRishi Academy -- Client Journey schema
-- Run: psql -h localhost -p 5431 -U academy -d academy -f 005_client_journey_schema.sql

BEGIN;

-- ============================================================
-- CLIENT JOURNEYS (one row per client)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id UUID,  -- FK to users table when auth is wired
  client_code VARCHAR(20) NOT NULL,  -- e.g. DS-001 (initials + number)
  initials VARCHAR(10) NOT NULL,
  full_name VARCHAR(255) NOT NULL,  -- stored encrypted at rest
  age INTEGER,
  occupation VARCHAR(255),
  ep_type VARCHAR(50),  -- e.g. "76% Physical"
  vak VARCHAR(50),  -- e.g. "Kinesthetic"
  presenting_issue TEXT NOT NULL,
  case_ref VARCHAR(20),  -- e.g. SLEEP-004
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'scheduled', 'completed', 'paused', 'graduated', 'referred', 'discharged')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_sessions INTEGER DEFAULT 6,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CLIENT SESSIONS (one row per session visit)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES client_journeys(id) ON DELETE CASCADE,
  session_num INTEGER NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  duration_min INTEGER DEFAULT 60,
  -- Techniques and clinical content
  techniques TEXT,
  -- SOAP notes
  soap_subjective TEXT,
  soap_objective TEXT,
  soap_assessment TEXT,
  soap_plan TEXT,
  -- Metrics
  sleep_score INTEGER CHECK (sleep_score BETWEEN 1 AND 10),
  deep_sleep_pct NUMERIC(5,2),
  light_sleep_pct NUMERIC(5,2),
  rem_pct NUMERIC(5,2),
  sleep_onset_min INTEGER,
  resting_hr INTEGER,
  depth_score VARCHAR(20),  -- Bad/Poor/Fair/Good/Excellent
  regularity_score VARCHAR(20),
  -- Client feedback
  client_feedback TEXT,
  dream_journal TEXT,
  -- Homework compliance (stored as JSON array of completed items)
  homework_done JSONB DEFAULT '[]'::jsonb,
  -- Next session plan
  next_plan TEXT,
  -- AVS document reference (MinIO path)
  avs_document_path VARCHAR(500),
  -- Recording reference (MinIO path)
  recording_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(journey_id, session_num)
);

-- ============================================================
-- CLIENT GOALS (SMART goals per client)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES client_journeys(id) ON DELETE CASCADE,
  metric VARCHAR(100) NOT NULL,  -- e.g. "Deep sleep %"
  baseline_value VARCHAR(50),  -- e.g. "~0%"
  target_value VARCHAR(50),  -- e.g. "18-23%"
  current_value VARCHAR(50),
  target_date DATE,
  status VARCHAR(20) DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'achieved', 'missed', 'revised')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_client_journeys_updated') THEN
    CREATE TRIGGER trg_client_journeys_updated BEFORE UPDATE ON client_journeys
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_client_sessions_updated') THEN
    CREATE TRIGGER trg_client_sessions_updated BEFORE UPDATE ON client_sessions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_client_goals_updated') THEN
    CREATE TRIGGER trg_client_goals_updated BEFORE UPDATE ON client_goals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;
