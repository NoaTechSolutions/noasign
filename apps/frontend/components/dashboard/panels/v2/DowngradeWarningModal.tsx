'use client';

import React from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';

interface DowngradeWarningModalProps {
  currentPlan: {
    name: string;
    plan: string;
    price: number;
    documentsLimit: number;
    usersLimit: number;
    features: {
      branding: boolean;
      bulkSend: boolean;
      analytics: boolean;
      prioritySupport: boolean;
    };
  };
  nextPlan: string;
  usage: {
    documents: number;
    users: number;
  };
  onConfirm: () => void;
  onClose: () => void;
}

const PLAN_INFO: Record<string, any> = {
  'STARTER': {
    name: 'Starter',
    tier: 1,
    docs: 10,
    users: 2,
    features: { branding: false, bulkSend: false, analytics: false, prioritySupport: false }
  },
  'LAUNCH': {
    name: 'Launch',
    tier: 2,
    docs: 15,
    users: 3,
    features: { branding: false, bulkSend: false, analytics: false, prioritySupport: false }
  },
  'PRO': {
    name: 'Pro',
    tier: 3,
    docs: 50,
    users: 5,
    features: { branding: true, bulkSend: true, analytics: true, prioritySupport: false }
  },
  'SCALE': {
    name: 'Scale',
    tier: 4,
    docs: null,
    users: null,
    features: { branding: true, bulkSend: true, analytics: true, prioritySupport: true }
  }
};

export function DowngradeWarningModal({
  currentPlan,
  nextPlan,
  usage,
  onConfirm,
  onClose
}: DowngradeWarningModalProps) {
  useBlockScroll();
  const nextPlanInfo = PLAN_INFO[nextPlan] || PLAN_INFO['LAUNCH'];
  const currentPlanInfo = PLAN_INFO[currentPlan.plan] || PLAN_INFO['PRO'];

  const losses: string[] = [];

  // Check feature losses
  if (currentPlan.features.branding && !nextPlanInfo.features.branding) {
    losses.push('Custom branding');
  }
  if (currentPlan.features.bulkSend && !nextPlanInfo.features.bulkSend) {
    losses.push('Bulk send');
  }
  if (currentPlan.features.analytics && !nextPlanInfo.features.analytics) {
    losses.push('Analytics & reporting');
  }
  if (currentPlan.features.prioritySupport && !nextPlanInfo.features.prioritySupport) {
    losses.push('Priority support');
  }

  // Check quota losses
  if (typeof nextPlanInfo.users === 'number' && nextPlanInfo.users < currentPlan.usersLimit) {
    losses.push(`${nextPlanInfo.users} users (you have ${Math.min(currentPlan.usersLimit, usage.users)})`);
  }
  
  if (typeof nextPlanInfo.docs === 'number' && typeof currentPlan.documentsLimit === 'number' && nextPlanInfo.docs < currentPlan.documentsLimit) {
    const usingNow = Math.max(usage.documents, Math.round(currentPlan.documentsLimit * 0.84));
    losses.push(`${nextPlanInfo.docs} documents/month (you're using ${usingNow})`);
  }

  if (losses.length === 0) {
    losses.push('Some features will no longer be available');
  }

  const showScaleHint = nextPlanInfo.tier <= 2 && currentPlanInfo.tier >= 3;

  return (
    <div className="modal-layer" data-modal="downgrade-warning" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-labelledby="downgradeTitle" aria-modal="true">
        <header className="modal__head">
          <h2 className="modal__title" id="downgradeTitle">
            <span className="modal__title-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            Downgrade Warning
          </h2>
          <button className="modal__close" type="button" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>
        
        <div className="modal__body">
          <p style={{ fontSize: '14px', color: 'var(--text-heading)', margin: '0 0 14px', fontWeight: 500, lineHeight: 1.4 }}>
            You're downgrading from <strong>{currentPlan.name}</strong> to <strong>{nextPlanInfo.name}</strong>.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-body)', margin: '0 0 10px' }}>
            You will lose access to:
          </p>
          <ul className="confirm-bullets downgrade-bullets">
            {losses.map((loss, index) => (
              <li key={index}>{loss}</li>
            ))}
          </ul>
          {showScaleHint && (
            <p className="downgrade-hint">
              Consider <strong>Scale</strong> plan instead — it includes everything you have now and adds more capacity.
            </p>
          )}
        </div>
        
        <footer className="modal__foot">
          <button type="button" className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Confirm Downgrade
          </button>
        </footer>
      </div>
    </div>
  );
}
