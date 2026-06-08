'use client';

import React, { useState } from 'react';

interface ComparisonSectionProps {
  currentPlan: string;
}

const PLANS = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    price: 19,
    tier: 1,
    docs: 10,
    users: 2,
    templates: 5,
    overage: 5.00,
    star: false,
    features: {
      userManagement: false,
      multiSigner: false,
      branding: false,
      bulkSend: false,
      analytics: false,
      prioritySupport: false,
      retention: '1 year'
    }
  },
  LAUNCH: {
    id: 'LAUNCH',
    name: 'Launch',
    price: 39,
    tier: 2,
    docs: 15,
    users: 3,
    templates: 8,
    overage: 3.50,
    star: false,
    features: {
      userManagement: true,
      multiSigner: true,
      branding: false,
      bulkSend: false,
      analytics: false,
      prioritySupport: false,
      retention: '2 years'
    }
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    price: 89,
    tier: 3,
    docs: 50,
    users: 5,
    templates: null,
    overage: 2.50,
    star: true,
    features: {
      userManagement: true,
      multiSigner: true,
      branding: true,
      bulkSend: true,
      analytics: true,
      prioritySupport: false,
      retention: '5 years'
    }
  },
  SCALE: {
    id: 'SCALE',
    name: 'Scale',
    price: 229,
    tier: 4,
    docs: null,
    users: null,
    templates: null,
    overage: 0,
    star: true,
    features: {
      userManagement: true,
      multiSigner: true,
      branding: true,
      bulkSend: true,
      analytics: true,
      prioritySupport: true,
      retention: 'Unlimited'
    }
  }
};

const PLAN_ORDER = ['STARTER', 'LAUNCH', 'PRO', 'SCALE'] as const;

export function ComparisonSection({ currentPlan }: ComparisonSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const CheckIcon = () => (
    <span className="compare-check">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </span>
  );

  const XIcon = () => (
    <span className="compare-x">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </span>
  );

  const renderCell = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? <CheckIcon /> : <XIcon />;
    }
    return value;
  };

  const rows = [
    { label: 'Price / month', render: (p: any) => <strong>${p.price}</strong> },
    { label: 'Documents / month', render: (p: any) => p.docs === null ? 'Unlimited' : p.docs },
    { label: 'Users', render: (p: any) => p.users === null ? 'Unlimited' : p.users },
    { label: 'Templates', render: (p: any) => p.templates === null ? 'Unlimited' : p.templates },
    { label: 'Overage rate / doc', render: (p: any) => p.overage === 0 ? 'N/A' : `$${p.overage.toFixed(2)}` },
    { label: 'User management', render: (p: any) => renderCell(p.features.userManagement) },
    { label: 'Multi-signer', render: (p: any) => renderCell(p.features.multiSigner) },
    { label: 'Custom branding', render: (p: any) => renderCell(p.features.branding) },
    { label: 'Bulk send', render: (p: any) => renderCell(p.features.bulkSend) },
    { label: 'Analytics & reporting', render: (p: any) => renderCell(p.features.analytics) },
    { label: 'Priority support', render: (p: any) => renderCell(p.features.prioritySupport) },
    { label: 'Retention', render: (p: any) => p.features.retention }
  ];

  return (
    <>
      <div className="compare-toggle-wrap">
        <button
          type="button"
          className="compare-toggle"
          id="compareToggleBtn"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10"/>
            <line x1="18" y1="20" x2="18" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="16"/>
          </svg>
          <span>{isOpen ? 'Hide comparison' : 'Compare all plans'}</span>
        </button>
      </div>

      <div className="compare-wrap" id="compareWrap" data-open={isOpen ? 'true' : 'false'}>
        <div className="compare-scroll">
          <table className="compare-table" aria-label="Plan comparison">
            <thead>
              <tr>
                <th className="compare-feat" style={{ minWidth: '180px' }}>Feature</th>
                {PLAN_ORDER.map(planId => {
                  const plan = PLANS[planId];
                  const isCurrent = planId === currentPlan;
                  return (
                    <th key={planId} className={`compare-plan${isCurrent ? ' compare-plan--current' : ''}`}>
                      <span className="compare-plan__name">
                        {plan.name}
                        {plan.star && <span className="compare-plan__star" aria-hidden="true">⭐</span>}
                      </span>
                      <span className="compare-plan__price">${plan.price}/mo</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="compare-feat"><strong>{row.label}</strong></td>
                  {PLAN_ORDER.map(planId => {
                    const plan = PLANS[planId];
                    const isCurrent = planId === currentPlan;
                    return (
                      <td key={planId} className={`compare-cell${isCurrent ? ' compare-cell--current' : ''}`}>
                        {row.render(plan)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
