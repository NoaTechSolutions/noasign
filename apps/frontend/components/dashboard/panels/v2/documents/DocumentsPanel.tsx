'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentsPanelHeader } from './DocumentsPanelHeader';
import { DocumentsStats } from './DocumentsStats';
import { DocumentsToolbar } from './DocumentsToolbar';
import { DocumentsTable } from './DocumentsTable';
import { DocumentsCards } from './DocumentsCards';
import { DocumentDetailModal } from './DocumentDetailModal';
import { DocumentsEmptyState } from './DocumentsEmptyState';
import { DocumentCreationModal } from './DocumentCreationModal';
import type { CreateReceiptPayload } from './ReceiptForm';
import { ConfirmActionModal } from '@/components/dashboard/shared/ConfirmActionModal';
import type {
  V2DocumentItem,
  V2DocumentAction,
  BackendDocumentAction,
  StatusFilter,
  DocumentVersion,
  DocumentDetail,
} from './types';
import { BACKEND_ACTIONS } from './types';
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
  onCreateDraft: (payload: CreateDraftPayload) => Promise<void>;
  // Phase 2 — direct PDF receipts. When provided, a "New Receipt" action shows.
  onCreateReceipt?: (payload: CreateReceiptPayload) => Promise<void>;
  defaultReceivedBy?: string;
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
  isMaster?: boolean;
}

const PAGE_SIZE = 10;

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'DRAFT',
  'SENT',
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
  onCreateDraft,
  onCreateReceipt,
  defaultReceivedBy,
  onEditDocument,
  onDocumentAction,
  onSyncStatus,
  onPreviewPdf,
  onDownloadPdf,
  onFetchDocument,
  onFetchPdfUrl,
  onUpdateDraft,
  isMaster = false,
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
  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    () => searchParams.get('doc'),
  );
  const [showCreateModal, setShowCreateModal] = useState(
    () => searchParams.get('new') === '1',
  );
  const [confirmAction, setConfirmAction] = useState<{
    action: 'send' | 'cancel';
    docId: string;
  } | null>(null);
  // Which tab the detail modal opens on ('pdf' for kebab "Preview PDF").
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
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

  // Persist filters + search in the URL via replaceState (NOT the Next router,
  // so it never re-runs the page's data effects). Empty/"all" values are removed.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('panel', 'documents');
    const sync = (key: string, value: string) =>
      value && value !== 'all' ? params.set(key, value) : params.delete(key);
    sync('search', search.trim());
    sync('status', statusFilter);
    sync('type', typeFilter);
    // One-shot navigation params consumed by the initial state — strip them so
    // they don't linger / re-trigger on reload.
    params.delete('doc');
    params.delete('new');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [search, statusFilter, typeFilter]);

  // Reset to page 1 whenever the filters/search change.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter]);

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
    if (statusFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
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

  const handleAction = async (action: V2DocumentAction, docId: string) => {
    if (action === 'view') {
      setInitialTab(undefined);
      setSelectedDocId(docId);
      return;
    }
    if (action === 'edit') {
      onEditDocument(docId);
      return;
    }
    if (action === 'sync') {
      await onSyncStatus(docId);
      return;
    }
    if (action === 'preview') {
      // Open the View modal directly on the PDF tab (no new tab / no download).
      setInitialTab('pdf');
      setSelectedDocId(docId);
      return;
    }
    if (action === 'download') {
      onDownloadPdf(docId);
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
  const handleCloseSidebar = () => setSelectedDocId(null);

  const showEmpty = filteredDocuments.length === 0;
  const hasFilters =
    search.trim().length > 0 || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="documents-v2-panel">
      <DocumentsPanelHeader isLoading={isLoading} />

      <DocumentsStats stats={stats} isLoading={isLoading} />

      <DocumentsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onCreateNew={() => setShowCreateModal(true)}
      />

      {isLoading ? (
        <>
          <DocumentsTable
            documents={[]}
            selectedId={null}
            onSelect={handleSelect}
            onAction={handleAction}
            isLoading
          />
          <DocumentsCards
            documents={[]}
            selectedId={null}
            onSelect={handleSelect}
            onAction={handleAction}
            isLoading
          />
        </>
      ) : showEmpty ? (
        <DocumentsEmptyState hasFilters={hasFilters} />
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
          />
          <DocumentsCards
            documents={pageItems}
            selectedId={selectedDocId}
            onSelect={handleSelect}
            onAction={handleAction}
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
        />
      ) : null}

      {showCreateModal ? (
        <DocumentCreationModal
          documentTypes={documentTypes}
          customers={customers}
          sessionId={sessionId}
          isMaster={isMaster}
          onClose={() => setShowCreateModal(false)}
          onCreate={onCreateDraft}
          onCreateReceipt={onCreateReceipt}
          defaultReceivedBy={defaultReceivedBy}
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
                <strong>{confirmDoc.customer?.email ?? 'the customer'}</strong> for
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
    </div>
  );
}
