-- VRishi Academy -- Clinical Case Journal schema
-- Run: cat 006_case_journal_schema.sql | docker exec -i jeethhypno-postgres psql -U academy -d academy

BEGIN;

-- ============================================================
-- CASE JOURNAL ENTRIES (therapist's workbook/journal)
-- ============================================================
CREATE TABLE IF NOT EXISTS case_journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES client_journeys(id) ON DELETE CASCADE,
  entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN (
    'observation', 'reasoning', 'idea', 'research', 'script_note',
    'session_note', 'homework_note', 'feedback', 'supervision',
    'hmi_conference', 'modification', 'contraindication', 'general'
  )),
  session_num INTEGER,
  title VARCHAR(255),
  content TEXT NOT NULL,
  research_refs TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  visibility VARCHAR(20) NOT NULL DEFAULT 'therapist_only'
    CHECK (visibility IN ('therapist_only', 'hmi_visible', 'hipaa_audit')),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CLINICAL REASONING LOG (decisions + rationale)
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_reasoning_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES client_journeys(id) ON DELETE CASCADE,
  session_num INTEGER,
  decision VARCHAR(500) NOT NULL,
  rationale TEXT NOT NULL,
  alternatives_considered TEXT,
  research_support TEXT,
  outcome TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- RESEARCH REFERENCES (global library, reusable across cases)
-- ============================================================
CREATE TABLE IF NOT EXISTS research_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  citation_key VARCHAR(50) NOT NULL UNIQUE,
  authors VARCHAR(500),
  title TEXT NOT NULL,
  journal VARCHAR(255),
  year INTEGER,
  url VARCHAR(500),
  relevance TEXT,
  used_in_cases TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- COMMUNICATION LOG (replaces WhatsApp/text)
-- ============================================================
CREATE TABLE IF NOT EXISTS communication_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES client_journeys(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN (
    'portal', 'email', 'phone', 'zoom', 'in_person', 'text', 'other'
  )),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  summary TEXT NOT NULL,
  full_content TEXT,
  attachment_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- CONSENT RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES client_journeys(id) ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL CHECK (document_type IN (
    'sb577_disclosure', 'acknowledgment_of_services', 'parental_consent',
    'insurance_verification', 'recording_consent', 'hipaa_notice',
    'pro_bono_agreement', 'other'
  )),
  signed_date DATE,
  document_path VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_journal_entries_updated') THEN
    CREATE TRIGGER trg_journal_entries_updated BEFORE UPDATE ON case_journal_entries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reasoning_log_updated') THEN
    CREATE TRIGGER trg_reasoning_log_updated BEFORE UPDATE ON clinical_reasoning_log
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- INDEXES for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_journal_journey ON case_journal_entries(journey_id);
CREATE INDEX IF NOT EXISTS idx_journal_type ON case_journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_session ON case_journal_entries(session_num);
CREATE INDEX IF NOT EXISTS idx_reasoning_journey ON clinical_reasoning_log(journey_id);
CREATE INDEX IF NOT EXISTS idx_comms_journey ON communication_log(journey_id);
CREATE INDEX IF NOT EXISTS idx_consent_journey ON consent_records(journey_id);

COMMIT;
