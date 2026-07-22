import request from 'supertest';
import { DocumentStatus } from '@prisma/client';
import { bootstrapTestApp, closeTestApp, signToken, TestApp } from './harness';
import {
  resetDb,
  seedInvoiceTenant,
  seedReceiptTenant,
  seedPeerTenant,
  createInvoiceDoc,
  createReceiptDoc,
  createTemplate,
  INVOICE_BASE_PDF,
  RECEIPT_BASE_PDF,
  ReceiptTenant,
} from './fixtures';

// Authorization candado for GET /documents/invoice/:id/pdf.
//
// This route streams a regenerated PDF. It must answer exactly one question before
// rendering anything: "is this id an INVOICE belonging to the caller's tenant?"
// Both halves are pinned here, because a PDF route that only gets one half right
// is either a data leak (tenant) or a confusing blank document (type).
//
// The TYPE half is the one that regressed: streamInvoicePdf was the only method in
// the invoice family that omitted the `documentType` filter its five siblings all
// carry (sendDraftInvoice, sendInvoiceNow, resendInvoice, updateInvoice,
// voidInvoice). Before the fix, a RECEIPT id from your OWN tenant rendered a blank
// PDF with HTTP 200 instead of 404.
//
// The TENANT half was already correct — `companyProfileId` is resolved server-side
// from the JWT, never from client input. It is pinned anyway: it is the half that
// would actually leak data if anyone ever "simplified" the query.
describe('GET /documents/invoice/:id/pdf — authorization candado', () => {
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
  const getPdf = (id: string) =>
    request(server())
      .get(`/documents/invoice/${id}/pdf`)
      .set('Authorization', bearer());

  // ── POSITIVE: legitimate access must keep working ──────────────────────────
  // A guard that blocks the attack AND the owner is not a fix, it is an outage.
  it('POSITIVE — the owner CAN download the PDF of their OWN invoice', async () => {
    const template = await createTemplate(
      ctx.prisma,
      tenant.company.id,
      INVOICE_BASE_PDF,
    );
    const doc = await createInvoiceDoc(
      ctx.prisma,
      tenant,
      DocumentStatus.SENT,
      {
        receiptTemplateId: template.id,
        dataJson: { company_name: 'ACME LLC', total: '100.00' },
      },
    );

    const res = await getPdf(doc.id).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });

    if (res.status !== 200) {
      throw new Error(
        `The owner must be able to download their OWN invoice PDF. Got HTTP ${res.status}. ` +
          `If this broke, the documentType/tenant guard in streamInvoicePdf is too strict — ` +
          `it is rejecting legitimate access, not just the attack.`,
      );
    }
    expect(res.headers['content-type']).toContain('application/pdf');
    // A real PDF, not an error page: the magic bytes must be there.
    expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
  });

  // ── NEGATIVE 1: cross-tenant ───────────────────────────────────────────────
  // This half was already correct. It is pinned so it can never silently regress.
  it('NEGATIVE — a user CANNOT read an invoice PDF belonging to ANOTHER tenant', async () => {
    const peer = await seedPeerTenant(
      ctx.prisma,
      tenant,
      'e2e.peer@test.local',
    );
    const peerTemplate = await createTemplate(
      ctx.prisma,
      peer.company.id,
      INVOICE_BASE_PDF,
    );
    // A fully renderable invoice — it belongs to the OTHER tenant.
    const victim = await createInvoiceDoc(
      ctx.prisma,
      peer,
      DocumentStatus.SENT,
      {
        receiptTemplateId: peerTemplate.id,
        dataJson: { company_name: 'VICTIM CORP', total: '9999.00' },
      },
    );

    // Caller is `tenant`'s user, asking for `peer`'s document id.
    const res = await getPdf(victim.id);

    if (res.status !== 404) {
      throw new Error(
        `CROSS-TENANT LEAK: a user of tenant A requested tenant B's invoice PDF and got ` +
          `HTTP ${res.status} instead of 404. streamInvoicePdf MUST scope the lookup by ` +
          `companyProfileId resolved from the JWT (never from client input).`,
      );
    }
    expect(res.headers['content-type']).not.toContain('application/pdf');
  });

  // ── NEGATIVE 2: type confusion (the actual regression) ─────────────────────
  // Before the fix this returned HTTP 200 with a blank PDF: the query matched a
  // RECEIPT because it filtered only by id + tenant, never by documentType.
  it('NEGATIVE — a RECEIPT id is REJECTED by the invoice PDF route (not rendered blank)', async () => {
    const receiptTenant = await seedReceiptTenant(ctx.prisma);
    // Same company as the caller, so tenant scoping cannot be what blocks this —
    // only the documentType filter can.
    const receiptTemplate = await createTemplate(
      ctx.prisma,
      tenant.company.id,
      RECEIPT_BASE_PDF,
    );
    const receipt = await createReceiptDoc(
      ctx.prisma,
      {
        ...receiptTenant,
        company: tenant.company,
        user: tenant.user,
      },
      DocumentStatus.SENT,
      {
        receiptTemplateId: receiptTemplate.id,
        dataJson: { receipt_number: 'REC-2026-0001', amount: '250.00' },
      },
    );

    const res = await getPdf(receipt.id);

    if (res.status !== 404) {
      throw new Error(
        `TYPE CONFUSION: the invoice PDF route accepted a RECEIPT id and answered HTTP ` +
          `${res.status} instead of 404. streamInvoicePdf must filter by ` +
          `documentType.code = INVOICE, exactly like its five siblings ` +
          `(sendDraftInvoice, sendInvoiceNow, resendInvoice, updateInvoice, voidInvoice).`,
      );
    }
    expect(res.headers['content-type']).not.toContain('application/pdf');
  });
});
