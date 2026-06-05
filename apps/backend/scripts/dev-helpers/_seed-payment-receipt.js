// Seeds the PAYMENT_RECEIPT document type + form + the World Pavers
// ReceiptTemplate (the first DIRECT_PDF client). Idempotent. Field coordinates
// are the validated WPC mapping — generic engine, WPC is just the first row.
//
//   DATABASE_URL=... node scripts/dev-helpers/_seed-payment-receipt.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WPC_COMPANY_ID = '7aaad16a-6d76-4c36-97c7-b9ce3e45b801'; // World Pavers

const RECEIPT_FORM_SCHEMA = {
  sections: [
    {
      key: 'receipt',
      label: 'Receipt',
      fields: [
        { key: 'client', label: 'Client', type: 'text', required: true },
        { key: 'amount', label: 'Amount', type: 'currency', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        {
          key: 'payment_method',
          label: 'Payment method',
          type: 'select',
          required: true,
          options: [
            { value: 'CASH', label: 'Cash' },
            { value: 'CREDIT_DEBIT_CARD', label: 'Credit/Debit Card' },
            { value: 'CHEQUE', label: 'Cheque' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
            { value: 'OTHER', label: 'Other' },
          ],
        },
        { key: 'other_label', label: 'Other (label)', type: 'text' },
        { key: 'payment_for', label: 'Payment for', type: 'text' },
        { key: 'payment_current', label: 'Payment #', type: 'number', default: '1' },
        { key: 'payment_total', label: 'Of (total)', type: 'number', default: '1' },
        { key: 'received_by', label: 'Received by', type: 'text' },
      ],
    },
  ],
};

const WPC_FIELD_MAPPING = {
  receipt_number: { type: 'text', x: 387, baseline: 488.5, font: 'Montserrat-Black', size: 16, color: '#000000', autoShiftRightLimit: 558 },
  date: { type: 'text', x: 428, lineTop: 331, font: 'Carlito', size: 11.5 },
  client: { type: 'text', x: 118, lineTop: 371, font: 'Carlito', size: 11.5 },
  amount: { type: 'currency', x: 118, lineTop: 396, font: 'Carlito', size: 11.5 },
  payment_n: { type: 'text', x: 357, lineTop: 385, gap: -9, font: 'Carlito', size: 11.5 },
  payment_for: { type: 'text', x: 146, lineTop: 442, gap: 3.5, font: 'Carlito', size: 11.5 },
  received_by: { type: 'text', x: 138, lineTop: 465, font: 'Carlito', size: 11.5 },
  other_label: { type: 'text', x: 472, lineTop: 423, font: 'Carlito', size: 10 },
  payment_method: {
    type: 'checkbox_group', lineTop: 407, gap: -11.5, mark: 'X', font: 'Carlito-Bold', size: 12,
    options: { CASH: 63, CREDIT_DEBIT_CARD: 126, CHEQUE: 256, BANK_TRANSFER: 333, OTHER: 448 },
  },
};

(async () => {
  try {
    const docType = await prisma.documentType.upsert({
      where: { code: 'PAYMENT_RECEIPT' },
      update: { name: 'Receipt', generationMode: 'DIRECT_PDF' },
      create: { name: 'Receipt', code: 'PAYMENT_RECEIPT', generationMode: 'DIRECT_PDF' },
    });
    console.log(`DocumentType: ${docType.name} (${docType.id}) mode=${docType.generationMode}`);

    let form = await prisma.formDefinition.findFirst({
      where: { documentTypeId: docType.id, name: 'Payment Receipt Form' },
    });
    if (form) {
      form = await prisma.formDefinition.update({
        where: { id: form.id },
        data: { schemaJson: RECEIPT_FORM_SCHEMA, isActive: true },
      });
    } else {
      form = await prisma.formDefinition.create({
        data: { name: 'Payment Receipt Form', documentTypeId: docType.id, schemaJson: RECEIPT_FORM_SCHEMA, isActive: true },
      });
    }
    console.log(`FormDefinition: ${form.name} (${form.id})`);

    const company = await prisma.companyProfile.findUnique({ where: { id: WPC_COMPANY_ID } });
    if (!company) {
      throw new Error(`World Pavers company ${WPC_COMPANY_ID} not found — seed it first`);
    }

    let template = await prisma.receiptTemplate.findFirst({
      where: { companyProfileId: WPC_COMPANY_ID, name: 'World Pavers Receipt' },
    });
    const templateData = {
      name: 'World Pavers Receipt',
      basePdfPath: 'assets/templates/wpc_receipt.pdf',
      pageWidth: 612,
      pageHeight: 792,
      mediaBoxOffsetY: 7.92,
      fieldMappingJson: WPC_FIELD_MAPPING,
      numberFormat: 'REC-{YYYY}-{NNNN}',
      isActive: true,
    };
    if (template) {
      template = await prisma.receiptTemplate.update({ where: { id: template.id }, data: templateData });
    } else {
      template = await prisma.receiptTemplate.create({ data: { companyProfileId: WPC_COMPANY_ID, ...templateData } });
    }
    console.log(`ReceiptTemplate: ${template.name} (${template.id}) offsetY=${template.mediaBoxOffsetY}`);
    console.log('=== PAYMENT_RECEIPT seed done ===');
  } catch (e) {
    console.error('ERR:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
