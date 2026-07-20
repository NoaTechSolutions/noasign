'use client';

import React, { useEffect } from 'react';
import { Receipt, FileText, FileSignature } from 'lucide-react';
import './month-breakdown-modal.css';

interface MonthlyCounts {
  receipts: number;
  invoices: number;
  total: number;
}

interface TypeCounts {
  receipts: number;
  invoices: number;
  documents: number;
  total: number;
}

interface MonthBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Overview "this month" mode: pass `monthly` (title/subtitle default to the
  // current month). Documents "totals by type" mode: pass `counts` + title.
  monthly?: MonthlyCounts | null;
  counts?: TypeCounts | null;
  title?: string;
  subtitle?: string;
  // Tipo DOCUMENTO → include the signature Documents line in the breakdown.
  showDocuments?: boolean;
}

/**
 * Type breakdown popup, reused by two callers (each with its own numbers):
 *  - Overview → "Receipts this month" card: THIS-MONTH counts (`monthly`).
 *  - Documents → "Total" status pill: ALL-TIME totals (`counts`).
 * Both show Receipts + Invoices (+ Documents for tipo-documento) and a Total.
 * Reuses the shared overlay (.coming-soon-overlay → global backdrop blur).
 */
export function MonthBreakdownModal({
  isOpen,
  onClose,
  monthly,
  counts,
  title,
  subtitle,
  showDocuments = false,
}: MonthBreakdownModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Prefer explicit totals (`counts`); otherwise fall back to the month counts
  // (which carry no signature Documents figure — that line stays at 0/hidden).
  const data: TypeCounts = counts ?? {
    receipts: monthly?.receipts ?? 0,
    invoices: monthly?.invoices ?? 0,
    documents: 0,
    total: monthly?.total ?? 0,
  };

  const heading = title ?? 'This month by type';
  const sub =
    subtitle ??
    new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const rows = [
    { key: 'receipts', label: 'Receipts', value: data.receipts, icon: <Receipt size={16} />, tone: 'green' },
    { key: 'invoices', label: 'Invoices', value: data.invoices, icon: <FileText size={16} />, tone: 'blue' },
  ];
  if (showDocuments) {
    rows.push({
      key: 'documents',
      label: 'Documents',
      value: data.documents,
      icon: <FileSignature size={16} />,
      tone: 'amber',
    });
  }

  return (
    <div className="coming-soon-overlay" onClick={onClose}>
      <div
        className="month-breakdown-modal"
        role="dialog"
        aria-labelledby="month-breakdown-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="month-breakdown-modal__head">
          <h3 id="month-breakdown-title" className="month-breakdown-modal__title">
            {heading}
          </h3>
          <span className="month-breakdown-modal__sub">{sub}</span>
        </div>

        <ul className="month-breakdown-modal__list">
          {rows.map((r) => (
            <li key={r.key} className="month-breakdown-row">
              <span className={`month-breakdown-row__icon month-breakdown-row__icon--${r.tone}`}>
                {r.icon}
              </span>
              <span className="month-breakdown-row__label">{r.label}</span>
              <span className="month-breakdown-row__value">{r.value}</span>
            </li>
          ))}
          <li className="month-breakdown-row month-breakdown-row--total">
            <span className="month-breakdown-row__label">Total</span>
            <span className="month-breakdown-row__value">{data.total}</span>
          </li>
        </ul>

        <button
          type="button"
          className="month-breakdown-modal__btn"
          onClick={onClose}
          autoFocus
        >
          Close
        </button>
      </div>
    </div>
  );
}
