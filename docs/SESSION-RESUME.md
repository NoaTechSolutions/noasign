# Session Resume — Billing/Receipts + Signature Page

_Last updated: 2026-06-29. Read this first to continue exactly where we left off._

## ✅ Already on STAGING (pushed to `develop`, deploy OK)

The billing/receipts UI lot — commits `62be4de`, `eca5fee`, `937b0ec`, `a8772fe`:
recipient column (receipts-only), single status formatter, account-aware
WelcomeCard + receipts layout + flicker fix + plan focus-refetch, and
anti-downgrade by real contract usage. Staging verified: front `app-staging.ntssign.com`
**200**, back `api-staging.ntssign.com` **401**, migrations **"No pending migrations to apply"**.

## 🟡 Committed LOCALLY today, NOT pushed (await owner approval before staging)

- `fix(billing): align contract overage to per-plan pricing` — PLAN_DEFAULTS
  `contractOveragePrice` (4/3.5/2.5/1.5, unlimited→0, PPC 12), `set-tenant-plan.js`
  seeds it, schema default → 3.50, conservative `backfill-overage.js`.
  **Backfill ALREADY APPLIED in local** (2 LAUNCH $5→$3.50; 0 left at $5).
- `feat(leads): public lead-capture endpoint and table` — `Lead` model + table,
  `POST /public/leads` (no auth, rate-limited).
- `feat(signature): redesign post-signature confirmation page` — NTSsign-branded
  confirmation + download + lead form. **⚠️ NOT APPROVED.**

## 📌 To resume next session

1. **Signature confirmation page is NOT approved** — the owner wants to improve it
   visually. Details come next session. Files:
   `apps/frontend/app/signature-complete/{page,DownloadSignedCopy,LeadCaptureForm}.tsx`.
   Local test URLs (tokens valid ~7 days, served at `localhost:3001`):
   - (a) COMPLETED (download button): mint a token for doc
     `45d828b1-077e-48a6-95a1-c2753c7b9712` — HMAC-SHA256 over
     `base64url({v:1,p:'signature-complete',documentId,exp})` with `PUBLIC_LINK_SECRET`.
   - (b) "Preparing" state: token for a non-existent documentId → 404 → the page
     shows the Preparing pill + poll (the real flow can't be cleanly simulated
     locally — the non-completed path force-syncs with BoldSign).

2. **New migrations PENDING staging** (apply via `migrate deploy` when approved):
   - `20260629120000_align_overage_default` (overage column default 5.00 → 3.50)
   - `20260629130000_add_leads_table`
   Both already applied in LOCAL via `db execute` + `migrate resolve`.

3. **Overage is DISPLAY-ONLY** — no payment processor reads it (only
   `billing.service.ts` estimatedOverageCost). No automated overcharge happened;
   if anyone invoiced manually off the shown estimate, that's external to check.

4. **Sentry release stays PARKED for prod** (on `develop`, awaiting the prod
   off-hours window). This session touched staging only — **prod untouched**.

5. **Local-only (NOT versioned):** `scripts/setup-billing-test-tenants.js` and
   `scripts/seed-receipts-test-data.js` (billingtest.local / secret123 test
   tenants, incl. an INDIVIDUAL receipts user for the WelcomeCard persona review).
