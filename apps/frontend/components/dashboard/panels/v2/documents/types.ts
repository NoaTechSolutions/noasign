import type { DashboardDocument } from '@/app/dashboard/page';
import { formatDocumentStatus } from '@/lib/document-status';
import { detectBrowserTimeZone, tenantLocalDate } from '@/lib/tenant-date';

export type { DashboardDocument };

export type DocumentStatus =
  | 'DRAFT'
  | 'SENT'
  | 'SEND_FAILED'
  | 'VIEWED'
  | 'SIGNED'
  | 'COMPLETED'
  | 'CANCELLED';

// 'VOID' (receipts with supersededAt) and 'SCHEDULED' (deferred future-dated
// drafts) are derived filters — neither is a real DocumentStatus.
export type StatusFilter = 'all' | DocumentStatus | 'VOID' | 'SCHEDULED';

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
  | 'discard'
  // Reissue a SENT receipt (2c): create a corrected copy + void the original.
  | 'reissue'
  // Void a SENT receipt (2c): mark VOID with no replacement.
  | 'void'
  // B7: soft-delete a DRAFT (not an issued doc → deleted, never voided).
  | 'delete';

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
/** Receipt resend policy v2 state (backend-computed), for the kebab countdown /
 *  "limit reached". Null for contracts. */
export interface ReceiptResendState {
  canResend: boolean;
  retryAfterSeconds: number;
  limitReached: boolean;
}

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
  receiptResend?: ReceiptResendState | null;
  // Reissue (2c): set on the original once it has been superseded → drives the
  // red VOID badge in the list.
  supersededAt?: string | null;
  // B7 soft-delete: set (only visible to a SUPERADMIN) → drives the "Deleted"
  // badge. Absent/null for live docs.
  deletedAt?: string | null;
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
  // Reissue (2c) traceability. supersededAt: this receipt was voided/reissued.
  // supersedes: the original this receipt corrects. supersededBy: the receipt(s)
  // that replaced this one (normally one).
  supersededAt?: string | null;
  supersedes?: { id: string; documentNumber: string } | null;
  supersededBy?: Array<{ id: string; documentNumber: string }> | null;
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

/**
 * Recipient name held in an invoice's form data. Invoices don't use
 * `customer_name`/`client` — the billed_to recipient lives in the wizard fields:
 * `company_name` (business) or `first_name` + `last_name` (individual). Mirrors
 * the backend's buildInvoicePdfData name composition. Returns '' when absent.
 */
export function invoiceRecipientName(
  dataJson: Record<string, unknown> | null | undefined,
): string {
  if (!dataJson) return '';
  const company = dataJson.company_name;
  if (typeof company === 'string' && company.trim()) return company.trim();
  const composed = ['first_name', 'last_name']
    .map((k) => dataJson[k])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
    .join(' ');
  return composed;
}

export function getCustomerDisplayName(doc: V2DocumentItem): string {
  if (doc.customer?.name) return doc.customer.name;
  if (doc.customer?.email) return doc.customer.email;
  // Fallback: docs without a linked customerId still carry the name in
  // dataJson — contracts use `customer_name`, receipts use `client`.
  const dataJson = doc.data?.dataJson;
  const fromData = dataJson?.customer_name ?? dataJson?.client;
  if (typeof fromData === 'string' && fromData.trim()) return fromData.trim();
  // Invoices carry the recipient in the billed_to fields (company_name or
  // first/last), not customer_name/client.
  const invoiceName = invoiceRecipientName(dataJson);
  if (invoiceName) return invoiceName;
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

/** An invoice (DIRECT_PDF, code INVOICE) — DIRECT_PDF like a receipt but with its
 *  own create/edit pipeline (POST/PATCH /documents/invoice), not the BoldSign flow. */
export function isInvoiceDoc(doc: {
  documentType?: { code?: string | null } | null;
}): boolean {
  return doc.documentType?.code === 'INVOICE';
}

/** A reissued receipt — its internal status stays SENT, but it is DISPLAYED as
 *  VOID (status, badge) and is terminal (no resend / reissue). Derived from
 *  supersededAt so DocumentStatus (shared with contracts) is never polluted. */
export function isVoidedReceipt(doc: {
  documentType?: { code?: string | null } | null;
  supersededAt?: string | null;
}): boolean {
  return isReceiptDoc(doc) && Boolean(doc.supersededAt);
}

/** A voided DIRECT_PDF document — a receipt OR an invoice with supersededAt set.
 *  Both display as VOID (badge/card/list/timeline); the internal status is left
 *  untouched. Used for DISPLAY; receipt-only actions still gate on isReceiptDoc. */
export function isVoidedDoc(doc: {
  documentType?: { code?: string | null } | null;
  supersededAt?: string | null;
}): boolean {
  return (isReceiptDoc(doc) || isInvoiceDoc(doc)) && Boolean(doc.supersededAt);
}

// B7: a soft-deleted doc only ever reaches the frontend for a SUPERADMIN (the
// backend hides it from everyone else), so a truthy deletedAt → show "Deleted".
export function isDeletedDoc(doc: { deletedAt?: string | null }): boolean {
  return Boolean(doc.deletedAt);
}

/** A deferred (future-dated) document whose issue date has NOT arrived yet — it
 *  can't be sent/finalized. Browser zone is a hint; the backend enforces with the
 *  tenant's authoritative timezone. */
export function isDeferredPending(doc: {
  isDeferred?: boolean;
  issueDate?: string | null;
}): boolean {
  if (!doc.isDeferred || !doc.issueDate) return false;
  return doc.issueDate.slice(0, 10) > tenantLocalDate(detectBrowserTimeZone());
}

/** "Scheduled for YYYY-MM-DD" label for a deferred-pending doc, else null. */
export function scheduledLabel(doc: {
  isDeferred?: boolean;
  issueDate?: string | null;
}): string | null {
  return isDeferredPending(doc)
    ? `Scheduled for ${doc.issueDate!.slice(0, 10)}`
    : null;
}

export function getAvailableActions(doc: V2DocumentItem): V2DocumentAction[] {
  // B7: a soft-deleted doc (SUPERADMIN-only view) is terminal — view only, no
  // re-delete/send. No restore yet (that's F1).
  if (isDeletedDoc(doc)) return ['view'];
  // Receipts (DIRECT_PDF): the PDF is always viewable; a SENT receipt is issued
  // and is NOT cancellable; a failed one can be retried or discarded. Edit is a
  // per-card pencil (DRAFT/SEND_FAILED), not a kebab action.
  if (isReceiptDoc(doc)) {
    const actions: V2DocumentAction[] = ['view', 'viewPdf'];
    switch (doc.status as DocumentStatus) {
      case 'DRAFT':
        // A deferred receipt can't be sent until its issue date arrives. A DRAFT
        // is deleted (soft), never voided (B7).
        actions.push(...(isDeferredPending(doc) ? ['delete'] : ['send', 'delete']) as V2DocumentAction[]);
        break;
      case 'SENT':
        // A voided receipt is terminal: no resend, no reissue, no void.
        if (!doc.supersededAt) actions.push('resend', 'reissue', 'void');
        break;
      case 'SEND_FAILED':
        actions.push('retry', 'discard');
        break;
    }
    return actions;
  }

  // Invoices (DIRECT_PDF): the kebab EXACTLY MIRRORS the receipt kebab, adapted to
  // invoice semantics. Like receipts, Edit is a per-card pencil in the detail —
  // NOT a kebab action. The one adaptation: the PDF ('viewPdf') only appears once
  // SENT (a draft/scheduled invoice has no issued PDF yet), whereas a receipt's
  // PDF always regenerates. Receipt-2c actions (resend/reissue/void/retry) have no
  // invoice equivalent, so none are invented. Every status keeps "View details".
  if (isInvoiceDoc(doc)) {
    const actions: V2DocumentAction[] = ['view'];
    // A voided invoice is terminal — view only (no edit / send / re-void).
    if (doc.supersededAt) return actions;
    switch (doc.status as DocumentStatus) {
      case 'DRAFT':
        // Mirrors receipt DRAFT (send + delete); a scheduled invoice can't send
        // until its issue date arrives. A DRAFT is deleted (soft), never voided (B7).
        actions.push(
          ...((isDeferredPending(doc)
            ? ['delete']
            : ['send', 'delete']) as V2DocumentAction[]),
        );
        break;
      case 'SENT':
        // Mirrors receipt SENT's base (view + viewPdf).
        actions.push('viewPdf');
        break;
      case 'SEND_FAILED':
        // Mirrors receipt SEND_FAILED's discard; re-sending is via edit → send.
        actions.push('discard');
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
    reissue: 'Reissue',
    void: 'Void',
    delete: 'Delete',
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

/** Human-readable status label — delegates to the canonical formatter so there
 *  is ONE place that maps statuses (no raw "SEND_FAILED" leaking anywhere). */
export function getStatusLabel(status: string): string {
  return formatDocumentStatus(status);
}

export const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'SENT', label: 'Sent' },
  { value: 'VOID', label: 'Void' },
  { value: 'SEND_FAILED', label: 'Send failed' },
  { value: 'VIEWED', label: 'Viewed' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
