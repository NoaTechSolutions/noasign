// jest `setupFiles` — runs BEFORE anything else in an e2e suite (before AppModule
// or PrismaClient are ever constructed). Its only job: guarantee the whole suite
// talks to the ISOLATED test database, never the dev DB.
//
// Resolution order:
//   1. TEST_DATABASE_URL (CI sets this to its Postgres service)
//   2. DATABASE_URL with the db name suffixed `_test` (local convenience)
import 'dotenv/config';

function resolveTestDbUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error(
      'e2e: set TEST_DATABASE_URL (or DATABASE_URL to derive `<db>_test`)',
    );
  }
  const url = new URL(base);
  const db = url.pathname.replace(/^\//, '');
  if (!db.endsWith('_test')) {
    url.pathname = `/${db}_test`;
  }
  return url.toString();
}

const testUrl = resolveTestDbUrl();

// Hard stop: never let an e2e run against a db whose name isn't clearly a test db.
if (!/_test(\?|$)/.test(new URL(testUrl).pathname + '?')) {
  throw new Error(
    `e2e: refusing to run — resolved DB is not a *_test database (${testUrl.replace(/:[^:@/]+@/, ':***@')})`,
  );
}

process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = 'test';
