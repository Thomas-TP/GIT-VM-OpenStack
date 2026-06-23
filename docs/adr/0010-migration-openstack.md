# ADR 0010 — Migration du backend compute : AWS EC2 → OpenStack (Infomaniak)

**Statut** : Acté (2026-06-23) · porte le projet de [ADR 0001](0001-architecture-cloudflare-workers.md)
sur un nouveau fournisseur de compute, sans toucher au reste de l'architecture.

## Contexte

Le client souhaite faire tourner la plateforme sur **Infomaniak Public Cloud (OpenStack)** plutôt que
sur **AWS EC2**, en **conservant la même infrastructure** (Cloudflare Workers + D1 + Hono + SPA React),
les mêmes fonctionnalités et le même réconciliateur. Le déploiement se fait **à côté** du projet AWS :
nouveau Worker, nouvelle base D1, nouveau repo GitHub, nouvelle app Entra — l'AWS d'origine reste intact.

Identifiants Infomaniak : projet `PCP-8V8ABFJ`, région `dc3-a`, Keystone v3
`https://api.pub1.infomaniak.cloud/identity/v3`.

## Décision

**Remplacer `src/aws.ts` par `src/openstack.ts` en conservant exactement la même surface d'export**
(mêmes noms de fonctions : `createKeyPair`, `launchInstance`, `describeInstance`, `start/stop/reboot/
terminateInstance`, `createSnapshot`, `describeSnapshot`, `deleteSnapshot`, `registerImageFromSnapshot`,
`listManagedInstances`, `maxCpuOverWindow`). `index.ts` ne change quasiment pas (l'import + la
composition du flavor).

Choix techniques de portage :

- **Auth** : Keystone v3 (user `OS_USERNAME` + secret `OS_PASSWORD`, scope projet). Token + catalogue
  d'endpoints mis en cache dans l'isolate, ré-auth automatique sur 401.
- **IP publique** : rattachement **direct** au réseau **partagé `ext-net1`** (sous-réseaux IPv4 publics
  Infomaniak). L'adresse de la VM EST son IP publique — **pas de floating IP, pas de routeur**. C'est
  l'équivalent du `AssociatePublicIpAddress` d'EC2.
- **Flavor** : composé `${perf.flavorStem}-disk${storage.sizeGb}-perf1` (ex. `a2-ram4-disk20-perf1`),
  résolu en UUID au lancement. Le disque racine est porté par le flavor (disque éphémère) → pas de
  Cinder. STORAGE = 20 / 50 / 80 Go (les variantes de disque existantes). Windows ≥ 60 → impose 80.
- **Snapshots** : Nova `createImage` → image **Glance** (analogue d'une AMI). La restauration boote
  directement depuis cette image (`registerImageFromSnapshot` est un passe-plat). Suppression = DELETE Glance.
- **Clés SSH** : Nova génère la keypair et renvoie la clé privée **une fois** (comme `CreateKeyPair`
  d'EC2) — RSA. On la chiffre (AES-GCM) et on la stocke comme avant.
- **Windows** : mot de passe Administrator posé via user_data `<powershell>` exécuté par cloudbase-init.
- **Colonnes DB inchangées** : `aws_instance_id` / `aws_snapshot_id` contiennent désormais un UUID de
  serveur OpenStack / d'image Glance (migrations additives uniquement, base neuve).
- **Security group** : `git-vm-portal` (ingress SSH/RDP/ICMP) créé par `scripts/openstack-setup.mjs`.
- **Arrêt sur inactivité** : **désactivé** (`IDLE_STOP=false`). `maxCpuOverWindow()` renvoie `null`.

## Justification

- **Surface d'export identique** = portage à faible risque : tout le réconciliateur, l'API et la SPA
  restent inchangés (règle d'or « ne pas réécrire »).
- **`ext-net1` en attache directe** : c'est le modèle réseau natif d'Infomaniak (réseau partagé à IP
  publiques) — le plus simple et le plus fiable, validé par un **test de bout en bout** (VM bootée →
  ACTIVE en ~30 s avec IP publique, puis supprimée).
- **Snapshot = Glance image** : mappe presque 1:1 le flux AWS « snapshot → register → boot » tout en
  évitant Cinder et le couplage volume.
- **Pas d'IAM à écrire** : le rôle member par défaut du projet couvre Nova/Glance/Neutron.

## Conséquences

- (+) Même produit, même UX, même cycle de vie ; bascule de fournisseur transparente pour l'utilisateur.
- (+) Réseau et snapshots plus simples qu'AWS (pas de floating IP, pas d'EBS/AMI séparés).
- (−) **Pas d'arrêt sur inactivité** : il reste l'extinction nocturne (19 h), les planifications par VM
  et la suppression à l'échéance comme garde-fous coûts.
- (−) **Catalogue OS réduit** : Amazon Linux et AlmaLinux ne sont pas fournis par Infomaniak (remplacés
  par Ubuntu 22.04 / Debian 13 ; ids legacy masqués remappés sur Rocky 9).
- (−) Les noms de colonnes `aws_*` sont trompeurs (assumé : renommer = migration destructive interdite).

## Alternatives écartées

- **Floating IP (réseau privé + routeur + `ext-floating1`)** : plus proche d'un VPC, mais inutilement
  complexe ici — `ext-net1` donne déjà une IP publique en attache directe.
- **Boot-from-volume (flavor `disk0` + volume Cinder)** : disques arbitraires, mais ajoute Cinder et
  complique `createImage`. Le disque porté par le flavor suffit pour un usage pédagogique.
- **Idle-stop via Gnocchi/Aodh** : la conversion du compteur `cpu` cumulatif en % est fragile sur cloud
  public (faux arrêts). Reporté ; le code est prêt si une source fiable est branchée.
