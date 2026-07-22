import request from 'supertest';
import { bootstrapTestApp, closeTestApp, signToken, TestApp } from './harness';
import { resetDb, seedReceiptTenant, ReceiptTenant } from './fixtures';

// End-to-end wiring for the "session robustness" fix. The exhaustive multi-secret
// matching logic is unit-tested in src/auth/jwt-secrets.spec.ts (deterministic,
// no boot needed). This suite proves the wiring through the REAL app:
//  - a token signed with the primary secret still authenticates (no regression
//    from swapping secretOrKey → secretOrKeyProvider);
//  - an unknown/absent token is rejected AND the auth cookie is cleared, so a
//    dead session cannot keep feeding the reload loop.
describe('session robustness — auth wiring + cookie clear on 401', () => {
  let ctx: TestApp;
  let tenant: ReceiptTenant;

  const AUTH_COOKIE = 'ntssign_access_token';
  const GUARDED = '/documents/my-documents';

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });
  afterAll(async () => {
    await closeTestApp(ctx);
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    tenant = await seedReceiptTenant(ctx.prisma);
  });

  const server = () => ctx.app.getHttpServer();

  // A Set-Cookie line that deletes the auth cookie: express clearCookie emits an
  // expired/epoch cookie, so it names the cookie and forces it to expire.
  const clearsAuthCookie = (setCookie: string[] | undefined): boolean =>
    (setCookie ?? []).some(
      (c) =>
        c.startsWith(`${AUTH_COOKIE}=`) &&
        (/Expires=Thu, 01 Jan 1970/i.test(c) || /Max-Age=0/i.test(c)),
    );

  it('✅ a token signed with the primary JWT_SECRET still authenticates (200)', async () => {
    const token = signToken(ctx.jwt, tenant.user);
    const res = await request(server())
      .get(GUARDED)
      .set('Authorization', `Bearer ${token}`);
    // 200 proves the new secretOrKeyProvider accepts the primary secret exactly
    // as the old secretOrKey did.
    expect(res.status).toBe(200);
  });

  it('🔒 no token → 401 AND the auth cookie is cleared', async () => {
    const res = await request(server()).get(GUARDED);
    expect(res.status).toBe(401);
    if (!clearsAuthCookie(res.headers['set-cookie'] as unknown as string[])) {
      throw new Error(
        `A 401 must clear the HttpOnly auth cookie so a dead session cannot keep ` +
          `feeding the proxy loop. Set-Cookie was: ${JSON.stringify(res.headers['set-cookie'])}`,
      );
    }
  });

  it('🔒 a token signed with an UNKNOWN secret → 401 AND the cookie is cleared', async () => {
    // A well-formed JWT whose signature none of the app's secrets can verify —
    // exactly the failover-from-another-origin case.
    const foreign = signToken(ctx.jwt, tenant.user); // valid shape...
    const tampered = `${foreign.slice(0, -3)}xyz`; // ...broken signature
    const res = await request(server())
      .get(GUARDED)
      .set('Cookie', `${AUTH_COOKIE}=${tampered}`);
    expect(res.status).toBe(401);
    if (!clearsAuthCookie(res.headers['set-cookie'] as unknown as string[])) {
      throw new Error(
        `A 401 from an unverifiable cookie token must clear the cookie. ` +
          `Set-Cookie was: ${JSON.stringify(res.headers['set-cookie'])}`,
      );
    }
  });
});
