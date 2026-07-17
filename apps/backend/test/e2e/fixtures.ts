import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../src/prisma/prisma.service';

// Wipe every table before a suite/test seeds fresh, so runs are isolated and
// order-independent. TRUNCATE ... CASCADE handles the FK graph in one shot;
// _prisma_migrations is left alone.
export async function resetDb(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

export interface ContractTenant {
  company: { id: string; companyName: string };
  user: { id: string; email: string; role: string; companyProfileId: string | null };
  documentType: { id: string; code: string };
  formDefinition: { id: string };
  signatureTemplate: { id: string; providerTemplateId: string };
}

// A minimal but REAL contract tenant: a contracts-enabled company, an ACTIVE
// normal user, and a BOLDSIGN contract type wired to a form + signature template.
// Enough for the create→send→sign→complete cycle through the real endpoints.
export async function seedContractTenant(
  prisma: PrismaService,
): Promise<ContractTenant> {
  const company = await prisma.companyProfile.create({
    data: { companyName: 'E2E Contracts Co', contractsEnabled: true },
  });

  const user = await prisma.user.create({
    data: {
      email: 'e2e.user@test.local',
      // Real hash (low rounds for speed); auth is via a minted JWT, not login.
      passwordHash: bcrypt.hashSync('e2e-pass', 4),
      role: 'USER',
      status: 'ACTIVE',
      companyProfileId: company.id,
    },
  });

  const documentType = await prisma.documentType.create({
    // generationMode defaults to BOLDSIGN — the real contract path.
    data: { name: 'E2E Contract', code: 'CON' },
  });

  const formDefinition = await prisma.formDefinition.create({
    data: {
      name: 'E2E Contract Form',
      documentTypeId: documentType.id,
      isActive: true,
      schemaJson: {
        sections: [
          {
            key: 'client',
            label: 'Client',
            fields: [
              { key: 'customer_name', label: 'Customer name', type: 'text', required: true },
              { key: 'customer_email', label: 'Email', type: 'email' },
            ],
          },
        ],
      },
    },
  });

  const signatureTemplate = await prisma.signatureTemplate.create({
    data: {
      name: 'E2E Template',
      documentTypeId: documentType.id,
      providerTemplateId: 'bs-template-1',
      recipientRole: 'Client',
      isActive: true,
      companyProfileId: company.id,
    },
  });

  return { company, user, documentType, formDefinition, signatureTemplate };
}
