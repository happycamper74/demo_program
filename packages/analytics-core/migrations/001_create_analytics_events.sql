CREATE TABLE IF NOT EXISTS analytics_events (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  experience_session_id TEXT,
  prospect_id TEXT,
  industry TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events (experience_session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_industry ON analytics_events (industry);
CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at ON analytics_events (occurred_at);
