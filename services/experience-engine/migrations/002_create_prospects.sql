CREATE TABLE IF NOT EXISTS prospects (
  prospect_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  industry TEXT NOT NULL,
  business_location TEXT NOT NULL,
  company_size TEXT NOT NULL,
  website TEXT,
  biggest_challenge TEXT NOT NULL,
  implementation_timeframe TEXT NOT NULL,
  current_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects (email);
CREATE INDEX IF NOT EXISTS idx_prospects_phone_number ON prospects (phone_number);
CREATE INDEX IF NOT EXISTS idx_prospects_industry ON prospects (industry);
CREATE INDEX IF NOT EXISTS idx_prospects_business_name ON prospects (business_name);
