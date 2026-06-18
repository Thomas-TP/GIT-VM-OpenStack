-- Per-VM SSH key pair generated at provision time.
-- ssh_private_key is AES-GCM encrypted at rest (key derived from SESSION_SECRET).
ALTER TABLE vms ADD COLUMN ssh_key_name TEXT;
ALTER TABLE vms ADD COLUMN ssh_private_key TEXT;
