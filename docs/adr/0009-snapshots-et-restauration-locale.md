# ADR 0009 — Snapshots (image) et restauration

**Statut** : Acté (2026-06-22) · transposé sur OpenStack par [ADR 0010](0010-migration-openstack.md) ·
complète [ADR 0008](0008-suppression-auto-a-l-echeance.md).

> **Note (2026-06-25)** : sur OpenStack, le snapshot = **image Glance** créée via Nova `createImage`
> (et non un snapshot de bloc). L'ancien **export local** vers VMware/VirtualBox a été **retiré**.

## Contexte

[ADR 0008](0008-suppression-auto-a-l-echeance.md) supprime les VM à l'échéance (action irréversible)
et listait le « snapshot avant suppression » comme évolution possible. Le client a ensuite demandé :
(1) pouvoir **sauvegarder** une VM, et (2) la **restaurer** à la création.

## Décision

**Sauvegarde = snapshot via image Glance** (`createImage` du serveur), pas d'export de fichier.

- Bouton **« Créer un snapshot »** sur la page VM + case **« snapshot auto avant suppression /
  expiration »** (`vm_requests.snapshot_on_delete`). Le réconciliateur déclenche le snapshot avant
  `terminate` (suppression manuelle **et** `enforceExpiry`) et synchronise l'état (`*/2 min`, statut
  de l'image Glance : `queued/saving → active`).
- **Restauration à la création** : on choisit un snapshot terminé ; la VM démarre **directement depuis
  cette image Glance** (boot-from-volume), et cloud-init / cloudbase-init ré-injecte la clé SSH ou le
  mot de passe au nouveau boot.

## Justification

- `createImage` est le mécanisme **natif** d'OpenStack, sans infra supplémentaire (pas de bucket, pas
  de tâche d'export asynchrone) : l'image produite est **directement bootable**.
- Couvre tout le catalogue (Linux et Windows) de façon uniforme, en réutilisant le réconciliateur.

## Conséquences

- (+) Sauvegarde / restauration sur tout le catalogue, sans surface supplémentaire.
- (+) Restauration triviale (l'image de snapshot est un `imageRef` comme un autre).
- (−) Coût de stockage des images de snapshot (volume-snapshot Cinder sous-jacent) — à surveiller.
- (−) Pour une VM **boot-from-volume**, supprimer l'image de snapshot peut laisser un volume-snapshot
  Cinder résiduel → à vérifier / purger (**point ouvert**).

## Alternatives écartées

- **Export OVA / disque téléchargeable** : transférer des Go via un Worker est inadapté (limites
  CPU/mémoire/temps) → retiré du périmètre.
- **Snapshot de volume Cinder direct** (au lieu de `createImage`) : possible, mais `createImage` donne
  une **image bootable** réutilisable telle quelle pour la restauration, plus simple à enchaîner.
