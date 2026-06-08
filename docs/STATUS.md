# NTSsign — Project Status (living snapshot)

**Last updated: 2026-06-08.** Keep this current with every substantive change.
This is the single-glance status doc; deep detail lives in the linked docs and in
[architecture/pending.md](architecture/pending.md) (Linear-tracked backlog).

---

## Environments

| Env | Frontend | Backend | Deploy trigger |
|-----|----------|---------|----------------|
| Local | `localhost:3001` | `localhost:3000` | manual (`npm run dev` / `start:dev`) |
| Staging | `app-staging.ntssign.com` | `api-staging.ntssign.com` | push to **`develop`** → `deploy-staging.yml` (Oracle VM, pm2, runs `prisma migrate deploy`) |
| Prod | `app.ntssign.com` | `api.ntssign.com` | push to **`main`** → `deploy-prod.yml` |
| Landing | `ntssign.com` | — | SiteGround (static) + `deploy-landing.yml` |

Stack: NestJS 11 + Prisma + PostgreSQL 16 (backend), Next.js 16 (frontend),
BoldSign (signatures), Resend (email), Cloudflare (DNS/SSL/R2). See
[architecture/overview.md](architecture/overview.md).

---

## Recently shipped

- **Honest send state (FASE 1)** — receipts flip to `SEND_FAILED` (not phantom
  `SENT`) on synchronous send failure. → [email-delivery-and-bounces.md](architecture/email-delivery-and-bounces.md)
- **Async bounce detection (FASE 2)** — Resend webhook (`POST /webhooks/resend`)
  flips receipts **and** contracts to `SEND_FAILED` on permanent bounce. Verified
  e2e local (receipt+contract) and staging (receipt). On `develop` (commit
  `53ea3f4`). → [email-delivery-and-bounces.md](architecture/email-delivery-and-bounces.md)
- **Payment receipts** — template-driven PDF generation, create/send/resend UI,
  resend cooldown v2, detail view.

---

## In progress / planned

| Item | Status | Doc |
|------|--------|-----|
| **FASE 2 → prod** | pending: owner creates prod Resend webhook + `RESEND_WEBHOOK_SECRET` in prod VM `.env`, then merge `develop`→`main` | [email-delivery-and-bounces.md](architecture/email-delivery-and-bounces.md) |
| **PDF storage in R2** | receipts done + e2e local ✅ + staging ✅; contracts wired (pending real COMPLETED doc); prod bucket pending owner | [pdf-storage-r2.md](architecture/pdf-storage-r2.md) |
| **Receipt reissue (2c)** | ✅ DONE local (backend + frontend), owner-approved; committed local (NOT pushed — goes to staging with 2b). Reissue + direct Void, derived VOID state, full-page watermark over the stored PDF, Actions submenu | [pdf-storage-r2.md](architecture/pdf-storage-r2.md) |
| Schema-driven forms admin panel (NOA-53) | ⏸️ paused (onboarding via DB scripts) | [pending.md](architecture/pending.md) |
| B2B API foundation (NOA-17…) | backlog | [pending.md](architecture/pending.md) |

---

## Infrastructure & operations

| System | State | Doc |
|--------|-------|-----|
| Prod DB backup → R2 (`ntssign-backups`, daily 03:00 UTC) | LIVE | [deployment/backups.md](deployment/backups.md) |
| Deploy pipelines (staging/prod/landing) | LIVE | [deployment/](deployment/) |
| SSL/HTTPS (Let's Encrypt, auto-renew) | LIVE | [deployment/production.md](deployment/production.md) |

### Open ops gaps (see backups.md "Who does what")

- Backup **retention** rule not yet set in R2 (dumps accumulate) — owner adds a
  30-day lifecycle rule.
- Backup **restore** documented; run the SAFE restore drill periodically.
- Backup **cron** live (bucket has dumps) but crontab not verifiable from repo
  (NOA-127).
- Staging DB backup: intentionally skipped (reproducible from seeds).

---

## Conventions worth knowing

- **Backend secrets live in each VM's `.env`, manually** — NOT GitHub Secrets.
  GitHub Secrets are only frontend build-time (`NEXT_PUBLIC_*`) + landing
  (SiteGround/Cloudflare). Applies to `RESEND_*`, `BOLDSIGN_*`, `R2_*`, etc.
- **Webhook/storage isolation per env** — separate Resend webhook endpoints per
  env; separate R2 buckets per env. Never repoint/share across envs.
- **Tracking:** Linear (project NTSSign, `NOA-XX`).
- **Migrations:** CI runs `prisma migrate deploy`. Local DB has checksum drift —
  never `migrate dev`; add migrations via `db execute` + `migrate resolve`.
