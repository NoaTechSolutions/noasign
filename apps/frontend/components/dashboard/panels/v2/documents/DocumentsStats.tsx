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
}

export function DocumentsStats({ stats }: DocumentsStatsProps) {
  return (
    <div className="documents-v2-stats">
      <div className="documents-v2-stat-pill documents-v2-stat-pill--blue">
        <div className="documents-v2-stat-pill__label">Total</div>
        <div className="documents-v2-stat-pill__value">{stats.total}</div>
        <div className="documents-v2-stat-pill__hint">documents</div>
      </div>

      <div className="documents-v2-stat-pill documents-v2-stat-pill--slate">
        <div className="documents-v2-stat-pill__label">Draft</div>
        <div className="documents-v2-stat-pill__value">{stats.draft}</div>
        <div className="documents-v2-stat-pill__hint">editable</div>
      </div>

      <div className="documents-v2-stat-pill documents-v2-stat-pill--purple">
        <div className="documents-v2-stat-pill__label">In Progress</div>
        <div className="documents-v2-stat-pill__value">{stats.inProgress}</div>
        <div className="documents-v2-stat-pill__hint">sent + viewed + signed</div>
      </div>

      <div className="documents-v2-stat-pill documents-v2-stat-pill--green">
        <div className="documents-v2-stat-pill__label">Completed</div>
        <div className="documents-v2-stat-pill__value">{stats.completed}</div>
        <div className="documents-v2-stat-pill__hint">signed off</div>
      </div>
    </div>
  );
}
