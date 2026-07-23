import request from 'supertest';
import { bootstrapTestApp, closeTestApp, TestApp } from './harness';
import { resetDb, seedReceiptTenant, ReceiptTenant } from './fixtures';

// Proves the per-environment cookie NAME wiring end-to-end through the REAL app.
// The exhaustive name/domain logic is unit-tested in src/auth/auth-cookie.spec.ts
// and the 401 belt-and-suspenders in clear-cookie-on-401.filter.spec.ts; this
// suite boots the app with AUTH_COOKIE_NAME set (as the staging VM will) and
// proves:
//   - login writes the CONFIGURED cookie name (not the legacy default);
//   - a 401 clears BOTH the configured name AND the legacy default, so an orphan
//     prod cookie sitting on the same browser is wiped and the user lands on
//     login ONCE (no reload loop).
describe('cookie-name isolation — AUTH_COOKIE_NAME wiring', () => {
  const CONFIGURED = 'ntssign_access_token_stg';
  const LEGACY = 'ntssign_access_token';
  const GUARDED = '/documents/my-documents';
  const PASSWORD = 'e2e-pass'; // seedReceiptTenant's fixed bcrypt password

  let ctx: TestApp;
  let tenant: ReceiptTenant;
  let prevName: string | undefined;

  beforeAll(async () => {
    // Set BEFORE bootstrapping — ConfigService reads process.env at construction.
    prevName = process.env.AUTH_COOKIE_NAME;
    process.env.AUTH_COOKIE_NAME = CONFIGURED;
    ctx = await bootstrapTestApp();
  });
  afterAll(async () => {
    await closeTestApp(ctx);
    if (prevName === undefined) delete process.env.AUTH_COOKIE_NAME;
    else process.env.AUTH_COOKIE_NAME = prevName;
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    tenant = await seedReceiptTenant(ctx.prisma);
  });

  const server = () => ctx.app.getHttpServer();

  const cookieNames = (setCookie: string[] | undefined): string[] =>
    (setCookie ?? []).map((c) => c.split('=')[0]);

  const clears = (setCookie: string[] | undefined, name: string): boolean =>
    (setCookie ?? []).some(
      (c) =>
        c.startsWith(`${name}=`) &&
        (/Expires=Thu, 01 Jan 1970/i.test(c) || /Max-Age=0/i.test(c)),
    );

  it('login writes the CONFIGURED cookie name, not the legacy default', async () => {
    const res = await request(server())
      .post('/auth/login')
      .send({ email: tenant.user.email, password: PASSWORD });

    expect(res.status).toBe(201);
    const names = cookieNames(res.headers['set-cookie'] as unknown as string[]);
    expect(names).toContain(CONFIGURED);
    expect(names).not.toContain(LEGACY);
  });

  it('a 401 clears BOTH the configured name AND the legacy default (orphan wipe)', async () => {
    const res = await request(server()).get(GUARDED);
    expect(res.status).toBe(401);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    if (!clears(setCookie, CONFIGURED) || !clears(setCookie, LEGACY)) {
      throw new Error(
        `A 401 must clear BOTH ${CONFIGURED} and ${LEGACY} so a stale cross-` +
          `environment cookie cannot keep feeding the proxy loop. Set-Cookie was: ` +
          JSON.stringify(setCookie),
      );
    }
  });
});
