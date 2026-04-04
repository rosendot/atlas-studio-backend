CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'discovery',
  start_date    DATE,
  launch_date   DATE,
  site_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
