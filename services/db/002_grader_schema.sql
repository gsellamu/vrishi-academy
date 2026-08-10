-- VRishi Academy grader schema v1.0
-- Run after 001_schema.sql
-- psql -h localhost -p 5431 -U academy -d academy -f 002_grader_schema.sql

BEGIN;

-- ============================================================
-- RUBRICS (grading templates)
-- ============================================================
CREATE TABLE IF NOT EXISTS rubrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('drill', 'session')),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- RUBRIC DIMENSIONS (criteria within a rubric)
-- ============================================================
CREATE TABLE IF NOT EXISTS rubric_dimensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  criteria TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  max_score INTEGER NOT NULL DEFAULT 100 CHECK (max_score > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (rubric_id, name)
);
CREATE INDEX IF NOT EXISTS idx_dim_rubric ON rubric_dimensions(rubric_id, sort_order);

-- ============================================================
-- GRADES (grading results)
-- ============================================================
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE RESTRICT,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('drill', 'session')),
  target_id UUID NOT NULL,
  overall_score REAL NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  narrative TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_model VARCHAR(50),
  ai_latency_ms INTEGER,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grade_user ON grades(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grade_target ON grades(target_type, target_id);

-- ============================================================
-- GRADE DIMENSIONS (per-dimension scores within a grade)
-- ============================================================
CREATE TABLE IF NOT EXISTS grade_dimensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES rubric_dimensions(id) ON DELETE CASCADE,
  score REAL NOT NULL CHECK (score >= 0),
  justification TEXT,
  UNIQUE (grade_id, dimension_id)
);
CREATE INDEX IF NOT EXISTS idx_gdim_grade ON grade_dimensions(grade_id);

-- ============================================================
-- SEED: default rubrics + dimensions
-- ============================================================

-- Drill rubric: technique, safety, flow, timing
INSERT INTO rubrics (id, name, description, target_type) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'drill_standard',
   'Standard drill grading: technique accuracy, clinical safety, flow, and timing.',
   'drill')
ON CONFLICT (name) DO NOTHING;

INSERT INTO rubric_dimensions (rubric_id, name, criteria, weight, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Technique Accuracy',
   'Correct execution of the Kappasinian technique steps. All required checkpoints addressed.',
   3.0, 1),
  ('a0000000-0000-0000-0000-000000000001', 'Clinical Safety',
   'PHS anatomy present and correct. Permission language used. No contraindicated suggestions.',
   4.0, 2),
  ('a0000000-0000-0000-0000-000000000001', 'Flow & Pacing',
   'Smooth transitions between steps. Appropriate pauses. No rushing or excessive hesitation.',
   2.0, 3),
  ('a0000000-0000-0000-0000-000000000001', 'Time Management',
   'Completed within planned time window. Proportional time spent on each section.',
   1.0, 4)
ON CONFLICT (rubric_id, name) DO NOTHING;

-- Session rubric: rapport, induction quality, NLP, ideomotor, clinical safety, overall delivery
INSERT INTO rubrics (id, name, description, target_type) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'session_standard',
   'Standard session grading: rapport, induction quality, NLP usage, ideomotor response, clinical safety, delivery.',
   'session')
ON CONFLICT (name) DO NOTHING;

INSERT INTO rubric_dimensions (rubric_id, name, criteria, weight, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Rapport & Presuggestibility',
   'Effective use of E/P axis matching. VAK-appropriate language. Conversational flow with client persona.',
   2.5, 1),
  ('a0000000-0000-0000-0000-000000000002', 'Induction Quality',
   'Appropriate induction technique for suggestibility type. Smooth deepening. Progressive relaxation cues.',
   3.0, 2),
  ('a0000000-0000-0000-0000-000000000002', 'NLP Coverage',
   'Variety and appropriateness of NLP techniques. Anchoring, reframing, embedded commands, metaphor usage.',
   2.0, 3),
  ('a0000000-0000-0000-0000-000000000002', 'Ideomotor Response Capture',
   'Correct number of ideomotor checkpoints. Appropriate nod prompts. Response acknowledgment.',
   2.5, 4),
  ('a0000000-0000-0000-0000-000000000002', 'Clinical Safety',
   'PHS anatomy after conversions/deepeners. Permission language. Advisory framing. No contraindications.',
   4.0, 5),
  ('a0000000-0000-0000-0000-000000000002', 'Overall Delivery',
   'Tonality variation appropriate for stages. Pacing and vocal quality. Professional confidence.',
   1.0, 6)
ON CONFLICT (rubric_id, name) DO NOTHING;

-- Trigger for rubric updated_at
DROP TRIGGER IF EXISTS trg_rubric_updated ON rubrics;
CREATE TRIGGER trg_rubric_updated BEFORE UPDATE ON rubrics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
