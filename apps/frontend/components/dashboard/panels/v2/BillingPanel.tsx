'use client';

import React, { useState } from 'react';
import { TopCardsSection } from './TopCardsSection';
import { MonthlyUsageSection } from './MonthlyUsageSection';
import { PlanFeaturesSection } from './PlanFeaturesSection';
import { OverageAlert } from './OverageAlert';
import { ChangePlanModal } from './ChangePlanModal';
import { ConfirmChangeModal } from './ConfirmChangeModal';
import { DowngradeWarningModal } from './DowngradeWarningModal';
import './billing-panel.css';

interface BillingPanelProps {
  currentPlan: {
    name: string;
    plan: string;
    price: number;
    documentsLimit: number;
    usersLimit: number;
    templatesLimit: number | null;
    overageRate: number;
    features: {
      userManagement: boolean;
      multiSigner: boolean;
      branding: boolean;
      bulkSend: boolean;
      analytics: boolean;
      prioritySupport: boolean;
      retention: string;
    };
  };
  cycle: {
    month: string;
    nextBilling: string;
    periodStart: string;
    periodEnd: string;
  };
  usage: {
    documents: number;
    users: number;
    templates: number;
    overageCount: number;
  };
  role: 'master' | 'admin' | 'user';
  isLoading?: boolean;
}

export function BillingPanel({ currentPlan, cycle, usage, role, isLoading }: BillingPanelProps) {
  const [activeModal, setActiveModal] = useState<'change-plan' | 'confirm-change' | 'downgrade-warning' | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const handleChangePlan = () => {
    setActiveModal('change-plan');
  };

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlan.plan) return;

    setPendingPlan(planId);

    const planTiers: Record<string, number> = {
      STARTER: 1, LAUNCH: 2, PRO: 3, SCALE: 4,
    };

    const currentTier = planTiers[currentPlan.plan] || 2;
    const nextTier = planTiers[planId] || 2;

    setActiveModal(null);
    setTimeout(() => {
      setActiveModal(nextTier < currentTier ? 'downgrade-warning' : 'confirm-change');
    }, 80);
  };

  const handleConfirmChange = () => {
    setActiveModal(null);
    setPendingPlan(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    if (activeModal === 'change-plan') {
      setPendingPlan(null);
    }
  };

  const hasOverage = usage.overageCount > 0;

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="billing-panel">
        <header className="panel-head">
          <div className="panel-head__main">
            <div
              className="skeleton-pulse skeleton-line"
              style={{ width: '110px', height: '24px' }}
              aria-hidden="true"
            />
          </div>
        </header>

        {/* Top 2 cards */}
        <div className="billing-top-grid">
          {/* Card 1 skeleton — Current Plan */}
          <div className="bill-card2">
            <div className="bill-card2__head">
              <div className="skeleton-pulse skeleton-line" style={{ width: '90px', height: '12px' }} />
            </div>
            <div className="skeleton-pulse skeleton-line" style={{ width: '120px', height: '26px', marginTop: '14px' }} />
            <div className="skeleton-pulse skeleton-line" style={{ width: '80px', height: '14px', marginTop: '8px' }} />
            <div className="billing-stat-boxes" style={{ marginTop: '16px' }}>
              {[0, 1].map((i) => (
                <div key={i} className="billing-stat-box" style={{ gap: '8px' }}>
                  <div className="skeleton-pulse skeleton-line" style={{ width: '60px', height: '10px' }} />
                  <div className="skeleton-pulse skeleton-line" style={{ width: '80px', height: '16px' }} />
                  <div className="skeleton-pulse" style={{ width: '100%', height: '5px', borderRadius: '99px' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 skeleton — Billing Cycle */}
          <div className="bill-card2">
            <div className="bill-card2__head">
              <div className="skeleton-pulse skeleton-line" style={{ width: '100px', height: '12px' }} />
            </div>
            <div className="billing-cycle-grid" style={{ marginTop: '16px' }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="billing-cycle-cell" style={{ gap: '8px' }}>
                  <div className="skeleton-pulse skeleton-line" style={{ width: '70px', height: '10px' }} />
                  <div className="skeleton-pulse skeleton-line" style={{ width: '90px', height: '16px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Usage skeleton */}
        <div className="billing-usage-card" style={{ marginBottom: '16px' }}>
          <div className="billing-usage-card__head">
            <div className="skeleton-pulse skeleton-line" style={{ width: '120px', height: '13px' }} />
            <div className="skeleton-pulse skeleton-line" style={{ width: '70px', height: '20px', borderRadius: '99px' }} />
          </div>
          <div className="billing-usage-card__body">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="skeleton-pulse skeleton-line" style={{ width: '80px', height: '11px' }} />
                <div className="skeleton-pulse skeleton-line" style={{ width: '140px', height: '17px' }} />
                <div className="skeleton-pulse" style={{ width: '100%', height: '5px', borderRadius: '3px' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Plan Features skeleton */}
        <div className="billing-features-card">
          <div className="billing-features-card__head">
            <div className="skeleton-pulse skeleton-line" style={{ width: '150px', height: '13px' }} />
            <div className="skeleton-pulse skeleton-line" style={{ width: '100px', height: '11px' }} />
          </div>
          <div className="billing-features-card__body">
            <div className="billing-features-card__col">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="skeleton-pulse skeleton-line" style={{ width: '70px', height: '10px' }} />
                  <div className="skeleton-pulse skeleton-line" style={{ width: '90px', height: '14px' }} />
                </div>
              ))}
            </div>
            <div className="billing-features-card__divider" />
            <div className="billing-features-card__col">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-pulse skeleton-line" style={{ width: '130px', height: '14px' }} />
              ))}
            </div>
          </div>
          <div className="billing-features-card__foot">
            <div className="skeleton-pulse skeleton-line" style={{ width: '120px', height: '12px' }} />
            <div className="skeleton-pulse skeleton-line" style={{ width: '130px', height: '30px', borderRadius: '8px' }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="billing-panel">
      <header className="panel-head">
        <div className="panel-head__main">
          {/* GLOBAL RULE: panel headers have title only — NO subtitles. */}
          <h1 className="panel-head__title">Billing</h1>
        </div>
      </header>

      {hasOverage && (
        <OverageAlert
          overageCount={usage.overageCount}
          overageRate={currentPlan.overageRate}
          nextBilling={cycle.nextBilling}
          role={role}
          onUpgrade={handleChangePlan}
        />
      )}

      <TopCardsSection
        currentPlan={currentPlan}
        cycle={cycle}
        usage={usage}
        role={role}
        onChangePlan={handleChangePlan}
      />

      <MonthlyUsageSection
        usage={usage}
        limits={{
          documents: currentPlan.documentsLimit,
          users: currentPlan.usersLimit,
          templates: currentPlan.templatesLimit,
        }}
        cycleMonth={cycle.month}
        overageRate={currentPlan.overageRate}
      />

      <PlanFeaturesSection
        planName={currentPlan.name}
        planPrice={currentPlan.price}
        limits={{
          documents: currentPlan.documentsLimit,
          users: currentPlan.usersLimit,
          templates: currentPlan.templatesLimit,
        }}
        features={currentPlan.features}
        overageRate={currentPlan.overageRate}
        onCompare={handleChangePlan}
      />

      {activeModal === 'change-plan' && (
        <ChangePlanModal
          currentPlan={currentPlan.plan}
          onSelectPlan={handleSelectPlan}
          onClose={closeModal}
        />
      )}

      {activeModal === 'confirm-change' && pendingPlan && (
        <ConfirmChangeModal
          currentPlan={currentPlan}
          nextPlan={pendingPlan}
          nextBilling={cycle.nextBilling}
          onConfirm={handleConfirmChange}
          onClose={closeModal}
        />
      )}

      {activeModal === 'downgrade-warning' && pendingPlan && (
        <DowngradeWarningModal
          currentPlan={currentPlan}
          nextPlan={pendingPlan}
          usage={usage}
          onConfirm={handleConfirmChange}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
