-- GIT VM Portal — schema initial
-- Members request VMs, admins approve, Worker provisions on AWS EC2.

CREATE TABLE IF NOT EXISTS users (
  email       TEXT PRIMARY KEY,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vm_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email  TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  preset      TEXT NOT NULL,              -- small | medium | large
  region      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','provisioning','active','failed','terminated')),
  admin_note  TEXT,
  decided_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at  TEXT,
  FOREIGN KEY (user_email) REFERENCES users(email)
);

CREATE TABLE IF NOT EXISTS vms (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id       INTEGER NOT NULL,
  aws_instance_id  TEXT,
  public_ip        TEXT,
  state            TEXT NOT NULL DEFAULT 'pending',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  terminated_at    TEXT,
  FOREIGN KEY (request_id) REFERENCES vm_requests(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON vm_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_user   ON vm_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_vms_request      ON vms(request_id);
