# Staging Environment (optional)

The two required environments are `local` (development) and `production`.
Staging is optional — use it when you need to validate changes against a
live server before pushing to production customers.

If you run a staging environment, it follows the same setup as production
(same `production.md` guide) with different domain names and separate secrets.

## Domains

- Backend: `https://api-staging.ntssign.com`
- Frontend: `https://app-staging.ntssign.com`

## Backend env vars (staging-specific values)

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/ntssign_staging
JWT_SECRET=<staging-specific-secret — never reuse production secret>
AUTH_COOKIE_DOMAIN=.ntssign.com
PORT=3000
HOST=127.0.0.1
TRUST_PROXY=1
CORS_ORIGINS=https://app-staging.ntssign.com
APP_URL=https://app-staging.ntssign.com
BACKEND_URL=https://api-staging.ntssign.com
BOLDSIGN_API_KEY=<staging-api-key>
BOLDSIGN_BASE_URL=https://api.boldsign.com
BOLDSIGN_WEBHOOK_SECRET=<staging-webhook-secret>
BOLDSIGN_BRAND_ID=<staging-brand-id>
PUBLIC_LINK_SECRET=<staging-specific-secret>
```

## Frontend env vars

```env
NEXT_PUBLIC_API_URL=https://api-staging.ntssign.com
```

## Seed staging data

```bash
cd apps/backend
STAGING_DEMO_MASTER_EMAIL=demo@ntssign.com \
STAGING_DEMO_MASTER_PASSWORD='replace-with-password' \
STAGING_DEMO_COMPANY_NAME='Demo Company' \
npm run seed:staging-demo
```

## Security rules (same as production)

- Keep only ports `80`, `443`, `22` publicly reachable.
- Never reuse production secrets in staging.
- Never commit `.env` files to Git.
- Cloudflare DNS for staging subdomains should also point to the staging VM IP.
- Set `CORS_ORIGINS` to only the staging frontend origin.
