CREATE TABLE IF NOT EXISTS experience_definitions (
  experience_definition_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  version TEXT NOT NULL,
  industry TEXT NOT NULL,
  status TEXT NOT NULL,
  estimated_duration_seconds INTEGER NOT NULL,
  maximum_call_duration_seconds INTEGER NOT NULL,
  scenario TEXT NOT NULL,
  ai_agent_identifier TEXT NOT NULL,
  booking_configuration TEXT NOT NULL,
  active INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (slug, version)
);

CREATE INDEX IF NOT EXISTS idx_experience_definitions_industry
  ON experience_definitions (industry);

CREATE INDEX IF NOT EXISTS idx_experience_definitions_active
  ON experience_definitions (active);
