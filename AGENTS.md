# AGENTS.md — Guide pour agents IA & nouveaux développeurs

> **Lis ce fichier en premier.** Point d'entrée **canonique** pour toute IA (Claude Code, Copilot,
> Cursor…) **et** pour un développeur qui découvre le repo. Il donne l'essentiel pour comprendre,
> modifier, tester et **déployer** le projet sans rien casser.
>
> Documents liés : [`CLAUDE.md`](CLAUDE.md) (redirige ici) · [`README.md`](README.md) ·
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) ·
> [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) · [`CONTRIBUTING.md`](CONTRIBUTING.md) ·
> [`docs/adr/`](docs/adr/) (décisions).
>
> Dernière mise à jour : 2026-06-23.

---

## 1. Le projet en une phrase

Plateforme **self-service de provisioning de VM** : un utilisateur se connecte en **SSO Microsoft
(Entra ID)**, nomme et demande une (ou plusieurs) VM depuis un catalogue, un **admin valide**, la VM
est **provisionnée automatiquement sur OpenStack (Infomaniak Public Cloud)** (clé SSH unique chiffrée,
ou mot de passe RDP Windows), **durcie** (filtrage réseau), **sauvegardable** (snapshots Glance),
**arrêtée la nuit/le WE**, et **supprimée à sa date de fin**. Le tout tourne sur **Cloudflare Workers**.

- **Prod** : <https://git-vm-portal-openstack.thomas-prudhomme.workers.dev>
- **Repo** : <https://github.com/Thomas-TP/GIT-VM-OpenStack>
- **Origine** : portage du projet AWS EC2 d'origine vers OpenStack — voir [ADR 0010](docs/adr/0010-migration-openstack.md).

## 2. Règles d'or (NE PAS enfreindre)

1. **Ne casse pas l'existant qui marche.** Le socle OpenStack + Workers est déployé et fonctionnel. On
   **ajoute** et on **corrige** ; on ne réécrit pas, on ne pivote pas.
2. **Toute logique de cycle de vie passe par le réconciliateur cron** (`src/index.ts`). Pas de
   mécanisme parallèle. Voir [ADR 0004](docs/adr/0004-cycle-de-vie-reconciliateur.md).
3. **Migrations D1 additives uniquement** (`ALTER TABLE … ADD COLUMN`, `CREATE TABLE`). Jamais de
   reconstruction de table (conflits de clés étrangères sur D1 remote).
4. **Aucun secret dans le repo.** Secrets via `wrangler secret put` uniquement. Les scripts OpenStack
   lisent les creds depuis l'environnement (`$env:OS_PASSWORD`…), jamais en dur.
5. **Une décision structurante = un ADR** dans [`docs/adr/`](docs/adr/).
6. **Docs et commentaires en français** (équipe + client francophones). Code et identifiants en anglais.
7. **`i18n.ts`** : `en: typeof fr` → toute clé ajoutée à `fr` doit l'être à `en`, sinon le typecheck SPA casse.
8. **Déploiement par merge sur `main` uniquement** (Cloudflare Workers Builds). Pas de `wrangler deploy` manuel.

## 3. Stack

| Couche | Techno |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind v4 + TanStack Query + react-i18next |
| Backend | Cloudflare Worker (**Hono**) — API JSON + cron `scheduled()` |
| Base de données | Cloudflare **D1** (SQLite) |
| Hébergement | Cloudflare Workers Static Assets (SPA) + Worker (API) |
| Auth | Microsoft **Entra ID** (OIDC authorization-code, in-Worker, sans librairie) |
| Compute | **OpenStack** (Infomaniak Public Cloud, région `dc3-a`) — Keystone (token) + **Nova**/**Glance**/**Neutron** en REST, `fetch` natif |
| Email | EmailJS (REST) · Erreurs : Sentry (optionnel) · Monitoring : Grafana Cloud (optionnel) |
| CD | **Cloudflare Workers Builds** = build + migrate D1 + deploy sur `main` |

## 4. Rôles

Trois rôles (colonne `users.role`), résolus à chaque login (`upsertUser`) :

- **member** : demande/gère ses propres VM.
- **formateur** : `member` + page **« Demande groupée »** (`/trainer`) — crée un lot de **1 à 30 VM**
  et les **attribue à des utilisateurs** (round-robin). Ces demandes passent aussi par la **validation admin**.
- **admin** : tout valider/piloter (console `/admin`), gérer les rôles, accès à la page formateur.

Admins « bootstrap » via `ADMIN_EMAILS` (toujours admin) ; les autres rôles sont posés en base par un admin.

## 5. Carte du code

```
src/                      WORKER (API + cron)
  index.ts                Routes OIDC (/auth/*), API (/api/*), middlewares (apiAuth/apiAdmin/apiTrainer),
                          cron scheduled() + tout le réconciliateur. provisionRequest() = clé+serveur+userData.
  oidc.ts                 Entra ID : authorizeUrl / exchangeCode / userFromIdToken
  crypto.ts               JWT HMAC maison, AES-GCM (clés SSH + mots de passe), randomToken
  db.ts                   Toutes les requêtes D1 (requests, vms, users, snapshots, audit, notifs, metrics)
  openstack.ts            Client OpenStack : Keystone (token + catalogue), Nova (servers/keypairs/actions/
                          createImage), Glance (images/snapshots), Neutron (réseau). MÊMES noms de fonctions
                          que l'ancien aws.ts (launchInstance, describeInstance, createSnapshot…).
  presets.ts              Catalogue PERF × STORAGE × OS + COURSES + coûts. SOURCE DE VÉRITÉ.
  email.ts                Notifications EmailJS · sentry.ts erreurs · types.ts Env + types worker
migrations/               D1 (additif) : 0001 init … 0018 vm.name (schéma hérité, migrations additives)
web/src/                  SPA REACT (voir §9)
scripts/                  Helpers OpenStack one-off (Node, creds depuis l'env / openrc) :
  _os.mjs                 Auth Keystone + osFetch partagés
  openstack-discover.mjs  Liste flavors / images / réseaux / SG (rafraîchir les UUID d'images)
  openstack-setup.mjs     Crée le security group git-vm-portal (ingress 22/3389/ICMP), idempotent
  openstack-harden-sg.mjs (optionnel) verrouille l'egress du SG en liste blanche
wrangler.jsonc            Config Worker : binding D1, vars (OS_*…), crons, assets
docs/                     Architecture, déploiement, configuration, ADR
```

> ℹ️ **Noms de colonnes** : la DB garde `aws_instance_id` / `aws_snapshot_id` (schéma hérité, migrations
> additives). Ici elles contiennent un **UUID de serveur OpenStack** et un **UUID d'image Glance**.

## 6. Le pattern central : le réconciliateur

**La DB = état désiré.** Une cron `*/2 * * * *` réconcilie le réel OpenStack avec la DB, en séquence :

1. `reconcile` — `provisioning → active` (serveur ACTIVE + IP publique + email « prête »), détection de
   **drift** (serveur supprimé hors portail → `terminated`). Liste via la **metadata** `managed-by`.
2. `applySchedules` — **plannings auto start/stop par VM** (jours + horaires, fuseau Europe/Zurich).
3. `retryFailed` — **retry** des provisioning échoués (max 3).
4. `enforceExpiry` — à la `end_date` : **snapshot auto** (si activé, via Glance) puis **suppression**
   (serveur + clé) + `expired_at` + email. [ADR 0008](docs/adr/0008-suppression-auto-a-l-echeance.md).
5. `enforceIdleStop` — **arrêt sur inactivité** : **désactivé** (`IDLE_STOP=false`) — pas de
   télémétrie CPU fiable sur le cloud public (voir §14). `maxCpuOverWindow()` renvoie `null`.
6. `syncSnapshots` — suit les snapshots Glance en cours (`pending → completed/error`).

Une cron `0 19 * * *` arrête les VM running (garde-fou coûts nocturne, ignore les VM planifiées).
**Toute nouvelle automatisation de cycle de vie s'ajoute dans ce pipeline.**

## 7. Modèle de données (D1)

- `users(email PK, name, role[member|formateur|admin], created_at)`
- `vm_requests(id, user_email, name, purpose, preset, storage, os, region, status, course,
  course_ready_at, group_id, group_name, snapshot_on_delete, restore_snapshot_id, admin_note,
  decided_by, created_at, decided_at, start_date, end_date, expired_at, ext_*, schedule_*)`
  — `status ∈ pending | approved | rejected | provisioning | active | failed | terminated`
  — « expired » est **dérivé** de `expired_at` (le statut reste `active`).
- `vms(id, request_id, aws_instance_id[=UUID serveur OpenStack], public_ip, state, ssh_key_name,
  ssh_private_key[AES-GCM], ssh_user, connect_method['ssh'|'rdp'], admin_password[AES-GCM, Windows],
  created_at, terminated_at)`
- `snapshots(id, request_id, user_email, aws_snapshot_id[=UUID image Glance], description, root_device,
  architecture, size_gb, status, os, created_at, completed_at, …)`
- `audit_log(...)` · `notifications(...)` · `request_comments(...)` (dormant).

Détails : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 8. Catalogue (src/presets.ts)

Une demande = **PERF × STORAGE × OS** (+ cours optionnel).

- **PERF** = un *stem* de flavor Infomaniak (cpu/ram) : `a1-ram2` (Micro), `a2-ram4` (Small, recommandé),
  `a4-ram8` (Flex). **STORAGE** = taille du disque racine : **20 / 50 / 80 Go**.
- Le flavor effectif = `${stem}-disk${sizeGb}-perf1` (ex. `a2-ram4-disk20-perf1`), résolu en **UUID de
  flavor** au lancement (`openstack.ts`). Tous ces flavors existent sur Infomaniak.
- **OS** = **UUID d'image Glance** (région dc3-a), vérifiés via `node scripts/openstack-discover.mjs` :
  Ubuntu 24.04 & 22.04 (`ubuntu`), Debian 12 & 13 (`debian`), Rocky 9 (`rocky`), **Windows Server 2022**
  et **Windows poste de travail** (Server 2025) — Windows en RDP, Linux en SSH. (Amazon Linux & AlmaLinux
  ne sont pas proposés par Infomaniak : ids legacy masqués, remappés sur Rocky 9.)
- Windows exige un disque ≥ 60 Go → impose **s80**. Coût indicatif (CHF≈USD) dans `PERF[].hourlyUsd`.

**Bundles d'outils par cours** (`COURSES`) : préinstalle des logiciels via cloud-init (Linux) /
cloudbase-init (Windows) au premier boot ; callback `course-done` → l'UI affiche « outils prêts ».

## 9. Fonctionnalités clés

- **Multi-VM & groupes** : 1–4 VM à la création (chacune nommée) ; >1 VM ⇒ **groupe** (piloter ensemble).
- **Snapshots (Glance)** : créer / lister / supprimer ; **snapshot auto avant suppression** ; **restaurer**
  une VM depuis un snapshot à la création (l'image Glance est directement bootable — pas de « register »).
  [ADR 0009](docs/adr/0009-snapshots-et-restauration-locale.md).
- **Nom de VM** : obligatoire ; nom du serveur OpenStack = `<nom>.<préfixe-email>`.
- **Durcissement sécurité** (`HARDENING`) : in-VM (DNS Cloudflare for Families, blocage P2P/torrent,
  hostname verrouillé — Linux + Windows) **+** (optionnel) verrouillage **egress du security group**
  (`openstack-harden-sg.mjs`). Voir §11.
- **Demande groupée formateur** : lot 1–30 VM attribuées en round-robin.
- **Console admin** : onglet **VM** unifié (demandes + machines), validation en cartes, actions cycle de
  vie inline, recherche/filtre/CSV ; onglets Vue d'ensemble / Utilisateurs / Monitoring (Grafana).
- Web (`web/src/`) : `App.tsx` (routeur + gardes), `api.ts`, `i18n.ts` (fr source), `pages/`, `components/`.

## 10. Commandes

```bash
npm install && npm --prefix web install                          # installer

npx wrangler dev                                                 # Worker (API) :8787
npm --prefix web run dev                                         # SPA hot-reload (proxy /api → :8787)
npx wrangler d1 migrations apply git_vm_portal_openstack --local # migrations locales

npm run typecheck                                                # worker (tsc) — AVANT tout commit
npm --prefix web run typecheck                                   # SPA (tsc)
npm test                                                         # tests unitaires (vitest)
npm --prefix web run build                                       # build SPA → web/dist
node scripts/openstack-discover.mjs                              # rafraîchir flavors/images/réseaux
npx wrangler tail git-vm-portal-openstack --format pretty        # logs prod
```

## 11. Sécurité réseau des VM (durcissement)

Défense en profondeur, car un utilisateur **sudo/admin** peut défaire ce qui est *dans* la VM :

- **In-VM** (au provisioning, `linuxHardeningBody` / `windowsHardeningLines`) : DNS forcé vers
  **Cloudflare for Families** (1.1.1.3 / 1.0.0.3), blocage des ports torrent/P2P, **hostname verrouillé**.
  Flag `HARDENING` (déf. true).
- **Réseau** : le security group `git-vm-portal` (`openstack-setup.mjs`) ouvre en **entrée** SSH 22 /
  RDP 3389 / ICMP. L'**egress** est ouvert par défaut (installs de cours). Pour la **vraie barrière**,
  `openstack-harden-sg.mjs` verrouille l'egress en liste blanche (80/443, **DNS 53 → Cloudflare
  uniquement**, NTP, SSH, DHCP) + default-deny — un root ne peut pas le contourner.

## 12. Déploiement

**On NE lance PAS `wrangler deploy` à la main.** Un push/merge sur **`main`** déclenche, côté
Cloudflare Workers Builds, le **build** puis le **deploy command** :
`npx wrangler d1 migrations apply git_vm_portal_openstack --remote && npx wrangler deploy`. → **Les
migrations D1 remote sont appliquées automatiquement** avant le déploiement. Livrer = ouvrir une PR →
merger sur `main`. Vérifier en live : `GET /healthz` et `GET /api/presets`. Détail / rollback :
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## 13. Secrets & credentials

Config **publique** dans `wrangler.jsonc` → `vars` (IDs Entra, `OS_AUTH_URL`/`OS_REGION`/`OS_PROJECT_ID`/
`OS_USERNAME`/`OS_NETWORK_ID`/`OS_SECURITY_GROUP_NAME`, flags `SCHEDULED_STOP`/`IDLE_STOP`/`HARDENING`,
EmailJS public…). **Secrets** via `wrangler secret put` : `SESSION_SECRET`, `ENTRA_CLIENT_SECRET`,
`OS_PASSWORD`, `EMAILJS_PRIVATE_KEY`. Le Worker s'authentifie à **Keystone** (user `OS_USERNAME` +
`OS_PASSWORD`, scope projet) ; le rôle member par défaut du projet suffit (pas d'IAM à écrire). Détail,
Entra, **rotation** : [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) et [ADR 0006](docs/adr/0006-gestion-des-secrets.md).

## 14. Pièges connus (gotchas)

- **`i18n.ts`** : `en: typeof fr` — toute clé `fr` doit exister en `en`.
- **Migrations** : additives uniquement ; le deploy command applique les migrations remote avant le deploy.
- **IP publique** : les VM sont rattachées au réseau **partagé `ext-net1`** (IPv4 publique directe). Pas
  de floating IP, pas de routeur. `OS_NETWORK_ID` doit pointer dessus.
- **Security group** : `default` refuse l'ingress → SSH/RDP KO. Utiliser `git-vm-portal` (créé par
  `openstack-setup.mjs`). Nova attend le **nom** du SG au boot, pas l'id.
- **Images** : UUID régionaux figés dans `presets.ts`, ils peuvent périmer → `openstack-discover.mjs`.
- **Idle stop inerte** : `IDLE_STOP=false` (pas de télémétrie CPU fiable sur Infomaniak). Le code est prêt
  si une source Gnocchi/Aodh exploitable est branchée dans `maxCpuOverWindow()`.
- **Windows** : mot de passe Administrator posé via user_data `<powershell>` (cloudbase-init). Si une image
  ignore l'user_data, basculer sur `os-server-password` + déchiffrement par la clé.
- **Login KO** : presque toujours une **config Entra** (redirect URI / secret / domaine), pas le code.
- **Token Keystone** : mis en cache dans l'isolate ; ré-auth automatique sur 401.

## 15. Où trouver quoi

| Besoin | Fichier |
|---|---|
| Architecture, diagrammes, flux, sécurité | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Déployer / publier / rollback | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Variables, secrets, OpenStack, Entra, rotation | [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) |
| Contribuer (workflow, conventions) | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Décisions techniques (ADR 0001 → 0010) | [`docs/adr/`](docs/adr/) |
| Migration AWS → OpenStack | [ADR 0010](docs/adr/0010-migration-openstack.md) |
