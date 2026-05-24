'use client';

import React, { useMemo, useState } from 'react';
import { DocumentsPanelHeader } from './DocumentsPanelHeader';
import { DocumentsStats } from './DocumentsStats';
import { DocumentsToolbar } from './DocumentsToolbar';
import { DocumentsTable } from './DocumentsTable';
import { DocumentsCards } from './DocumentsCards';
import { DocumentDetailSidebar } from './DocumentDetailSidebar';
import { DocumentsEmptyState } from './DocumentsEmptyState';
import { DocumentCreationModal } from './DocumentCreationModal';
import type {
  V2DocumentItem,
  V2DocumentAction,
  BackendDocumentAction,
  StatusFilter,
  DocumentVersion,
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
  documents: V2DocumentItem[];
  documentTypes: DocumentTypeOption[];
  customers: CustomerOption[];
  onCreateDraft: (payload: CreateDraftPayload) => Promise<void>;
  onEditDocument: (docId: string) => void;
  onDocumentAction: (docId: string, action: BackendDocumentAction) => Promise<void>;
  onSyncStatus: (docId: string) => Promise<void>;
  onPreviewPdf: (docId: string) => void;
  onDownloadPdf: (docId: string) => void;
  onFetchVersions?: (docId: string) => Promise<DocumentVersion[]>;
}

export function DocumentsPanel({
  documents,
  documentTypes,
  customers,
  onCreateDraft,
  onEditDocument,
  onDocumentAction,
  onSyncStatus,
  onPreviewPdf,
  onDownloadPdf,
  onFetchVersions,
}: DocumentsPanelProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    return filtered;
  }, [documents, search, statusFilter]);

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
      onPreviewPdf(docId);
      return;
    }
    if (action === 'download') {
      onDownloadPdf(docId);
      return;
    }
    if (BACKEND_ACTIONS.has(action)) {
      await onDocumentAction(docId, action as BackendDocumentAction);
    }
  };

  const handleSelect = (docId: string) => setSelectedDocId(docId);
  const handleCloseSidebar = () => setSelectedDocId(null);

  const showEmpty = filteredDocuments.length === 0;
  const hasFilters = search.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="documents-v2-panel">
      <DocumentsPanelHeader />

      <DocumentsStats stats={stats} />

      <DocumentsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onCreateNew={() => setShowCreateModal(true)}
      />

      {showEmpty ? (
        <DocumentsEmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <DocumentsTable
            documents={filteredDocuments}
            selectedId={selectedDocId}
            onSelect={handleSelect}
            onAction={handleAction}
          />
          <DocumentsCards
            documents={filteredDocuments}
            selectedId={selectedDocId}
            onSelect={handleSelect}
            onAction={handleAction}
          />
        </>
      )}

      {selectedDocument ? (
        <DocumentDetailSidebar
          document={selectedDocument}
          onClose={handleCloseSidebar}
          onAction={handleAction}
          onFetchVersions={onFetchVersions}
        />
      ) : null}

      {showCreateModal ? (
        <DocumentCreationModal
          documentTypes={documentTypes}
          customers={customers}
          sessionId={sessionId}
          onClose={() => setShowCreateModal(false)}
          onCreate={onCreateDraft}
        />
      ) : null}
    </div>
  );
}
