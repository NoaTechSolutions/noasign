'use client';

import React, { useEffect, useRef } from 'react';

interface MonthlyUsageSectionProps {
  usage: {
    documents: number;
    users: number;
    templates: number;
  };
  limits: {
    documents: number;
    users: number;
    templates: number | null;
  };
  cycleMonth: string;
}

export function MonthlyUsageSection({ usage, limits, cycleMonth }: MonthlyUsageSectionProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate progress bars
    if (!bodyRef.current) return;
    
    requestAnimationFrame(() => {
      bodyRef.current?.querySelectorAll('.usage-row__fill').forEach((el) => {
        const target = parseInt((el as HTMLElement).dataset.target || '0', 10);
        (el as HTMLElement).style.width = `${target}%`;
      });
    });
  }, [usage, limits]);

  const getProgressTone = (percentage: number): string => {
    if (percentage < 75) return 'green';
    if (percentage < 90) return 'yellow';
    return 'red';
  };

  const renderUsageRow = (
    icon: string,
    label: string,
    used: number,
    limit: number | null,
    unitOver: string
  ) => {
    if (limit === null) {
      // Unlimited
      return (
        <div className="usage-row" key={label}>
          <div className="usage-row__head">
            <span className="usage-row__label">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon === 'file-text' && (
                  <>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </>
                )}
                {icon === 'users' && (
                  <>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </>
                )}
                {icon === 'layout' && (
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </>
                )}
              </svg>
              {' '}{label}
            </span>
            <span className="usage-row__right">
              <span className="usage-row__count">{used} / Unlimited</span>
            </span>
          </div>
          <div className="usage-row__bar">
            <div className="usage-row__fill" data-tone="green" data-target="6"></div>
          </div>
          <p className="usage-row__pct">{used} used</p>
        </div>
      );
    }

    const pctRaw = (used / limit) * 100;
    const pct = Math.min(100, Math.round(pctRaw));
    const tone = getProgressTone(pctRaw);
    const isAtLimit = used === limit;
    const isOver = used > limit;
    const overBy = isOver ? used - limit : 0;

    return (
      <div className="usage-row" key={label}>
        <div className="usage-row__head">
          <span className="usage-row__label">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {icon === 'file-text' && (
                <>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </>
              )}
              {icon === 'users' && (
                <>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </>
              )}
              {icon === 'layout' && (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </>
              )}
            </svg>
            {' '}{label}
          </span>
          <span className="usage-row__right">
            {isOver ? (
              <>
                <span className="usage-row__count usage-row__count--over">{used} / {limit}</span>
                <span style={{ fontSize: '11.5px', color: 'var(--danger)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {overBy} {unitOver}
                </span>
              </>
            ) : (
              <span className="usage-row__count">{used} / {limit}</span>
            )}
            {isAtLimit && !isOver && (
              <span className="usage-row__limit-badge">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-flex' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {' '}At limit
              </span>
            )}
          </span>
        </div>
        <div className="usage-row__bar">
          <div className="usage-row__fill" data-tone={tone} data-target={pct}></div>
        </div>
        <p className="usage-row__pct">{Math.round(pctRaw)}% used</p>
      </div>
    );
  };

  return (
    <div className="bill-section">
      <div className="bill-section__head">
        <h2 className="bill-section__title">Monthly Usage</h2>
        <span style={{ fontSize: '11.5px', color: 'var(--text-label)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {cycleMonth}
        </span>
      </div>
      <div className="bill-section__body" ref={bodyRef}>
        {renderUsageRow('file-text', 'Documents', usage.documents, limits.documents, 'over')}
        {renderUsageRow('users', 'Users', usage.users, limits.users, 'over')}
        {renderUsageRow('layout', 'Templates', usage.templates, limits.templates, 'over')}
      </div>
    </div>
  );
}
