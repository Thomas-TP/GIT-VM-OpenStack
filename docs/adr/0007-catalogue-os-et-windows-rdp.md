# ADR 0007 — Catalogue d'OS élargi + support Windows (RDP)

**Statut** : Acté (2026-06-19)

> **Note (2026-06-25)** : la décision (catalogue élargi + Windows RDP) **reste valide**, mais les
> détails techniques ont été transposés par la migration OpenStack — images **Glance** (UUID), mot de
> passe Windows via **cloudbase-init**, catalogue actuel dans `src/presets.ts`. Voir [ADR 0010](0010-migration-openstack.md).

## Contexte

La page de création n'offrait que 3 systèmes (Ubuntu 24.04, Ubuntu 22.04 — doublon perçu — et
Debian 12) et passait par une **modale** peu lisible. Demande produit : refonte en **pages dédiées**
(« Mes VM » + « Créer une VM »), catalogue d'OS diversifié (dont **Windows**), et **procédures de
connexion** (MobaXterm, Termius) intégrées au portail.

Contraintes techniques découvertes :
- Le pipeline existant = **SSH + clé ed25519** ; le security group n'ouvre que **tcp/22**.
- **Termius** ne gère **que SSH** (pas de RDP) ; MobaXterm gère SSH **et** RDP.
- Les images sont vérifiées via `scripts/openstack-discover.mjs` (Glance, lecture seule) plutôt que devinées.

## Décision

1. **Catalogue d'OS** (images Glance concrètes, vérifiées) : Ubuntu 24.04 LTS (par défaut),
   Debian 13, **Rocky Linux 9**, **Fedora 42**, **CentOS Stream 9**, **Windows Server 2022** + poste
   de travail. Versions plus anciennes (Ubuntu 22.04, Debian 12) conservées **masquées** (`hidden`).
2. **Windows = RDP**, pas SSH : mot de passe Administrateur **généré au provisioning**, injecté via
   **user_data (cloudbase-init)**, stocké **chiffré AES-GCM** (même mécanisme que les clés SSH, cf.
   [ADR 0006](0006-gestion-des-secrets.md)), révélé au seul propriétaire/admin via une route auditée.
3. **Guide de connexion adaptatif** dans le détail de la VM : SSH → MobaXterm / Termius / Terminal ;
   RDP → MobaXterm / Bureau à distance (Termius explicitement marqué non supporté).
4. **Images concrètes** (UUID Glance) résolues au lancement ; pas de dépendance à un service de paramètres externe.
5. Schéma **100 % additif** (migration 0006 : `vms.connect_method`, `vms.admin_password`).

## Conséquences

- (+) Choix d'OS large et **réellement provisionnables** (AMIs vérifiés, pas inventés).
- (+) Windows fonctionne via mot de passe injecté (pas de récupération chiffrée à déchiffrer côté Worker).
- (+) Le chemin Linux **reste** SSH par clé.
- (−) **RDP nécessite d'ouvrir tcp/3389** sur le security group partagé. Exposition `0.0.0.0/0`
  acceptée pour la démo, **à restreindre** à une plage IP GIT en production (SG créé via
  `scripts/openstack-setup.mjs`, idempotent). Les hôtes Linux partagent ce SG mais n'écoutent pas sur 3389.
- (−) La migration 0006 doit être appliquée **avant** le déploiement (le code lit `connect_method` /
  `admin_password`) — voir runbook.

## Alternatives écartées

- **Résolution dynamique des images** (alias « toujours à jour ») : ajoute une dépendance externe ;
  UUID Glance concrets préférés pour la fiabilité démo.
- **Mot de passe Windows via récupération chiffrée** : nécessite un déchiffrement RSA indisponible
  dans WebCrypto → injection par user_data (cloudbase-init) retenue.
- **Modale de création conservée** : rejetée (lisibilité, place pour toutes les options).
