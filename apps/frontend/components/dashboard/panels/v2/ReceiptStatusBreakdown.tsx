import React from 'react';
import type { ReceiptStats } from './ReceiptMetricCards';

interface ReceiptStatusBreakdownProps {
  stats: ReceiptStats | null;
  isLoading: boolean;
}

/**
 * Receipt status breakdown for the RECEIPTS_ONLY overview. Repurposes the shared
 * .status-breakdown / .status-pill styles but shows ONLY the statuses a receipt
 * can really have (no signature states). Cancelled and Void are merged here for
 * a cleaner summary — the Documents module keeps them separate for filtering.
 */
export function ReceiptStatusBreakdown({ stats, isLoading }: ReceiptStatusBreakdownProps) {
  if (isLoading) {
    return (
      <div className="status-breakdown loading">
        <h2 className="status-breakdown-title">Receipt status</h2>
        <div className="status-breakdown-grid">
          {[1, 2, 3, 4].map((i) => (
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

  const by = stats?.byStatus;
  const sent = by?.sent ?? 0;
  const draft = by?.draft ?? 0;
  const failed = by?.sendFailed ?? 0;
  const cancelledVoid = (by?.cancelled ?? 0) + (by?.void ?? 0);
  const total = sent + draft + failed + cancelledVoid;

  const items = [
    { key: 'sent', label: 'Sent', count: sent, color: 'status-sent', icon: '📤' },
    { key: 'draft', label: 'Draft', count: draft, color: 'status-draft', icon: '📝' },
    { key: 'failed', label: 'Send failed', count: failed, color: 'status-cancelled', icon: '⚠️' },
    { key: 'cancelledVoid', label: 'Cancelled / Void', count: cancelledVoid, color: 'status-cancelled', icon: '❌' },
  ];

  return (
    <div className="status-breakdown">
      <div className="status-breakdown-header">
        <h2 className="status-breakdown-title">Receipt status</h2>
        <span className="status-breakdown-total">
          {total} {total === 1 ? 'receipt' : 'receipts'}
        </span>
      </div>

      <div className="status-breakdown-grid">
        {items.map((s) => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          return (
            <div key={s.key} className={`status-pill ${s.color}`}>
              <div className="status-pill-header">
                <span className="status-pill-icon">{s.icon}</span>
                <span className="status-pill-label">{s.label}</span>
              </div>
              <div className="status-pill-count">{s.count}</div>
              <div className="status-pill-bar-container">
                <div className="status-pill-bar" style={{ width: `${pct}%` }} />
              </div>
              <div className="status-pill-percentage">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
