'use client';

import React from 'react';

interface OverageAlertProps {
  overageCount: number;
  overageRate: number;
  nextBilling: string;
  role: 'master' | 'admin' | 'user';
  onUpgrade: () => void;
}

export function OverageAlert({ overageCount, overageRate, nextBilling, role, onUpgrade }: OverageAlertProps) {
  const total = (overageCount * overageRate).toFixed(2);
  const isMaster = role === 'master';

  const handleUpgradeClick = () => {
    if (!isMaster) {
      // Show toast: "Only the workspace owner can change the plan"
      return;
    }
    onUpgrade();
  };

  return (
    <div className="overage-alert-holder">
      <div className="overage-alert" role="alert">
        <h2 className="overage-alert__title">
          <span className="overage-alert__title-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          You've exceeded your plan limit
        </h2>
        <p className="overage-alert__calc">
          Extra documents: <strong>{overageCount} × ${overageRate.toFixed(2)} = ${total}</strong>
        </p>
        <p className="overage-alert__when">
          This will be charged on your next invoice ({nextBilling}).
        </p>
        <div className="overage-alert__actions">
          <button type="button" className="btn-quiet" onClick={() => {
            // Scroll to comparison table
            const compareWrap = document.getElementById('compareWrap');
            if (compareWrap) {
              const compareToggle = document.getElementById('compareToggleBtn');
              if (compareToggle && compareWrap.getAttribute('data-open') !== 'true') {
                compareToggle.click();
              }
              setTimeout(() => {
                compareWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
            View Plans
          </button>
          <button type="button" className="btn-primary" onClick={handleUpgradeClick}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}
