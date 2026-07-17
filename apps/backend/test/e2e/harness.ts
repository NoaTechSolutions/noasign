// Shared e2e harness — boots the REAL AppModule against the isolated test DB,
// mocking ONLY the external world (BoldSign, email, R2 object storage). Everything
// the frontend actually hits — routes, guards, validation pipe, services, Prisma
// queries — runs for real. Reusable across contract / invoice / receipt suites.
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SignatureProviderService } from '../../src/signature-provider/signature-provider.service';
import { EmailService } from '../../src/email/email.service';
import { R2Service } from '../../src/storage/r2.service';
import { BoldSignService } from '../../src/boldsign/boldsign.service';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  jwt: JwtService;
  // The external-world mocks, exposed so a test can assert on / reconfigure them.
  providerMock: Record<string, jest.Mock>;
  emailMock: Record<string, jest.Mock>;
  boldSignMock: Record<string, jest.Mock>;
}

export function buildProviderMock(): Record<string, jest.Mock> {
  return {
    // A created BoldSign document — the send flow reads providerDocumentId + status.
    createDocumentFromTemplate: jest.fn().mockResolvedValue({
      providerDocumentId: 'bs-doc-1',
      status: 'document.draft',
      providerStatus: 'document.draft',
    }),
    getDocumentStatus: jest
      .fn()
      .mockResolvedValue({ status: 'document.draft', providerStatus: 'document.draft' }),
    waitForDocumentDraft: jest.fn().mockResolvedValue(undefined),
    sendDocument: jest.fn().mockResolvedValue(undefined),
    resendDocument: jest.fn().mockResolvedValue(undefined),
    downloadDocumentPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 test')),
    getSigningLink: jest
      .fn()
      .mockResolvedValue({ signingLink: 'https://sign.test/x', signingUrl: 'https://sign.test/x' }),
  };
}

export async function bootstrapTestApp(): Promise<TestApp> {
  const providerMock = buildProviderMock();
  const emailMock: Record<string, jest.Mock> = {
    sendSigningInvitation: jest.fn().mockResolvedValue({ id: 'email-1' }),
    sendSignedConfirmation: jest.fn().mockResolvedValue(undefined),
  };
  // R2 not configured → the completed-status PDF cache is skipped (no object store
  // in tests). BoldSign only reached for webhook signature verification → always OK.
  const r2Mock = {
    isConfigured: jest.fn().mockReturnValue(false),
    getObject: jest.fn(),
    putObject: jest.fn(),
  };
  const boldSignMock: Record<string, jest.Mock> = {
    verifyEventCallback: jest.fn().mockReturnValue(true),
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SignatureProviderService)
    .useValue(providerMock)
    .overrideProvider(EmailService)
    .useValue(emailMock)
    .overrideProvider(R2Service)
    .useValue(r2Mock)
    .overrideProvider(BoldSignService)
    .useValue(boldSignMock)
    .compile();

  // rawBody: the BoldSign webhook verifies the raw request body.
  const app = moduleRef.createNestApplication({ rawBody: true });
  // Same pipe as main.ts — the whitelist/forbidNonWhitelisted behaviour is part of
  // the real contract (it's what produced the customer-DTO 400s), so tests must run it.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    jwt: app.get(JwtService),
    providerMock,
    emailMock,
    boldSignMock,
  };
}

// Clean teardown — close the Nest app and disconnect Prisma (PrismaService has no
// onModuleDestroy, so app.close() alone leaves the pool open and jest warns about
// leaked handles).
export async function closeTestApp(ctx: TestApp): Promise<void> {
  await ctx.prisma.$disconnect();
  await ctx.app.close();
}

// Mint a Bearer token the real JwtStrategy accepts (payload sub/email/role/tenant).
// The user must already exist and be ACTIVE in the test DB (the strategy re-loads it).
export function signToken(
  jwt: JwtService,
  user: { id: string; email: string; role: string; companyProfileId: string | null },
): string {
  return jwt.sign({
    sub: user.id,
    email: user.email,
    role: user.role,
    companyProfileId: user.companyProfileId,
  });
}
