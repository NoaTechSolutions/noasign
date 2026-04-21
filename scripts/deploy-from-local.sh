#!/usr/bin/env bash
# =============================================================================
# NTSsign — Local deploy trigger
# =============================================================================
# Run from your local machine to deploy to staging or production.
#
# Usage:
#   bash scripts/deploy-from-local.sh staging
#   bash scripts/deploy-from-local.sh prod
#
# Prerequisites:
#   - SSH key configured for each server
#   - You are on the correct branch (develop → staging, main → prod)
#   - All changes committed and pushed to the remote branch
# =============================================================================

set -euo pipefail

ENV="${1:-}"

# ── Colors ────────────────────────────────────────────────────────────────────
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; W='\033[1m'; X='\033[0m'

usage() {
  echo -e "${W}Usage:${X} bash scripts/deploy-from-local.sh ${W}[staging|prod]${X}"
  echo ""
  echo "  staging  — deploy develop branch to staging server"
  echo "  prod     — deploy main branch to production server"
  echo ""
  exit 1
}

[ -z "$ENV" ] && usage
[[ "$ENV" != "staging" && "$ENV" != "prod" ]] && usage

# ── Server config ─────────────────────────────────────────────────────────────
STAGING_HOST="163.192.12.220"
STAGING_USER="ubuntu"
STAGING_KEY="$HOME/.ssh/staging_vm"
STAGING_BRANCH="develop"

PROD_HOST="163.192.63.37"
PROD_USER="ubuntu"
PROD_KEY="$HOME/.ssh/new_prod_key"
PROD_BRANCH="main"

APP_DIR="/home/ubuntu/apps/ntssign"

# ── Select environment ────────────────────────────────────────────────────────
if [ "$ENV" = "staging" ]; then
  SSH_HOST="$STAGING_HOST"
  SSH_USER="$STAGING_USER"
  SSH_KEY="$STAGING_KEY"
  BRANCH="$STAGING_BRANCH"
else
  if [ -z "$PROD_HOST" ]; then
    echo -e "${R}✖${X}  Production server IP not configured."
    echo "   Edit PROD_HOST in scripts/deploy-from-local.sh and try again."
    exit 1
  fi
  SSH_HOST="$PROD_HOST"
  SSH_USER="$PROD_USER"
  SSH_KEY="$PROD_KEY"
  BRANCH="$PROD_BRANCH"
fi

# ── Pre-flight: ensure local branch is pushed ─────────────────────────────────
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse "origin/$CURRENT_BRANCH" 2>/dev/null || echo "")

echo ""
echo -e "${W}Target environment : ${G}$ENV${X}"
echo -e "${W}Server             :${X} $SSH_USER@$SSH_HOST"
echo -e "${W}Branch on server   :${X} $BRANCH"
echo -e "${W}Your local branch  :${X} $CURRENT_BRANCH ($(git rev-parse --short HEAD))"
echo ""

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
  echo -e "${Y}⚠  Your local branch has unpushed commits.${X}"
  echo -e "   Push first with: ${W}git push origin $CURRENT_BRANCH${X}"
  echo ""
  read -rp "Push now and continue? (y/N) " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    git push origin "$CURRENT_BRANCH"
  else
    echo "Aborted."
    exit 0
  fi
fi

# ── Confirm ───────────────────────────────────────────────────────────────────
if [ "$ENV" = "prod" ]; then
  echo -e "${R}${W}⚠  You are about to deploy to PRODUCTION.${X}"
  echo ""
  read -rp "Type 'deploy' to confirm: " confirm
  [ "$confirm" = "deploy" ] || { echo "Aborted."; exit 0; }
fi

# ── Run deploy on server ──────────────────────────────────────────────────────
echo ""
echo -e "${G}▶ Connecting to $SSH_USER@$SSH_HOST ...${X}"
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" \
  "cd $APP_DIR && bash scripts/deploy.sh"
