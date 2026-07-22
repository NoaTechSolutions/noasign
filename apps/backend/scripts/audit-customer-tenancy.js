#!/usr/bin/env node
/**
 * READ-ONLY audit: find Documents whose `customerId` points at a Customer owned
 * by a DIFFERENT tenant.
 *
 * Why this exists: until 2026-07-21 the sale-document write paths
 * (createReceipt / createInvoice / updateReceipt / updateInvoice) wrote
 * `customerId` straight to the FK with no tenant check, while the contract path
 * had always verified it. A caller could therefore attach another tenant's
 * customer to their own document. The guard is now in place
 * (receipts.service.ts `assertCustomerInTenant`), so no NEW dirty rows can be
 * created — this script answers the remaining question: are there OLD ones?
 *
 * This script NEVER writes. It only counts and reports. Cleanup, if any is
 * needed, is a separate deliberate step.
 *
 *   Usage:  node scripts/audit-customer-tenancy.js
 *   Env:    DATABASE_URL (loaded from .env like the app)
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const dbLabel = (process.env.DATABASE_URL || '').replace(
    /:\/\/[^@]*@/,
    '://***@',
  );
  console.log(`\nAuditing: ${dbLabel}\n`);

  const docs = await prisma.document.findMany({
    where: { NOT: { customerId: null } },
    select: {
      id: true,
      documentNumber: true,
      companyProfileId: true,
      customerId: true,
      createdAt: true,
    },
  });

  if (docs.length === 0) {
    console.log('No documents carry a customerId. Nothing to audit.\n');
    await prisma.$disconnect();
    return;
  }

  const customerIds = [...new Set(docs.map((d) => d.customerId))];
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, companyProfileId: true, fullName: true },
  });
  const ownerOf = new Map(customers.map((c) => [c.id, c.companyProfileId]));

  const crossTenant = [];
  const orphans = [];
  for (const d of docs) {
    const owner = ownerOf.get(d.customerId);
    if (owner === undefined) {
      orphans.push(d);
    } else if (owner !== d.companyProfileId) {
      crossTenant.push({ ...d, customerTenant: owner });
    }
  }

  console.log(`documents carrying a customerId : ${docs.length}`);
  console.log(`CROSS-TENANT (the real finding) : ${crossTenant.length}`);
  console.log(`orphan FK (customer deleted)    : ${orphans.length}`);
  console.log(
    `clean                           : ${docs.length - crossTenant.length - orphans.length}\n`,
  );

  if (crossTenant.length > 0) {
    console.log('CROSS-TENANT rows (document -> customer owned by another tenant):');
    for (const r of crossTenant) {
      console.log(
        `  ${r.documentNumber}  doc=${r.id}  docTenant=${r.companyProfileId}  ` +
          `customer=${r.customerId}  customerTenant=${r.customerTenant}  ` +
          `created=${r.createdAt.toISOString().slice(0, 10)}`,
      );
    }
    console.log(
      '\nThese predate the write guard. Decide cleanup deliberately: null the FK,\n' +
        'or re-point it at the correct customer of the document\'s own tenant.\n',
    );
    process.exitCode = 1; // non-zero so CI/automation can notice
  } else {
    console.log('No cross-tenant customer references found.\n');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Audit failed:', e.message);
  process.exit(2);
});
