-- One-click local-disk export of a snapshot (.vmdk/.vdi) via an ephemeral helper instance.
ALTER TABLE snapshots ADD COLUMN export_status TEXT;        -- null | running | ready | error
ALTER TABLE snapshots ADD COLUMN export_format TEXT;        -- vmdk | vdi
ALTER TABLE snapshots ADD COLUMN export_key TEXT;           -- S3 object key
ALTER TABLE snapshots ADD COLUMN export_url TEXT;           -- presigned download URL
ALTER TABLE snapshots ADD COLUMN export_instance_id TEXT;   -- helper EC2 instance
ALTER TABLE snapshots ADD COLUMN export_started_at TEXT;
