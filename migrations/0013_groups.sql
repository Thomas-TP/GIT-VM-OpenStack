-- 0013 — Groupes de VM : organiser plusieurs VM ensemble (création multiple,
-- contrôle groupé). 100 % additif. Un groupe = des vm_requests partageant le même
-- group_id (généré) ; group_name est dupliqué sur chaque ligne (renommage = UPDATE).

ALTER TABLE vm_requests ADD COLUMN group_id TEXT;    -- id de groupe (NULL = sans groupe)
ALTER TABLE vm_requests ADD COLUMN group_name TEXT;  -- nom affiché du groupe

CREATE INDEX IF NOT EXISTS idx_requests_group ON vm_requests(group_id);
