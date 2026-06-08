import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Schema for construction client ────────────────────────────────────────────

const constructionSchema = {
  sections: [
    {
      key: 'client',
      label: 'Client',
      fields: [
        {
          key: 'customer_name',
          label: 'Customer name',
          type: 'text',
          required: true,
          placeholder: 'Full name',
          transform: 'titleCase',
          row: 'name-age',
        },
        {
          key: 'customer_age',
          label: 'Age',
          type: 'number',
          required: true,
          placeholder: '35',
          transform: 'digitsOnly',
          validation: { min: 21, maxLength: 3 },
          row: 'name-age',
        },
        {
          key: 'customer_email',
          label: 'Email',
          type: 'email',
          required: true,
          placeholder: 'Email address',
          validation: { isEmail: true },
        },
        {
          key: 'customer_phone',
          label: 'Phone',
          type: 'phone',
          placeholder: '(555) 123-4567',
          transform: 'phone',
          row: 'phone-fax',
        },
        {
          key: 'customer_fax',
          label: 'Fax',
          type: 'phone',
          placeholder: '(555) 123-4567',
          transform: 'phone',
          row: 'phone-fax',
        },
        {
          key: 'customer_address',
          label: 'Address',
          type: 'text',
          placeholder: 'Street address',
        },
        {
          key: 'city',
          label: 'City',
          type: 'text',
          placeholder: 'City',
          row: 'csz',
        },
        {
          key: 'state',
          label: 'State',
          type: 'text',
          placeholder: 'State',
          row: 'csz',
        },
        {
          key: 'zip',
          label: 'Zip code',
          type: 'text',
          placeholder: 'Zip code',
          row: 'csz',
        },
      ],
    },
    {
      key: 'project',
      label: 'Project',
      copyAddressToggle: { label: 'Same as client address', defaultValue: true },
      fields: [
        {
          key: 'project_address',
          label: 'Project address',
          type: 'text',
          required: true,
          placeholder: 'Project address',
          copyFrom: 'customer_address',
        },
        {
          key: 'project_city',
          label: 'City',
          type: 'text',
          required: true,
          placeholder: 'City',
          copyFrom: 'city',
          row: 'pcsz',
        },
        {
          key: 'project_state',
          label: 'State',
          type: 'text',
          required: true,
          placeholder: 'State',
          copyFrom: 'state',
          row: 'pcsz',
        },
        {
          key: 'project_zip',
          label: 'Zip code',
          type: 'text',
          required: true,
          placeholder: 'Zip code',
          copyFrom: 'zip',
          row: 'pcsz',
        },
        {
          key: 'start_date',
          label: 'Start date',
          type: 'date',
          required: true,
          validation: { minDate: 'today' },
          row: 'dates',
        },
        {
          key: 'estimated_completion_date',
          label: 'Est. completion date',
          type: 'date',
          validation: { minDateFrom: 'start_date' },
          row: 'dates',
        },
        {
          key: 'project_description',
          label: 'Project description',
          type: 'textarea',
          placeholder: 'Project description',
        },
        {
          key: 'contract_scope',
          label: 'Internal notes (only you can see this)',
          type: 'text',
          placeholder: 'Add internal notes',
        },
      ],
    },
    {
      key: 'pricing',
      label: 'Pricing',
      toggles: [{ key: 'finance', label: 'Finance' }],
      fields: [
        {
          key: 'contract_amount',
          label: 'Contract price',
          type: 'currency',
          required: true,
          placeholder: '12000.00',
          transform: 'currency',
          row: 'main-amounts',
        },
        {
          key: 'down_payment_amount',
          label: 'Down payment',
          type: 'currency',
          placeholder: '2500.00',
          transform: 'currency',
          row: 'main-amounts',
        },
        {
          key: 'finance_charge',
          label: 'Finance charge',
          type: 'currency',
          placeholder: '350.00',
          transform: 'currency',
          showWhen: 'finance',
        },
        {
          key: 'finance_1_amount',
          label: 'Finance 1',
          type: 'currency',
          placeholder: '1000.00',
          transform: 'currency',
          showWhen: 'finance',
          row: 'fin1',
        },
        {
          key: 'finance_1_description',
          label: 'Description',
          type: 'text',
          placeholder: 'Description',
          showWhen: 'finance',
          row: 'fin1',
        },
        {
          key: 'finance_1_date',
          label: 'Date',
          type: 'date',
          showWhen: 'finance',
          row: 'fin1',
        },
        {
          key: 'finance_2_amount',
          label: 'Finance 2',
          type: 'currency',
          placeholder: '1000.00',
          transform: 'currency',
          showWhen: 'finance',
          row: 'fin2',
        },
        {
          key: 'finance_2_description',
          label: 'Description',
          type: 'text',
          placeholder: 'Description',
          showWhen: 'finance',
          row: 'fin2',
        },
        {
          key: 'finance_2_date',
          label: 'Date',
          type: 'date',
          showWhen: 'finance',
          row: 'fin2',
        },
        {
          key: 'finance_3_amount',
          label: 'Finance 3',
          type: 'currency',
          placeholder: '1000.00',
          transform: 'currency',
          showWhen: 'finance',
          row: 'fin3',
        },
        {
          key: 'finance_3_description',
          label: 'Description',
          type: 'text',
          placeholder: 'Description',
          showWhen: 'finance',
          row: 'fin3',
        },
        {
          key: 'finance_3_date',
          label: 'Date',
          type: 'date',
          showWhen: 'finance',
          row: 'fin3',
        },
        {
          key: 'finance_4_amount',
          label: 'Finance 4',
          type: 'currency',
          placeholder: '1000.00',
          transform: 'currency',
          showWhen: 'finance',
          row: 'fin4',
        },
        {
          key: 'finance_4_description',
          label: 'Description',
          type: 'text',
          placeholder: 'Description',
          showWhen: 'finance',
          row: 'fin4',
        },
        {
          key: 'finance_4_date',
          label: 'Date',
          type: 'date',
          showWhen: 'finance',
          row: 'fin4',
        },
      ],
    },
    {
      key: 'others',
      label: 'Others',
      fields: [
        {
          key: 'salesman_full_name',
          label: 'Salesman who solicited or negotiated contract',
          type: 'text',
          placeholder: 'Full name',
        },
        {
          key: 'state_registration_number',
          label: 'State registration number',
          type: 'text',
          placeholder: 'Registration number',
        },
        {
          key: 'warranty_years',
          label: 'Warranty year(s)',
          type: 'number',
          placeholder: '10',
          transform: 'digitsOnly',
          validation: { maxLength: 3 },
        },
      ],
    },
  ],
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding construction document type and form definition...');

  // 1. Upsert DocumentType
  const documentType = await prisma.documentType.upsert({
    where: { code: 'CONSTRUCTION_CONTRACT' },
    update: { name: 'Construction Contract' },
    create: {
      name: 'Construction Contract',
      code: 'CONSTRUCTION_CONTRACT',
    },
  });

  console.log(`DocumentType: ${documentType.name} (${documentType.id})`);

  // 2. Upsert FormDefinition with schema
  const existing = await prisma.formDefinition.findFirst({
    where: { documentTypeId: documentType.id, name: 'Construction Contract Form' },
  });

  let formDefinition;
  if (existing) {
    formDefinition = await prisma.formDefinition.update({
      where: { id: existing.id },
      data: { schemaJson: constructionSchema },
    });
    console.log(`FormDefinition updated: ${formDefinition.name} (${formDefinition.id})`);
  } else {
    formDefinition = await prisma.formDefinition.create({
      data: {
        name: 'Construction Contract Form',
        documentTypeId: documentType.id,
        schemaJson: constructionSchema,
        description: 'Standard construction contract form for residential and commercial projects',
        isActive: true,
      },
    });
    console.log(`FormDefinition created: ${formDefinition.name} (${formDefinition.id})`);
  }

  console.log('\nDone. Next steps:');
  console.log('1. Create a SignatureTemplate linked to this DocumentType');
  console.log('2. Assign FormDefinition + SignatureTemplate to users via UserDocumentConfig');
  console.log(`   DocumentType ID:    ${documentType.id}`);
  console.log(`   FormDefinition ID:  ${formDefinition.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
