import React from 'react';

interface DashboardDocument {
  id: string;
  status: string;
}

interface StatusBreakdownProps {
  documents: DashboardDocument[] | null;
  isLoading: boolean;
}

interface StatusCount {
  status: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  icon: string;
}

export function StatusBreakdown({ documents, isLoading }: StatusBreakdownProps) {
  // Compute status counts client-side
  const computeStatusCounts = (): StatusCount[] => {
    if (!documents || documents.length === 0) {
      return [
        { status: 'DRAFT', label: 'Draft', count: 0, percentage: 0, color: 'status-draft', icon: '📝' },
        { status: 'SENT', label: 'Sent', count: 0, percentage: 0, color: 'status-sent', icon: '📤' },
        { status: 'VIEWED', label: 'Viewed', count: 0, percentage: 0, color: 'status-viewed', icon: '👁️' },
        { status: 'SIGNED', label: 'Signed', count: 0, percentage: 0, color: 'status-signed', icon: '✍️' },
        { status: 'COMPLETED', label: 'Completed', count: 0, percentage: 0, color: 'status-completed', icon: '✅' },
        { status: 'CANCELLED', label: 'Cancelled', count: 0, percentage: 0, color: 'status-cancelled', icon: '❌' },
      ];
    }

    const total = documents.length;
    const statusMap: Record<string, number> = {};

    // Count occurrences
    documents.forEach((doc) => {
      const status = doc.status.toUpperCase();
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    // Build status counts with percentages. Count and percentage are added
    // by the .map() below — declaring the literal without the StatusCount
    // type lets TS infer the partial shape.
    const statuses = [
      { status: 'DRAFT', label: 'Draft', color: 'status-draft', icon: '📝' },
      { status: 'SENT', label: 'Sent', color: 'status-sent', icon: '📤' },
      { status: 'VIEWED', label: 'Viewed', color: 'status-viewed', icon: '👁️' },
      { status: 'SIGNED', label: 'Signed', color: 'status-signed', icon: '✍️' },
      { status: 'COMPLETED', label: 'Completed', color: 'status-completed', icon: '✅' },
      { status: 'CANCELLED', label: 'Cancelled', color: 'status-cancelled', icon: '❌' },
    ];

    return statuses.map((s) => ({
      ...s,
      count: statusMap[s.status] || 0,
      percentage: total > 0 ? Math.round(((statusMap[s.status] || 0) / total) * 100) : 0,
    }));
  };

  const statusCounts = computeStatusCounts();
  const totalDocs = documents?.length || 0;

  if (isLoading) {
    return (
      <div className="status-breakdown loading">
        <h2 className="status-breakdown-title">Document Status</h2>
        <div className="status-breakdown-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="status-pill loading">
              <div className="status-skeleton-label"></div>
              <div className="status-skeleton-count"></div>
              <div className="status-skeleton-bar"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="status-breakdown">
      <div className="status-breakdown-header">
        <h2 className="status-breakdown-title">Document Status</h2>
        <span className="status-breakdown-total">
          {totalDocs} {totalDocs === 1 ? 'document' : 'documents'}
        </span>
      </div>

      <div className="status-breakdown-grid">
        {statusCounts.map((status) => (
          <div key={status.status} className={`status-pill ${status.color}`}>
            <div className="status-pill-header">
              <span className="status-pill-icon">{status.icon}</span>
              <span className="status-pill-label">{status.label}</span>
            </div>
            <div className="status-pill-count">{status.count}</div>
            <div className="status-pill-bar-container">
              <div
                className="status-pill-bar"
                style={{ width: `${status.percentage}%` }}
              ></div>
            </div>
            <div className="status-pill-percentage">{status.percentage}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
