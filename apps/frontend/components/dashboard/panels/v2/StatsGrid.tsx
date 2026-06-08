import React from 'react';

interface CurrentUsage {
  documentsUsed: number;
  documentsLimit: number;
  overageCount?: number;
}

interface MonthlySummary {
  billingAmount: number;
  overage: number;
}

interface DashboardDocument {
  id: string;
  status: string;
  createdAt: string;
}

interface StatsGridProps {
  usage: CurrentUsage | null;
  monthlySummary: MonthlySummary | null;
  documents: DashboardDocument[] | null;
  isLoading: boolean;
}

export function StatsGrid({ usage, monthlySummary, documents, isLoading }: StatsGridProps) {
  // Calculate sent this month (documents with status != DRAFT)
  const sentThisMonth = documents
    ? documents.filter((doc) => doc.status !== 'DRAFT').length
    : 0;

  // Calculate usage percentage
  const usagePercentage = usage
    ? Math.round((usage.documentsUsed / usage.documentsLimit) * 100)
    : 0;

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'stat-value-danger';
    if (percentage >= 75) return 'stat-value-warning';
    return 'stat-value-success';
  };

  if (isLoading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card loading">
            <div className="stat-skeleton-label"></div>
            <div className="stat-skeleton-value"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="stats-grid">
      {/* Monthly Overview */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-icon">📊</span>
          <span className="stat-label">Monthly Overview</span>
        </div>
        <div className="stat-content">
          <div className={`stat-value ${getUsageColor(usagePercentage)}`}>
            {usage?.documentsUsed || 0} / {usage?.documentsLimit || 0}
          </div>
          <div className="stat-progress-bar">
            <div
              className={`stat-progress-fill ${getUsageColor(usagePercentage)}`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
          <div className="stat-meta">{usagePercentage}% of plan limit</div>
        </div>
      </div>

      {/* Sent This Month */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-icon">📤</span>
          <span className="stat-label">Sent This Month</span>
        </div>
        <div className="stat-content">
          <div className="stat-value">{sentThisMonth}</div>
          <div className="stat-meta">
            {documents ? documents.length : 0} total documents
          </div>
        </div>
      </div>

      {/* Current Billing */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-icon">💳</span>
          <span className="stat-label">Current Billing</span>
        </div>
        <div className="stat-content">
          <div className="stat-value">
            ${monthlySummary?.billingAmount.toFixed(2) || '0.00'}
          </div>
          <div className="stat-meta">This billing cycle</div>
        </div>
      </div>

      {/* Overage */}
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-icon">⚠️</span>
          <span className="stat-label">Overage</span>
        </div>
        <div className="stat-content">
          <div
            className={`stat-value ${
              monthlySummary && monthlySummary.overage > 0
                ? 'stat-value-warning'
                : ''
            }`}
          >
            ${monthlySummary?.overage.toFixed(2) || '0.00'}
          </div>
          <div className="stat-meta">
            {usage?.overageCount || 0} documents over limit
          </div>
        </div>
      </div>
    </div>
  );
}
