# Backups — Prod PostgreSQL → Cloudflare R2

**Status: LIVE** (the `ntssign-backups` R2 bucket already contains `backups/prod/*.dump`).

This documents the existing production database backup system, discovered while
setting up R2 for PDF persistence (it was previously undocumented outside the
script header).

> ⚠️ Do not repurpose this system's env vars or bucket for the PDF-storage
> feature. See [Interaction with PDF storage](#interaction-with-pdf-storage-r2).

---

## What it does

Script: [`scripts/backup-postgres-to-r2.sh`](../../scripts/backup-postgres-to-r2.sh)

- `pg_dump` of the **prod** PostgreSQL DB — custom format, `--compress=9`,
  `--no-owner --no-privileges`.
- Uploads the dump to Cloudflare R2 via the **`aws` CLI** (`aws s3 cp`
  `--endpoint-url $R2_ENDPOINT`).
- **Schedule:** daily at **03:00 UTC** via cron on the prod VM (the crontab entry
  lives on the prod VM; TODO: capture the exact install steps in this repo).
- Concurrency-locked (`flock`), tees output to `~/logs/ntssign-backup/`, prunes
  local logs older than 14 days. The remote dumps in R2 are **not** auto-pruned
  by this script (retention is whatever R2 lifecycle rules / manual cleanup
  apply — see Gaps below).

### Destination

- Bucket: **`ntssign-backups`** (env var `R2_BUCKET`).
- Object key: `backups/prod/ntssign-<UTC-timestamp>.dump`.

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | another instance running (lock held) |
| 2 | env file missing or a required var unset |
| 3 | `pg_dump` failed |
| 4 | R2 upload failed |

---

## Configuration (prod VM `.env`)

Loaded from `~/apps/ntssign/apps/backend/.env` (the same manual, gitignored
backend env file — **not** GitHub Secrets):

```env
DATABASE_URL=postgres://…            # prod DB connection string
R2_BUCKET=ntssign-backups
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
```

The script maps `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` to the
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` names the `aws` CLI expects, with
`AWS_DEFAULT_REGION=auto`.

> These R2 credentials **already exist on the prod VM** — they predate the PDF
> work. Their token scope (bucket-scoped vs account-wide) is set in the
> Cloudflare dashboard and should be confirmed by the owner.

---

## Interaction with PDF storage (R2)

The upcoming **PDF persistence** feature (receipts + signed contracts) also uses
R2, in the **same Cloudflare account**. To avoid breaking this backup:

| Concern | Rule for the PDF feature |
|---------|--------------------------|
| **Env var `R2_BUCKET`** | ⚠️ **Owned by the backup.** PDF storage MUST use a **different** var (e.g. `R2_DOCS_BUCKET`). Reassigning `R2_BUCKET` would redirect backups to the docs bucket. |
| **Buckets** | PDFs use **separate** buckets (`ntssign-docs-local/-staging/-prod`). Never write PDFs into `ntssign-backups`. |
| **Credentials** | Use **separate** R2 API token/keys for PDFs (e.g. `R2_DOCS_ACCESS_KEY_ID` / `R2_DOCS_SECRET_ACCESS_KEY`), scoped to the docs buckets only — don't reuse the backup token (whose scope may be backups-only anyway). |
| **Endpoint** | `R2_ENDPOINT` is account-level and shared; reading it read-only is fine. |
| **Tooling** | Backup uses the `aws` CLI; PDF feature uses `@aws-sdk/client-s3`. No conflict. |

Net: same account, **disjoint** bucket + var names + credentials → no
interference.

---

## Restore procedure

> A backup is only as good as a **tested** restore. The dumps are PostgreSQL
> **custom format** (`pg_dump --format=custom`), so they restore with
> `pg_restore` (NOT `psql`).

> **Helper script:** [`scripts/restore-postgres-from-r2.sh`](../../scripts/restore-postgres-from-r2.sh)
> automates all of the below — safe by default (restores into a throwaway
> `ntssign_restore_test` DB unless you set `TARGET_DATABASE_URL`, and refuses to
> overwrite the live DB without `FORCE=1`). The manual steps follow for reference
> / when you want full control.
>
> ```bash
> # Safe restore drill (latest dump → scratch DB):
> ./scripts/restore-postgres-from-r2.sh
> # Specific dump:
> BACKUP_KEY=backups/prod/ntssign-<TS>.dump ./scripts/restore-postgres-from-r2.sh
> ```

### 1. Download a dump from R2

```bash
# On any machine with the R2 creds (or the VM, which already has them in .env).
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION=auto

# List available dumps (newest last)
aws s3 ls s3://ntssign-backups/backups/prod/ --endpoint-url "$R2_ENDPOINT"

# Download the one you want
aws s3 cp s3://ntssign-backups/backups/prod/ntssign-<TIMESTAMP>.dump ./restore.dump \
  --endpoint-url "$R2_ENDPOINT"
```

### 2a. SAFE restore test (recommended — validates the backup, zero risk)

Restore into a **throwaway** database, never the live one:

```bash
# Create a scratch DB (same server is fine; it's isolated)
createdb ntssign_restore_test

pg_restore --no-owner --no-privileges \
  --dbname="postgresql://USER:PASS@localhost:5432/ntssign_restore_test" \
  ./restore.dump

# Sanity-check it loaded (expect non-zero, sane counts)
psql "postgresql://USER:PASS@localhost:5432/ntssign_restore_test" \
  -c "SELECT count(*) FROM documents; SELECT count(*) FROM users;"

# Tear down
dropdb ntssign_restore_test
```

If this completes with sane row counts, the backup is **provably restorable**.
Run this drill periodically (e.g. quarterly) — see [DEV vs owner](#who-does-what).

### 2b. Real disaster recovery (restore OVER prod — destructive, last resort)

⚠️ Only in an actual recovery. Stop the backend first so nothing writes mid-restore.

```bash
pm2 stop ntssign-backend
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$PROD_DATABASE_URL" ./restore.dump
pm2 start ntssign-backend
```

`--clean --if-exists` drops existing objects before recreating them. Double-check
you're pointed at the right DB before running.

---

## Retention policy

**Problem today:** the script prunes only local *logs*; the `.dump` objects in R2
are **never pruned** → they accumulate forever (cost + clutter).

**Recommendation: an R2 object-lifecycle rule (server-side, no script to maintain).**
Keep **30 daily dumps** (~1 month of point-in-time recovery). At ~2 MB/dump that's
~60 MB — trivially inside the R2 free tier.

- **Owner (R2 dashboard):** R2 → `ntssign-backups` → **Settings → Object lifecycle
  rules → Add rule**: prefix `backups/prod/`, action **Delete** objects **30 days**
  after creation.

Alternative (if lifecycle rules aren't desired): add a prune step to the script
after upload — `aws s3 ls` the prefix, delete objects older than N days. The
lifecycle rule is preferred (server-side, survives script changes, can't fail the
backup run).

---

## Staging backup — recommendation: **not needed**

Honest take: **staging does not need backups.** Its data is fully reproducible
from seeds — the deploy workflow has a gated one-shot seed
(`seed_test_users=true`) that rebuilds the CONSTRUCTION_CONTRACT type, World
Pavers tenant, test users, and the receipt template. There is no
irreplaceable data in staging worth a nightly `pg_dump`.

If at some point staging accumulates manual test data someone cares about, a
**weekly** dump (same script, `ENV_FILE` pointed at the staging VM `.env`, bucket
prefix `backups/staging/`) would suffice — but that's a "when needed", not now.

---

## Who does what

| Gap | DEV (code/docs) | Owner (VM / R2 dashboard) |
|-----|-----------------|---------------------------|
| **Restore** | ✅ Documented + helper script `scripts/restore-postgres-from-r2.sh` (safe by default). | Run the SAFE restore drill periodically (needs DB + R2 creds on the VM). |
| **Retention** | Can add a prune step to the script if lifecycle isn't used. | Add the **R2 lifecycle rule** (30d, prefix `backups/prod/`) — dashboard, ~2 min. |
| **Live cron** | — | Confirm the crontab entry exists; bucket has dumps so it's running. |
| **Staging backup** | — | Decision: skip (reproducible from seeds). |
