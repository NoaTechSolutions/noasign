#!/usr/bin/env bash
#
# ntssign-restore: downloads a PostgreSQL dump from Cloudflare R2 and restores it.
#
# Companion to backup-postgres-to-r2.sh. SAFE BY DEFAULT — restores into a
# throwaway DB, never the live one, unless you explicitly target another DB.
#
# Required env vars (loaded from ~/apps/ntssign/apps/backend/.env, same as backup):
#   R2_BUCKET               R2 bucket name (ntssign-backups)
#   R2_ENDPOINT             R2 S3-compatible endpoint URL
#   R2_ACCESS_KEY_ID        R2 access key
#   R2_SECRET_ACCESS_KEY    R2 secret key
#   DATABASE_URL            used ONLY as a guard (refuse to overwrite it)
#
# Usage:
#   # Safe restore drill into a scratch DB (default) — validates the backup:
#   ./scripts/restore-postgres-from-r2.sh
#
#   # Restore a specific dump:
#   BACKUP_KEY=backups/prod/ntssign-2026-06-08_03-00-01.dump ./scripts/restore-postgres-from-r2.sh
#
#   # Restore into an explicit target DB:
#   TARGET_DATABASE_URL=postgres://user:pass@host/dbname ./scripts/restore-postgres-from-r2.sh
#
#   # Disaster recovery OVER the live DB (DESTRUCTIVE — requires FORCE=1):
#   TARGET_DATABASE_URL="$DATABASE_URL" FORCE=1 ./scripts/restore-postgres-from-r2.sh
#
# Exit codes: 0 ok · 2 env/var missing · 3 download failed · 4 restore failed
#             5 refused (would overwrite DATABASE_URL without FORCE)

set -Eeuo pipefail

ENV_FILE="${ENV_FILE:-/home/ubuntu/apps/ntssign/apps/backend/.env}"
TMP_DIR="/tmp/ntssign-restore"
SCRATCH_DB="${SCRATCH_DB:-ntssign_restore_test}"

mkdir -p "$TMP_DIR"
log() { echo "[$(date -u +'%Y-%m-%d %H:%M:%S')] $*"; }

# Focused env loader — never executes any value (unlike `source`).
load_env_var() {
  local key="$1" line value
  line=$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | head -n1)
  [ -z "$line" ] && return 1
  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"
  case "$value" in
    \"*\") value="${value:1:${#value}-2}" ;;
    \'*\') value="${value:1:${#value}-2}" ;;
  esac
  printf '%s' "$value"
}

[ -f "$ENV_FILE" ] || { log "ERROR: env file not found: $ENV_FILE"; exit 2; }

R2_BUCKET=$(load_env_var R2_BUCKET)
R2_ENDPOINT=$(load_env_var R2_ENDPOINT)
R2_ACCESS_KEY_ID=$(load_env_var R2_ACCESS_KEY_ID)
R2_SECRET_ACCESS_KEY=$(load_env_var R2_SECRET_ACCESS_KEY)
PROD_DATABASE_URL=$(load_env_var DATABASE_URL || true)

for var in R2_BUCKET R2_ENDPOINT R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  [ -z "${!var:-}" ] && { log "ERROR: required env var missing: $var"; exit 2; }
done

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

# ── Pick the dump (latest by default) ──────────────────────────────────────────
if [ -z "${BACKUP_KEY:-}" ]; then
  log "No BACKUP_KEY given — selecting the latest under backups/prod/"
  BACKUP_KEY=$(aws s3 ls "s3://${R2_BUCKET}/backups/prod/" \
    --endpoint-url "$R2_ENDPOINT" \
    | sort | tail -n1 | awk '{print $4}' | sed 's#^#backups/prod/#')
  [ -z "$BACKUP_KEY" ] || [ "$BACKUP_KEY" = "backups/prod/" ] && {
    log "ERROR: no dumps found under backups/prod/"; exit 3; }
fi
log "Selected dump: $BACKUP_KEY"

DUMP_FILE="${TMP_DIR}/$(basename "$BACKUP_KEY")"
log "Downloading to $DUMP_FILE"
aws s3 cp "s3://${R2_BUCKET}/${BACKUP_KEY}" "$DUMP_FILE" \
  --endpoint-url "$R2_ENDPOINT" --no-progress || { log "ERROR: download failed"; exit 3; }

# ── Resolve target (safe by default) ───────────────────────────────────────────
if [ -z "${TARGET_DATABASE_URL:-}" ]; then
  log "No TARGET_DATABASE_URL — using scratch DB '${SCRATCH_DB}' (safe drill)"
  createdb "$SCRATCH_DB" 2>/dev/null || log "(scratch DB may already exist — continuing)"
  TARGET_DATABASE_URL="postgresql:///${SCRATCH_DB}"
fi

# Guard: refuse to overwrite the live DB unless explicitly forced.
if [ -n "${PROD_DATABASE_URL:-}" ] && [ "$TARGET_DATABASE_URL" = "$PROD_DATABASE_URL" ] && [ "${FORCE:-0}" != "1" ]; then
  log "REFUSED: target equals DATABASE_URL (the live DB). Re-run with FORCE=1 to confirm a destructive restore."
  exit 5
fi

# ── Restore ────────────────────────────────────────────────────────────────────
log "Restoring into: $TARGET_DATABASE_URL"
if ! pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$TARGET_DATABASE_URL" "$DUMP_FILE"; then
  log "ERROR: pg_restore failed"; exit 4
fi

log "Restore complete. Sanity check:"
psql "$TARGET_DATABASE_URL" -c "SELECT count(*) AS documents FROM documents;" -c "SELECT count(*) AS users FROM users;" || true

rm -f "$DUMP_FILE"
log "Done. (If this was a drill, drop the scratch DB: dropdb ${SCRATCH_DB})"
