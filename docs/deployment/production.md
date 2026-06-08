# Production Deployment Guide

## Architecture

```
Internet
  ↓
Cloudflare DNS + Proxy (ntssign.com)
  ↓
Oracle Cloud VM — nginx (ports 80/443)
  ├── → pm2: NestJS backend  (internal port 3000)
  ├── → pm2: Next.js frontend (internal port 3001)
  └── PostgreSQL 16 (internal port 5432)
```

**Domains:**
- Frontend: `https://app.ntssign.com`
- Backend API: `https://api.ntssign.com`

---

## Landing Page (ntssign.com)

La landing page pública está hospedada como sitio estático 
en SiteGround, separada de la aplicación Next.js.

- URL: https://ntssign.com
- Hosting: SiteGround (static files)
- Archivos: index.html + img/ en public_html/
- CDN: Cloudflare (activo)
- SSL: Let's Encrypt (renovación automática)
- Deploy: manual via File Manager o FTP
  (pipeline automático pendiente — NOA-78)

If the frontend and backend run on separate VMs, each VM has its own nginx
instance. The steps below are identical on each VM — just apply them to the
relevant app.

---

## Environment Variables

### Backend — required

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/ntssign

# Auth — generate with: openssl rand -base64 64
JWT_SECRET=<strong-unique-secret>
JWT_EXPIRES_IN=7d
NODE_ENV=production

# Cookie
AUTH_COOKIE_DOMAIN=.ntssign.com

# Server
PORT=3000
HOST=127.0.0.1
TRUST_PROXY=1

# CORS — only the frontend origin
CORS_ORIGINS=https://app.ntssign.com

# URLs
APP_URL=https://app.ntssign.com
BACKEND_URL=https://api.ntssign.com

# BoldSign
BOLDSIGN_API_KEY=<your-production-api-key>
BOLDSIGN_BASE_URL=https://api.boldsign.com
BOLDSIGN_WEBHOOK_SECRET=<your-webhook-secret>
BOLDSIGN_BRAND_ID=<your-brand-id>

# Public link HMAC (recommended: separate from JWT_SECRET)
PUBLIC_LINK_SECRET=<another-strong-secret>
```

### Frontend — required

```env
NEXT_PUBLIC_API_URL=https://api.ntssign.com
```

### Rules

- Never commit `.env` files to Git.
- Generate secrets with `openssl rand -base64 64`.
- `AUTH_COOKIE_DOMAIN=.ntssign.com` is required for auth cookies to work
  across subdomains (`app.ntssign.com` and `api.ntssign.com`).
- Rotate any secret that was shared in plaintext during setup.

---

## 1. Oracle Cloud VM Setup

### Prerequisites on the VM

```bash
# Node.js 20 (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20 && nvm alias default 20

# pm2
npm install -g pm2

# nginx
sudo apt update && sudo apt install -y nginx

# certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### Clone the repository

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/YOUR_ORG/ntssign.git ntssign
```

---

## 2. PostgreSQL

If PostgreSQL runs on the same VM:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER ntssign WITH PASSWORD 'replace-with-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE ntssign OWNER ntssign;"
```

Set `DATABASE_URL` accordingly:
```env
DATABASE_URL=postgresql://ntssign:replace-with-strong-password@localhost:5432/ntssign
```

If PostgreSQL is on a separate VM, set `DATABASE_URL` to the remote host.

---

## 3. nginx Configuration

### Backend (`/etc/nginx/sites-available/api.ntssign.com`)

```nginx
server {
    listen 80;
    server_name api.ntssign.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        client_max_body_size 10M;
    }
}
```

### Frontend (`/etc/nginx/sites-available/app.ntssign.com`)

```nginx
server {
    listen 80;
    server_name app.ntssign.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/api.ntssign.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app.ntssign.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
sudo certbot --nginx -d api.ntssign.com -d app.ntssign.com
```

Certbot auto-renews. Verify with:

```bash
sudo certbot renew --dry-run
```

---

## 4. Cloudflare DNS Setup

In your Cloudflare dashboard for `ntssign.com`:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `api` | `<Oracle VM IP>` | ✅ Proxied |
| A | `app` | `<Oracle VM IP>` | ✅ Proxied |

If frontend and backend are on different VMs, use each VM's IP for its record.

**Cloudflare SSL setting:** Set to `Full (strict)` in SSL/TLS → Overview.
This requires a valid certificate on the Oracle VM (the certbot step above).

**Page Rules (optional):** Add a cache rule to bypass Cloudflare cache for
`api.ntssign.com/*` so API responses are never cached.

---

## 5. pm2 Ecosystem File

Create `~/apps/ntssign/ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'ntssign-backend',
      cwd: '/home/ubuntu/apps/ntssign/apps/backend',
      script: 'node',
      args: 'dist/main',
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'ntssign-frontend',
      cwd: '/home/ubuntu/apps/ntssign/apps/frontend',
      script: 'node_modules/.bin/next',
      args: 'start --port 3001',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Start and save:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # follow the printed command to enable pm2 on reboot
```

---

## 6. First Deploy

```bash
cd ~/apps/ntssign

# Backend
cd apps/backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm prune --omit=dev

# Frontend
cd ../frontend
npm ci
npm run build

# Start with pm2
cd ~/apps/ntssign
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 7. Create Initial Master User

Run once, from the VM, after the backend is running:

```bash
cd ~/apps/ntssign/apps/backend

PROD_MASTER_EMAIL=owner@example.com \
PROD_MASTER_PASSWORD='replace-with-strong-password' \
PROD_COMPANY_NAME='Your Company Name' \
PROD_COMPANY_INDUSTRY='Construction' \
PROD_COMPANY_EMAIL='contact@example.com' \
PROD_COMPANY_PHONE='(555) 000-0000' \
npm run bootstrap:prod-master
```

Full list of optional variables:
`PROD_COMPANY_LEGAL_NAME`, `PROD_COMPANY_WEBSITE`, `PROD_COMPANY_ADDRESS_LINE_1`,
`PROD_COMPANY_ADDRESS_LINE_2`, `PROD_COMPANY_CITY`, `PROD_COMPANY_STATE`,
`PROD_COMPANY_ZIP`, `PROD_COMPANY_COUNTRY`, `PROD_COMPANY_LICENSE`,
`PROD_CONTACT_FIRST_NAME`, `PROD_CONTACT_LAST_NAME`, `PROD_CONTACT_TITLE`,
`PROD_CONTACT_EMAIL`, `PROD_CONTACT_PHONE`.

---

## 8. Subsequent Deploys

With GitHub Actions configured (see `.github/workflows/deploy-prod.yml`),
deploys happen automatically on push to `main`.

Manual deploy:

```bash
cd ~/apps/ntssign
git pull origin main

cd apps/backend
npm ci && npx prisma generate && npx prisma migrate deploy && npm run build && npm prune --omit=dev
pm2 restart ntssign-backend --update-env

cd ../frontend
npm ci && npm run build
pm2 restart ntssign-frontend --update-env
```

---

## 9. BoldSign Configuration

Before sending real documents:

- [ ] Production API plan is active
- [ ] Production `BOLDSIGN_API_KEY` is set on the VM
- [ ] Webhook is registered in BoldSign dashboard pointing to:
      `https://api.ntssign.com/boldsign/webhooks/events`
- [ ] `BOLDSIGN_WEBHOOK_SECRET` matches the secret configured in BoldSign
- [ ] Production template IDs are validated
- [ ] Recipient role names match the production templates

---

## 10. Pre-Launch Checklist

- [ ] All env vars set on the VM (never in the repo)
- [ ] `NODE_ENV=production` is set
- [ ] `npx prisma migrate deploy` ran successfully
- [ ] Master user created via bootstrap script
- [ ] nginx is running and SSL is valid
- [ ] Cloudflare DNS is pointing to the Oracle VM IP
- [ ] Cloudflare SSL mode is `Full (strict)`
- [ ] `AUTH_COOKIE_DOMAIN=.ntssign.com` is set
- [ ] `CORS_ORIGINS=https://app.ntssign.com` (only the frontend)
- [ ] BoldSign webhook is registered and `BOLDSIGN_WEBHOOK_SECRET` matches
- [ ] Database backup configured (daily pg_dump → R2; see [backups.md](./backups.md))
- [ ] pm2 startup configured (survives VM reboot)
- [ ] Login, create document, send via BoldSign smoke-tested manually

---

## 11. Smoke Test

After deploying, test these flows manually with the master user:

1. Login
2. Create member user → temporary password → member logs in
3. Create document → fill all tabs → send via BoldSign
4. Sign as recipient
5. Verify status updates automatically via webhook
6. View and download final signed PDF
7. Check billing usage reflects the signed document

Automated smoke test (from the VM or any machine with network access):

```bash
BASE_URL=https://api.ntssign.com node apps/backend/scripts/smoke-api.mjs
```

---

## 12. Monitoring

```bash
# Live logs
pm2 logs ntssign-backend
pm2 logs ntssign-frontend

# Status
pm2 status

# nginx
sudo tail -f /var/log/nginx/error.log
```

Watch for:
- `401` errors in auth endpoints (brute force)
- BoldSign webhook failures (look for `ForbiddenException`)
- Database connection errors
- pm2 process crashes (`pm2 resurrect` if needed)
