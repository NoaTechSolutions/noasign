// jest globalSetup for the e2e suite — runs ONCE before any suite. Syncs the
// Prisma schema into the isolated *_test database so a run is reproducible
// everywhere: locally (keeps the test DB current) and in CI (creates the schema
// on the fresh Postgres service container). Uses `db push` (not migrate) so the
// dev DB's migration-history drift never touches the test DB.
//
// Precondition: the *_test database EXISTS. Locally: create it once
//   (createdb noasign_test  — or via your Postgres client).
// CI: the Postgres service container creates it (POSTGRES_DB=..._test).
const { execSync } = require('child_process');
require('dotenv/config');

function resolveTestDbUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      'e2e globalSetup: set TEST_DATABASE_URL (or DATABASE_URL to derive `<db>_test`)',
    );
  }
  const url = new URL(base);
  const db = url.pathname.replace(/^\//, '');
  if (!db.endsWith('_test')) url.pathname = `/${db}_test`;
  return url.toString();
}

module.exports = async () => {
  const testUrl = resolveTestDbUrl();
  if (!/_test(\?|$)/.test(new URL(testUrl).pathname + '?')) {
    throw new Error('e2e globalSetup: resolved DB is not a *_test database');
  }
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'ignore',
  });
};
