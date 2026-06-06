import type { DashboardDocument } from '@/app/dashboard/page';

export type { DashboardDocument };

export type DocumentStatus =
  | 'DRAFT'
  | 'SENT'
  | 'SEND_FAILED'
  | 'VIEWED'
  | 'SIGNED'
  | 'COMPLETED'
  | 'CANCELLED';

export type StatusFilter = 'all' | DocumentStatus;

/** Internal V2 action vocabulary. Dispatch logic in DocumentsPanel maps each
 *  to its corresponding handler prop — view/edit/sync/preview/download are
 *  client-only or take their own handler; only send/resend/cancel/reactivate
 *  match the backend's DocumentAction union and go through onDocumentAction. */
export type V2DocumentAction =
  | 'view'
  | 'edit'
  | 'send'
  | 'resend'
  | 'cancel'
  | 'reactivate'
  | 'sync'
  | 'preview'
  | 'download'
  // Receipt-specific (DIRECT_PDF): view the regenerated PDF, retry a failed
  // send, or discard a draft/failed receipt.
  | 'viewPdf'
  | 'retry'
  | 'discard';

/** Subset matching page.tsx `DocumentAction` (the backend-bound one). */
export type BackendDocumentAction = 'send' | 'resend' | 'cancel' | 'reactivate';

export const BACKEND_ACTIONS: ReadonlySet<V2DocumentAction> = new Set<V2DocumentAction>([
  'send',
  'resend',
  'cancel',
  'reactivate',
]);

/** Document shape after page.tsx adapter enriches DashboardDocument with
 *  customer + user resolved from the existing customers/managedUsers caches.
 *  DashboardDocument from page.tsx does NOT include these fields natively. */
export interface V2DocumentItem extends DashboardDocument {
  customer?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/** Schema-driven form definition (subset of FormDefinition.schemaJson). */
export interface SchemaField {
  key: string;
  type: string;
  label: string;
  transform?: string;
  options?: Array<{ value: string; label: string }>;
}
export interface SchemaSection {
  key: string;
  label: string;
  fields: SchemaField[];
}

/** Full document detail from GET /documents/:id (schema + data + timestamps). */
export interface DocumentDetail {
  id: string;
  documentNumber: string;
  status: DocumentStatus;
  documentType?: { name?: string | null; code?: string | null } | null;
  formDefinition?: { schemaJson?: { sections?: SchemaSection[] } | null } | null;
  data?: { dataJson?: Record<string, unknown> | null } | null;
  customer?: { fullName?: string | null; email?: string | null; phone?: string | null } | null;
  companyProfile?: { companyName?: string | null } | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string } | null;
  contractDate?: string | null;
  createdAt: string;
  sentAt?: string | null;
  viewedAt?: string | null;
  signedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  lastSentRecipientEmail?: string | null;
  providerDocumentId?: string | null;
  // Receipt timeline (DIRECT_PDF): resend / failure / edit tracking.
  updatedAt?: string | null;
  lastManualReminderAt?: string | null;
  sendError?: string | null;
  lastEditedAt?: string | null;
}

/** Version timeline entry. Fetched on-demand when the sidebar opens
 *  (DashboardDocument doesn't include versions on the list endpoint). */
export interface DocumentVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  changedBy?: {
    name?: string | null;
    email: string;
  } | null;
}

export function getCustomerDisplayName(doc: V2DocumentItem): string {
  if (doc.customer?.name) return doc.customer.name;
  if (doc.customer?.email) return doc.customer.email;
  // Fallback: docs without a linked customerId still carry the name in
  // dataJson — contracts use `customer_name`, receipts use `client`.
  const dataJson = doc.data?.dataJson;
  const fromData = dataJson?.customer_name ?? dataJson?.client;
  if (typeof fromData === 'string' && fromData.trim()) return fromData.trim();
  return 'No customer';
}

export function getDocumentTypeDisplayName(doc: V2DocumentItem): string {
  return doc.documentType?.name || 'Unknown Type';
}

export function getCreatorDisplayName(doc: V2DocumentItem): string {
  if (doc.user?.name) return doc.user.name;
  if (doc.user?.email) return doc.user.email;
  return 'Unknown';
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}y ago`;
}

/** A receipt (DIRECT_PDF) — its action set differs from a BoldSign contract. */
export function isReceiptDoc(doc: {
  documentType?: { code?: string | null } | null;
}): boolean {
  return doc.documentType?.code === 'PAYMENT_RECEIPT';
}

export function getAvailableActions(doc: V2DocumentItem): V2DocumentAction[] {
  // Receipts (DIRECT_PDF): the PDF is always viewable; a SENT receipt is issued
  // and is NOT cancellable; a failed one can be retried or discarded. Edit is a
  // per-card pencil (DRAFT/SEND_FAILED), not a kebab action.
  if (isReceiptDoc(doc)) {
    const actions: V2DocumentAction[] = ['view', 'viewPdf'];
    switch (doc.status as DocumentStatus) {
      case 'DRAFT':
        actions.push('send', 'discard');
        break;
      case 'SENT':
        actions.push('resend');
        break;
      case 'SEND_FAILED':
        actions.push('retry', 'discard');
        break;
    }
    return actions;
  }

  const actions: V2DocumentAction[] = ['view'];
  switch (doc.status as DocumentStatus) {
    case 'DRAFT':
      // Edit is per-card now (✏️ inside the detail modal), not a kebab action.
      actions.push('send', 'cancel');
      break;
    case 'SENT':
    case 'VIEWED':
      // 'sync' removed from the kebab — the 10s polling syncs status on its own.
      actions.push('resend', 'cancel');
      break;
    case 'SIGNED':
      break;
    case 'COMPLETED':
      actions.push('preview', 'download');
      break;
    case 'CANCELLED':
      actions.push('reactivate');
      break;
  }
  return actions;
}

export function getActionLabel(action: V2DocumentAction): string {
  const labels: Record<V2DocumentAction, string> = {
    view: 'View Details',
    edit: 'Edit',
    send: 'Send',
    resend: 'Resend',
    cancel: 'Cancel',
    reactivate: 'Reactivate',
    sync: 'Sync Status',
    preview: 'Preview PDF',
    download: 'Download PDF',
    viewPdf: 'View PDF',
    retry: 'Retry send',
    discard: 'Discard',
  };
  return labels[action];
}

export function getStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase() as DocumentStatus;
  const classes: Record<DocumentStatus, string> = {
    DRAFT: 'doc-status-badge--draft',
    SENT: 'doc-status-badge--sent',
    SEND_FAILED: 'doc-status-badge--failed',
    VIEWED: 'doc-status-badge--viewed',
    SIGNED: 'doc-status-badge--signed',
    COMPLETED: 'doc-status-badge--completed',
    CANCELLED: 'doc-status-badge--cancelled',
  };
  return classes[normalized] ?? 'doc-status-badge--draft';
}

/** Human-readable status label — avoids showing raw enum values like
 *  "SEND_FAILED" (underscored) in badges. */
export function getStatusLabel(status: string): string {
  const labels: Record<DocumentStatus, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    SEND_FAILED: 'Send failed',
    VIEWED: 'Viewed',
    SIGNED: 'Signed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  const normalized = status.toUpperCase() as DocumentStatus;
  return labels[normalized] ?? status;
}

export const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'SEND_FAILED', label: 'Send failed' },
  { value: 'VIEWED', label: 'Viewed' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
