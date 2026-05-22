import React from 'react';

interface DashboardDocument {
  id: string;
  documentNumber: string;
  status: string;
  recipientEmail: string;
  createdAt: string;
}

interface RecentDocumentsTableProps {
  documents: DashboardDocument[];
  isLoading: boolean;
}

export function RecentDocumentsTable({ documents, isLoading }: RecentDocumentsTableProps) {
  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Status badge class
  const getStatusBadgeClass = (status: string) => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case 'DRAFT':
        return 'doc-status-draft';
      case 'SENT':
        return 'doc-status-sent';
      case 'VIEWED':
        return 'doc-status-viewed';
      case 'SIGNED':
        return 'doc-status-signed';
      case 'COMPLETED':
        return 'doc-status-completed';
      case 'CANCELLED':
        return 'doc-status-cancelled';
      default:
        return 'doc-status-default';
    }
  };

  // Format status label
  const formatStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <div className="recent-documents loading">
        <h2 className="recent-documents-title">Recent Documents</h2>
        <div className="recent-documents-table">
          <div className="recent-documents-table-header">
            <div className="recent-doc-col-name">Document</div>
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
        <h2 className="recent-documents-title">Recent Documents</h2>
        <div className="recent-documents-empty">
          <p className="recent-documents-empty-icon">📄</p>
          <p className="recent-documents-empty-text">No documents yet</p>
          <p className="recent-documents-empty-subtext">
            Create your first document to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-documents">
      <div className="recent-documents-header">
        <h2 className="recent-documents-title">Recent Documents</h2>
        <a href="/dashboard?panel=documents" className="recent-documents-view-all">
          View all →
        </a>
      </div>

      <div className="recent-documents-table">
        {/* Desktop table */}
        <div className="recent-documents-table-desktop">
          <div className="recent-documents-table-header">
            <div className="recent-doc-col-name">Document</div>
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
                  <span className={`doc-status-badge ${getStatusBadgeClass(doc.status)}`}>
                    {formatStatusLabel(doc.status)}
                  </span>
                </div>
                <div className="recent-doc-col-recipient">
                  <span className="recent-doc-email">{doc.recipientEmail}</span>
                </div>
                <div className="recent-doc-col-date">
                  <span className="recent-doc-date">{formatDate(doc.createdAt)}</span>
                </div>
                <div className="recent-doc-col-actions">
                  <button className="recent-doc-action-btn" title="View document">
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
                <span className={`doc-status-badge ${getStatusBadgeClass(doc.status)}`}>
                  {formatStatusLabel(doc.status)}
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
