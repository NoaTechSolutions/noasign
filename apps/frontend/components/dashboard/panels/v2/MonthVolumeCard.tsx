import React from 'react';
import { FileText, Receipt } from 'lucide-react';

interface MonthVolumeCardProps {
  entity: 'document' | 'receipt';
  used: number;
  // null = unlimited (unlimited document plans and all receipts). Receipts always
  // pass null since they have no monthly quota.
  limit: number | null;
  isLoading: boolean;
  // Placeholder for the future "buy more documents" packages popup. Visible now,
  // no-op until that task lands.
  onNeedMore?: () => void;
}

/**
 * Row-2 left card — monthly volume. For a limited document plan it shows
 * used / limit + a quota bar + "X left" + a "Need more?" link. For unlimited
 * document plans and for receipts (no quota) it shows just the volume number.
 */
export function MonthVolumeCard({ entity, used, limit, isLoading, onNeedMore }: MonthVolumeCardProps) {
  const isReceipt = entity === 'receipt';
  const label = isReceipt ? 'Receipts this month' : 'Documents this month';
  const Icon = isReceipt ? Receipt : FileText;
  const unlimited = limit === null;

  // Receipts, or unlimited document plans: volume only, no quota bar / "Need more?".
  if (isReceipt || unlimited) {
    return (
      <div className="ov-card ov-volume">
        <span className="ov-card__label"><Icon size={15} /> {label}</span>
        <span className="ov-card__value">{isLoading ? '—' : used}</span>
        <span className="ov-card__foot">
          {isReceipt ? 'Unlimited — issue as many as you need' : 'Unlimited on your plan'}
        </span>
      </div>
    );
  }

  // Limited document plan: used / limit + progress bar + "X left" + Need more link.
  const cap = limit ?? 0;
  const remaining = Math.max(0, cap - used);
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const fillMod = pct >= 100 ? ' ov-bar__fill--danger' : pct >= 80 ? ' ov-bar__fill--warning' : '';

  return (
    <div className="ov-card ov-volume">
      <span className="ov-card__label"><Icon size={15} /> {label}</span>
      <span className="ov-card__value">
        {isLoading ? '—' : used}
        <span className="ov-card__value-sub"> / {cap}</span>
      </span>
      <div
        className="ov-bar"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={cap}
      >
        <div className={`ov-bar__fill${fillMod}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="ov-volume__foot-row">
        <span className="ov-card__foot">
          {remaining === 0
            ? 'No documents left this month'
            : `${remaining} document${remaining === 1 ? '' : 's'} left`}
        </span>
        <button type="button" className="ov-need-more" onClick={onNeedMore}>
          Need more? →
        </button>
      </div>
    </div>
  );
}
