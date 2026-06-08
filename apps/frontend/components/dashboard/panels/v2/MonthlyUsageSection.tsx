'use client';

import React from 'react';
import { BarChart2, FileText, Users, LayoutTemplate } from 'lucide-react';

interface MonthlyUsageSectionProps {
  usage: {
    documents: number;
    users: number;
    templates: number;
    overageCount: number;
  };
  limits: {
    documents: number;
    users: number;
    templates: number | null;
  };
  cycleMonth: string;
  overageRate: number;
}

export function MonthlyUsageSection({
  usage,
  limits,
  cycleMonth,
  overageRate,
}: MonthlyUsageSectionProps) {
  const docsPct =
    limits.documents > 0
      ? Math.min(100, Math.round((usage.documents / limits.documents) * 100))
      : 0;

  const usersPct =
    limits.users > 0
      ? Math.min(100, Math.round((usage.users / limits.users) * 100))
      : 0;

  const templatesPct =
    limits.templates != null && limits.templates > 0
      ? Math.min(100, Math.round((usage.templates / limits.templates) * 100))
      : 0;

  const docsRemaining = Math.max(0, limits.documents - usage.documents);

  return (
    <div className="billing-usage-card">
      {/* Header */}
      <div className="billing-usage-card__head">
        <span className="billing-usage-card__head-left">
          <span className="billing-usage-card__icon">
            <BarChart2 size={16} />
          </span>
          <h2 className="billing-usage-card__title">Monthly usage</h2>
        </span>
        <span className="billing-usage-card__month-badge">{cycleMonth}</span>
      </div>

      {/* Items */}
      <div className="billing-usage-card__body">
        {/* Documents */}
        <div className="billing-usage-item">
          <div className="billing-usage-item__top">
            <span className="billing-usage-item__icon">
              <FileText size={14} />
            </span>
            <span className="billing-usage-item__label">Documents</span>
          </div>
          <div className="billing-usage-item__mid">
            <span className="billing-usage-item__value">{usage.documents}</span>
            <span className="billing-usage-item__limit">
              / {limits.documents} included
            </span>
            <span className="billing-usage-item__badge">{docsPct}%</span>
          </div>
          <div className="billing-usage-item__bar">
            <div
              className="billing-usage-item__fill"
              style={{ width: `${docsPct}%` }}
            />
          </div>
          <p className="billing-usage-item__overage-hint">
            {docsRemaining} remaining · Overage: ${overageRate.toFixed(2)}/doc
          </p>
        </div>

        {/* Users */}
        <div className="billing-usage-item">
          <div className="billing-usage-item__top">
            <span className="billing-usage-item__icon">
              <Users size={14} />
            </span>
            <span className="billing-usage-item__label">Users</span>
          </div>
          <div className="billing-usage-item__mid">
            <span className="billing-usage-item__value">{usage.users}</span>
            <span className="billing-usage-item__limit">
              / {limits.users} seats
            </span>
            <span className="billing-usage-item__badge">{usersPct}%</span>
          </div>
          <div className="billing-usage-item__bar">
            <div
              className="billing-usage-item__fill"
              style={{ width: `${usersPct}%` }}
            />
          </div>
        </div>

        {/* Templates */}
        <div className="billing-usage-item">
          <div className="billing-usage-item__top">
            <span className="billing-usage-item__icon">
              <LayoutTemplate size={14} />
            </span>
            <span className="billing-usage-item__label">Templates</span>
          </div>
          <div className="billing-usage-item__mid">
            <span className="billing-usage-item__value">{usage.templates}</span>
            <span className="billing-usage-item__limit">
              {limits.templates == null
                ? '/ Unlimited'
                : `/ ${limits.templates} included`}
            </span>
            {limits.templates != null && (
              <span className="billing-usage-item__badge">{templatesPct}%</span>
            )}
          </div>
          {limits.templates != null && (
            <div className="billing-usage-item__bar">
              <div
                className="billing-usage-item__fill"
                style={{ width: `${templatesPct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
