import type { ReactNode } from "react";

/**
 * Shared document-domain types.
 *
 * FASE 3 — extracted from `components/dashboard-sidebar-demo.tsx` so the
 * monolith, the documents panel, the document viewer, and the create-draft
 * flow can all share one definition instead of duplicating it.
 */

export type Doc = {
  id: string;
  documentNumber: string;
  status: string;
  contractDate: string;
  createdAt: string;
  customerId?: string | null;
  providerDocumentId?: string | null;
  providerStatus?: string | null;
  providerLastSyncedAt?: string | null;
  lastManualReminderAt?: string | null;
  lastSentRecipientEmail?: string | null;
  sendAvailableAt?: string | null;
  sendAvailableInSeconds?: number;
  canSend?: boolean;
  resendAvailableAt?: string | null;
  resendAvailableInSeconds?: number;
  serverNow?: string | null;
  canResend?: boolean;
  billingPeriod?: string | null;
  sentAt?: string | null;
  cancelledAt?: string | null;
  viewedAt?: string | null;
  signedAt?: string | null;
  completedAt?: string | null;
  countedInBilling: boolean;
  isOverage: boolean;
  user?: { email: string; role?: string } | null;
  companyProfile?: { companyName?: string | null } | null;
  documentType?: { name: string; code: string } | null;
  formDefinition?: { name: string; key: string } | null;
  data?: { dataJson: Record<string, unknown> } | null;
};

export type DocDetail = Doc & {
  signatureTemplate?: {
    name: string;
    templateKey: string;
    providerTemplateId?: string | null;
  } | null;
  data?: { dataJson: Record<string, unknown> } | null;
  versions?: Array<{ id: string; versionNumber: number; createdAt: string }>;
};

export type DocumentTypeCatalogItem = {
  id: string;
  name: string;
  code: string;
  formDefinitions: Array<{
    id: string;
    name: string;
    schemaJson?: unknown;
  }>;
  signatureTemplates: Array<{
    id: string;
    name: string;
    templateKey: string;
    providerTemplateId?: string | null;
  }>;
};

export type StatusFilter =
  | "ALL"
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "SIGNED"
  | "COMPLETED"
  | "CANCELLED";

export type WorkflowAction = {
  key: "send" | "resend" | "cancel" | "reactivate";
  label: string;
  icon: ReactNode;
  tone: string;
  disabled?: boolean;
};
