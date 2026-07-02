import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { formatDocumentStatus } from '@/lib/document-status';

interface DashboardDocument {
  id: string;
  documentNumber: string;
  status: string;
  recipientEmail: string;
  // Client/recipient name (from the form data) + system type (Receipt|Contract).
  recipientName?: string;
  type?: string;
  createdAt: string;
  // Reissued/voided receipt: status stays SENT but it displays as VOID.
  supersededAt?: string | null;
}

interface RecentDocumentsTableProps {
  documents: DashboardDocument[];
  isLoading: boolean;
  // Drives the columns + wording. Documents: Name · Type · Date · Status · View.
  // Receipts: Name · Status · Date · View (Status sits earlier — on purpose).
  entity?: 'document' | 'receipt';
  // Opens the row's document in the Documents module (one click → detail open).
  onView?: (docId: string) => void;
}

export function RecentDocumentsTable({
  documents,
  isLoading,
  entity = 'document',
  onView,
}: RecentDocumentsTableProps) {
  const isReceipt = entity === 'receipt';
  const titleLabel = isReceipt ? 'Recent Receipts' : 'Recent Documents';
  const emptyTitle = isReceipt ? 'No receipts yet' : 'No documents yet';
  const emptySubtext = isReceipt
    ? 'Issue your first receipt to get started'
    : 'Create your first document to get started';
  const viewTitle = isReceipt ? 'View receipt' : 'View document';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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

  const nameOf = (doc: DashboardDocument) =>
    doc.recipientName || doc.recipientEmail || '—';

  // Cell renderers, keyed so header labels and body cells stay in lockstep.
  const nameCell = (doc: DashboardDocument) => (
    <span className="recent-doc-name" title={nameOf(doc)}>{nameOf(doc)}</span>
  );
  const typeCell = (doc: DashboardDocument) => (
    <span className="recent-doc-type">{doc.type ?? 'Contract'}</span>
  );
  const dateCell = (doc: DashboardDocument) => (
    <span className="recent-doc-date">{formatDate(doc.createdAt)}</span>
  );
  const statusCell = (doc: DashboardDocument) => (
    <span className={`doc-status-badge ${getStatusBadgeClass(displayStatus(doc))}`}>
      {formatDocumentStatus(displayStatus(doc))}
    </span>
  );
  // Status → brand tone for the compact mobile row (colours the status text).
  const toneForStatus = (s: string) => {
    switch (s.toUpperCase()) {
      case 'COMPLETED': return 'green';
      case 'SENT': return 'sky';
      case 'DRAFT': return 'navy';
      case 'SIGNED': return 'green';
      case 'VIEWED':
      case 'SEND_FAILED': return 'amber';
      case 'CANCELLED':
      case 'VOID': return 'red';
      default: return 'navy';
    }
  };
  const viewCell = (doc: DashboardDocument) => (
    <button
      type="button"
      className="recent-doc-action-btn"
      title={viewTitle}
      onClick={() => onView?.(doc.id)}
    >
      View
    </button>
  );

  // Column order differs by entity (Status is intentionally in a different slot).
  const columns: {
    key: string;
    label: string;
    cell: (d: DashboardDocument) => React.ReactNode;
  }[] = isReceipt
    ? [
        { key: 'name', label: 'Name', cell: nameCell },
        { key: 'status', label: 'Status', cell: statusCell },
        { key: 'date', label: 'Date', cell: dateCell },
        { key: 'view', label: 'Actions', cell: viewCell },
      ]
    : [
        { key: 'name', label: 'Name', cell: nameCell },
        { key: 'type', label: 'Type', cell: typeCell },
        { key: 'date', label: 'Date', cell: dateCell },
        { key: 'status', label: 'Status', cell: statusCell },
        { key: 'view', label: 'Actions', cell: viewCell },
      ];

  if (isLoading) {
    return (
      <div className="recent-documents loading">
        <h2 className="recent-documents-title">{titleLabel}</h2>
        <div className="recent-documents-table">
          <div className={`recent-documents-table-desktop recent-table--${entity}`}>
            <div className="recent-documents-table-header">
              {columns.map((c) => (
                <div key={c.key} className={`recent-col recent-col--${c.key}`}>{c.label}</div>
              ))}
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
        {/* Desktop table — columns per entity via the grid modifier. */}
        <div className={`recent-documents-table-desktop recent-table--${entity}`}>
          <div className="recent-documents-table-header">
            {columns.map((c) => (
              <div key={c.key} className={`recent-col recent-col--${c.key}`}>{c.label}</div>
            ))}
          </div>
          <div className="recent-documents-table-body">
            {documents.map((doc) => (
              <div key={doc.id} className="recent-doc-row">
                {columns.map((c) => (
                  <div key={c.key} className={`recent-col recent-col--${c.key}`}>{c.cell(doc)}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile — compact tappable rows (icon · name / status · date · chevron).
            The whole row opens the document (same as desktop "View"). */}
        <div className="recent-documents-mobile">
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className="recent-doc-mobile-row"
              title={viewTitle}
              onClick={() => onView?.(doc.id)}
            >
              <span className="recent-doc-mobile-icon" aria-hidden="true">
                <FileText size={18} />
              </span>
              <span className="recent-doc-mobile-main">
                <span className="recent-doc-mobile-name">{nameOf(doc)}</span>
                <span className="recent-doc-mobile-meta">
                  <span
                    className={`recent-doc-mobile-status recent-doc-mobile-status--${toneForStatus(displayStatus(doc))}`}
                  >
                    {formatDocumentStatus(displayStatus(doc))}
                  </span>
                  <span className="recent-doc-mobile-date">· {formatDate(doc.createdAt)}</span>
                </span>
              </span>
              <ChevronRight size={18} className="recent-doc-mobile-chevron" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
