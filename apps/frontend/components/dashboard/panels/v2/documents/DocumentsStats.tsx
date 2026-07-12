'use client';

import React from 'react';

interface Stats {
  total: number;
  draft: number;
  inProgress: number;
  completed: number;
}

interface DocumentsStatsProps {
  stats: Stats;
  isLoading?: boolean;
  // When set, the "Total" pill shows a "Detail →" link opening the by-type popup.
  onTotalDetail?: () => void;
}

// Only the numeric value is dynamic — labels/hints are static.
function StatValue({
  value,
  isLoading,
}: {
  value: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <span
        className="skeleton-pulse skeleton-line"
        style={{ display: "inline-block", width: "34px", height: "22px" }}
        aria-hidden="true"
      />
    );
  }
  return <>{value}</>;
}

export function DocumentsStats({
  stats,
  isLoading,
  onTotalDetail,
}: DocumentsStatsProps) {
  return (
    <div className="documents-v2-stats">
      <div className="documents-v2-stat-pill documents-v2-stat-pill--blue">
        <div className="documents-v2-stat-pill__head">
          <div className="documents-v2-stat-pill__label">Total</div>
          {onTotalDetail ? (
            <button
              type="button"
              className="documents-v2-stat-pill__detail"
              onClick={onTotalDetail}
            >
              Detail →
            </button>
          ) : null}
        </div>
        <div className="documents-v2-stat-pill__value">
          <StatValue value={stats.total} isLoading={isLoading} />
        </div>
        <div className="documents-v2-stat-pill__hint">documents</div>
      </div>

      <div className="documents-v2-stat-pill documents-v2-stat-pill--slate">
        <div className="documents-v2-stat-pill__label">Draft</div>
        <div className="documents-v2-stat-pill__value">
          <StatValue value={stats.draft} isLoading={isLoading} />
        </div>
        <div className="documents-v2-stat-pill__hint">editable</div>
      </div>

      <div className="documents-v2-stat-pill documents-v2-stat-pill--amber">
        <div className="documents-v2-stat-pill__label">In Progress</div>
        <div className="documents-v2-stat-pill__value">
          <StatValue value={stats.inProgress} isLoading={isLoading} />
        </div>
        <div className="documents-v2-stat-pill__hint">sent + viewed + signed</div>
      </div>

      <div className="documents-v2-stat-pill documents-v2-stat-pill--green">
        <div className="documents-v2-stat-pill__label">Completed</div>
        <div className="documents-v2-stat-pill__value">
          <StatValue value={stats.completed} isLoading={isLoading} />
        </div>
        <div className="documents-v2-stat-pill__hint">signed off</div>
      </div>
    </div>
  );
}
