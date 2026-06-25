# Configuration & secrets — GIT VM Portal (OpenStack)

> Toutes les variables, les secrets, les credentials OpenStack et les procédures de **publication /
> rotation**. Référence transverse de sécurité — voir [ADR 0006](adr/0006-gestion-des-secrets.md) et
> [ADR 0010](adr/0010-migration-openstack.md). Dernière mise à jour : 2026-06-23.

---

## 1. Principe

- **Config publique** (non sensible) → `wrangler.jsonc` → `vars`. Commitée.
- **Secrets** (sensibles) → **Cloudflare Wrangler Secrets** (`wrangler secret put`). **Jamais commités.**
- **En local** → fichier `.dev.vars` (ignoré par Git) pour vars + secrets de dev.

> 🚫 **Aucun secret en clair dans le repo, les logs, les commits.** Les scripts OpenStack lisent les
> creds depuis l'environnement (openrc), jamais en dur.

## 2. Variables publiques (`wrangler.jsonc` → `vars`)

| Variable | Exemple / valeur | Rôle |
|---|---|---|
| `ALLOWED_EMAIL_DOMAINS` | `satom.ch,git.swiss` | Domaines email autorisés à se connecter |
| `ADMIN_EMAILS` | `thomas.prudhomme@satom.ch,…` | Admins « bootstrap » (toujours admin) |
| `ENTRA_TENANT_ID` | `33a7a298-…` | Tenant Entra ID |
| `ENTRA_CLIENT_ID` | `07545850-…` | App registration Entra (*GIT-VM-OpenStack*) |
| `OS_AUTH_URL` | `https://api.pub1.infomaniak.cloud/identity/v3` | Endpoint Keystone v3 |
| `OS_REGION` | `dc3-a` | Région Infomaniak |
| `OS_PROJECT_ID` | `9e3188971b0b453da67698c6c7d75e27` | Projet OpenStack (PCP-8V8ABFJ) |
| `OS_USER_DOMAIN_NAME` | `Default` | Domaine de l'utilisateur Keystone |
| `OS_USERNAME` | `PCU-8V8ABFJ` | Utilisateur OpenStack (API) |
| `OS_NETWORK_ID` | `dcf25c41-…` | Réseau public partagé `ext-net1` (IP publique directe) |
| `OS_SECURITY_GROUP_NAME` | `git-vm-portal` | Security group appliqué aux VM (ingress 22/3389/ICMP) |
| `APP_URL` | `https://git-vm-portal-openstack.…workers.dev` | URL publique (redirects, emails) |
| `GRAFANA_URL` | *(vide)* | Lien Grafana affiché dans l'onglet Monitoring (admin) |
| `MAIL_ENABLED` | `true` | Active l'envoi EmailJS |
| `SCHEDULED_STOP` | `true` | Active l'extinction nocturne (cron 19 h UTC) |
| `IDLE_STOP` | `false` | Arrêt sur inactivité CPU — **désactivé** (pas de télémétrie fiable, voir §5.2) |
| `IDLE_STOP_HOURS` | `3` | Heures d'inactivité avant arrêt (si `IDLE_STOP=true`) |
| `HARDENING` | `true` | Durcissement in-VM (DNS filtré, blocage P2P, hostname) |
| `SENTRY_DSN` | *(vide)* | DSN Sentry (optionnel) |
| `EMAILJS_PUBLIC_KEY` | `KlKcUV9e…` | Clé publique EmailJS |
| `EMAILJS_SERVICE_ID` | `service_aeuc86a` | Service EmailJS |
| `EMAILJS_TEMPLATE_ID` | `template_za3761l` | Template EmailJS |

## 3. Secrets (`wrangler secret put <NAME>`)

| Secret | Source | Rôle |
|---|---|---|
| `SESSION_SECRET` | aléatoire fort (≥ 32 octets) | Signe les JWT de session **ET** dérive la clé AES-GCM de chiffrement |
| `ENTRA_CLIENT_SECRET` | Entra → Certificates & secrets | Échange du code OIDC contre l'id_token |
| `OS_PASSWORD` | mot de passe du user OpenStack `OS_USERNAME` | Auth Keystone (token API) |
| `EMAILJS_PRIVATE_KEY` | EmailJS → Account → API Keys | Auth serveur EmailJS |
| `GRAFANA_TOKEN` | aléatoire fort (optionnel) | Bearer des endpoints `/api/monitoring/*`. Non défini → endpoints `503`. |

```bash
# Définir / mettre à jour un secret (prod)
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ENTRA_CLIENT_SECRET
npx wrangler secret put OS_PASSWORD
npx wrangler secret put EMAILJS_PRIVATE_KEY

# Lister les secrets définis (noms uniquement)
npx wrangler secret list
```

> ⚠️ `SESSION_SECRET` est **double usage** : sa rotation invalide toutes les sessions **et** rend
> illisibles les clés SSH / mots de passe Windows déjà stockés (re-télécharger / re-provisionner après).

## 4. Développement local (`.dev.vars`)

Fichier `.dev.vars` à la racine (déjà dans `.gitignore`) :

```ini
SESSION_SECRET="dev-only-change-me-0123456789abcdef"
ENTRA_CLIENT_SECRET="..."
OS_PASSWORD="..."
EMAILJS_PRIVATE_KEY="..."
```

`wrangler dev` charge `.dev.vars` automatiquement. Pour les scripts `scripts/*.mjs`, exporter les
variables OpenStack dans le shell (PowerShell) — ou simplement *sourcer* l'openrc Infomaniak :

```powershell
$env:OS_AUTH_URL='https://api.pub1.infomaniak.cloud/identity/v3'
$env:OS_USERNAME='PCU-8V8ABFJ'; $env:OS_PASSWORD='...'
$env:OS_PROJECT_ID='9e3188971b0b453da67698c6c7d75e27'
$env:OS_USER_DOMAIN_NAME='Default'; $env:OS_REGION='dc3-a'
node scripts/openstack-discover.mjs
```

## 5. OpenStack (Infomaniak Public Cloud)

**Projet** : `PCP-8V8ABFJ` (`OS_PROJECT_ID=9e3188971b0b453da67698c6c7d75e27`) · **Région** : `dc3-a` ·
**Keystone** : `https://api.pub1.infomaniak.cloud/identity/v3`.

### 5.1 Ce que fait le Worker (runtime)

Le Worker s'authentifie auprès de **Keystone** (user `OS_USERNAME` + `OS_PASSWORD`, scope projet),
met le token en cache, puis appelle les services depuis le **catalogue** :

- **Nova** (`compute`) : créer / décrire / start / stop / reboot / supprimer les serveurs, keypairs,
  snapshot (`createImage`).
- **Glance** (`image`) : images OS + snapshots (statut, suppression).
- **Neutron** (`network`) : rattachement au réseau public `ext-net1`, security group.

Le rôle « member » par défaut du projet Infomaniak suffit (création/gestion de serveurs, keypairs,
images, lecture réseau). Aucune politique IAM à écrire (le rôle member du projet suffit).

### 5.2 Télémétrie CPU (arrêt sur inactivité)

Infomaniak expose **Gnocchi** (`metric`) et **Aodh** (`alarm`), mais transformer le compteur
cumulatif `cpu` en % d'utilisation fiable est fragile sur cloud public (risque de faux arrêts).
`maxCpuOverWindow()` renvoie donc `null` et **`IDLE_STOP=false`**. Les autres garde-fous coûts
(extinction nocturne 19 h, planifications par VM, suppression à l'échéance) restent actifs.

### 5.3 Réseau & security group

- `ext-net1` (`OS_NETWORK_ID`) est **partagé** et porte des **sous-réseaux IPv4 publics**
  (195.15.x / 188.213.x). Une VM rattachée directement obtient une **IP publique routable** — pas de
  floating IP, pas de routeur (IP publique directe).
- Le security group `git-vm-portal` (créé par `scripts/openstack-setup.mjs`) ouvre **en entrée**
  SSH 22, RDP 3389, ICMP. L'**egress** reste ouvert par défaut (installs de cours). Pour le verrouiller
  en liste blanche (DNS Cloudflare uniquement, 80/443/NTP/SSH/DHCP) : `scripts/openstack-harden-sg.mjs`.

### 5.4 Scripts d'admin (one-off)

| Script | Rôle |
|---|---|
| `scripts/openstack-discover.mjs` | Lister flavors / images / réseaux / SG (rafraîchir les UUID d'images de `src/presets.ts`) |
| `scripts/openstack-setup.mjs` | Créer/compléter le SG `git-vm-portal` (idempotent) |
| `scripts/openstack-harden-sg.mjs` | (optionnel) Verrouiller l'egress du SG en liste blanche |

## 6. Microsoft Entra ID

App registration (Azure Portal → Entra ID → App registrations → *GIT-VM-OpenStack*) :

1. **Redirect URI** (type *Web*) : `https://<APP_URL>/auth/callback`
   (prod : `https://git-vm-portal-openstack.thomas-prudhomme.workers.dev/auth/callback`).
2. **Client ID** → `ENTRA_CLIENT_ID` (var). **Tenant ID** → `ENTRA_TENANT_ID` (var).
3. **Client secret** (Certificates & secrets) → `ENTRA_CLIENT_SECRET` (secret).
4. **Permissions** : `openid`, `profile`, `email` (scopes OIDC standard).
5. Les utilisateurs doivent appartenir à un domaine de `ALLOWED_EMAIL_DOMAINS`.

> 90 % des pannes de login viennent d'ici (redirect URI / secret / domaine), pas du code.

## 7. EmailJS

Service transactionnel (REST, côté serveur). Template à 4 variables : `to_email`, `subject`,
`title`, `message` (texte avec `white-space: pre-line`). IDs publics dans `vars`, clé privée en secret.
Mettre `MAIL_ENABLED=false` pour désactiver proprement (les envois sont alors loggés `mail.skipped`).

## 8. Rotation des credentials

| Credential | Procédure |
|---|---|
| **`OS_PASSWORD`** | Changer le mot de passe du user OpenStack (Infomaniak) → `wrangler secret put OS_PASSWORD` → re-déployer. |
| **Secret Entra** | Entra → nouveau secret → `wrangler secret put ENTRA_CLIENT_SECRET` → re-déployer → supprimer l'ancien. |
| **EmailJS** | Régénérer la clé privée → `wrangler secret put EMAILJS_PRIVATE_KEY`. |
| **`SESSION_SECRET`** | Générer une nouvelle valeur → `wrangler secret put` → **déconnecte tout le monde** et rend les clés/mots de passe stockés illisibles. À éviter sauf compromission. |

## 9. Checklist « nouveau credential publié »

- [ ] La valeur n'apparaît **dans aucun fichier commité** (`git grep` la valeur → rien).
- [ ] Variable publique → `wrangler.jsonc` `vars` ; sensible → `wrangler secret put`.
- [ ] `.dev.vars` à jour pour le dev local (et bien ignoré par Git).
- [ ] Re-déploiement effectué (merge `main`) et vérifié (`/api/presets`, `/healthz`).
- [ ] Ancienne valeur révoquée si rotation.
