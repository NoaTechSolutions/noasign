'use client';

import { ChevronLeft } from 'lucide-react';

/**
 * Shared header for any bottom-sheet SUB-sheet (a sheet opened from another
 * sheet — e.g. Documents "Actions", Clients "Change status"). Renders a back
 * arrow (returns to the parent sheet) + the title. Use this in every sub-sheet
 * so the back affordance is consistent across the SaaS.
 *
 * `onBack` should close ONLY this sub-sheet (the parent stays open). The
 * overlay/close still dismisses everything — don't change that.
 */
export function SubSheetHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="card-actions-sheet__header">
      <button
        type="button"
        className="card-actions-sheet__back"
        onClick={onBack}
        aria-label="Back"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="card-actions-sheet__title">{title}</span>
    </div>
  );
}
