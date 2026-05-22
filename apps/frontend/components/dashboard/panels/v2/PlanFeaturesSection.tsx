'use client';

import React from 'react';

interface PlanFeaturesSectionProps {
  planName: string;
  planPrice: number;
  limits: {
    documents: number;
    users: number;
    templates: number | null;
  };
  features: {
    userManagement: boolean;
    multiSigner: boolean;
    branding: boolean;
    bulkSend: boolean;
    analytics: boolean;
    prioritySupport: boolean;
    retention: string;
  };
}

export function PlanFeaturesSection({ planName, planPrice, limits, features }: PlanFeaturesSectionProps) {
  const CheckIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );

  const XIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );

  const included = [
    { text: <><strong>{limits.documents}</strong> documents per month</>, ok: true },
    { text: <><strong>{limits.users}</strong> team users</>, ok: true },
    { text: <><strong>{limits.templates === null ? 'Unlimited' : limits.templates}</strong> active templates</>, ok: true },
    { text: 'User management', ok: features.userManagement },
    { text: 'Multi-signer / sequential signing', ok: features.multiSigner },
    { text: 'Automatic reminders', ok: true },
    { text: 'Document expiration', ok: true },
    { text: `${features.retention} document retention`, ok: true }
  ].filter(f => f.ok);

  const notIncluded = [
    { text: 'Custom branding', ok: features.branding, hint: 'available in Pro' },
    { text: 'Bulk send', ok: features.bulkSend, hint: 'available in Pro' },
    { text: 'Analytics & reporting', ok: features.analytics, hint: 'available in Pro' }
  ];

  return (
    <div className="bill-section">
      <div className="bill-section__head">
        <h2 className="bill-section__title">Plan Features</h2>
        <span style={{ fontSize: '11.5px', color: 'var(--text-label)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {planName} · ${planPrice}/mo
        </span>
      </div>
      <div className="bill-section__body">
        <ul className="features-list">
          {included.map((item, index) => (
            <li key={index} className="features-list__item features-list__item--ok">
              <span className="features-list__icon" aria-hidden="true">
                <CheckIcon />
              </span>
              <span>{item.text}</span>
            </li>
          ))}
          {notIncluded.map((item, index) => (
            <li key={`not-${index}`} className={`features-list__item ${item.ok ? 'features-list__item--ok' : 'features-list__item--miss'}`}>
              <span className="features-list__icon" aria-hidden="true">
                {item.ok ? <CheckIcon /> : <XIcon />}
              </span>
              <span>
                {item.text}
                {!item.ok && <span className="features-list__hint">{item.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
