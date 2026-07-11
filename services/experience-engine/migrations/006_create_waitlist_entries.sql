CREATE TABLE IF NOT EXISTS waitlist_entries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  business_location TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  website TEXT,
  no_website INTEGER NOT NULL DEFAULT 0,
  biggest_challenge TEXT NOT NULL,
  implementation_timeframe TEXT NOT NULL,
  client_context TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_email_normalized
  ON waitlist_entries (email_normalized);
