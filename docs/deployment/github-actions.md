# GitHub Actions Setup

Two workflows are configured:

| Workflow | File | Trigger |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Every push and PR to `main` or `develop` |
| Deploy to staging | `.github/workflows/deploy-staging.yml` | Push to `develop` (+ gated one-shot ops via manual **Run workflow**) |
| Deploy to production | `.github/workflows/deploy-prod.yml` | Push to `main` or manual trigger |

Other workflow files also exist: `deploy-landing.yml`, `prod-maintenance.yml`.

---

## CI workflow

Runs automatically on every PR and push. No configuration needed beyond
having the workflows in the repository.

What it does:
1. Installs backend dependencies
2. Generates the Prisma client
3. Runs unit tests (`npm test`)
4. Installs frontend dependencies
5. Runs the linter (`npm run lint`)

---

## Deploy workflow — required secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** →
**Actions** and add these secrets:

| Secret | Value |
|---|---|
| `PROD_BACKEND_HOST` | IP address or hostname of the Oracle VM running the backend |
| `PROD_FRONTEND_HOST` | IP address or hostname of the Oracle VM running the frontend (same as backend if on one VM) |
| `PROD_SSH_USER` | SSH user on the Oracle VM (usually `ubuntu` or `opc`) |
| `PROD_SSH_KEY` | Private SSH key that has access to the Oracle VM |

### If frontend and backend are on the same VM

Set `PROD_FRONTEND_HOST` to the same value as `PROD_BACKEND_HOST`.
The deploy workflow will SSH to the same server twice — once for the
backend deploy and once for the frontend. Both deploys are idempotent so
running `git pull` twice is safe.

### Generating the SSH key pair

If you don't already have a key pair:

```bash
# Generate a new key pair (on your local machine)
ssh-keygen -t ed25519 -C "github-actions-ntssign" -f ~/.ssh/ntssign_deploy

# Copy the public key to the Oracle VM
ssh-copy-id -i ~/.ssh/ntssign_deploy.pub ubuntu@<your-oracle-vm-ip>
```

Then paste the contents of `~/.ssh/ntssign_deploy` (the private key, starting
with `-----BEGIN OPENSSH PRIVATE KEY-----`) into the `PROD_SSH_KEY` secret.

---

## Environment protection rules (recommended)

In GitHub → Settings → Environments, create a `production` environment and
configure:

- **Required reviewers** — add yourself or a team member so every deploy to
  production requires manual approval
- **Deployment branches** — restrict to `main` only

This prevents accidental deploys from feature branches.

---

## Manual deploy trigger

You can trigger a production deploy without pushing code:

1. Go to **Actions** → **Deploy to Production**
2. Click **Run workflow**
3. Select `main` and click **Run workflow**

---

## What the deploy does on the VM

```
git pull origin main
↓
Backend:
  npm ci
  npx prisma generate
  npx prisma migrate deploy   ← runs any pending DB migrations
  npm run build
  npm prune --omit=dev
  pm2 restart ntssign-backend --update-env
↓
Frontend:
  npm ci
  npm run build
  pm2 restart ntssign-frontend --update-env
```

The `--update-env` flag tells pm2 to reload the environment variables from
the `.env` file on the VM, so you don't need to restart pm2 manually after
changing env vars.

---

## ⚠️ workflow_dispatch input cap — 10 maximum

**The GitHub "Run workflow" form renders at most 10 inputs.** If a `workflow_dispatch` defines 11 or more, the 11th onward are **silently hidden** — the workflow still parses and runs, there is **no error or warning**, the extra inputs simply never appear in the UI.

**The symptom (how to catch it):** an input **exists in the YAML but does not appear in the Run-workflow dropdown**. Nothing fails — it's just missing. So when someone says *"I don't see option X"* and X is defined in the file, **count the inputs**: X is almost certainly beyond position #10. (Same shape as the nginx traps in [../operations/health-check.md](../operations/health-check.md) — the danger is that it's *silent*, so the value is recognizing the symptom.)

This bit `deploy-staging.yml` on 2026-07-17: it had **12** inputs, so `seed_laura` (#12) was invisible and could not be triggered. Fixed by merging the three per-op `*_company_id` inputs into one shared `target_company_id` (→ **10**). ⚠️ It now sits at **exactly 10 — the next input added re-breaks it.** The durable fix (a separate `staging-ops.yml` so the deploy workflow stops accumulating one-shot inputs) is tracked in the backlog.

**Before adding a `workflow_dispatch` input: count the existing ones.** At 10, don't add — consolidate or split the workflow first.

---

## Viewing deploy logs

In GitHub → Actions → select a workflow run to see live output from the
SSH session on your Oracle VM.

On the VM directly:

```bash
pm2 logs ntssign-backend --lines 100
pm2 logs ntssign-frontend --lines 100
```
