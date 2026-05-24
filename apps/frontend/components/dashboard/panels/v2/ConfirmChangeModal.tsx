'use client';

import React from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';

interface ConfirmChangeModalProps {
  currentPlan: {
    name: string;
    price: number;
  };
  nextPlan: string;
  nextBilling: string;
  onConfirm: () => void;
  onClose: () => void;
}

const PLAN_PRICES: Record<string, { name: string; price: number }> = {
  'STARTER': { name: 'Starter', price: 19 },
  'LAUNCH': { name: 'Launch', price: 39 },
  'PRO': { name: 'Pro', price: 89 },
  'SCALE': { name: 'Scale', price: 229 }
};

export function ConfirmChangeModal({ currentPlan, nextPlan, nextBilling, onConfirm, onClose }: ConfirmChangeModalProps) {
  useBlockScroll();
  const nextPlanInfo = PLAN_PRICES[nextPlan] || PLAN_PRICES['PRO'];
  
  // Mock prorated calculation (in real app this would come from backend)
  const diff = Math.max(0, nextPlanInfo.price - currentPlan.price);
  const prorated = (diff * 0.65).toFixed(2);

  return (
    <div className="modal-layer" data-modal="confirm-change" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-labelledby="confirmChangeTitle" aria-modal="true">
        <header className="modal__head">
          <h2 className="modal__title" id="confirmChangeTitle">Confirm Plan Change</h2>
          <button className="modal__close" type="button" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>
        
        <div className="modal__body">
          <div className="confirm-block">
            <h3 className="confirm-block__title">
              Change from {currentPlan.name} to {nextPlanInfo.name}?
            </h3>
            <p className="confirm-block__line">
              <strong>Current:</strong> {currentPlan.name} (${currentPlan.price}/mo)
            </p>
            <p className="confirm-block__line">
              <strong>New:</strong> {nextPlanInfo.name} (${nextPlanInfo.price}/mo)
            </p>
          </div>
          
          <ul className="confirm-bullets">
            <li>Change is effective <strong>immediately</strong></li>
            <li>Prorated charge: <strong>${prorated}</strong></li>
            <li>Next full charge: <strong>{nextBilling} (${nextPlanInfo.price})</strong></li>
          </ul>
        </div>
        
        <footer className="modal__foot">
          <button type="button" className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Confirm Change
          </button>
        </footer>
      </div>
    </div>
  );
}
