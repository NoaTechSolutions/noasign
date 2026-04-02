# Local development

## Ports

| Service | Port |
|---|---|
| Backend | `3000` |
| Frontend | `3001` |
| PostgreSQL | `5433` |

## 1. Start local database

Run from the repository root:

```bash
docker compose -f infra/docker-compose.local.yml up -d
```

## 2. Create local env files

Backend:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Frontend:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

## 3. Configure backend env

Edit `apps/backend/.env` with these values:

```env
# Database — local Docker PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/noasign

# Auth
JWT_SECRET=replace-with-any-local-secret
JWT_EXPIRES_IN=7d
NODE_ENV=development

# Server
PORT=3000
HOST=127.0.0.1

# BoldSign
BOLDSIGN_API_KEY=replace-with-your-boldsign-api-key
BOLDSIGN_BASE_URL=https://api.boldsign.com
BOLDSIGN_WEBHOOK_SECRET=
BOLDSIGN_BRAND_ID=

# URLs
# BACKEND_URL is used for public signature links.
# Leave empty in local dev unless you need BoldSign webhooks to work
# (in that case, expose the backend via ngrok and paste the https URL here).
APP_URL=http://127.0.0.1:3001
BACKEND_URL=
```

## 4. Configure frontend env

`apps/frontend/.env.local` only needs one variable:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
```

## 5. Install dependencies

```bash
cd apps/backend && npm install
cd ../frontend && npm install
```

## 6. Prepare local database

From `apps/backend`:

```bash
npx prisma migrate deploy
npm run bootstrap:local
```

This creates:
- A `Contract` document type, form definition, and signature template
- A MASTER user (`master@ntssign.test` / `secret123`)
- A standard user (`ana.martinez@worldpaversco.test` / `secret123`)

**Configure your BoldSign template before bootstrapping:**

```bash
# Windows PowerShell
$env:LOCAL_SIGNATURE_TEMPLATE_ID='your-boldsign-template-id'
$env:LOCAL_SIGNATURE_RECIPIENT_ROLE='BUYER'
npm run bootstrap:local

# macOS / Linux
LOCAL_SIGNATURE_TEMPLATE_ID='your-boldsign-template-id' \
LOCAL_SIGNATURE_RECIPIENT_ROLE='BUYER' \
npm run bootstrap:local
```

The `LOCAL_SIGNATURE_RECIPIENT_ROLE` must match the signer role name defined
in your BoldSign template (e.g. `BUYER`, `Client`, `Signer`).

## 7. Seed test documents (optional)

```bash
npm run seed:local-documents
```

Creates 8 documents in different statuses for UI testing.

## 8. Start the apps

Backend (terminal 1):

```bash
cd apps/backend
npm run start:dev
```

Frontend (terminal 2):

```bash
cd apps/frontend
npm run dev
```

## 9. URLs

| App | URL |
|---|---|
| Frontend | http://127.0.0.1:3001 |
| Backend | http://127.0.0.1:3000 |

## BoldSign webhooks in local dev

BoldSign callbacks require a public `https://` URL. In local development,
automatic status updates (VIEWED, SIGNED, COMPLETED) will not fire unless you
expose the backend via a tunnel.

```bash
# Using ngrok
ngrok http 3000
```

Then set `BACKEND_URL` in `apps/backend/.env` to the ngrok `https://` URL and
restart the backend. BoldSign will call `{BACKEND_URL}/boldsign/webhooks/events`.

## Run smoke tests

Tests the full document lifecycle against a running local backend:

```bash
cd apps/backend
npm run test:smoke
```

## Run unit tests

```bash
cd apps/backend
npm test
```
