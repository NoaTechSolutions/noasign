import request from 'supertest';
import {
  bootstrapTestApp,
  closeTestApp,
  signToken,
  TestApp,
} from './harness';
import { resetDb, seedContractTenant, ContractTenant } from './fixtures';

// The core safety net: a contract driven create → send → sign → complete through
// the SAME HTTP endpoints the frontend + BoldSign hit, asserting the REAL persisted
// state (and the detail the frontend reads). BoldSign/email/R2 are the only mocks.
// It fails iff the owner would see the contract stuck or in the wrong state.
describe('Contract lifecycle (create → send → sign → complete)', () => {
  let ctx: TestApp;
  let tenant: ContractTenant;
  let token: string;

  beforeAll(async () => {
    ctx = await bootstrapTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  beforeEach(async () => {
    await resetDb(ctx.prisma);
    tenant = await seedContractTenant(ctx.prisma);
    token = signToken(ctx.jwt, tenant.user);
    Object.values(ctx.providerMock).forEach((m) => m.mockClear());
  });

  const server = () => ctx.app.getHttpServer();
  const bearer = () => `Bearer ${token}`;
  const statusOf = async (id: string) =>
    (await ctx.prisma.document.findUnique({ where: { id } }))?.status;

  // BoldSign → our webhook, exactly as prod delivers it (HMAC verify is mocked).
  async function webhook(docId: string, eventType: string) {
    const res = await request(server())
      .post('/boldsign/webhooks/events')
      .set('x-boldsign-signature', 'test-signature')
      .send({
        event: { eventType, created: String(Math.floor(1_700_000_000)) },
        data: {
          documentId: 'bs-doc-1',
          metaData: { noasignDocumentId: docId },
        },
      });
    expect([200, 201]).toContain(res.status);
    return res;
  }

  it('drives DRAFT → SENT → SIGNED → COMPLETED via the real endpoints', async () => {
    // ── CREATE ────────────────────────────────────────────────────────────
    const created = await request(server())
      .post('/documents/draft')
      .set('Authorization', bearer())
      .send({
        documentTypeId: tenant.documentType.id,
        formDefinitionId: tenant.formDefinition.id,
        signatureTemplateId: tenant.signatureTemplate.id,
        contractDate: '2026-07-16',
        dataJson: {
          customer_name: 'Jane Client',
          customer_email: 'jane@client.test',
        },
      });
    expect([200, 201]).toContain(created.status);
    const docId: string = created.body.document?.id ?? created.body.id;
    expect(docId).toBeTruthy();
    expect(await statusOf(docId)).toBe('DRAFT');

    // ── SEND (BoldSign mocked) ────────────────────────────────────────────
    const sent = await request(server())
      .post(`/documents/${docId}/send`)
      .set('Authorization', bearer());
    expect([200, 201]).toContain(sent.status);
    // The real send flow actually talked to the provider…
    expect(ctx.providerMock.createDocumentFromTemplate).toHaveBeenCalledTimes(1);
    expect(ctx.providerMock.sendDocument).toHaveBeenCalledTimes(1);
    // …and persisted SENT + the provider correlation id.
    const afterSend = await ctx.prisma.document.findUnique({ where: { id: docId } });
    expect(afterSend?.status).toBe('SENT');
    expect(afterSend?.sentAt).toBeTruthy();
    expect(afterSend?.providerDocumentId).toBe('bs-doc-1');

    // ── SIGN (BoldSign webhook) ───────────────────────────────────────────
    await webhook(docId, 'DocumentSigned');
    expect(await statusOf(docId)).toBe('SIGNED');
    expect((await ctx.prisma.document.findUnique({ where: { id: docId } }))?.signedAt)
      .toBeTruthy();

    // ── COMPLETE (BoldSign webhook) ───────────────────────────────────────
    await webhook(docId, 'DocumentCompleted');
    const completed = await ctx.prisma.document.findUnique({ where: { id: docId } });
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.completedAt).toBeTruthy();

    // ── The detail the frontend reads reflects it ─────────────────────────
    const detail = await request(server())
      .get(`/documents/${docId}`)
      .set('Authorization', bearer());
    expect(detail.status).toBe(200);
    expect(detail.body.status).toBe('COMPLETED');
  });

  it('rejects sending a document that is not a DRAFT', async () => {
    const created = await request(server())
      .post('/documents/draft')
      .set('Authorization', bearer())
      .send({
        documentTypeId: tenant.documentType.id,
        formDefinitionId: tenant.formDefinition.id,
        signatureTemplateId: tenant.signatureTemplate.id,
        contractDate: '2026-07-16',
        // A sendable draft needs a signer email (buildSignatureRecipient).
        dataJson: { customer_name: 'Jane Client', customer_email: 'jane@client.test' },
      });
    const docId: string = created.body.document?.id ?? created.body.id;

    // First send → SENT
    const firstSend = await request(server())
      .post(`/documents/${docId}/send`)
      .set('Authorization', bearer());
    expect([200, 201]).toContain(firstSend.status);
    expect(await statusOf(docId)).toBe('SENT');

    // Second send → rejected (only DRAFT can be sent); state unchanged.
    const secondSend = await request(server())
      .post(`/documents/${docId}/send`)
      .set('Authorization', bearer());
    expect(secondSend.status).toBeGreaterThanOrEqual(400);
    expect(await statusOf(docId)).toBe('SENT');
  });
});
