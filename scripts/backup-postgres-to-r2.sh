#!/usr/bin/env bash
#
# ntssign-backup: dumps the prod PostgreSQL database and uploads to Cloudflare R2.
#
# Runs daily at 03:00 UTC via cron (see install steps in NOA-127).
#
# Required env vars (loaded from ~/apps/ntssign/apps/backend/.env):
#   DATABASE_URL            postgres:// connection string
#   R2_BUCKET               R2 bucket name (e.g. ntssign-backups)
#   R2_ENDPOINT             R2 S3-compatible endpoint URL
#   R2_ACCESS_KEY_ID        R2 access key
#   R2_SECRET_ACCESS_KEY    R2 secret key
#
# Exit codes:
#   0  success
#   1  another instance is running (lock held)
#   2  env file missing or required var unset
#   3  pg_dump failed
#   4  R2 upload failed

set -Eeuo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
ENV_FILE="${ENV_FILE:-/home/ubuntu/apps/ntssign/apps/backend/.env}"
LOG_DIR="${LOG_DIR:-/home/ubuntu/logs/ntssign-backup}"
LOCK_FILE="/tmp/ntssign-backup.lock"
TMP_DIR="/tmp/ntssign-backup"

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "$LOG_DIR" "$TMP_DIR"
TIMESTAMP=$(date -u +%Y-%m-%d_%H-%M-%S)
LOG_FILE="${LOG_DIR}/backup-${TIMESTAMP}.log"
DUMP_FILE="${TMP_DIR}/ntssign-${TIMESTAMP}.dump"

log() {
  echo "[$(date -u +'%Y-%m-%d %H:%M:%S')] $*"
}

cleanup() {
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

# Tee all output (stdout + stderr) to both terminal and log file
exec > >(tee -a "$LOG_FILE") 2>&1

log "Starting backup (timestamp ${TIMESTAMP})"

# ── Concurrency lock ──────────────────────────────────────────────────────────
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  log "ERROR: another backup is running (lock held)"
  exit 1
fi

# ── Load env ──────────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  log "ERROR: env file not found: $ENV_FILE"
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for var in DATABASE_URL R2_BUCKET R2_ENDPOINT R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  if [ -z "${!var:-}" ]; then
    log "ERROR: required env var missing: $var"
    exit 2
  fi
done

# Map R2 creds to the env names aws-cli expects
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

# ── Dump ──────────────────────────────────────────────────────────────────────
log "Dumping database to ${DUMP_FILE}"
if ! pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE" \
  "$DATABASE_URL"; then
  log "ERROR: pg_dump failed"
  exit 3
fi

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
log "Dump created: $DUMP_SIZE"

# ── Upload to R2 ──────────────────────────────────────────────────────────────
S3_KEY="backups/prod/$(basename "$DUMP_FILE")"
S3_URI="s3://${R2_BUCKET}/${S3_KEY}"

log "Uploading to ${S3_URI}"
if ! aws s3 cp "$DUMP_FILE" "$S3_URI" \
  --endpoint-url "$R2_ENDPOINT" \
  --no-progress; then
  log "ERROR: R2 upload failed"
  exit 4
fi

log "Backup complete: ${S3_URI} (${DUMP_SIZE})"

# ── Prune local log files older than 14 days ──────────────────────────────────
find "$LOG_DIR" -name 'backup-*.log' -type f -mtime +14 -delete 2>/dev/null || true
