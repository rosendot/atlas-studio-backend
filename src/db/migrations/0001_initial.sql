-- D1 (SQLite) initial schema for Atlas Studio backend.
-- Applied by `wrangler d1 migrations apply atlas-studio`.

CREATE TABLE leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  business    TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  pos         TEXT,
  website     TEXT,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE clients (
  id          TEXT PRIMARY KEY,
  lead_id     TEXT REFERENCES leads(id),
  auth_uid    TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  business    TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE projects (
  id           TEXT PRIMARY KEY,
  client_id    TEXT REFERENCES clients(id),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'discovery',
  start_date   TEXT,
  launch_date  TEXT,
  site_url     TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE milestones (
  id            TEXT PRIMARY KEY,
  project_id    TEXT REFERENCES projects(id),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  due_date      TEXT,
  completed_at  INTEGER,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE messages (
  id           TEXT PRIMARY KEY,
  project_id   TEXT REFERENCES projects(id),
  sender_uid   TEXT NOT NULL,
  sender_role  TEXT NOT NULL,
  body         TEXT NOT NULL,
  read_at      INTEGER,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE files (
  id            TEXT PRIMARY KEY,
  project_id    TEXT REFERENCES projects(id),
  uploaded_by   TEXT NOT NULL,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_type     TEXT,
  size_bytes    INTEGER,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_clients_auth_uid ON clients(auth_uid);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_files_project_id ON files(project_id);
