# GIT VM Portal

Self-service portal that lets organization members request **AWS EC2 virtual machines**,
have an admin approve them, and get SSH access automatically — built end-to-end on
**Cloudflare Workers**.

> Projet scolaire — Satom IT Learning Solutions · Thomas P. & Abderahmane

## ✨ Features

- 🔐 **SSO Microsoft Entra ID** (OIDC, in-Worker, no password stored)
- 🖥️ **Self-service VM requests** from a preset catalog (CPU/RAM)
- ✅ **Admin approval workflow** with notifications
- ⚙️ **Automatic EC2 provisioning** (unique SSH key per VM, public IP, SSH security group)
- 📧 **Transactional emails** (EmailJS) at each step
- 🔑 **Per-VM SSH key**, AES-GCM encrypted at rest, downloadable only by the owner
- 🗑️ **Lifecycle management** — terminate (delete instance + key)
- 🌗 **Light / dark theme**, 🌐 **FR / EN**
- 📊 **Admin dashboard** — stats, filter, approve / reject

## 🧱 Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + TypeScript + Tailwind v4 + TanStack Query + react-i18next |
| Backend | Cloudflare Worker (Hono) — JSON API + scheduled cron |
| Database | Cloudflare D1 (SQLite) |
| Hosting | Cloudflare Workers Static Assets (SPA) |
| Auth | Microsoft Entra ID (OIDC authorization-code flow) |
| Compute | AWS EC2 (region `eu-central-2` / Zurich), signed with `aws4fetch` |
| Email | EmailJS REST API |

## 📁 Structure

```
src/            Cloudflare Worker (API, OIDC, AWS, email, D1)
migrations/     D1 schema migrations
web/            React SPA (built to web/dist, served as static assets)
scripts/        One-off AWS helper scripts (discover/setup/cleanup)
wrangler.jsonc  Worker + bindings config
```

## 🚀 Development

```bash
# install
npm install
npm --prefix web install

# run the worker (API) on :8787
npx wrangler dev

# run the SPA with hot reload (proxies /api to :8787)
npm --prefix web run dev
```

## 🛠️ Build & deploy

```bash
npm --prefix web run build   # build the SPA -> web/dist
npx wrangler deploy          # deploy Worker + assets
```

Secrets are managed with `wrangler secret put` (never committed):
`SESSION_SECRET`, `ENTRA_CLIENT_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`EMAILJS_PRIVATE_KEY`.

## 🗄️ Database

```bash
npx wrangler d1 migrations apply git_vm_portal --remote
```

## 📄 License

Internal educational project — all rights reserved.
