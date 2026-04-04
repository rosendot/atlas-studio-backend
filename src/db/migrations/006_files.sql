CREATE TABLE files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id),
  uploaded_by     TEXT NOT NULL,
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  file_type       TEXT,
  size_bytes      INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
