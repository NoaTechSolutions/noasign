'use client';

import React, { useState } from 'react';
import { TopCardsSection } from './TopCardsSection';
import { OverageAlert } from './OverageAlert';
import { MonthlyUsageSection } from './MonthlyUsageSection';
import { PlanFeaturesSection } from './PlanFeaturesSection';
import { ComparisonSection } from './ComparisonSection';
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
}

export function BillingPanel({ currentPlan, cycle, usage, role }: BillingPanelProps) {
  const [activeModal, setActiveModal] = useState<'change-plan' | 'confirm-change' | 'downgrade-warning' | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const handleChangePlan = () => {
    if (role !== 'master') {
      // Toast notification would go here
      return;
    }
    setActiveModal('change-plan');
  };

  const handleSelectPlan = (planId: string) => {
    if (role !== 'master') return;
    if (planId === currentPlan.plan) return;
    
    setPendingPlan(planId);
    
    // Determine if upgrade or downgrade
    const planTiers: Record<string, number> = {
      'STARTER': 1,
      'LAUNCH': 2,
      'PRO': 3,
      'SCALE': 4
    };
    
    const currentTier = planTiers[currentPlan.plan] || 2;
    const nextTier = planTiers[planId] || 2;
    
    setActiveModal(null);
    setTimeout(() => {
      setActiveModal(nextTier < currentTier ? 'downgrade-warning' : 'confirm-change');
    }, 80);
  };

  const handleConfirmChange = () => {
    // Here you would make the API call to change the plan
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

  return (
    <div className="billing-panel">
      <header className="panel-head">
        <div className="panel-head__main">
          <h1 className="panel-head__title">Billing</h1>
          <p className="panel-head__sub">Manage your plan, usage and renewal details.</p>
        </div>
      </header>

      <TopCardsSection
        currentPlan={currentPlan}
        cycle={cycle}
        role={role}
        onChangePlan={handleChangePlan}
      />

      {hasOverage && (
        <OverageAlert
          overageCount={usage.overageCount}
          overageRate={currentPlan.overageRate}
          nextBilling={cycle.nextBilling}
          role={role}
          onUpgrade={handleChangePlan}
        />
      )}

      <div className="billing-sections-grid">
        <MonthlyUsageSection
          usage={usage}
          limits={{
            documents: currentPlan.documentsLimit,
            users: currentPlan.usersLimit,
            templates: currentPlan.templatesLimit
          }}
          cycleMonth={cycle.month}
        />

        <PlanFeaturesSection
          planName={currentPlan.name}
          planPrice={currentPlan.price}
          limits={{
            documents: currentPlan.documentsLimit,
            users: currentPlan.usersLimit,
            templates: currentPlan.templatesLimit
          }}
          features={currentPlan.features}
        />
      </div>

      <ComparisonSection currentPlan={currentPlan.plan} />

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
