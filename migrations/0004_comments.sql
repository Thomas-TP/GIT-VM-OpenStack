-- Discussion thread on a request (admins collaborate, requester can read/reply).
CREATE TABLE IF NOT EXISTS request_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER NOT NULL,
  author      TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES vm_requests(id)
);
CREATE INDEX IF NOT EXISTS idx_comments_request ON request_comments(request_id);
