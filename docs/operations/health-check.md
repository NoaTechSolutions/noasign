# Staging deploy health check — what it checks, what each error means

_Verified against `.github/workflows/deploy-staging.yml` (frontend step) — 2026-07-17._

Every push to `develop` deploys staging. After the frontend build + `pm2 reload ntssign-frontend`, the workflow runs a **two-stage health check** before declaring the deploy complete. If either stage fails, the deploy **fails loudly** — but see [No auto-rollback](#no-auto-rollback) below.

## The two stages

| Stage | Target | Window | Question it answers |
|---|---|---|---|
| **1. LOCAL** | `http://127.0.0.1:3001/` | 6 tries × 5s | Did the frontend process actually come up on the VM? |
| **2. PUBLIC** | `https://app-staging.ntssign.com/` | 12 tries × 10s | Is the site reachable from outside? |

Stage 2 only runs if stage 1 passed. The two-stage split is the whole point: it tells you **which layer broke** before you start debugging.

## What each failure means

### ❌ "Frontend did not start" (stage 1 failed)

> The frontend is **NOT** serving on `127.0.0.1:3001` after the pm2 reload.

This is a **BUILD / APP problem** — the deployed code or its build. It is **not** a network issue.

**Where to look:** the frontend build output in the deploy log, and `pm2 logs ntssign-frontend` on the VM.

### ❌ "Site unreachable (NOT a code bug)" (stage 1 passed, stage 2 failed)

> The frontend is UP locally (`127.0.0.1:3001` → 200) but `app-staging.ntssign.com` is not returning 200.

This is **NETWORK / DNS / nginx / Cloudflare** — **not** the deploy and **not** the code. The deployed build is fine. **Do NOT hunt for a code bug.**

**Where to look:** Cloudflare proxy status (DNS-only vs Proxied), DNS, the nginx `sites-enabled` symlink, and the origin certificate.

---

## ⚠️ Two nginx traps that waste time here

When stage 2 sends you to nginx, two default behaviors produce **false negatives** — you look, see "nothing", and conclude wrongly:

> **Trap 1 — `grep -r` in `sites-enabled` does NOT follow symlinks.** `sites-enabled/` is almost always symlinks into `sites-available/`. A plain `grep -r pattern /etc/nginx/sites-enabled/` **skips the symlinked files** and returns nothing — which reads as "the config isn't there" when it is. Grep the real target instead: use `grep -r --dereference-recursive`, grep `sites-available/` directly, or just dump the *effective* merged config with **`nginx -T`** (that's the source of truth — it shows exactly what nginx loaded).

> **Trap 2 — the nginx `access.log` does NOT record the `Host` by default.** The default `combined` log format has no `$host`. So grepping the access log for `app-staging.ntssign.com` **never returns anything**, even when requests are arriving — because the domain was never written to the log, not because traffic isn't coming. Confirm the `server_name` with `nginx -T`, or add `$host` to a custom `log_format` if you need per-Host lines.

---

## No auto-rollback

The health check **fails the deploy loudly, but does not revert.** By the time it runs, the new code is already on the VM and reloaded — `pm2 reload` gives only **partial** protection (zero-downtime reload of a process that did come up). A true rollback would need **versioned build artifacts** to swap back to, which this pipeline does not have yet. See `architecture/` for the pending auto-rollback design.
