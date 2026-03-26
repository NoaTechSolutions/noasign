# Production Launch Checklist

This document is the minimum checklist to launch NoaSign safely into production.

## 1. PandaDoc

- Confirm the production PandaDoc plan and Production API access.
- Confirm the production API key is active and not sandbox-only.
- Create or validate the production webhook URL.
- Validate the production template IDs used by live customers.
- Confirm the recipient role names match the production templates.

## 2. Infrastructure

- Provision a production server or managed runtime.
- Configure the production domain for frontend and backend.
- Enable HTTPS for both application and API endpoints.
- Restrict server access to authorized operators only.
- Enable automatic backups for the production database.
- Ensure logs are available for backend, frontend, and reverse proxy.

## 3. Environment Variables

Required backend variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `HOST`
- `PANDADOC_API_KEY`
- `PANDADOC_BASE_URL`
- `PANDADOC_WEBHOOK_SHARED_KEY`
- `APP_URL`

Recommended operational variables:

- `NODE_ENV=production`

Rules:

- Never commit production `.env` files to Git.
- Use a strong unique `JWT_SECRET`.
- Store PandaDoc credentials only on the server or secret manager.

## 4. Database

- Run Prisma migrations before exposing the production application.
- Validate that the schema is current.
- Take a backup snapshot before the first launch.

Commands:

```bash
cd ~/apps/noasign/apps/backend
npx prisma migrate deploy
```

## 5. Initial Master User

Create the initial `MASTER` account using the production bootstrap script.

Backend script:

- `apps/backend/scripts/bootstrap-production-master.js`

Command:

```bash
cd ~/apps/noasign/apps/backend
PROD_MASTER_EMAIL=owner@example.com \
PROD_MASTER_PASSWORD='replace-with-strong-password' \
PROD_COMPANY_NAME='Your Company Name' \
npm run bootstrap:prod-master
```

Optional variables supported by the script:

- `PROD_COMPANY_LEGAL_NAME`
- `PROD_COMPANY_INDUSTRY`
- `PROD_COMPANY_EMAIL`
- `PROD_COMPANY_PHONE`
- `PROD_COMPANY_WEBSITE`
- `PROD_COMPANY_ADDRESS_LINE_1`
- `PROD_COMPANY_ADDRESS_LINE_2`
- `PROD_COMPANY_CITY`
- `PROD_COMPANY_STATE`
- `PROD_COMPANY_ZIP`
- `PROD_COMPANY_COUNTRY`
- `PROD_COMPANY_LICENSE`
- `PROD_CONTACT_FIRST_NAME`
- `PROD_CONTACT_LAST_NAME`
- `PROD_CONTACT_TITLE`
- `PROD_CONTACT_EMAIL`
- `PROD_CONTACT_PHONE`

Rules:

- Use a strong production-only password.
- Run the script only from a trusted shell on the production host.
- Do not expose the production master password in chat, screenshots, or repo files.

## 6. Deployment

Backend:

```bash
cd ~/apps/noasign/apps/backend
npm install
npm run build
pm2 restart noasign-backend --update-env
```

Frontend:

```bash
cd ~/apps/noasign/apps/frontend
npm install
npm run build
pm2 restart noasign-frontend --update-env
```

## 7. Smoke Test

Test these flows with the production master user:

- Login
- Create member
- Temporary password reset from `Members`
- Create document
- Send document to PandaDoc
- Sign document as recipient
- Receive webhook update automatically
- View final PDF
- Download final PDF

## 8. Post-Launch Monitoring

- Watch backend logs for auth, webhook, and PandaDoc API errors.
- Watch frontend logs for runtime failures.
- Monitor document creation, send, sign, and complete flows for the first live customers.
- Track monthly document usage from the first day to compare against PandaDoc pricing assumptions.

## 9. Current Recommendation

For the current stage of NoaSign, the recommended environment strategy is:

- `local` for development
- `staging` for QA and client validation
- `production` for live customers

A separate QA environment is not required yet.
