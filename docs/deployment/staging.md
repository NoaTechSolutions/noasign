# Staging deployment notes

## Backend

- Public base URL: `https://api-staging.ntssign.com`
- Runs behind `nginx`
- Process manager: `pm2`
- Required backend env vars:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `AUTH_COOKIE_DOMAIN=.ntssign.com`
  - `PORT`
  - `HOST`
  - `BACKEND_URL=https://api-staging.ntssign.com`
  - `BOLDSIGN_API_KEY`
  - `BOLDSIGN_BASE_URL`
  - `BOLDSIGN_WEBHOOK_SECRET`
  - `BOLDSIGN_BRAND_ID`
  - `BOLDSIGN_CALLBACK_URL` or rely on `BACKEND_URL`

## Frontend

- Public base URL: `https://app-staging.ntssign.com`
- Required frontend env vars:
  - `NEXT_PUBLIC_API_URL=https://api-staging.ntssign.com`

## Security follow-up

- Keep only `80/443/22` publicly reachable on the VM.
- Do not rely on fallback secrets in staging or production.
- Rotate secrets if they were ever shared in plaintext.
- Keep `CORS_ORIGINS=https://app-staging.ntssign.com` so credentialed requests only come from the staging frontend.
