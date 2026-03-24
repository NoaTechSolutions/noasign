# Staging deployment notes

## Backend

- Public base URL: `https://api-staging.ntssign.com`
- Runs behind `nginx`
- Process manager: `pm2`
- Required backend env vars:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `PORT`
  - `HOST`
  - `PANDADOC_API_KEY`
  - `PANDADOC_BASE_URL`
  - `PANDADOC_WEBHOOK_SHARED_KEY`

## Frontend

- Public base URL: `https://app-staging.ntssign.com`
- Required frontend env vars:
  - `NEXT_PUBLIC_API_URL=https://api-staging.ntssign.com`

## Security follow-up

- Keep only `80/443/22` publicly reachable on the VM.
- Do not rely on fallback secrets in staging or production.
- Rotate secrets if they were ever shared in plaintext.
