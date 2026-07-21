import request from 'supertest';
import { bootstrapTestApp, closeTestApp, TestApp } from './harness';

// Proves the harness itself: the REAL app boots against the ISOLATED test DB with
// only the external world mocked. If this suite is red, no lifecycle test is
// trustworthy — so it runs first.
describe('e2e harness (smoke)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('boots the real app and serves a public route (/version)', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/version');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Object);
  });

  it('is wired to the isolated *_test database (real query runs)', async () => {
    const count = await ctx.prisma.document.count();
    expect(typeof count).toBe('number');
    expect(process.env.DATABASE_URL).toMatch(/_test(\?|$)/);
  });

  it('enforces auth on a guarded route (no token → 401)', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/users/me');
    expect(res.status).toBe(401);
  });
});
