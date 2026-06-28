'use client';

import React from 'react';
import { Sparkles, Check, X, ArrowLeftRight } from 'lucide-react';
import { formatLimit } from '@/lib/plan-catalog';

interface PlanFeaturesSectionProps {
  planName: string;
  planPrice: number;
  limits: {
    documents: number | null; // null = unlimited
    users: number | null; // null = unlimited
    templates: number | null;
  };
  // Model C — receipt allowance for this plan (cupo + overage, or unlimited).
  receipts: {
    limit: number;
    unlimited: boolean;
    overagePrice: number;
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
  overageRate: number;
  onCompare: () => void;
}

export function PlanFeaturesSection({
  planName,
  planPrice,
  limits,
  receipts,
  features,
  overageRate,
  onCompare,
}: PlanFeaturesSectionProps) {
  const metrics: { label: string; value: string }[] = [
    {
      label: 'Documents/mo',
      value: formatLimit(limits.documents),
    },
    {
      label: 'Receipts/mo',
      value: receipts.unlimited ? 'Unlimited' : String(receipts.limit),
    },
    {
      label: 'Users',
      value: formatLimit(limits.users),
    },
    {
      label: 'Templates',
      value: formatLimit(limits.templates),
    },
    {
      label: 'History',
      value: features.retention,
    },
    {
      label: 'Overage',
      value: `$${overageRate.toFixed(2)}/doc`,
    },
    {
      label: 'Receipt overage',
      value: `$${receipts.overagePrice.toFixed(2)}/receipt`,
    },
  ];

  const featureRows: { label: string; enabled: boolean }[] = [
    { label: 'Team management', enabled: features.userManagement },
    { label: 'Multi-signer', enabled: features.multiSigner },
    { label: 'Auto reminders', enabled: true },
    { label: 'Custom branding', enabled: features.branding },
    { label: 'Analytics', enabled: features.analytics },
  ];

  return (
    <div className="billing-features-card">
      {/* Header */}
      <div className="billing-features-card__head">
        <span className="billing-features-card__head-left">
          <span className="billing-features-card__icon">
            <Sparkles size={15} />
          </span>
          <h2 className="billing-features-card__title">
            {planName} features
          </h2>
        </span>
        <span className="billing-features-card__subtitle">
          Everything in Starter +
        </span>
      </div>

      {/* Two-column body */}
      <div className="billing-features-card__body">
        {/* Left — metrics */}
        <div className="billing-features-card__col">
          {metrics.map((m) => (
            <div key={m.label} className="billing-feat-metric">
              <span className="billing-feat-metric__label">{m.label}</span>
              <span className="billing-feat-metric__value">{m.value}</span>
            </div>
          ))}
        </div>

        {/* Vertical separator */}
        <div className="billing-features-card__divider" aria-hidden="true" />

        {/* Right — feature toggles */}
        <div className="billing-features-card__col">
          {featureRows.map((f) => (
            <div key={f.label} className="billing-feat-row">
              {f.enabled ? (
                <span className="billing-feat-row__icon--ok">
                  <Check size={14} />
                </span>
              ) : (
                <span className="billing-feat-row__icon--no">
                  <X size={14} />
                </span>
              )}
              <span className="billing-feat-row__label">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="billing-features-card__foot">
        <span className="billing-features-card__foot-label">
          Want more features?
        </span>
        <button
          type="button"
          className="btn-compare-plans"
          onClick={onCompare}
        >
          <ArrowLeftRight size={13} />
          Compare all plans
        </button>
      </div>
    </div>
  );
}
