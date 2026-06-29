import React from 'react';
import { formatDocumentStatus } from '@/lib/document-status';

interface DashboardDocument {
  id: string;
  documentNumber: string;
  status: string;
  recipientEmail: string;
  createdAt: string;
  // Reissued/voided receipt: status stays SENT but it displays as VOID.
  supersededAt?: string | null;
}

interface RecentDocumentsTableProps {
  documents: DashboardDocument[];
  isLoading: boolean;
  // Drives the wording. Receipts (DIRECT_PDF) are a different entity than
  // contract documents (BoldSign) — a receipts-only tenant sees "receipts".
  entity?: 'document' | 'receipt';
}

export function RecentDocumentsTable({
  documents,
  isLoading,
  entity = 'document',
}: RecentDocumentsTableProps) {
  const isReceipt = entity === 'receipt';
  const titleLabel = isReceipt ? 'Recent Receipts' : 'Recent Documents';
  const colLabel = isReceipt ? 'Receipt' : 'Document';
  const emptyTitle = isReceipt ? 'No receipts yet' : 'No documents yet';
  const emptySubtext = isReceipt
    ? 'Issue your first receipt to get started'
    : 'Create your first document to get started';
  const viewTitle = isReceipt ? 'View receipt' : 'View document';

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Status badge class (this table's own color tokens). Now covers SEND_FAILED
  // and the derived VOID so they don't fall back to the gray default.
  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return 'doc-status-draft';
      case 'SENT':
        return 'doc-status-sent';
      case 'SEND_FAILED':
        return 'doc-status-failed';
      case 'VIEWED':
        return 'doc-status-viewed';
      case 'SIGNED':
        return 'doc-status-signed';
      case 'COMPLETED':
        return 'doc-status-completed';
      case 'CANCELLED':
        return 'doc-status-cancelled';
      case 'VOID':
        return 'doc-status-void';
      default:
        return 'doc-status-default';
    }
  };

  // A receipt with supersededAt is displayed as VOID (internal status stays SENT).
  const displayStatus = (doc: DashboardDocument) =>
    isReceipt && doc.supersededAt ? 'VOID' : doc.status;

  if (isLoading) {
    return (
      <div className="recent-documents loading">
        <h2 className="recent-documents-title">{titleLabel}</h2>
        <div className="recent-documents-table">
          <div className="recent-documents-table-header">
            <div className="recent-doc-col-name">{colLabel}</div>
            <div className="recent-doc-col-status">Status</div>
            <div className="recent-doc-col-recipient">Recipient</div>
            <div className="recent-doc-col-date">Date</div>
            <div className="recent-doc-col-actions">Actions</div>
          </div>
          <div className="recent-documents-table-body">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="recent-doc-row loading">
                <div className="recent-doc-skeleton-line"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="recent-documents">
        <h2 className="recent-documents-title">{titleLabel}</h2>
        <div className="recent-documents-empty">
          <p className="recent-documents-empty-icon">📄</p>
          <p className="recent-documents-empty-text">{emptyTitle}</p>
          <p className="recent-documents-empty-subtext">{emptySubtext}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-documents">
      <div className="recent-documents-header">
        <h2 className="recent-documents-title">{titleLabel}</h2>
        <a href="/dashboard?panel=documents" className="recent-documents-view-all">
          View all →
        </a>
      </div>

      <div className="recent-documents-table">
        {/* Desktop table */}
        <div className="recent-documents-table-desktop">
          <div className="recent-documents-table-header">
            <div className="recent-doc-col-name">{colLabel}</div>
            <div className="recent-doc-col-status">Status</div>
            <div className="recent-doc-col-recipient">Recipient</div>
            <div className="recent-doc-col-date">Date</div>
            <div className="recent-doc-col-actions">Actions</div>
          </div>
          <div className="recent-documents-table-body">
            {documents.map((doc) => (
              <div key={doc.id} className="recent-doc-row">
                <div className="recent-doc-col-name">
                  <span className="recent-doc-number">{doc.documentNumber}</span>
                </div>
                <div className="recent-doc-col-status">
                  <span className={`doc-status-badge ${getStatusBadgeClass(displayStatus(doc))}`}>
                    {formatDocumentStatus(displayStatus(doc))}
                  </span>
                </div>
                <div className="recent-doc-col-recipient">
                  <span className="recent-doc-email">{doc.recipientEmail}</span>
                </div>
                <div className="recent-doc-col-date">
                  <span className="recent-doc-date">{formatDate(doc.createdAt)}</span>
                </div>
                <div className="recent-doc-col-actions">
                  <button className="recent-doc-action-btn" title={viewTitle}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="recent-documents-mobile">
          {documents.map((doc) => (
            <div key={doc.id} className="recent-doc-card">
              <div className="recent-doc-card-header">
                <span className="recent-doc-number">{doc.documentNumber}</span>
                <span className={`doc-status-badge ${getStatusBadgeClass(displayStatus(doc))}`}>
                  {formatDocumentStatus(displayStatus(doc))}
                </span>
              </div>
              <div className="recent-doc-card-body">
                <div className="recent-doc-card-row">
                  <span className="recent-doc-card-label">Recipient:</span>
                  <span className="recent-doc-card-value">{doc.recipientEmail}</span>
                </div>
                <div className="recent-doc-card-row">
                  <span className="recent-doc-card-label">Date:</span>
                  <span className="recent-doc-card-value">{formatDate(doc.createdAt)}</span>
                </div>
              </div>
              <div className="recent-doc-card-actions">
                <button className="recent-doc-action-btn">View</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
