import request from 'supertest';
import { DocumentStatus } from '@prisma/client';
import { bootstrapTestApp, closeTestApp, signToken, TestApp } from './harness';
import {
  resetDb,
  seedInvoiceTenant,
  seedPeerTenant,
  seedInvoiceCreateStack,
  createCustomer,
  createInvoiceDoc,
  ReceiptTenant,
} from './fixtures';

// Tenancy candado for the `customerId` object reference on the sale-document
// write paths (createInvoice / updateInvoice, and the receipt twins).
//
// The bug this pins: receipts.service wrote `customerId: dto.customerId` straight
// to the FK at four call sites with NO validation, while the CONTRACT path in
// documents.service.ts:991-1000 had always verified the customer belongs to the
// caller's tenant. A user could therefore attach ANOTHER tenant's customer id to
// their own invoice and then read that customer back — `documentDetailInclude`
// joins `customer: true`, and the receipt-stats "top clients" query looked names
// up by id with no tenant filter.
//
// Both halves are pinned here, because either one alone leaves the leak open:
//   WRITE — a foreign customerId must be refused before the FK is written.
//   READ  — even if a dirty FK already exists in the database (rows written
//           before the fix), a foreign customer must never surface.
describe('customer tenancy candado — sale documents', () => {
  let ctx: TestApp;
  let tenant: ReceiptTenant;
  let peer: ReceiptTenant;
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
    peer = await seedPeerTenant(ctx.prisma, tenant, 'e2e.peer@test.local');
    await seedInvoiceCreateStack(ctx.prisma, tenant);
    token = signToken(ctx.jwt, tenant.user);
  });

  const server = () => ctx.app.getHttpServer();
  const bearer = () => `Bearer ${token}`;
  const invoicePayload = (customerId?: string) => ({
    data: { company_name: 'ACME LLC', total: '100.00' },
    ...(customerId ? { customerId } : {}),
  });

  // ── WRITE side ─────────────────────────────────────────────────────────────

  it('POSITIVE — creating an invoice with the tenant\'s OWN customer still works', async () => {
    const mine = await createCustomer(ctx.prisma, tenant, 'My Own Client');

    const res = await request(server())
      .post('/documents/invoice')
      .set('Authorization', bearer())
      .send(invoicePayload(mine.id));

    if (![200, 201].includes(res.status)) {
      throw new Error(
        `Legitimate use broke: creating an invoice with a customer of the caller's OWN ` +
          `tenant returned HTTP ${res.status}. The guard must reject only FOREIGN ids.`,
      );
    }
    const doc = await ctx.prisma.document.findFirst({
      where: { companyProfileId: tenant.company.id },
      select: { customerId: true },
    });
    expect(doc?.customerId).toBe(mine.id);
  });

  it('NEGATIVE — creating an invoice with ANOTHER tenant\'s customerId is rejected', async () => {
    const foreign = await createCustomer(ctx.prisma, peer, 'Victim Client');

    const res = await request(server())
      .post('/documents/invoice')
      .set('Authorization', bearer())
      .send(invoicePayload(foreign.id));

    if (res.status !== 404) {
      throw new Error(
        `CROSS-TENANT FK: createInvoice accepted a customerId owned by another tenant and ` +
          `answered HTTP ${res.status} instead of 404. Verify the customer belongs to the ` +
          `caller's tenant before writing the FK — same check as documents.service.ts:991-1000.`,
      );
    }
    // The document must not exist at all — the guard runs before the write.
    const written = await ctx.prisma.document.count({
      where: { customerId: foreign.id },
    });
    expect(written).toBe(0);
  });

  it('NEGATIVE — updating an invoice to ANOTHER tenant\'s customerId is rejected', async () => {
    const foreign = await createCustomer(ctx.prisma, peer, 'Victim Client');
    const created = await request(server())
      .post('/documents/invoice')
      .set('Authorization', bearer())
      .send(invoicePayload());
    expect([200, 201]).toContain(created.status);
    const docId = (created.body as { document: { id: string } }).document.id;

    const res = await request(server())
      .patch(`/documents/invoice/${docId}`)
      .set('Authorization', bearer())
      .send({ data: { company_name: 'ACME LLC' }, customerId: foreign.id });

    if (res.status !== 404) {
      throw new Error(
        `CROSS-TENANT FK on UPDATE: updateInvoice accepted another tenant's customerId and ` +
          `answered HTTP ${res.status} instead of 404. The create path is not the only ` +
          `way in — the update path writes the same FK.`,
      );
    }
    const after = await ctx.prisma.document.findUnique({
      where: { id: docId },
      select: { customerId: true },
    });
    expect(after?.customerId).not.toBe(foreign.id);
  });

  // ── READ side ──────────────────────────────────────────────────────────────
  // Defence in depth: the write guard stops NEW dirty rows, but rows written
  // before the fix still exist in staging/prod. The read path must not surface
  // them either.

  it('NEGATIVE (read) — a foreign customer never appears in "top clients", even with a dirty FK already in the DB', async () => {
    const foreign = await createCustomer(ctx.prisma, peer, 'LEAKED CLIENT NAME');
    // Simulate a row written BEFORE the write guard existed: plant the dirty FK
    // directly, bypassing the endpoint.
    await createInvoiceDoc(ctx.prisma, tenant, DocumentStatus.SENT);
    await ctx.prisma.document.updateMany({
      where: { companyProfileId: tenant.company.id },
      data: { customerId: foreign.id },
    });

    const res = await request(server())
      .get('/documents/receipt/stats')
      .set('Authorization', bearer());
    expect(res.status).toBe(200);

    const body = JSON.stringify(res.body);
    if (body.includes('LEAKED CLIENT NAME')) {
      throw new Error(
        `CROSS-TENANT READ: another tenant's customer name surfaced in the receipt stats ` +
          `"top clients". The customer.findMany that resolves topCustomerIds must filter by ` +
          `companyProfileId — a dirty FK from before the write guard must still not resolve.`,
      );
    }
  });
});
