import request from 'supertest';
import { DocumentStatus } from '@prisma/client';
import { bootstrapTestApp, closeTestApp, signToken, TestApp } from './harness';
import {
  resetDb,
  seedInvoiceTenant,
  createInvoiceDoc,
  ReceiptTenant,
} from './fixtures';

const DOC = 'docs/architecture/document-lifecycle.md';

// BACKEND-invariants candado for the invoice "kill" actions — the mirror of
// receipt-lifecycle. Same coverage boundary: it pins the delete/void ENDPOINT
// behavior, NOT the frontend action routing (see the coverage map in testing.md).
//
// The VOID-DRAFT case below guards a bug that ACTUALLY happened: voidInvoice once
// did not check status and would void a DRAFT (while voidReceipt already enforced
// SENT). The SENT guard now mirrors voidReceipt — this candado keeps it that way.
describe(`invoice lifecycle — BACKEND invariants candado (see ${DOC})`, () => {
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
    tenant = await seedInvoiceTenant(ctx.prisma);
    token = signToken(ctx.jwt, tenant.user);
  });

  const server = () => ctx.app.getHttpServer();
  const bearer = () => `Bearer ${token}`;
  const reload = (id: string) =>
    ctx.prisma.document.findUnique({ where: { id } });

  it('DELETE on a DRAFT invoice → SOFT DELETE (deletedAt), NOT Cancelled', async () => {
    const doc = await createInvoiceDoc(ctx.prisma, tenant, DocumentStatus.DRAFT);

    await request(server())
      .delete(`/documents/${doc.id}`)
      .set('Authorization', bearer())
      .expect(204);

    const after = await reload(doc.id);
    if (!after?.deletedAt || after.status === DocumentStatus.CANCELLED) {
      throw new Error(
        `Discard/Delete of an invoice must be a SOFT DELETE (deletedAt), never Cancel. ` +
          `Got deletedAt=${String(after?.deletedAt)}, status=${after?.status}. ` +
          `(b73cbc9 fixed invoice Discard → CANCELLED to → soft delete.) ` +
          `→ if the routing intentionally changed, update ${DOC} AND this test together.`,
      );
    }
  });

  it('VOID on a SENT invoice → supersededAt set, status STAYS SENT (VOID is derived)', async () => {
    const doc = await createInvoiceDoc(ctx.prisma, tenant, DocumentStatus.SENT);

    const res = await request(server())
      .post(`/documents/invoice/${doc.id}/void`)
      .set('Authorization', bearer());
    expect([200, 201]).toContain(res.status);

    const after = await reload(doc.id);
    if (!after?.supersededAt || after.status !== DocumentStatus.SENT) {
      throw new Error(
        `Void of a SENT invoice must set supersededAt and KEEP status=SENT — VOID is DERIVED, ` +
          `not a status. Got supersededAt=${String(after?.supersededAt)}, status=${after?.status}. ` +
          `→ see ${DOC} §"Why three mechanisms".`,
      );
    }
  });

  // The bug that existed: voidInvoice used to void a DRAFT (no SENT check). This is
  // the alarm on the door that was already forced once.
  it('VOID on a DRAFT invoice → REJECTED (only SENT invoices can be voided)', async () => {
    const doc = await createInvoiceDoc(ctx.prisma, tenant, DocumentStatus.DRAFT);

    const res = await request(server())
      .post(`/documents/invoice/${doc.id}/void`)
      .set('Authorization', bearer());

    const after = await reload(doc.id);
    if (res.status < 400 || after?.supersededAt) {
      throw new Error(
        `A DRAFT invoice must NOT be voidable — a never-sent invoice is deleted, not voided ` +
          `(this REGRESSED once: voidInvoice skipped the SENT check). Got HTTP ${res.status}, ` +
          `supersededAt=${String(after?.supersededAt)}. → see ${DOC} §VOID; keep the SENT guard.`,
      );
    }
  });
});
