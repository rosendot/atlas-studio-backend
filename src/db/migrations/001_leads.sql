CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  business    TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  pos         TEXT,
  website     TEXT,
  message     TEXT,
  status      TEXT DEFAULT 'new',
  created_at  TIMESTAMPTZ DEFAULT now()
);
