'use client';

import React from 'react';
import { Receipt, FileText } from 'lucide-react';
import './generated-docs-card.css';

interface GeneratedDocsCardProps {
  // Current-month counts (from receiptStats.monthlyCounts).
  receiptsThisMonth: number;
  invoicesThisMonth: number;
  isLoading?: boolean;
}

/**
 * "Generated documents · this month" card for the Documents module — replaces the
 * receipts-quota card with a two-column monthly count split: Receipts (left) and
 * Invoices (right), divided by a thin 0.5px rule. Reuses the design-system tokens.
 */
export function GeneratedDocsCard({
  receiptsThisMonth,
  invoicesThisMonth,
  isLoading = false,
}: GeneratedDocsCardProps) {
  return (
    <div className="generated-docs-card">
      <div className="generated-docs-card__head">
        <h2 className="generated-docs-card__title">Generated documents</h2>
        <span className="generated-docs-card__sub">this month</span>
      </div>

      <div className="generated-docs-card__cols">
        <div className="generated-docs-col">
          <span className="generated-docs-col__label">
            <Receipt size={15} /> Receipts
          </span>
          <span className="generated-docs-col__value">
            {isLoading ? '—' : receiptsThisMonth}
          </span>
        </div>

        <div className="generated-docs-card__divider" aria-hidden="true" />

        <div className="generated-docs-col">
          <span className="generated-docs-col__label">
            <FileText size={15} /> Invoices
          </span>
          <span className="generated-docs-col__value">
            {isLoading ? '—' : invoicesThisMonth}
          </span>
        </div>
      </div>
    </div>
  );
}
