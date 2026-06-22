-- 0014 — Snapshots EBS : sauvegarde du disque racine d'une VM. Restauration possible
-- a la creation. 100 % additif.

CREATE TABLE IF NOT EXISTS snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id      INTEGER,
  user_email      TEXT NOT NULL,
  aws_snapshot_id TEXT,
  description     TEXT,
  root_device     TEXT,
  architecture    TEXT,
  size_gb         INTEGER,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | completed | error
  ova_status      TEXT,                              -- NULL | exporting | ready | error  (etape 2)
  ova_url         TEXT,                              -- lien S3 presigne (etape 2)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON snapshots(user_email, created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_status ON snapshots(status);

-- Snapshot automatique avant suppression / expiration (par VM).
ALTER TABLE vm_requests ADD COLUMN snapshot_on_delete INTEGER NOT NULL DEFAULT 0;
