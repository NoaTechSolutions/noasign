import request from 'supertest';
import { DocumentStatus } from '@prisma/client';
import { bootstrapTestApp, closeTestApp, signToken, TestApp } from './harness';
import {
  resetDb,
  seedReceiptTenant,
  createReceiptDoc,
  ReceiptTenant,
} from './fixtures';

const DOC = 'docs/architecture/document-lifecycle.md';

// BACKEND-invariants candado for the receipt "kill" actions. It pins the BEHAVIOR
// of the delete/void ENDPOINTS the frontend hits, against what document-lifecycle.md
// documents — driven through the real HTTP endpoints, asserting the real persisted
// state.
//
// ⚠️ What this does NOT cover: the FRONTEND action routing (which endpoint the kebab
// calls for "Discard"). That's a frontend concern (getAvailableActions / DocumentsPanel)
// with NO test today — see the coverage table in docs/development/testing.md. A change
// there is caught by nobody. This test pins the endpoints' behavior, not the routing.
describe(`receipt lifecycle — BACKEND invariants candado (see ${DOC})`, () => {
  let ctx: TestApp;
  let tenant: ReceiptTenant;
  let token: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });
  afterAll(async () => {
    await closeTestApp(ctx);
  });
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    tenant = await seedReceiptTenant(ctx.prisma);
    token = signToken(ctx.jwt, tenant.user);
  });

  const server = () => ctx.app.getHttpServer();
  const bearer = () => `Bearer ${token}`;
  const reload = (id: string) =>
    ctx.prisma.document.findUnique({ where: { id } });

  it('DELETE on a DRAFT receipt → SOFT DELETE (deletedAt), NOT Cancelled', async () => {
    const doc = await createReceiptDoc(ctx.prisma, tenant, DocumentStatus.DRAFT);

    await request(server())
      .delete(`/documents/${doc.id}`)
      .set('Authorization', bearer())
      .expect(204);

    const after = await reload(doc.id);
    if (!after?.deletedAt || after.status === DocumentStatus.CANCELLED) {
      throw new Error(
        `Discard/Delete of a receipt must be a SOFT DELETE (deletedAt), never Cancel. ` +
          `Got deletedAt=${String(after?.deletedAt)}, status=${after?.status}. ` +
          `This is the EXACT drift ${DOC} warns about — the 2026-07-14 note wrongly claimed ` +
          `"receipt Discard → CANCELLED". → if the routing intentionally changed, update ${DOC} ` +
          `AND this test together.`,
      );
    }
  });

  it('DELETE on a SENT receipt → rejected (an issued receipt is not deletable)', async () => {
    const doc = await createReceiptDoc(ctx.prisma, tenant, DocumentStatus.SENT);

    const res = await request(server())
      .delete(`/documents/${doc.id}`)
      .set('Authorization', bearer());
    expect(res.status).toBeGreaterThanOrEqual(400);

    const after = await reload(doc.id);
    if (after?.deletedAt) {
      throw new Error(
        `A SENT (issued) receipt must NOT be deletable — only DRAFT/SEND_FAILED are. ` +
          `Got deletedAt=${String(after.deletedAt)}. → see ${DOC} §DELETE.`,
      );
    }
  });

  it('VOID on a SENT receipt → supersededAt set, status STAYS SENT (VOID is derived)', async () => {
    const doc = await createReceiptDoc(ctx.prisma, tenant, DocumentStatus.SENT);

    const res = await request(server())
      .post(`/documents/receipt/${doc.id}/void`)
      .set('Authorization', bearer());
    expect([200, 201]).toContain(res.status);

    const after = await reload(doc.id);
    if (!after?.supersededAt || after.status !== DocumentStatus.SENT) {
      throw new Error(
        `Void of a SENT receipt must set supersededAt and KEEP status=SENT — VOID is DERIVED ` +
          `from supersededAt, not a status value. Got supersededAt=${String(after?.supersededAt)}, ` +
          `status=${after?.status}. → see ${DOC} §"Why three mechanisms"; update the doc AND this ` +
          `test together if intentional.`,
      );
    }
  });

  it('VOID on a DRAFT receipt → rejected (only SENT receipts can be voided)', async () => {
    const doc = await createReceiptDoc(ctx.prisma, tenant, DocumentStatus.DRAFT);

    const res = await request(server())
      .post(`/documents/receipt/${doc.id}/void`)
      .set('Authorization', bearer());
    expect(res.status).toBeGreaterThanOrEqual(400);

    const after = await reload(doc.id);
    expect(after?.supersededAt ?? null).toBeNull();
  });
});
