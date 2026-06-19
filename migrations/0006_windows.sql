-- 0006 — Windows VMs : connexion par RDP (pas SSH) + mot de passe administrateur.
--
-- 100 % ADDITIF (ADD COLUMN). Le mot de passe Administrateur Windows est généré au
-- provisioning, injecté via UserData (EC2Launch) et stocké CHIFFRÉ (AES-GCM, même
-- mécanisme que les clés SSH). connect_method distingue 'ssh' (Linux) de 'rdp' (Windows).

ALTER TABLE vms ADD COLUMN connect_method TEXT;   -- 'ssh' | 'rdp' (défaut applicatif: 'ssh')
ALTER TABLE vms ADD COLUMN admin_password TEXT;   -- mot de passe Windows chiffré (AES-GCM), NULL pour Linux
