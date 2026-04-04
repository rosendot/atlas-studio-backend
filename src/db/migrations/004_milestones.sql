CREATE TABLE milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'pending',
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);
