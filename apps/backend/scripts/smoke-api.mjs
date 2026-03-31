import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const now = new Date();
const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const uniqueValue = Date.now();
const email = `smoke.${uniqueValue}@noasign.test`;
const password = 'secret123';
let authCookie = '';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(method, path, { token, body, expectedStatus } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authCookie) {
    headers.Cookie = authCookie;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  const setCookie = response.headers.get('set-cookie');

  if (setCookie) {
    authCookie = setCookie.split(';')[0];
  }

  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(
      `${method} ${path} returned ${response.status} instead of ${expectedStatus}: ${text}`,
    );
  }

  if (!expectedStatus && !response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
  }

  return {
    status: response.status,
    data,
  };
}

async function getContractFixture() {
  const fixture = await prisma.documentType.findFirst({
    where: {
      formDefinitions: {
        some: {
          isActive: true,
        },
      },
      signatureTemplates: {
        some: {
          isActive: true,
        },
      },
    },
    include: {
      formDefinitions: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      signatureTemplates: {
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  assert(fixture, 'No active document fixture found in database');
  assert(fixture.formDefinitions.length > 0, 'No active form definition found');
  assert(
    fixture.signatureTemplates.length > 0,
    'No active signature template found',
  );

  return {
    documentTypeId: fixture.id,
    formDefinitionId: fixture.formDefinitions[0].id,
    signatureTemplateId: fixture.signatureTemplates[0].id,
  };
}

async function main() {
  const fixture = await getContractFixture();
  const contractDate = now.toISOString().slice(0, 10);
  const updatedContractDate = new Date(now.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);

  const registerResult = await request('POST', '/auth/register', {
    expectedStatus: 201,
    body: {
      email,
      password,
    },
  });

  assert(registerResult.data.user.email === email, 'Registered email mismatch');
  assert(
    registerResult.data.user.role === 'MASTER',
    'Register should assign MASTER role',
  );

  const loginResult = await request('POST', '/auth/login', {
    expectedStatus: 201,
    body: {
      email,
      password,
    },
  });

  const meResult = await request('GET', '/users/me', {
    expectedStatus: 200,
  });

  assert(meResult.data.email === email, 'GET /users/me email mismatch');
  assert(meResult.data.role === 'MASTER', 'GET /users/me role mismatch');

  const companyProfileResult = await request('GET', '/company-profile/me', {
    expectedStatus: 200,
  });

  assert(
    companyProfileResult.data.id === meResult.data.companyProfileId,
    'Company profile id mismatch',
  );

  const updateCompanyProfileResult = await request('PATCH', '/company-profile/me', {
    expectedStatus: 200,
    body: {
      companyName: 'NoaSign Smoke Test LLC',
      industry: 'construction',
      website: 'https://example.com',
      phone: '510-000-0000',
      city: 'Richmond',
      state: 'CA',
      country: 'USA',
      contactFirstName: 'Smoke',
      contactLastName: 'Tester',
      contactTitle: 'Owner',
      contactEmail: email,
    },
  });

  assert(
    updateCompanyProfileResult.data.companyName === 'NoaSign Smoke Test LLC',
    'Company profile update failed',
  );

  await request('PATCH', '/company-profile/me', {
    expectedStatus: 400,
    body: {
      planName: 'PRO_UNLIMITED',
    },
  });

  const documentTypesResult = await request('GET', '/documents/types', {
    expectedStatus: 200,
  });

  assert(
    Array.isArray(documentTypesResult.data) && documentTypesResult.data.length > 0,
    'Document types should not be empty',
  );

  const createDraftResult = await request('POST', '/documents/draft', {
    expectedStatus: 201,
    body: {
      ...fixture,
      contractDate,
      dataJson: {
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_address: '123 Main St',
        city: 'Richmond',
        state: 'CA',
        zip: '94801',
        contact_full_name: 'Smoke Tester',
      },
    },
  });

  const documentId = createDraftResult.data.document.id;
  assert(createDraftResult.data.document.status === 'DRAFT', 'Draft status mismatch');

  const myDocumentsResult = await request('GET', '/documents/my-documents', {
    expectedStatus: 200,
  });

  assert(
    myDocumentsResult.data.some((document) => document.id === documentId),
    'Created draft is missing from my-documents',
  );

  const detailResult = await request('GET', `/documents/${documentId}`, {
    expectedStatus: 200,
  });

  assert(detailResult.data.id === documentId, 'Document detail id mismatch');
  assert(detailResult.data.versions.length >= 1, 'Document should have versions');

  const updateDraftResult = await request('PATCH', `/documents/${documentId}/draft`, {
    expectedStatus: 200,
    body: {
      contractDate: updatedContractDate,
      dataJson: {
        customer_name: 'John Doe Updated',
        customer_email: 'john.updated@example.com',
        customer_address: '456 Market St',
        city: 'Richmond',
        state: 'CA',
        zip: '94804',
        contact_full_name: 'Smoke Tester',
      },
    },
  });

  assert(updateDraftResult.data.document.status === 'DRAFT', 'Updated draft status mismatch');

  const sendResult = await request('POST', `/documents/${documentId}/send`, {
    expectedStatus: 201,
  });

  assert(sendResult.data.document.status === 'SENT', 'Send status mismatch');
  assert(sendResult.data.document.countedInBilling === false, 'Billing should start after VIEWED');

  const viewedResult = await request(
    'POST',
    `/documents/${documentId}/simulate-viewed`,
    {
      expectedStatus: 201,
    },
  );

  assert(viewedResult.data.document.status === 'VIEWED', 'Viewed status mismatch');

  const signedResult = await request(
    'POST',
    `/documents/${documentId}/simulate-signed`,
    {
      expectedStatus: 201,
    },
  );

  assert(signedResult.data.document.status === 'SIGNED', 'Signed status mismatch');

  const completedResult = await request(
    'POST',
    `/documents/${documentId}/simulate-completed`,
    {
      expectedStatus: 201,
    },
  );

  assert(
    completedResult.data.document.status === 'COMPLETED',
    'Completed status mismatch',
  );

  const createSecondDraftResult = await request('POST', '/documents/draft', {
    expectedStatus: 201,
    body: {
      ...fixture,
      contractDate,
      dataJson: {
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        customer_address: '789 Grove St',
        city: 'Richmond',
        state: 'CA',
        zip: '94805',
        contact_full_name: 'Smoke Tester',
      },
    },
  });

  const secondDocumentId = createSecondDraftResult.data.document.id;

  const cancelResult = await request('POST', `/documents/${secondDocumentId}/cancel`, {
    expectedStatus: 201,
  });

  assert(cancelResult.data.document.status === 'CANCELLED', 'Cancel status mismatch');

  const reactivateResult = await request(
    'POST',
    `/documents/${secondDocumentId}/reactivate`,
    {
      expectedStatus: 201,
    },
  );

  assert(
    reactivateResult.data.document.status === 'DRAFT',
    'Reactivate should return document to DRAFT',
  );

  const resendResult = await request('POST', `/documents/${secondDocumentId}/send`, {
    expectedStatus: 201,
  });

  assert(resendResult.data.document.status === 'SENT', 'Resend status mismatch');

  const secondViewedResult = await request(
    'POST',
    `/documents/${secondDocumentId}/simulate-viewed`,
    {
      expectedStatus: 201,
    },
  );

  assert(
    secondViewedResult.data.document.status === 'VIEWED',
    'Second viewed status mismatch',
  );

  const currentUsageResult = await request('GET', '/billing/current-usage', {
    expectedStatus: 200,
  });

  assert(
    currentUsageResult.data.billingPeriod === billingMonth,
    'Current usage billing period mismatch',
  );
  assert(
    currentUsageResult.data.documentsUsed >= 2,
    'Current usage should reflect viewed or completed documents',
  );

  const summaryResult = await request('GET', `/billing/summary?month=${billingMonth}`, {
    expectedStatus: 200,
  });

  assert(summaryResult.data.month === billingMonth, 'Billing summary month mismatch');
  assert(
    summaryResult.data.documentsSent >= 2,
    'Billing summary should reflect sent documents',
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        billingMonth,
        documentId,
        secondDocumentId,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
