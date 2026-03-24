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
PANDADOC_API_KEY=replace-with-your-pandadoc-sandbox-key
PANDADOC_BASE_URL=https://api.pandadoc.com/public/v1
PANDADOC_WEBHOOK_SHARED_KEY=replace-with-your-pandadoc-webhook-shared-key
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

This creates the `Contract` document type, form definition, and a PandaDoc template record for local testing.

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
- If you want to test PandaDoc end-to-end locally, keep your valid sandbox API key in `apps/backend/.env`.
