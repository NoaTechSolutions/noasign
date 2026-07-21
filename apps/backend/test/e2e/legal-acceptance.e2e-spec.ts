import request from 'supertest';
import { createHash } from 'crypto';
import { LegalDocType } from '@prisma/client';
import { bootstrapTestApp, closeTestApp, signToken, TestApp } from './harness';
import { resetDb, seedReceiptTenant, ReceiptTenant } from './fixtures';
import { LegalService } from '../../src/legal/legal.service';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

// Mechanism candado for legal acceptance. Pins the invariants the popup depends on,
// driven through the real endpoints. Content-agnostic — a DRAFT version is enough.
describe('legal acceptance — mechanism candado', () => {
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

  const seedVersion = (
    docType: LegalDocType,
    content: string,
    over: Partial<{ isActive: boolean; version: string }> = {},
  ) =>
    ctx.prisma.legalDocumentVersion.create({
      data: {
        docType,
        version: over.version ?? 'v1-draft',
        contentHash: sha(content),
        content,
        isActive: over.isActive ?? true,
        isDraft: true,
      },
    });

  it('no acceptance yet → status says mustAccept, TERMS pending', async () => {
    await seedVersion(LegalDocType.TERMS, '# Terms v1 (draft)');

    const res = await request(server())
      .get('/legal/acceptance-status')
      .set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(res.body.mustAccept).toBe(true);
    expect(res.body.pending.map((p: { docType: string }) => p.docType)).toContain(
      'TERMS',
    );
  });

  it('POST /legal/accept → records acceptance (version + IP), then status clears', async () => {
    const v = await seedVersion(LegalDocType.TERMS, '# Terms v1 (draft)');

    const accept = await request(server())
      .post('/legal/accept')
      .set('Authorization', bearer())
      .set('x-forwarded-for', '203.0.113.7'); // simulate the proxy-forwarded client IP
    expect([200, 201]).toContain(accept.status);

    // The real row must exist with the exact version + captured IP — not a boolean.
    const row = await ctx.prisma.legalAcceptance.findFirst({
      where: { userId: tenant.user.id, versionId: v.id },
    });
    if (!row || row.ipAddress !== '203.0.113.7' || row.docType !== 'TERMS') {
      throw new Error(
        `Acceptance must be recorded VERSIONED with the IP — got ${JSON.stringify(row)}. ` +
          `A bare boolean would not say WHICH version was accepted. See ` +
          `docs/architecture/legal-acceptance.md.`,
      );
    }

    const status = await request(server())
      .get('/legal/acceptance-status')
      .set('Authorization', bearer());
    expect(status.body.mustAccept).toBe(false);
  });

  it('GET /legal/terms/active → 200 with content + hash', async () => {
    const content = '# Terms v1 (draft)\n\nBe excellent to each other.';
    await seedVersion(LegalDocType.TERMS, content);

    const res = await request(server()).get('/legal/terms/active');
    expect(res.status).toBe(200);
    expect(res.body.content).toBe(content);
    expect(res.body.contentHash).toBe(sha(content));
  });

  // THE RED-TESTABLE GUARD: the popup says "read the Terms" and links to the active
  // version. If that version is active but EMPTY, the link is dead — the copy would
  // lie. The endpoint must surface it (404), never serve an empty document.
  it('active TERMS version with EMPTY content → GET active 404 (copy cannot lie)', async () => {
    await seedVersion(LegalDocType.TERMS, '   '); // active but blank

    const res = await request(server()).get('/legal/terms/active');
    if (res.status !== 404) {
      throw new Error(
        `An active-but-empty legal version must 404, not serve nothing behind a ` +
          `"read the Terms" link (got HTTP ${res.status}). The copy cannot lie. ` +
          `See docs/architecture/legal-acceptance.md.`,
      );
    }
    // ...and it must NOT count as pending (you can't be asked to accept nothing).
    const status = await request(server())
      .get('/legal/acceptance-status')
      .set('Authorization', bearer());
    expect(status.body.mustAccept).toBe(false);
  });

  // ── LOCK 1: activating a DRAFT is refused (the lawyer is the gate, in code) ──
  it('LOCK: activating a DRAFT without override → REFUSED, stays inactive', async () => {
    const legal = ctx.app.get(LegalService);
    const draft = await seedVersion(LegalDocType.TERMS, '# Draft', {
      isActive: false,
    }); // seedVersion always sets isDraft: true

    let refused = false;
    try {
      await legal.activateVersion(draft.id);
    } catch {
      refused = true;
    }
    const after = await ctx.prisma.legalDocumentVersion.findUnique({
      where: { id: draft.id },
    });
    if (!refused || after?.isActive) {
      throw new Error(
        `Activating a DRAFT (unreviewed) version without an explicit override MUST be ` +
          `refused and leave it inactive — otherwise an accidental activation blocks real ` +
          `clients with unapproved text. Got refused=${refused}, isActive=${after?.isActive}. ` +
          `See docs/architecture/legal-acceptance.md ("content is the gate").`,
      );
    }
    // The explicit override is the only way to activate a draft (for testing).
    await legal.activateVersion(draft.id, { allowDraft: true });
    const now = await ctx.prisma.legalDocumentVersion.findUnique({
      where: { id: draft.id },
    });
    expect(now?.isActive).toBe(true);
  });

  // ── LOCK 2: a normal seed activates NOTHING (isActive defaults false) ──
  it('LOCK: seeding inactive drafts does NOT block anyone (mustAccept stays false)', async () => {
    await seedVersion(LegalDocType.TERMS, '# Draft T', { isActive: false });
    await seedVersion(LegalDocType.PRIVACY, '# Draft P', { isActive: false });

    const status = await request(server())
      .get('/legal/acceptance-status')
      .set('Authorization', bearer());
    expect(status.body.mustAccept).toBe(false);
  });

  // ── LOCK 3: no active version at all → no popup ──
  it('LOCK: no active version → mustAccept false (no popup, nothing to block)', async () => {
    const status = await request(server())
      .get('/legal/acceptance-status')
      .set('Authorization', bearer());
    expect(status.body.mustAccept).toBe(false);
  });
});
