# GitHub Actions Setup

Two workflows are configured:

| Workflow | File | Trigger |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Every push and pull request to `main` |
| Deploy to production | `.github/workflows/deploy-prod.yml` | Push to `main` or manual trigger |

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

## Viewing deploy logs

In GitHub → Actions → select a workflow run to see live output from the
SSH session on your Oracle VM.

On the VM directly:

```bash
pm2 logs ntssign-backend --lines 100
pm2 logs ntssign-frontend --lines 100
```
