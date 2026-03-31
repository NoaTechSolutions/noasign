export type SignatureScalar = string | number | boolean;

export type SignatureToken = {
  name: string;
  value: SignatureScalar;
};

export type SignatureFieldValue = {
  value: SignatureScalar;
  role?: string;
};

export type SignatureRecipient = {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

export type SignatureOptionalRoleRecipient = {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

export type CreateSignatureDocumentRequest = {
  name: string;
  templateId: string;
  recipients: SignatureRecipient[];
  senderRecipient?: SignatureOptionalRoleRecipient | null;
  subject?: string;
  message?: string;
  tokens?: SignatureToken[];
  fields?: Record<string, SignatureFieldValue>;
  metadata?: Record<string, string>;
};

export type SignatureDocumentResponse = {
  id: string;
  status: string;
};

export type SignatureBinaryResponse = {
  buffer: Buffer;
  contentType: string | null;
  contentDisposition: string | null;
};

export type SendSignatureDocumentRequest = {
  subject: string;
  message: string;
};

export type RemindSignatureDocumentRequest = {
  message?: string;
};
