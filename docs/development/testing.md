# Testing — how it works, what it covers, what it does NOT

_Verified against `apps/backend/test/` + `.github/workflows/ci.yml` — 2026-07-17._

## The three CI layers

`ci.yml` runs on every push and PR to `main` / `develop`, three jobs in parallel:

| Job | Command | What it is |
|---|---|---|
| Backend unit | `npm test` | Jest, service/logic tests with **mocked** Prisma. Fast. |
| Backend e2e (real DB) | `npm run test:e2e` | Boots the **real** `AppModule` against an **isolated Postgres** (`*_test`), drives real HTTP endpoints. |
| Frontend lint | `npm run lint` | ESLint on the Next.js app. |

The e2e job exists because **a mocked DB can be green while the real thing is broken**. It spins up a `postgres:16` service container (`POSTGRES_DB=noasign_test`) and runs the suite against it.

### Doc-pinning characterization tests

Some unit tests exist to keep a **doc** honest, not to test behavior. Example:
`src/documents/lifecycle-invariants.spec.ts` asserts the `DocumentStatus` enum matches
what `docs/architecture/document-lifecycle.md` documents (and that `VOID` is intentionally
absent) — if the code drifts from the doc, the test turns **red** with a message pointing
back to the doc. This is the cheap half of "how does a business-rule doc not lie?": the
**mechanical** claims get pinned by a test; the prose still needs discipline. Fast, no DB.

---

## > ⚠️ What the e2e tests do NOT cover

> **They never touch the frontend.** The e2e suite is **backend / API-only**: `harness.ts` boots the NestJS `AppModule` and drives it over HTTP with `supertest`. There is **no browser, no Next.js, no Playwright/Cypress** — the frontend code is never loaded.
>
> **A green e2e run does NOT prove the owner sees the change.** The tests hit the same *endpoints* the frontend calls, but a rendering or wiring bug in the UI — a panel that doesn't mount, a component reading the wrong field — sails past them untouched. To confirm a change is really visible, **verify the actual component that mounts the view**, not just that the API returns 200. (This cost a full round on M1 — don't repeat it.)

## Coverage map — what's caught, and what's caught by NOBODY

The tools catch **different** things — no single one covers everything. 4 of the 5 bug families this week were **frontend**, and the 🔴 rows below are exactly where they lived. Know the gaps *before* trusting a green run:

| Bug class | Real example | Caught by | Status |
|---|---|---|---|
| Backend lifecycle invariants (delete-guard, void→`supersededAt`, enum values) | an endpoint routing Delete→Cancelled | `contract-lifecycle` + `receipt-lifecycle` e2e + `lifecycle-invariants` unit | ✅ covered |
| **Frontend action routing** (which endpoint the kebab calls) | the 2026-07-14 lie: Discard→cancel | Vitest (`getAvailableActions`) | 🔴 **NO test — caught by nobody** |
| **Real wiring** (does the app actually MOUNT the component?) | M1: `DocumentVersionTimeline` was perfect but never mounted | Playwright (browser) | 🔴 **NO test — caught by nobody** |
| Frontend logic / validation (optional vs required fields) | R1 | Vitest + Testing Library | 🔴 **NO test** |
| CSS / layout / real render | J4 (modal showed a stale photo) | Playwright / visual | 🔴 **NO test** |

> ⚠️ **The 🔴 rows are the point of this table.** A green backend suite does **not** mean the frontend works. The `receipt-lifecycle` candado pins the delete/void ENDPOINTS — it does **not** know which endpoint the frontend's kebab calls. A re-drift of the 2026-07-14 routing bug would leave every backend test green. That gap closes only with **Vitest (`getAvailableActions`)** for the routing and **Playwright** for the real mount — both pending.

---

## The e2e specs (today)

`apps/backend/test/e2e/*.e2e-spec.ts`:

| Spec | Exercises |
|---|---|
| `smoke.e2e-spec.ts` | Proves the harness: boots the real app on the `*_test` DB, serves public `GET /version`, runs a real `document.count()`, asserts `GET /users/me` → 401 without a token. |
| `contract-lifecycle.e2e-spec.ts` | Drives a contract `DRAFT → SENT → SIGNED → COMPLETED` through the real endpoints + the BoldSign webhook (`POST /boldsign/webhooks/events`), asserting the real persisted `DocumentStatus`; also asserts sending a non-DRAFT is rejected. |
| `receipt-lifecycle.e2e-spec.ts` | **BACKEND-invariants candado for receipts** — pins the kill-action ENDPOINT behavior against `document-lifecycle.md`: `DELETE`→soft-delete (`deletedAt`, **not** Cancelled), void→`supersededAt`+status stays `SENT`, plus the guards (can't delete a SENT receipt, can't void a DRAFT). Fails with a message pointing to the doc. ⚠️ Backend only — see the coverage map for what it does **not** cover. |

Support (not specs): `harness.ts` (boots the real `AppModule`; mocks **only** BoldSign / email / R2), `fixtures.ts` (`resetDb`, `seedContractTenant`), `env-setup.ts` (jest `setupFiles`), `global-setup.js` (jest `globalSetup`).

---

## Running e2e locally

**Precondition: a Postgres database whose name ends in `_test` must EXIST.** Create it once:

```bash
createdb noasign_test        # or via your Postgres client
```

Then run the suite from `apps/backend/`:

```bash
# Option A — point at the test DB explicitly:
TEST_DATABASE_URL=postgresql://user:pass@localhost:5433/noasign_test npm run test:e2e

# Option B — let it derive `<db>_test` from your existing DATABASE_URL:
npm run test:e2e
```

**How the DB is resolved** (`env-setup.ts` + `global-setup.js`):
1. `TEST_DATABASE_URL` if set (CI uses this).
2. else `DATABASE_URL` with `_test` appended to the db name (local convenience).

`global-setup.js` runs once and does `prisma db push --skip-generate --accept-data-loss` to sync the schema — **`db push`, not `migrate`**, so the dev DB's migration-history drift never touches the test DB.

> **e2e runs SERIALLY** (`maxWorkers: 1` in `jest-e2e.json`). Every spec shares the one `*_test` DB and `TRUNCATE`s it in `beforeEach`, so parallel jest workers would wipe each other's data mid-test — a flaky failure that only appears once a second resetting spec exists (it did, when `receipt-lifecycle` was added). Don't remove `maxWorkers: 1` without first giving each worker its own database.

> **Safety guard.** Both setup files **hard-refuse to run** unless the resolved DB name ends in `_test`. This is deliberate — it makes it impossible for an e2e run (which resets/pushes the schema with `--accept-data-loss`) to ever hit your real dev database.

---

## Other test commands

| Command | What it does |
|---|---|
| `npm test` | Backend unit tests (mocked Prisma). |
| `npm run test:e2e` | Backend e2e on a real `*_test` DB (above). |
| `npm run test:smoke` | Hits a running API (`scripts/smoke-api.mjs`) — a live smoke check, not part of CI's Jest jobs. |
| `npm run test:cov` | Unit tests with coverage. |
