# Mémoire projet — GIT VM Portal

> Faits durables non déductibles du seul code. Pour l'équipe et la continuité de l'assistance IA.
> Tenir à jour. Dernière màj : 2026-06-25.

## Identité
- **Projet** : plateforme self-service de provisioning de VM pour le Geneva Institute of Technology (GIT).
- **Prod** : `https://git-vm-portal-openstack.thomas-prudhomme.workers.dev` · **Repo** : `https://github.com/Thomas-TP/GIT-VM-OpenStack`.
- Contexte canonique : [`AGENTS.md`](../AGENTS.md).

## Décisions structurantes
- **Stack = OpenStack (Infomaniak Public Cloud) + Cloudflare Workers + D1** — portage depuis AWS EC2 (ADR 0010).
- Toute logique de cycle de vie passe par le **réconciliateur cron** (ADR 0004).
- À l'échéance, la VM est **supprimée** (terminate), pas seulement arrêtée (ADR 0008).
- Ansible via cloud-init `ansible-pull` (ADR 0003). IaC : API OpenStack directe (Keystone/Nova/Glance/Neutron).
- Secrets via Wrangler Secrets + chiffrement AES-GCM au repos (ADR 0006).
- Catalogue : flavors Infomaniak (perf × stockage), **boot-from-volume** (disque arbitraire), Windows en RDP (ADR 0007).

## Spécificités OpenStack / Infomaniak (à retenir)
- **IP publique** : attache directe au réseau partagé `ext-net1` (pas de floating IP).
- **config_drive obligatoire** : le service metadata (169.254.169.254) n'est pas routable sur `ext-net1` → sans config_drive, clé SSH (Linux) et mot de passe (Windows) ne sont pas injectés.
- **Security group** `git-vm-portal` requis (le `default` refuse l'ingress).
- **Boot-from-volume** : flavor `<stem>-disk0` + volume Cinder (`delete_on_termination`).
- **Coût réel** : CloudKitty (`rating`) — `v2/summary?groupby=type` OK ; par VM/utilisateur = 500 (non exposé).
- **Idle-stop désactivé** (pas de télémétrie CPU fiable). Une VM **éteinte reste facturée** (compute réservé) — seule la suppression arrête les frais.

## État connu (2026-06-25)
- **Login OIDC Entra fonctionnel** (app *GIT-VM-OpenStack*, tenant partagé).
- Déploiement via **Cloudflare Workers Builds** (push sur `main` → migrate + deploy). Pas la CI GitHub.
- Linux SSH **confirmé en live** ; boot-from-volume **confirmé**. Windows RDP, install cours, snapshot volume-backed, restauration : **à valider** (voir AGENTS §14).

## Préférences de travail (équipe)
- **Ne rien casser** de l'existant fonctionnel ; ajouter et corriger, pas réécrire.
- Attendu de l'assistance : analyser, proposer, optimiser, corriger, recommander — puis exécuter.
- Documentation et ADR en **français**.
- Livraison par **PR** mergées sur `main` (déploiement auto Cloudflare).
