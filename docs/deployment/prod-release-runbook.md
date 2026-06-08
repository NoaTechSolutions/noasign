# Prod release runbook — `develop` → `main` (MAJOR release)

⚠️ This is a **major release**: prod (`main`) last deployed **2026-04-22**;
`develop` is **~167 commits / 18 migrations** ahead (Customers module, lockout +
audit, payment receipts, FASE 1+2 email bounces, R2 PDF storage, receipt
reissue/void, mobile pass). Run it in a **low-traffic window**, step by step.

**Legend:** **[Owner]** = on the prod VM via SSH / Cloudflare + Resend dashboards.
**[DEV]** = git/gh + curl. Do steps in order; verify each before the next.

Prod hosts: backend `https://api.ntssign.com`, frontend `https://app.ntssign.com`.
VM backend env: `~/apps/ntssign/apps/backend/.env`. Repo on VM: `~/apps/ntssign`.

---

## 0. Freeze [DEV]
- Stop merging to `develop` until the release is done (no moving target).
- Announce the window.

## 1. Fresh prod DB backup — BEFORE anything [Owner, SSH]
```bash
cd ~/apps/ntssign
bash scripts/backup-postgres-to-r2.sh
```
**Verify:** the script ends with `Backup complete: s3://ntssign-backups/backups/prod/ntssign-<TS>.dump (<size>)` and exit code 0. Double-check the object exists:
```bash
cd ~/apps/ntssign/apps/backend
RB=$(grep -E '^R2_BUCKET=' .env | cut -d= -f2-); RE=$(grep -E '^R2_ENDPOINT=' .env | cut -d= -f2-)
AWS_ACCESS_KEY_ID=$(grep -E '^R2_ACCESS_KEY_ID=' .env | cut -d= -f2-) \
AWS_SECRET_ACCESS_KEY=$(grep -E '^R2_SECRET_ACCESS_KEY=' .env | cut -d= -f2-) \
AWS_DEFAULT_REGION=auto aws s3 ls "s3://$RB/backups/prod/" --endpoint-url "$RE" | tail -3
```
✅ Gate: a `.dump` with today's timestamp is listed. **Do not proceed without it.**

## 2. Orphan-customers pre-check (for the userId NOT NULL backfill) [Owner, SSH]
Migration `add_customer_user_owner` backfills `customers.userId` from
`createdByUserId`, else the oldest MASTER in the tenant, then enforces NOT NULL.
A customer with NEITHER would break the migration. Find them:
```bash
cd ~/apps/ntssign/apps/backend
psql "$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)" -c "
SELECT c.id, c.\"companyProfileId\", c.\"createdByUserId\"
FROM \"customers\" c
WHERE c.\"createdByUserId\" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM \"users\" u
    WHERE u.\"companyProfileId\" = c.\"companyProfileId\" AND u.\"role\" = 'MASTER'
  );"
```
✅ Gate: **0 rows** → safe. If rows appear → STOP: set a `createdByUserId` on
those customers, or ensure a MASTER user exists in each listed tenant, before
proceeding. (If prod has no `customers` table/rows yet, this returns 0 — fine.)

## 3. Create prod R2 bucket + token + Resend webhook [Owner, dashboards]
- **Cloudflare → R2:** create bucket **`ntssign-docs-prod`**. Manage API Tokens →
  create token **Object Read & Write**, scoped **only** to `ntssign-docs-prod`
  (NOT `ntssign-backups`, NOT docs-staging). Save Access Key ID + Secret + the
  Account ID.
- **Resend → Webhooks → Add endpoint:** URL **`https://api.ntssign.com/webhooks/resend`**,
  events **`email.bounced`** (+ `email.complained`). Copy the **`whsec_`** signing secret.

✅ Gate: bucket exists; token saved; webhook listed.

## 4. Set the new env vars on the prod VM [Owner, SSH]
Edit `~/apps/ntssign/apps/backend/.env` and **add** (do NOT touch `R2_BUCKET` /
`R2_*` of the backup, or any existing var):
```env
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxx
R2_DOCS_BUCKET=ntssign-docs-prod
R2_DOCS_ACCESS_KEY_ID=xxxxxxxx
R2_DOCS_SECRET_ACCESS_KEY=xxxxxxxx
R2_ACCOUNT_ID=xxxxxxxx
```
No reload needed now — the current (April) backend ignores them; the deploy in
step 5 reloads and picks them up.
**Verify (no secrets printed):**
```bash
cd ~/apps/ntssign/apps/backend
for k in RESEND_WEBHOOK_SECRET R2_DOCS_BUCKET R2_DOCS_ACCESS_KEY_ID R2_DOCS_SECRET_ACCESS_KEY R2_ACCOUNT_ID; do
  printf "%s=%s\n" "$k" "$(grep -cE "^$k=" .env)"; done
```
✅ Gate: every key prints `=1`. (None are fail-fast, so a typo won't crash boot —
but it would silently disable that feature; the `=1` check guards against that.)

## 5. Merge `develop` → `main` → deploy [DEV, git]
```bash
git fetch origin
gh pr create --base main --head develop \
  --title "Release: develop → main (receipts, FASE 1+2, R2, reissue/void, mobile)" \
  --body "Major release. See docs/STATUS.md. 18 additive migrations; new env set on prod VM."
# review, then merge (squash NOT recommended — keep history):
gh pr merge --merge --admin
```
This pushes `main` → `deploy-prod.yml` runs `prisma migrate deploy` (the 18
migrations) in the build, then `pm2 reload`.
**Verify:**
```bash
gh run watch "$(gh run list --workflow=deploy-prod.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```
✅ Gate: run = success.

## 6. Post-deploy verification [DEV + Owner]
**[DEV] migrations applied** (in the run log):
```bash
gh run view <run-id> --log | grep -iE "Applying migration|All migrations have been successfully applied"
```
✅ Expect the 18 names + "All migrations have been successfully applied."

**[DEV] services + assets:**
```bash
curl -s -o /dev/null -w "backend /users/me -> %{http_code}\n" https://api.ntssign.com/users/me   # 401
curl -s -o /dev/null -w "frontend / -> %{http_code}\n"        https://app.ntssign.com            # 200
curl -s -o /dev/null -w "pdf worker -> %{http_code}\n"        https://app.ntssign.com/pdf.worker.min.mjs  # 200
curl -s -o /dev/null -w "bounce webhook -> %{http_code}\n" -X POST https://api.ntssign.com/webhooks/resend \
  -H "Content-Type: application/json" -d '{}'                                                   # 403 (live + rejecting unsigned)
```
✅ Gate: 401 / 200 / 200 / 403.

**[Owner] webhook secret actually loaded** (pm2 logs on the VM): after the 403
probe above, the log should show `signature verification failed: ...` (secret IS
loaded), NOT `RESEND_WEBHOOK_SECRET not set`:
```bash
pm2 logs ntssign-backend --lines 50 --nostream | grep -i "RESEND_WEBHOOK_SECRET\|signature verification"
```

**[Owner] WorldPaver intact** (real data untouched):
```bash
cd ~/apps/ntssign/apps/backend
psql "$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)" -c "
SELECT d.\"documentNumber\", d.status, d.\"supersededAt\"
FROM \"documents\" d
JOIN \"company_profiles\" cp ON cp.id = d.\"companyProfileId\"
WHERE cp.\"companyName\" ILIKE '%World Paver%'
ORDER BY d.\"createdAt\" DESC LIMIT 10;"
```
✅ Gate: statuses unchanged, `supersededAt` all NULL.

## 7. Smoke test — master account [Owner, browser]
On `https://app.ntssign.com`, logged in as the master account:
1. Dashboard loads (no errors); Customers list loads.
2. Open an existing document → **PDF tab renders** (canvas viewer).
3. Create a test receipt → send → it shows SENT; open it → PDF renders.
4. (Optional) Reissue/Void the test receipt → VOID state + watermark.
✅ Gate: all work, no console/server errors.

## 8. If something fails — fix-forward (preferred) + rollback caveat
- **Fix-forward (default):** patch on `develop` → merge to `main` → redeploy.
  Fastest and safe with additive migrations.
- **Rollback caveat:** reverting code (revert the merge on `main` + push) leaves
  the 18 migrations applied. Most are harmless to old code, BUT
  `customers.userId` is now `NOT NULL` — April code that inserts a customer
  without `userId` would violate it. So a **code-only rollback can break customer
  creation**. If a true rollback is required, do a **full restore**: revert code
  AND `pg_restore` the Step-1 `.dump` (see
  [backups.md → Restore](./backups.md#restore-procedure), disaster-recovery path).
  Prefer fix-forward unless data is corrupted.

---

### Quick gate checklist
1 backup ✅ → 2 no orphans ✅ → 3 bucket+token+webhook ✅ → 4 env `=1` ✅ →
5 deploy green ✅ → 6 migrations+401/200/200/403+WorldPaver ✅ → 7 smoke ✅.
