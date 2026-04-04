# Staging Environment

**Status: LIVE** — desplegado en Oracle Cloud VM.

- Backend: `https://api-staging.ntssign.com`
- Frontend: `https://app-staging.ntssign.com`
- VM IP: `163.192.12.220`
- SSL: Let's Encrypt (renovación automática, expira 2026-07-03)

Deploy automático: cada push a la rama `staging` dispara `.github/workflows/deploy-staging.yml`.

---

## Stack en la VM

| Componente | Versión | Puerto interno |
|-----------|---------|---------------|
| Node.js | 20 (via nvm) | — |
| NestJS backend | — | 3000 |
| Next.js frontend | — | 3001 |
| PostgreSQL | 14 | 5432 |
| nginx | 1.18 | 80/443 |
| pm2 | latest | — |

---

## Variables de entorno

### Backend (`~/apps/ntssign/apps/backend/.env`)

```env
NODE_ENV=production
DATABASE_URL=postgresql://ntssign:ntssign_staging_pass@localhost:5432/ntssign_staging
JWT_SECRET=<staging-secret — nunca reutilizar en prod>
JWT_EXPIRES_IN=86400
PORT=3000
HOST=127.0.0.1
TRUST_PROXY=1
AUTH_COOKIE_DOMAIN=.ntssign.com
CORS_ORIGINS=https://app-staging.ntssign.com
APP_URL=https://app-staging.ntssign.com
BACKEND_URL=https://api-staging.ntssign.com
BOLDSIGN_API_KEY=<staging-api-key>
BOLDSIGN_BASE_URL=https://api.boldsign.com
BOLDSIGN_WEBHOOK_SECRET=<staging-webhook-secret>
BOLDSIGN_BRAND_ID=<staging-brand-id>
LOCAL_SIGNATURE_TEMPLATE_ID=<template-id>
LOCAL_SIGNATURE_RECIPIENT_ROLE=BUYER
PUBLIC_LINK_SECRET=<staging-public-link-secret>
```

### Frontend (`~/apps/ntssign/apps/frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=https://api-staging.ntssign.com
```

---

## pm2 Ecosystem (`~/apps/ntssign/ecosystem.config.js`)

```js
module.exports = {
  apps: [
    {
      name: 'ntssign-backend',
      cwd: '/home/ubuntu/apps/ntssign/apps/backend',
      script: 'dist/main.js',
      instances: 1,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'ntssign-frontend',
      cwd: '/home/ubuntu/apps/ntssign/apps/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 1,
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

---

## Notas de infraestructura

- La VM usa Ubuntu 22.04 con **2GB de swap** para soportar el build de Next.js (1GB RAM).
- Las reglas de iptables para puertos 80 y 443 deben ir **antes** del REJECT en posición 5.
  El comando correcto: `sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT`
- Guardado con `sudo netfilter-persistent save`.
- SSH key: ed25519 generada en Windows, guardada en `~/.ssh/staging_vm`.
- GitHub Actions secret `STAGING_SSH_KEY` contiene la clave privada completa.

---

## Comandos útiles en la VM

```bash
# Ver estado de las apps
pm2 status

# Logs en tiempo real
pm2 logs ntssign-backend
pm2 logs ntssign-frontend

# Reiniciar manualmente
pm2 restart ntssign-backend --update-env
pm2 restart ntssign-frontend --update-env

# Estado de nginx
sudo systemctl status nginx

# Ver certificados SSL
sudo certbot certificates
```

---

## Reglas de seguridad

- Mantener solo los puertos `22`, `80`, `443` abiertos.
- Nunca reutilizar secrets de producción en staging.
- Nunca commitear archivos `.env` al repositorio.
- `CORS_ORIGINS` solo apunta al frontend de staging.
