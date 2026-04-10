#!/usr/bin/env bash
# =============================================================================
# NTSsign — Server-side deploy script
# =============================================================================
# Runs DIRECTLY on the target server (staging or prod).
# Triggered from your local machine via:
#
#   Staging: ssh -i ~/.ssh/staging_vm ubuntu@163.192.12.220 \
#              "cd /home/ubuntu/apps/ntssign && bash scripts/deploy.sh"
#
#   Prod:    ssh -i ~/.ssh/prod_vm ubuntu@<PROD_IP> \
#              "cd /home/ubuntu/apps/ntssign && bash scripts/deploy.sh"
#
# What it does:
#   1. Pre-flight  — verifies git state and pending changes
#   2. Snapshot    — saves rollback point (commit hash + dist backup)
#   3. Pull        — fetches and merges latest from origin/main
#   4. Deps        — runs npm ci only when package-lock.json changed
#   5. Build       — backend (NestJS) → migrations (Prisma) → frontend (Next.js)
#   6. Reload      — zero-downtime PM2 graceful reload
#   7. Health      — verifies both services respond on their ports
#   8. Rollback    — auto-restores previous build on any failure
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
APP_DIR="/home/ubuntu/apps/ntssign"
BACKEND_DIR="$APP_DIR/apps/backend"
FRONTEND_DIR="$APP_DIR/apps/frontend"
# Branch to deploy — override with DEPLOY_BRANCH env var if needed
# Staging servers pull from 'develop', prod servers pull from 'main'
BRANCH="${DEPLOY_BRANCH:-main}"
BACKEND_PM2="ntssign-backend"
FRONTEND_PM2="ntssign-frontend"
BACKEND_PORT=3000
FRONTEND_PORT=3001
HEALTH_RETRIES=15       # times to retry the health check
HEALTH_WAIT=3           # seconds between retries
LOGS_DIR="/home/ubuntu/logs/ntssign"
BACKUP_DIR="$APP_DIR/.deploy-backup"

# ── Load Node (nvm) ───────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# ── Setup logging ─────────────────────────────────────────────────────────────
mkdir -p "$LOGS_DIR"
LOG_FILE="$LOGS_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

# ── Colors ────────────────────────────────────────────────────────────────────
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; W='\033[1m'; X='\033[0m'

log()   { echo -e "${G}  ✔${X}  $1"; }
step()  { echo -e "\n${B}${W}▶ $1${X}"; }
warn()  { echo -e "${Y}  ⚠${X}  $1"; }
error() { echo -e "${R}  ✖${X}  $1"; }
die()   { error "$1"; exit 1; }

# ── Rollback state ────────────────────────────────────────────────────────────
PREV_COMMIT=""
ROLLBACK_TRIGGERED=false

snapshot() {
  PREV_COMMIT=$(git -C "$APP_DIR" rev-parse HEAD)
  log "Rollback point saved: $(git -C "$APP_DIR" rev-parse --short HEAD)"

  mkdir -p "$BACKUP_DIR"

  if [ -d "$BACKEND_DIR/dist" ]; then
    rm -rf "$BACKUP_DIR/backend-dist"
    cp -r "$BACKEND_DIR/dist" "$BACKUP_DIR/backend-dist"
    log "Backend dist backed up"
  fi

  if [ -d "$FRONTEND_DIR/.next" ]; then
    rm -rf "$BACKUP_DIR/frontend-next"
    cp -r "$FRONTEND_DIR/.next" "$BACKUP_DIR/frontend-next"
    log "Frontend .next backed up"
  fi
}

rollback() {
  [ "$ROLLBACK_TRIGGERED" = true ] && return
  ROLLBACK_TRIGGERED=true

  echo ""
  error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  error " Deploy FAILED — initiating rollback"
  error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -n "$PREV_COMMIT" ]; then
    warn "Resetting code to $PREV_COMMIT"
    git -C "$APP_DIR" checkout "$PREV_COMMIT" -- . 2>/dev/null || \
      warn "git checkout failed — code may be in partial state"
  fi

  if [ -d "$BACKUP_DIR/backend-dist" ]; then
    rm -rf "$BACKEND_DIR/dist"
    cp -r "$BACKUP_DIR/backend-dist" "$BACKEND_DIR/dist"
    warn "Backend dist restored"
  fi

  if [ -d "$BACKUP_DIR/frontend-next" ]; then
    rm -rf "$FRONTEND_DIR/.next"
    cp -r "$BACKUP_DIR/frontend-next" "$FRONTEND_DIR/.next"
    warn "Frontend .next restored"
  fi

  pm2 reload "$BACKEND_PM2" --update-env 2>/dev/null || pm2 restart "$BACKEND_PM2"
  pm2 reload "$FRONTEND_PM2" --update-env 2>/dev/null || pm2 restart "$FRONTEND_PM2"

  error ""
  error " Rollback complete. Previous version restored."
  error " Log: $LOG_FILE"
  error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
}

# ── Health check ──────────────────────────────────────────────────────────────
wait_for_port() {
  local name=$1 port=$2
  for i in $(seq 1 $HEALTH_RETRIES); do
    if nc -z localhost "$port" 2>/dev/null; then
      log "$name is healthy on :$port"
      return 0
    fi
    warn "$name not ready yet (attempt $i/$HEALTH_RETRIES — waiting ${HEALTH_WAIT}s...)"
    sleep $HEALTH_WAIT
  done
  error "$name failed to respond on :$port after $((HEALTH_RETRIES * HEALTH_WAIT))s"
  return 1
}

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${W}╔══════════════════════════════════════════╗${X}"
echo -e "${W}║         NTSsign — Production Deploy      ║${X}"
echo -e "${W}║         $(date '+%Y-%m-%d %H:%M:%S')                ║${X}"
echo -e "${W}╚══════════════════════════════════════════╝${X}"
echo ""

cd "$APP_DIR"

# ── Step 1: Pre-flight ────────────────────────────────────────────────────────
step "1/7  Pre-flight checks"

git fetch origin "$BRANCH" --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")
AHEAD=$(git rev-list --count HEAD..origin/"$BRANCH" 2>/dev/null || echo 0)

log "Current commit : $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
log "Remote commit  : $(git rev-parse --short origin/$BRANCH) — $(git log -1 --pretty=%s origin/$BRANCH)"

if [ "$LOCAL" = "$REMOTE" ]; then
  warn "Already up to date with origin/$BRANCH ($AHEAD commits ahead)"
  warn "Nothing new to deploy. Abort? (Y/n)"
  read -r ans
  [[ "$ans" =~ ^[Nn]$ ]] || { log "Deploy aborted — already up to date."; exit 0; }
fi

log "$AHEAD new commit(s) will be deployed"

# Check for uncommitted local changes that would conflict
if ! git diff --quiet; then
  die "Uncommitted local changes detected. Clean up the server's working tree before deploying."
fi

# ── Step 2: Snapshot ──────────────────────────────────────────────────────────
step "2/7  Creating rollback snapshot"
snapshot

# Register rollback on any error from this point on
trap rollback ERR

# ── Step 3: Pull ──────────────────────────────────────────────────────────────
step "3/7  Pulling latest code from origin/$BRANCH"
git pull origin "$BRANCH"
NEW_COMMIT=$(git rev-parse --short HEAD)
log "Code updated to $NEW_COMMIT — $(git log -1 --pretty=%s)"

# ── Step 4: Dependencies ──────────────────────────────────────────────────────
step "4/7  Installing dependencies"

# Only reinstall if package-lock.json changed between the two commits
BACKEND_LOCK_CHANGED=$(git diff "$LOCAL" HEAD --name-only 2>/dev/null | grep -c "apps/backend/package-lock.json" || true)
FRONTEND_LOCK_CHANGED=$(git diff "$LOCAL" HEAD --name-only 2>/dev/null | grep -c "apps/frontend/package-lock.json" || true)

if [ "$BACKEND_LOCK_CHANGED" -gt 0 ]; then
  log "Backend package-lock.json changed — running npm ci"
  (cd "$BACKEND_DIR" && npm ci --prefer-offline)
else
  log "Backend deps unchanged — skipping install"
fi

if [ "$FRONTEND_LOCK_CHANGED" -gt 0 ]; then
  log "Frontend package-lock.json changed — running npm ci"
  (cd "$FRONTEND_DIR" && npm ci --prefer-offline)
else
  log "Frontend deps unchanged — skipping install"
fi

# ── Step 5: Build ─────────────────────────────────────────────────────────────
step "5/7  Building"

log "Building backend (NestJS)..."
(cd "$BACKEND_DIR" && npm run build)
log "Backend build complete"

log "Running Prisma migrations..."
(cd "$BACKEND_DIR" && npx prisma migrate deploy)
log "Migrations complete"

log "Building frontend (Next.js)..."
(cd "$FRONTEND_DIR" && npm run build)
log "Frontend build complete"

# ── Step 6: Reload (zero-downtime) ───────────────────────────────────────────
step "6/7  Reloading services"

pm2 reload "$BACKEND_PM2" --update-env
log "Backend reloaded"

pm2 reload "$FRONTEND_PM2" --update-env
log "Frontend reloaded"

# ── Step 7: Health checks ─────────────────────────────────────────────────────
step "7/7  Health checks"

wait_for_port "Backend"  $BACKEND_PORT  || rollback
wait_for_port "Frontend" $FRONTEND_PORT || rollback

# All good — clear the error trap
trap - ERR

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${G}${W}╔══════════════════════════════════════════╗${X}"
echo -e "${G}${W}║   ✔  Deploy successful!                  ║${X}"
echo -e "${G}${W}║                                          ║${X}"
echo -e "${G}${W}║   Commit : $NEW_COMMIT                           ║${X}"
echo -e "${G}${W}║   Log    : $LOG_FILE${X}"
echo -e "${G}${W}╚══════════════════════════════════════════╝${X}"
echo ""

pm2 status
