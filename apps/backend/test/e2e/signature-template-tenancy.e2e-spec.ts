import request from 'supertest';
import { bootstrapTestApp, closeTestApp, signToken, TestApp } from './harness';
import { resetDb, seedContractTenant, ContractTenant } from './fixtures';

// Tenancy candado for the `signatureTemplateId` object reference on
// POST /documents/draft.
//
// SignatureTemplate.companyProfileId carries the ownership semantics
// (schema.prisma:471-475): NULL = a GLOBAL catalog template every tenant may
// use; a set value = a CUSTOM template owned by that one tenant. The lookup at
// documents.service.ts:953-955 was a bare `findUnique({ where: { id } })`, so it
// could not express that rule, and the only follow-up check compared
// documentTypeId — a type-consistency check, not an ownership check.
//
// NOTE ON THE MASTER "BORROW": there is deliberately NO superadmin bypass here.
// The on-behalf-of flow is constrained to the caller's own tenant
// (documents.service.ts:1015-1018 requires the target user to share
// companyProfileId) and the row is always written with
// `companyProfileId: user.companyProfileId` (:1034). So a master never
// legitimately needs another tenant's PRIVATE template on this path — adding a
// bypass would CREATE cross-tenant reach rather than preserve it.
describe('signature template tenancy candado — POST /documents/draft', () => {
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
  const draft = (signatureTemplateId: string) =>
    request(server())
      .post('/documents/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({
        documentTypeId: tenant.documentType.id,
        formDefinitionId: tenant.formDefinition.id,
        signatureTemplateId,
        contractDate: '2026-07-21',
        dataJson: { customer_name: 'Jane Client' },
      });

  // seedContractTenant's template is owned by the caller's own company, so the
  // existing contract-lifecycle suite already covers the "own private template"
  // positive. This asserts it explicitly next to the other two cases.
  it('POSITIVE — the tenant\'s OWN private template works', async () => {
    const res = await draft(tenant.signatureTemplate.id);
    if (![200, 201].includes(res.status)) {
      throw new Error(
        `A tenant must be able to use its OWN signature template. Got HTTP ${res.status}.`,
      );
    }
  });

  it('POSITIVE — a GLOBAL catalog template (companyProfileId = null) works for any tenant', async () => {
    const global = await ctx.prisma.signatureTemplate.create({
      data: {
        name: 'E2E Global Catalog Template',
        documentTypeId: tenant.documentType.id,
        providerTemplateId: 'bs-global-1',
        recipientRole: 'Client',
        isActive: true,
        isStandard: true,
        companyProfileId: null, // the catalog marker
      },
      select: { id: true },
    });

    const res = await draft(global.id);
    if (![200, 201].includes(res.status)) {
      throw new Error(
        `A GLOBAL catalog template (companyProfileId = null) must be usable by EVERY tenant — ` +
          `that is the whole point of the shared catalog (schema.prisma:471-475). ` +
          `Got HTTP ${res.status}. The guard is too strict: it must reject only templates ` +
          `PRIVATELY owned by a DIFFERENT tenant.`,
      );
    }
  });

  it('NEGATIVE — another tenant\'s PRIVATE template is rejected', async () => {
    const peerCompany = await ctx.prisma.companyProfile.create({
      data: { companyName: 'E2E Peer Contracts Co', contractsEnabled: true },
    });
    const foreign = await ctx.prisma.signatureTemplate.create({
      data: {
        name: 'PEER PRIVATE TEMPLATE',
        documentTypeId: tenant.documentType.id,
        providerTemplateId: 'bs-peer-secret',
        recipientRole: 'Client',
        isActive: true,
        companyProfileId: peerCompany.id, // privately owned by the OTHER tenant
      },
      select: { id: true },
    });

    const res = await draft(foreign.id);

    if (res.status !== 404) {
      throw new Error(
        `CROSS-TENANT TEMPLATE: a user of tenant A created a contract with tenant B's PRIVATE ` +
          `signature template and got HTTP ${res.status} instead of 404. That exposes B's ` +
          `providerTemplateId, field mappings and send subject/message templates through the ` +
          `rendered document. Scope the lookup: allow companyProfileId = null (catalog) or ` +
          `= the caller's tenant; reject the rest.`,
      );
    }
    const written = await ctx.prisma.document.count({
      where: { signatureTemplateId: foreign.id },
    });
    expect(written).toBe(0);
  });
});
