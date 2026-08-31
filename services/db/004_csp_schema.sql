-- VRishi Academy -- CSP (Community Service Program) schema
-- Run: psql -h localhost -p 5431 -U academy -d academy -f 004_csp_schema.sql

BEGIN;

-- ============================================================
-- CSP INTAKE SUBMISSIONS (from /csp and /csp/intake forms)
-- ============================================================
CREATE TABLE IF NOT EXISTS csp_intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  concern TEXT NOT NULL,
  prior_hypnosis VARCHAR(20) DEFAULT 'none' CHECK (prior_hypnosis IN ('none', 'positive', 'negative', 'neutral')),
  prior_detail TEXT,
  medical_conditions TEXT,
  medications TEXT,
  mental_health TEXT,
  seeing_provider BOOLEAN DEFAULT FALSE,
  provider_name VARCHAR(255),
  goals TEXT,
  consent_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  consent_signature VARCHAR(255),
  consent_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'scheduled', 'active', 'completed', 'declined')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csp_intake_status ON csp_intakes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csp_intake_email ON csp_intakes(email);

-- ============================================================
-- CSP CLIENTS (active client tracker for dashboard)
-- ============================================================
CREATE TABLE IF NOT EXISTS csp_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES csp_intakes(id) ON DELETE SET NULL,
  initials VARCHAR(10) NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', '$35', '$55')),
  concern TEXT,
  referral_source VARCHAR(255),
  sessions_completed INTEGER DEFAULT 0 CHECK (sessions_completed >= 0),
  sessions_planned INTEGER DEFAULT 6 CHECK (sessions_planned >= 1),
  start_date DATE,
  last_session_date DATE,
  next_session_date TIMESTAMP,
  ccr_status VARCHAR(20) DEFAULT 'none' CHECK (ccr_status IN ('none', 'filed', 'due', 'overdue')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'referred')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csp_client_user ON csp_clients(user_id, status);

-- ============================================================
-- CSP CONFERENCES (supervision sessions with HMI faculty)
-- ============================================================
CREATE TABLE IF NOT EXISTS csp_conferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  faculty_name VARCHAR(255) NOT NULL,
  conference_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csp_conf_user ON csp_conferences(user_id, conference_date DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS trg_csp_intake_updated ON csp_intakes;
CREATE TRIGGER trg_csp_intake_updated BEFORE UPDATE ON csp_intakes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_csp_client_updated ON csp_clients;
CREATE TRIGGER trg_csp_client_updated BEFORE UPDATE ON csp_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
