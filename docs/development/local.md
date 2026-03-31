# Local development

## Ports

- Backend: `3000`
- Frontend: `3001`
- Postgres: `5433`

## 1. Start local database

Run from the repository root:

```powershell
docker compose -f infra/docker-compose.local.yml up -d
```

## 2. Create local env files

Backend:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
```

Frontend:

```powershell
Copy-Item apps/frontend/.env.example apps/frontend/.env.local
```

## 3. Set backend local env

Use these values in `apps/backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/noasign
JWT_SECRET=replace-with-a-local-dev-secret
JWT_EXPIRES_IN=86400
PORT=3000
HOST=127.0.0.1
SIGNATURE_PROVIDER=boldsign
BOLDSIGN_API_KEY=replace-with-your-boldsign-api-key
BOLDSIGN_BASE_URL=https://api.boldsign.com
BOLDSIGN_WEBHOOK_SECRET=
BOLDSIGN_BRAND_ID=
BACKEND_URL=
BOLDSIGN_CALLBACK_URL=
```

## 4. Set frontend local env

Use this in `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
```

## 5. Install dependencies

Backend:

```powershell
cd apps/backend
npm install
```

Frontend:

```powershell
cd ../frontend
npm install
```

## 6. Prepare local database

From `apps/backend`:

```powershell
npx prisma migrate deploy
npm run bootstrap:local
```

This creates the `Contract` document type, form definition, and a signature
template record for local testing.

Set `LOCAL_SIGNATURE_TEMPLATE_ID` before running the bootstrap so the seeded
template record stores your BoldSign `template_id`.

If your BoldSign template uses a signer role other than `BUYER` for the
customer signer, also set `LOCAL_SIGNATURE_RECIPIENT_ROLE` before running the
bootstrap. For example, a bill-of-sale template might need:

```powershell
$env:LOCAL_SIGNATURE_TEMPLATE_ID='your-boldsign-template-id'
$env:LOCAL_SIGNATURE_RECIPIENT_ROLE='BUYER'
npm run bootstrap:local
```

## 7. Start the apps

Backend terminal:

```powershell
cd apps/backend
npm run start:dev
```

Frontend terminal:

```powershell
cd apps/frontend
npm run dev
```

## 8. URLs

- Frontend: `http://127.0.0.1:3001`
- Backend: `http://127.0.0.1:3000`

## Notes

- Local frontend expects the backend on `127.0.0.1:3000`.
- Local backend binds to `127.0.0.1` when `HOST=127.0.0.1`.
- BoldSign callbacks require a public `https://` URL. For local automatic
  status updates, tunnel the backend with something like `ngrok` and set either
  `BOLDSIGN_CALLBACK_URL` or `BACKEND_URL`.
