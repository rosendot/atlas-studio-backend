CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID REFERENCES leads(id),
  firebase_uid  TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  business      TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);
