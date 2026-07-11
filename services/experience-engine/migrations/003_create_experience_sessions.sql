CREATE TABLE IF NOT EXISTS experience_sessions (
  experience_session_id TEXT PRIMARY KEY,
  prospect_id TEXT NOT NULL,
  experience_definition_id TEXT NOT NULL,
  state TEXT NOT NULL,
  recovery_state TEXT NOT NULL,
  failure_reason TEXT,
  cleanup_state TEXT NOT NULL,
  started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  completed_at TEXT,
  purged_at TEXT,
  leadboard_demo_session_id TEXT,
  leadboard_lead_id TEXT,
  FOREIGN KEY (prospect_id) REFERENCES prospects (prospect_id),
  FOREIGN KEY (experience_definition_id) REFERENCES experience_definitions (experience_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_experience_sessions_prospect_id
  ON experience_sessions (prospect_id);

CREATE INDEX IF NOT EXISTS idx_experience_sessions_state
  ON experience_sessions (state);

CREATE INDEX IF NOT EXISTS idx_experience_sessions_expires_at
  ON experience_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_experience_sessions_leadboard_lead_id
  ON experience_sessions (leadboard_lead_id);

CREATE INDEX IF NOT EXISTS idx_experience_sessions_prospect_definition
  ON experience_sessions (prospect_id, experience_definition_id);
