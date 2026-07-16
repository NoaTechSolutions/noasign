'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentsPanelHeader } from './DocumentsPanelHeader';
import { DocumentsStats } from './DocumentsStats';
import { ReceiptStatsPills } from './ReceiptStatsPills';
import { GeneratedDocsCard } from './GeneratedDocsCard';
import { MonthBreakdownModal } from '../MonthBreakdownModal';
import type { ReceiptStats } from '../ReceiptMetricCards';
import { DocumentsToolbar } from './DocumentsToolbar';
import { DocumentsTable } from './DocumentsTable';
import { DocumentsCards } from './DocumentsCards';
import { DocumentDetailModal } from './DocumentDetailModal';
import { DocumentsEmptyState } from './DocumentsEmptyState';
import {
  DocumentCreationModal,
  type SelectableUser,
} from './DocumentCreationModal';
import type {
  CreateReceiptPayload,
  ReceiptCreateResult,
} from './ReceiptForm';
import { ConfirmActionModal } from '@/components/dashboard/shared/ConfirmActionModal';
import type {
  V2DocumentItem,
  V2DocumentAction,
  BackendDocumentAction,
  StatusFilter,
  DocumentVersion,
  DocumentDetail,
} from './types';
import toast from 'react-hot-toast';
import {
  BACKEND_ACTIONS,
  contractSignerEmail,
  isDeferredPending,
  isInvoiceDoc,
  isReceiptDoc,
  isVoidedDoc,
} from './types';
// Reuse the Clients bottom-sheet styles (card-actions-*) for the mobile document
// card's Actions sheet — same pattern, no duplication. customer-card-* rules
// target customer elements only, so they don't affect documents.
import '../customers/customers-panel.css';
import type {
  CustomerOption,
  DocumentTypeOption,
} from './DocumentSetupCard';
import './documents-panel.css';

export interface CreateDraftPayload {
  documentTypeId: string;
  formDefinitionId: string;
  signatureTemplateId: string;
  contractDate: string;
  dataJson: Record<string, unknown>;
  customerId?: string;
}

export interface DocumentsPanelProps {
  isLoading?: boolean;
  documents: V2DocumentItem[];
  documentTypes: DocumentTypeOption[];
  customers: CustomerOption[];
  // Refetch the customers list — called when the create modal opens so a client
  // created elsewhere (e.g. the Clients module) appears without a page reload.
  onRefreshCustomers?: () => void;
  onCreateDraft: (payload: CreateDraftPayload) => Promise<void>;
  // Phase 2 — direct PDF receipts. When provided, a "New Receipt" action shows.
  onCreateReceipt?: (
    payload: CreateReceiptPayload,
  ) => Promise<ReceiptCreateResult>;
  // Phase 2 — invoices (DIRECT_PDF, schema-driven wizard). POST /documents/invoice.
  // `send` + `recipientEmail` drive "Create and send" (reuses the receipt email).
  onCreateInvoice?: (payload: {
    data: Record<string, string>;
    customerId?: string;
    send?: boolean;
    recipientEmail?: string;
  }) => Promise<void>;
  // Edit a DRAFT invoice — PATCH /documents/invoice/:id (same body shape).
  onUpdateInvoice?: (
    docId: string,
    payload: {
      data: Record<string, string>;
      customerId?: string;
      notifyOnIssueDate?: boolean;
    },
  ) => Promise<void>;
  // Finalize (send) a DRAFT invoice — POST /documents/invoice/:id/send.
  onSendInvoice?: (docId: string) => Promise<void>;
  defaultReceivedBy?: string;
  // Model C — receipt quota, forwarded to the receipt form's quota/overage hint.
  receiptQuota?: {
    remaining: number | null;
    unlimited: boolean;
    overagePrice: number;
  };
  // Model C — receipt usage for the standalone usage card (X / Y this month).
  receiptUsage?: {
    used: number;
    limit: number;
    unlimited: boolean;
    overagePrice: number;
  };
  // Receipts-only tenants (contractsEnabled === false) hide the document stats.
  contractsEnabled?: boolean;
  // Receipts-only: fetches GET /documents/receipt/stats for the stat pills.
  onFetchReceiptStats?: () => Promise<ReceiptStats>;
  // Bumped by the page after a create/send so the stats effect refetches.
  receiptStatsRefreshKey?: number;
  // Superadmin flow: SUPERADMIN picks any user (all tenants) to borrow templates.
  selectableUsers?: SelectableUser[];
  onFetchTypesAsUser?: (userId: string) => Promise<DocumentTypeOption[]>;
  onEditDocument: (docId: string) => void;
  onDocumentAction: (docId: string, action: BackendDocumentAction) => Promise<void>;
  onSyncStatus: (docId: string) => Promise<void>;
  onPreviewPdf: (docId: string) => void;
  onDownloadPdf: (docId: string) => void;
  onFetchVersions?: (docId: string) => Promise<DocumentVersion[]>;
  onFetchDocument: (docId: string) => Promise<DocumentDetail>;
  onFetchPdfUrl?: (docId: string) => Promise<string>;
  onUpdateDraft?: (
    docId: string,
    payload: { contractDate: string; dataJson: Record<string, unknown> },
  ) => Promise<void>;
  // Receipt-specific (DIRECT_PDF). Resend handles the cooldown + toast; update
  // PATCHes the receipt's data (DRAFT/SEND_FAILED only).
  onResendReceipt?: (docId: string) => Promise<void>;
  onUpdateReceipt?: (
    docId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  // Reissue (2c): create a corrected copy of a SENT receipt + void the original.
  onReissueReceipt?: (
    docId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  // Void (2c): mark a SENT receipt VOID with no replacement.
  onVoidReceipt?: (docId: string) => Promise<void>;
  // Void an invoice (owner decision: cancelling an invoice → VOID).
  onVoidInvoice?: (docId: string) => Promise<void>;
  // B7: soft-delete a DRAFT document (DELETE /documents/:id).
  onDeleteDocument?: (docId: string) => Promise<void>;
  // C6: finalize a scheduled invoice/receipt TODAY (issue date → today).
  onSendInvoiceNow?: (docId: string) => Promise<void>;
  onSendReceiptNow?: (docId: string) => Promise<void>;
  // K6: resend a SENT invoice's email (mirrors the receipt resend).
  onResendInvoice?: (docId: string) => Promise<void>;
  onFetchReceiptPdf?: (docId: string) => Promise<string>;
  // Invoice-specific (DIRECT_PDF, code INVOICE): regenerated PDF for the SENT
  // invoice's Preview tab (GET /documents/invoice/:id/pdf).
  onFetchInvoicePdf?: (docId: string) => Promise<string>;
  isSuperadmin?: boolean;
}

const PAGE_SIZE = 10;

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'DRAFT',
  'SENT',
  'VOID',
  'VIEWED',
  'SIGNED',
  'COMPLETED',
  'CANCELLED',
]);
function parseStatusParam(raw: string | null): StatusFilter {
  return raw && VALID_STATUSES.has(raw) ? (raw as StatusFilter) : 'all';
}

export function DocumentsPanel({
  isLoading,
  documents,
  documentTypes,
  customers,
  onRefreshCustomers,
  onCreateDraft,
  onCreateReceipt,
  onCreateInvoice,
  onUpdateInvoice,
  onSendInvoice,
  defaultReceivedBy,
  receiptQuota,
  contractsEnabled = true,
  onFetchReceiptStats,
  receiptStatsRefreshKey,
  selectableUsers,
  onFetchTypesAsUser,
  onEditDocument,
  onDocumentAction,
  onSyncStatus,
  onPreviewPdf,
  onDownloadPdf,
  onFetchDocument,
  onFetchPdfUrl,
  onUpdateDraft,
  onResendReceipt,
  onUpdateReceipt,
  onReissueReceipt,
  onVoidReceipt,
  onVoidInvoice,
  onDeleteDocument,
  onSendInvoiceNow,
  onSendReceiptNow,
  onResendInvoice,
  onFetchReceiptPdf,
  onFetchInvoicePdf,
  isSuperadmin = false,
}: DocumentsPanelProps) {
  // Filters + search seeded from the URL so they survive a reload / can be shared.
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    () => parseStatusParam(searchParams.get('status')),
  );
  const [typeFilter, setTypeFilter] = useState<string>(() => searchParams.get('type') ?? 'all');
  const [currentPage, setCurrentPage] = useState(1);
  // `doc`/`new` are one-shot navigation params (e.g. from the Overview): open a
  // document's modal or the create modal on mount, then strip them from the URL.
  // Seed the open document from the URL so it survives navigation AND reload.
  // Client navigation (router.push) populates useSearchParams but not yet
  // window.location; a full page load of a statically-rendered route is the
  // reverse (useSearchParams empty at first render, window.location correct).
  // Reading both covers both paths.
  const [selectedDocId, setSelectedDocId] = useState<string | null>(() => {
    const fromRouter = searchParams.get('doc');
    if (fromRouter) return fromRouter;
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('doc');
    }
    return null;
  });
  const [showCreateModal, setShowCreateModal] = useState(
    () => searchParams.get('new') === '1',
  );
  // One-shot: preselect a document type by code in the create modal (Templates →
  // Invoice "Create invoice" deep-links here with ?new=1&newType=INVOICE).
  const [createTypeCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('newType');
  });
  // When the create modal opens (toolbar "New Document" OR the Overview's
  // ?new=1 deep-link — both set showCreateModal), refetch the customers so the
  // "Client" selector reflects clients created since this page loaded (the
  // Clients module mutates via its own handlers and never touched this list).
  // The modal reads `customers` from props live, so a refetch updates it in place.
  useEffect(() => {
    if (showCreateModal) onRefreshCustomers?.();
  }, [showCreateModal, onRefreshCustomers]);
  const [confirmAction, setConfirmAction] = useState<{
    action: 'send' | 'cancel';
    docId: string;
  } | null>(null);
  // Confirm before any receipt email from the kebab — send (DRAFT), resend
  // (SENT) or retry (SEND_FAILED). isResend drives the wording.
  const [receiptSendConfirm, setReceiptSendConfirm] = useState<{
    docId: string;
    email: string;
    isResend: boolean;
  } | null>(null);
  // K6: resend a SENT invoice — confirm first (emails the client again).
  const [invoiceResendConfirm, setInvoiceResendConfirm] = useState<{
    docId: string;
    email: string;
  } | null>(null);
  // Which tab the detail modal opens on ('pdf' for kebab "Preview PDF").
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  // When the detail opens via the kebab "Reissue", auto-open the reissue form.
  const [reissueOnOpen, setReissueOnOpen] = useState(false);
  // Direct-void confirmation (kebab "Void" — no replacement created).
  const [voidConfirm, setVoidConfirm] = useState<{ docId: string } | null>(null);
  // Blocked-send warning (B6): a doc with no email on file can't be sent — we
  // show an acknowledgement dialog and never fire the send. The detail modal (if
  // open) stays open behind it.
  const [noEmailWarn, setNoEmailWarn] = useState(false);
  // Delete confirmation (B7): a DRAFT is soft-deleted (not voided) after a
  // confirm. The actor stops seeing it; a SUPERADMIN still does.
  const [deleteConfirm, setDeleteConfirm] = useState<{ docId: string } | null>(
    null,
  );
  // C6: "Send now" confirmation for a scheduled doc — it emits TODAY (not on its
  // scheduled date).
  const [sendNowConfirm, setSendNowConfirm] = useState<{ docId: string } | null>(
    null,
  );
  // C6: when the detail opens via the kebab "Change send date", auto-open the
  // billed-to edit (where the date lives).
  const [dateEditOnOpen, setDateEditOnOpen] = useState(false);
  // In-flight receipt resends — locks out double-clicks (ajuste 3).
  const resendingRef = useRef<Set<string>>(new Set());
  const [sessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const KEY = 'noasign:draft-session-id';
    try {
      let sid = window.sessionStorage.getItem(KEY);
      if (!sid) {
        sid =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        window.sessionStorage.setItem(KEY, sid);
      }
      return sid;
    } catch {
      return '';
    }
  });

  // Entrance animation for freshly-inserted rows: diff the document ids across
  // renders and flag only the genuinely new ones. The first populated render is
  // skipped (prev empty) so the whole table doesn't animate on initial load.
  const seenDocIdsRef = useRef<Set<string> | null>(null);
  const [newDocIds, setNewDocIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = documents.map((d) => d.id);
    const prev = seenDocIdsRef.current;
    seenDocIdsRef.current = new Set(currentIds);
    if (!prev) return; // first population — don't animate existing rows
    const added = currentIds.filter((id) => !prev.has(id));
    if (added.length === 0) return;
    setNewDocIds(new Set(added));
    // Keep the flag on for the full entrance animation (F8: fade/slide + fading
    // sky highlight, ~1.6s). Too short and the highlight gets cut off.
    const t = setTimeout(() => setNewDocIds(new Set()), 1700);
    return () => clearTimeout(t);
  }, [documents]);

  // Persist filters + search + the open document in the URL via replaceState (NOT
  // the Next router, so it never re-runs the page's data effects). Empty/"all"
  // values are removed. Keeping `doc` in sync with the open detail lets a reload
  // reopen the same document (the lazy init above reads it back).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('panel', 'documents');
    const sync = (key: string, value: string) =>
      value && value !== 'all' ? params.set(key, value) : params.delete(key);
    sync('search', search.trim());
    sync('status', statusFilter);
    sync('type', typeFilter);
    // Mirror the open document so it survives a reload; cleared when the detail
    // closes (selectedDocId null -> removed).
    sync('doc', selectedDocId ?? '');
    // `new`/`newType` stay one-shot — they open + preset the create modal on
    // mount, then are stripped.
    params.delete('new');
    params.delete('newType');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [search, statusFilter, typeFilter, selectedDocId]);

  // Reset to page 1 whenever the filters/search change.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter]);

  // Fetch the receipt stats: powers the receipts-only stat pills AND the per-type
  // document cards (which show for every tenant, hence not gated on receiptsOnly).
  const receiptsOnly = !contractsEnabled;
  const [receiptStats, setReceiptStats] = useState<ReceiptStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // "Detail →" on the Total status pill → by-type TOTALS popup.
  const [showTotalsModal, setShowTotalsModal] = useState(false);
  useEffect(() => {
    if (!onFetchReceiptStats) return;
    let active = true;
    const load = async () => {
      setStatsLoading(true);
      try {
        const s = await onFetchReceiptStats();
        if (active) setReceiptStats(s);
      } catch {
        if (active) setReceiptStats(null);
      } finally {
        if (active) setStatsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [receiptsOnly, onFetchReceiptStats, receiptStatsRefreshKey]);

  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((doc) => {
        const number = doc.documentNumber?.toLowerCase() ?? '';
        const customer =
          doc.customer?.name?.toLowerCase() ??
          doc.customer?.email?.toLowerCase() ??
          '';
        const type = doc.documentType?.name?.toLowerCase() ?? '';
        return (
          number.includes(q) || customer.includes(q) || type.includes(q)
        );
      });
    }
    if (statusFilter === 'VOID') {
      // Derived state: a voided receipt keeps internal status SENT.
      filtered = filtered.filter((doc) => isVoidedDoc(doc));
    } else if (statusFilter === 'SCHEDULED') {
      // Derived state: a deferred (future-dated) draft awaiting its issue date.
      filtered = filtered.filter(
        (doc) => isDeferredPending(doc) && !isVoidedDoc(doc),
      );
    } else if (statusFilter === 'DRAFT') {
      // A scheduled (deferred) draft shows under Scheduled, not Draft.
      filtered = filtered.filter(
        (doc) =>
          doc.status === 'DRAFT' &&
          !isDeferredPending(doc) &&
          !isVoidedDoc(doc),
      );
    } else if (statusFilter !== 'all') {
      // A voided receipt shows under VOID, not under its internal status.
      filtered = filtered.filter(
        (doc) => doc.status === statusFilter && !isVoidedDoc(doc),
      );
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter((doc) => (doc.documentType?.name ?? '') === typeFilter);
    }
    return filtered;
  }, [documents, search, statusFilter, typeFilter]);

  // Distinct document types present (for the Type header quick-filter).
  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const d of documents) {
      if (d.documentType?.name) set.add(d.documentType.name);
    }
    return [...set].sort();
  }, [documents]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const pageItems = filteredDocuments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const stats = useMemo(() => {
    const total = documents.length;
    const draft = documents.filter((d) => d.status === 'DRAFT').length;
    const inProgress = documents.filter(
      (d) => d.status === 'SENT' || d.status === 'VIEWED' || d.status === 'SIGNED',
    ).length;
    const completed = documents.filter((d) => d.status === 'COMPLETED').length;
    return { total, draft, inProgress, completed };
  }, [documents]);

  const selectedDocument = useMemo(() => {
    if (!selectedDocId) return null;
    return documents.find((d) => d.id === selectedDocId) ?? null;
  }, [selectedDocId, documents]);

  // Resend/retry/send a receipt with a double-click lock (shared by the kebab
  // direct path and the confirm-dialog path).
  const runReceiptResend = async (docId: string) => {
    if (!onResendReceipt || resendingRef.current.has(docId)) return;
    resendingRef.current.add(docId);
    try {
      await onResendReceipt(docId);
    } finally {
      resendingRef.current.delete(docId);
    }
  };

  const handleConfirmReceiptSend = () => {
    if (!receiptSendConfirm) return;
    const { docId } = receiptSendConfirm;
    setReceiptSendConfirm(null);
    void runReceiptResend(docId);
  };

  const handleAction = async (action: V2DocumentAction, docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    const receipt = doc ? isReceiptDoc(doc) : false;

    if (action === 'view') {
      setInitialTab(undefined);
      setSelectedDocId(docId);
      return;
    }
    if (action === 'edit') {
      // Legacy edit route (contracts). Invoices/receipts edit in place via the
      // detail's scoped edit popup, not this action.
      onEditDocument(docId);
      return;
    }
    if (action === 'sync') {
      await onSyncStatus(docId);
      return;
    }
    // 'preview' (contract) and 'viewPdf' (receipt): open the detail on the PDF
    // tab (no new browser tab / no download).
    if (action === 'preview' || action === 'viewPdf') {
      setInitialTab('pdf');
      setSelectedDocId(docId);
      return;
    }
    if (action === 'download') {
      onDownloadPdf(docId);
      return;
    }
    // Reissue (2c): open the detail modal and auto-open the prefilled reissue
    // form (the corrected copy + void happens on submit).
    if (action === 'reissue') {
      setInitialTab(undefined);
      setReissueOnOpen(true);
      setSelectedDocId(docId);
      return;
    }
    // Void directly (no replacement) — confirm first (irreversible).
    if (action === 'void') {
      setVoidConfirm({ docId });
      return;
    }
    // B7: soft-delete a DRAFT — confirm first, then DELETE /documents/:id.
    if (action === 'delete') {
      setDeleteConfirm({ docId });
      return;
    }
    // C6: finalize a scheduled doc TODAY — confirm first (it emits now, not on
    // the scheduled date).
    if (action === 'sendNow') {
      // H1: "Send now" issues AND emails the doc today, so a doc with no recipient
      // email must warn and NOT attempt the send — same B6/C5 guard as the plain
      // send (the backend would reject it). Invoice reads recipient_email, receipt
      // reads email.
      const dj = doc?.data?.dataJson as Record<string, unknown> | undefined;
      const email = (
        doc?.customer?.email ||
        (receipt
          ? typeof dj?.email === 'string'
            ? dj.email
            : ''
          : typeof dj?.recipient_email === 'string'
            ? dj.recipient_email
            : '')
      ).trim();
      if (!email) {
        setNoEmailWarn(true);
        return;
      }
      setSendNowConfirm({ docId });
      return;
    }
    // C6: reschedule — open the detail and auto-open the billed-to edit (date).
    if (action === 'changeDate') {
      setInitialTab(undefined);
      setDateEditOnOpen(true);
      setSelectedDocId(docId);
      return;
    }
    // Finalize (send) a DRAFT invoice — POST /documents/invoice/:id/send. Blocked
    // server-side while still deferred (and the kebab hides it until due).
    if (action === 'send' && doc && isInvoiceDoc(doc)) {
      // B6: no email on file → warn and don't attempt the send (the backend
      // would reject it). The detail modal, if open, stays open behind the warn.
      const dj = doc?.data?.dataJson as Record<string, unknown> | undefined;
      const email = (
        doc?.customer?.email ||
        (typeof dj?.recipient_email === 'string' ? dj.recipient_email : '')
      ).trim();
      if (!email) {
        setNoEmailWarn(true);
        return;
      }
      await onSendInvoice?.(docId);
      return;
    }
    // K6: resend a SENT invoice — same no-email guard as the send, then confirm.
    if (action === 'resend' && doc && isInvoiceDoc(doc)) {
      const dj = doc?.data?.dataJson as Record<string, unknown> | undefined;
      const email = (
        doc?.customer?.email ||
        (typeof dj?.recipient_email === 'string' ? dj.recipient_email : '')
      ).trim();
      if (!email) {
        setNoEmailWarn(true);
        return;
      }
      setInvoiceResendConfirm({ docId, email });
      return;
    }
    // Any receipt email — send (DRAFT), resend (SENT) or retry (SEND_FAILED) —
    // confirms first; on confirm it fires the send-toast.
    if (
      (action === 'send' || action === 'resend' || action === 'retry') &&
      receipt
    ) {
      const dj = doc?.data?.dataJson as Record<string, unknown> | undefined;
      const email = (
        doc?.customer?.email ||
        (typeof dj?.email === 'string' ? dj.email : '')
      ).trim();
      // B6: same guard as invoices — no email, no send, just a warning.
      if (!email) {
        setNoEmailWarn(true);
        return;
      }
      setReceiptSendConfirm({ docId, email, isResend: action !== 'send' });
      return;
    }
    // Discard: a receipt = cancel it; an invoice = VOID it (owner decision —
    // same VOID treatment as receipts). Both confirm first.
    if (action === 'discard') {
      if (doc && isInvoiceDoc(doc)) {
        setVoidConfirm({ docId });
      } else {
        setConfirmAction({ action: 'cancel', docId });
      }
      return;
    }
    // Send / Cancel are destructive-ish and irreversible → confirm first.
    // Both the kebab and the modal footer route through here, so one
    // interception point covers both triggers.
    if (action === 'send' || action === 'cancel') {
      setConfirmAction({ action, docId });
      return;
    }
    if (BACKEND_ACTIONS.has(action)) {
      await onDocumentAction(docId, action as BackendDocumentAction);
    }
  };

  const confirmDoc = confirmAction
    ? documents.find((d) => d.id === confirmAction.docId) ?? null
    : null;

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { action, docId } = confirmAction;
    setConfirmAction(null);
    await onDocumentAction(docId, action as BackendDocumentAction);
    // Close the detail modal too (no-op if it was triggered from the kebab).
    setSelectedDocId(null);
  };

  const handleSelect = (docId: string) => setSelectedDocId(docId);
  const handleCloseSidebar = () => {
    setSelectedDocId(null);
    setReissueOnOpen(false);
    setDateEditOnOpen(false);
  };

  const showEmpty = filteredDocuments.length === 0;
  const hasFilters =
    search.trim().length > 0 || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="documents-v2-panel">
      <DocumentsPanelHeader
        isLoading={isLoading}
        title={receiptsOnly ? 'Receipts' : 'Documents'}
      />

      {/* Status counters. Receipts/invoices module: Sent · Draft · Scheduled ·
          Void (no Total pill / by-type popup — that lives on the Overview). The
          contract module keeps its Total pill with the by-type "Detail →" popup. */}
      {receiptsOnly ? (
        <ReceiptStatsPills
          stats={receiptStats}
          isLoading={isLoading || statsLoading}
        />
      ) : (
        <DocumentsStats
          stats={stats}
          isLoading={isLoading}
          onTotalDetail={() => setShowTotalsModal(true)}
        />
      )}

      {/* Generated documents this month — Receipts | Invoices (two columns). */}
      <GeneratedDocsCard
        receiptsThisMonth={receiptStats?.monthlyCounts?.receipts ?? 0}
        invoicesThisMonth={receiptStats?.monthlyCounts?.invoices ?? 0}
        isLoading={isLoading || statsLoading}
      />

      <DocumentsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onCreateNew={() => setShowCreateModal(true)}
        entity={receiptsOnly ? 'receipt' : 'document'}
      />

      {isLoading ? (
        <>
          <DocumentsTable
            documents={[]}
            selectedId={null}
            onSelect={handleSelect}
            onAction={handleAction}
            isLoading
            receiptsOnly={receiptsOnly}
          />
          <DocumentsCards
            documents={[]}
            selectedId={null}
            onSelect={handleSelect}
            onAction={handleAction}
            isLoading
            receiptsOnly={receiptsOnly}
          />
        </>
      ) : showEmpty ? (
        <DocumentsEmptyState
          hasFilters={hasFilters}
          entity={receiptsOnly ? 'receipt' : 'document'}
        />
      ) : (
        <>
          <DocumentsTable
            documents={pageItems}
            selectedId={selectedDocId}
            onSelect={handleSelect}
            onAction={handleAction}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            availableTypes={availableTypes}
            onQuickFilterStatus={setStatusFilter}
            onQuickFilterType={setTypeFilter}
            newIds={newDocIds}
            receiptsOnly={receiptsOnly}
          />
          <DocumentsCards
            documents={pageItems}
            selectedId={selectedDocId}
            onSelect={handleSelect}
            onAction={handleAction}
            receiptsOnly={receiptsOnly}
          />

          {totalPages > 1 && (
            <div className="documents-pagination">
              <button
                type="button"
                className="documents-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <span className="documents-pagination__info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="documents-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {selectedDocId ? (
        <DocumentDetailModal
          documentId={selectedDocId}
          listItem={selectedDocument}
          initialTab={initialTab}
          onClose={handleCloseSidebar}
          onAction={handleAction}
          onFetchDocument={onFetchDocument}
          onFetchPdfUrl={onFetchPdfUrl}
          onUpdateDraft={onUpdateDraft}
          isReceipt={selectedDocument ? isReceiptDoc(selectedDocument) : false}
          isInvoice={selectedDocument ? isInvoiceDoc(selectedDocument) : false}
          onFetchInvoicePdf={onFetchInvoicePdf}
          onUpdateInvoice={onUpdateInvoice}
          onUpdateReceipt={onUpdateReceipt}
          onReissueReceipt={onReissueReceipt}
          autoOpenReissue={reissueOnOpen}
          autoOpenDateEdit={dateEditOnOpen}
          onFetchReceiptPdf={onFetchReceiptPdf}
          isSuperadmin={isSuperadmin}
        />
      ) : null}

      {showCreateModal ? (
        <DocumentCreationModal
          documentTypes={documentTypes}
          customers={customers}
          sessionId={sessionId}
          isSuperadmin={isSuperadmin}
          selectableUsers={selectableUsers}
          onFetchTypesAsUser={onFetchTypesAsUser}
          onClose={() => {
            setShowCreateModal(false);
          }}
          onCreate={onCreateDraft}
          onCreateReceipt={onCreateReceipt}
          onCreateInvoice={onCreateInvoice}
          initialDocumentTypeCode={createTypeCode ?? undefined}
          defaultReceivedBy={defaultReceivedBy}
          receiptQuota={receiptQuota}
        />
      ) : null}

      {confirmAction && confirmDoc ? (
        <ConfirmActionModal
          isOpen
          title={confirmAction.action === 'send' ? 'Send document?' : 'Cancel document?'}
          message={
            confirmAction.action === 'send' ? (
              <>
                This will send the document to{' '}
                {/* J5: show the REAL send target (data.customer_email), not the
                    linked-Customer email — the two can diverge. Same source the
                    backend sends to; display only, send path unchanged. */}
                <strong>{contractSignerEmail(confirmDoc) || 'the customer'}</strong> for
                signature. This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to cancel <strong>{confirmDoc.documentNumber}</strong>?
                The signing link will be invalidated and this action cannot be undone.
              </>
            )
          }
          confirmLabel={confirmAction.action === 'send' ? 'Send document' : 'Cancel document'}
          cancelLabel={confirmAction.action === 'send' ? 'Cancel' : 'Keep document'}
          variant={confirmAction.action === 'send' ? 'amber' : 'danger'}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}

      {receiptSendConfirm ? (
        <ConfirmActionModal
          isOpen
          title={receiptSendConfirm.isResend ? 'Resend receipt?' : 'Send receipt?'}
          message={
            <>
              {receiptSendConfirm.isResend ? 'Resend' : 'Send'} the receipt to{' '}
              <strong>{receiptSendConfirm.email || 'the recipient'}</strong>?
            </>
          }
          confirmLabel={receiptSendConfirm.isResend ? 'Resend' : 'Send'}
          cancelLabel="Cancel"
          variant="amber"
          onConfirm={handleConfirmReceiptSend}
          onCancel={() => setReceiptSendConfirm(null)}
        />
      ) : null}

      {invoiceResendConfirm ? (
        <ConfirmActionModal
          isOpen
          title="Resend invoice?"
          message={
            <>
              Resend the invoice to{' '}
              <strong>{invoiceResendConfirm.email || 'the recipient'}</strong>?
            </>
          }
          confirmLabel="Resend"
          cancelLabel="Cancel"
          variant="amber"
          onConfirm={() => {
            const { docId } = invoiceResendConfirm;
            setInvoiceResendConfirm(null);
            void onResendInvoice?.(docId);
          }}
          onCancel={() => setInvoiceResendConfirm(null)}
        />
      ) : null}

      {noEmailWarn ? (
        <ConfirmActionModal
          isOpen
          title="Can't send — no email on file"
          message="This document has no email address registered, so it can't be sent. Add a recipient email first, then try again."
          confirmLabel="Got it"
          variant="amber"
          onConfirm={() => setNoEmailWarn(false)}
          onCancel={() => setNoEmailWarn(false)}
        />
      ) : null}

      {deleteConfirm ? (
        <ConfirmActionModal
          isOpen
          title="Delete draft?"
          message="This draft will be deleted and removed from your list. It can't be restored — there's no self-service restore for deleted drafts yet."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => {
            const { docId } = deleteConfirm;
            setDeleteConfirm(null);
            void onDeleteDocument?.(docId);
            // Close the detail (if open) so the updated list shows.
            setSelectedDocId(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      ) : null}

      {sendNowConfirm ? (
        <ConfirmActionModal
          isOpen
          title="Send now?"
          message="This will issue the document TODAY (not on its scheduled date) and send it now. The issue date changes to today. Continue?"
          confirmLabel="Send now"
          cancelLabel="Cancel"
          variant="amber"
          onConfirm={() => {
            const { docId } = sendNowConfirm;
            const target = documents.find((d) => d.id === docId);
            setSendNowConfirm(null);
            if (target && isInvoiceDoc(target)) void onSendInvoiceNow?.(docId);
            else void onSendReceiptNow?.(docId);
            // Close the detail (if open) so the updated list shows.
            setSelectedDocId(null);
          }}
          onCancel={() => setSendNowConfirm(null)}
        />
      ) : null}

      {voidConfirm ? (
        (() => {
          const voidDoc = documents.find((d) => d.id === voidConfirm.docId);
          const voidIsInvoice = voidDoc ? isInvoiceDoc(voidDoc) : false;
          const noun = voidIsInvoice ? 'invoice' : 'receipt';
          return (
            <ConfirmActionModal
              isOpen
              title={`Void ${noun}?`}
              message={`This ${noun} will be marked as VOID and cannot be undone. Continue?`}
              confirmLabel="Void"
              cancelLabel="Cancel"
              variant="danger"
              onConfirm={() => {
                const { docId } = voidConfirm;
                setVoidConfirm(null);
                if (voidIsInvoice) void onVoidInvoice?.(docId);
                else void onVoidReceipt?.(docId);
                // Close the detail (if open) so the updated list shows.
                setSelectedDocId(null);
              }}
              onCancel={() => setVoidConfirm(null)}
            />
          );
        })()
      ) : null}

      {/* By-type TOTALS popup (from the Total pill's "Detail →"). All-time totals,
          NOT this month — distinct from the Overview month popup. Documents line
          only for tipo-documento tenants. */}
      <MonthBreakdownModal
        isOpen={showTotalsModal}
        onClose={() => setShowTotalsModal(false)}
        title="Documents by type"
        subtitle="All time"
        counts={
          receiptStats?.documentCounts
            ? {
                receipts: receiptStats.documentCounts.receipts,
                invoices: receiptStats.documentCounts.invoices,
                documents: receiptStats.documentCounts.signatures,
                total: receiptStats.documentCounts.total,
              }
            : null
        }
        showDocuments={!receiptsOnly}
      />
    </div>
  );
}
