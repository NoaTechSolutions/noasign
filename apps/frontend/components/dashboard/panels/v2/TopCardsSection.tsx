'use client';

import React from 'react';

interface TopCardsSectionProps {
  currentPlan: {
    name: string;
    price: number;
  };
  cycle: {
    month: string;
    nextBilling: string;
  };
  role: 'master' | 'admin' | 'user';
  onChangePlan: () => void;
}

export function TopCardsSection({ currentPlan, cycle, role, onChangePlan }: TopCardsSectionProps) {
  const isMaster = role === 'master';
  // Star emoji for Pro/Scale plans
  const showStar = currentPlan.name === 'Pro' || currentPlan.name === 'Scale';

  return (
    <div className="billing-top-grid">
      <div className="bill-card">
        <p className="bill-card__eyebrow">Current Plan</p>
        <h2 className="bill-card__title">
          {currentPlan.name}
          {showStar && <span className="bill-card__title-star" aria-hidden="true">⭐</span>}
        </h2>
        <p className="bill-card__price">${currentPlan.price}/month</p>
        <p className="bill-card__sub">Billed monthly</p>
        {isMaster && (
          <div className="bill-card__foot">
            <button type="button" className="btn-primary" onClick={onChangePlan}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <polyline points="23 20 23 14 17 14"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Change Plan
            </button>
          </div>
        )}
      </div>

      <div className="bill-card">
        <p className="bill-card__eyebrow">Billing Cycle</p>
        <h2 className="bill-card__title">{cycle.month}</h2>
        <p className="bill-card__price">Next billing: {cycle.nextBilling}</p>
        <p className="bill-card__sub">Renews automatically</p>
      </div>
    </div>
  );
}
