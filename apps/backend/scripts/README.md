# Backend scripts

One-off operational + local-dev scripts. Run from `apps/backend` with the
backend built (`npm run build`) and `DATABASE_URL` set. The data scripts load
`.env` via `dotenv`.

> ⚠️ The local seed scripts use the throwaway test password `secret123` for the
> fixtures they create. That's a LOCAL test credential, not a real secret — none
> of these scripts embed production secrets.

## Local test fixtures (review the billing/receipts UI by hand)

| Script | What it does |
|---|---|
| `setup-billing-test-tenants.js` | Creates 4 loginable test tenants on different plans (STARTER, PRO_UNLIMITED, two RECEIPTS_ONLY — one business, one individual) at `*@billingtest.local` / `secret123` (ADMIN). Idempotent (fixed ids/emails). Seeds plan + contract + receipt fields from `PLAN_DEFAULTS`. Run this first. |
| `seed-receipts-test-data.js` | Seeds 6 receipts in mixed statuses (SENT / DRAFT / SEND_FAILED / VOID) for the two RECEIPTS_ONLY test tenants so the receipts dashboard shows real numbers. Idempotent (fixed ids — only its own rows). Requires `setup-billing-test-tenants.js` first. |
| `seed-local-documents.js` | Seeds local contract documents. |
| `seed-locked-users.js` / `unseed-locked-users.js` | Seed / remove locked-user fixtures. |

## Operational one-shots (owner-gated, DRY_RUN by default)

| Script | What it does |
|---|---|
| `set-tenant-plan.js` | Assigns a plan + receipt fields to a tenant from `PLAN_DEFAULTS`. Backend half of the anti-downgrade lock (blocks RECEIPTS_ONLY when the tenant has real contracts). `DRY_RUN=true` by default. |
| `backfill-overage.js` | Corrects tenants stuck on the leaked `$5` overage default to their plan's canonical rate. Only touches `overagePrice === 5`; never touches deliberate overrides. `DRY_RUN=true` by default. |

## Other

`bootstrap-local-dev.js`, `bootstrap-production-master.js`, `seed-staging-demo.js`,
and the `test-*.mjs` / `smoke-api.mjs` helpers are documented in their own header
comments.
