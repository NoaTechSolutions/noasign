'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';

interface ChangePlanModalProps {
  currentPlan: string;
  onSelectPlan: (planId: string) => void;
  onClose: () => void;
}

// ─── Plan catalog (spec-defined values) ─────────────────────────────────────

const PLAN_ORDER = ['STARTER', 'LAUNCH', 'PRO', 'SCALE'] as const;
type PlanId = (typeof PLAN_ORDER)[number];

const PLANS: Record<PlanId, { name: string; price: number; docs: number | null; users: number | null; templates: number | null }> = {
  STARTER: { name: 'Starter', price: 19,  docs: 5,   users: 1,    templates: 1    },
  LAUNCH:  { name: 'Launch',  price: 39,  docs: 15,  users: 2,    templates: 3    },
  PRO:     { name: 'Pro',     price: 89,  docs: 50,  users: 5,    templates: 10   },
  SCALE:   { name: 'Scale',   price: 229, docs: 150, users: 15,   templates: null },
};

const PLAN_TIERS: Record<string, number> = {
  STARTER: 1, LAUNCH: 2, PRO: 3, SCALE: 4,
};

// ─── Feature matrix (cumulative per plan) ────────────────────────────────────
// Spec-defined: each plan gets a row of booleans for 5 features.
// Features: Team management, Multi-signer, Auto reminders, Custom branding, Analytics

type FeatureKey = 'teamManagement' | 'multiSigner' | 'autoReminders' | 'customBranding' | 'analytics';

const FEATURE_LABELS: Record<FeatureKey, string> = {
  teamManagement: 'Team management',
  multiSigner:    'Multi-signer',
  autoReminders:  'Auto reminders',
  customBranding: 'Custom branding',
  analytics:      'Analytics',
};

const PLAN_FEATURES: Record<PlanId, Record<FeatureKey, boolean>> = {
  STARTER: { teamManagement: false, multiSigner: false, autoReminders: true,  customBranding: false, analytics: false },
  LAUNCH:  { teamManagement: true,  multiSigner: true,  autoReminders: true,  customBranding: false, analytics: false },
  PRO:     { teamManagement: true,  multiSigner: true,  autoReminders: true,  customBranding: true,  analytics: true  },
  SCALE:   { teamManagement: true,  multiSigner: true,  autoReminders: true,  customBranding: true,  analytics: true  },
};

// ─── PlanSlide (mobile carousel card) ────────────────────────────────────────

interface PlanSlideProps {
  planId: PlanId;
  isCurrent: boolean;
  isDowngrade: boolean;
  isUpgrade: boolean;
  onSelectPlan: (planId: string) => void;
}

function PlanSlide({ planId, isCurrent, isDowngrade, isUpgrade, onSelectPlan }: PlanSlideProps) {
  const plan    = PLANS[planId];
  const features = PLAN_FEATURES[planId];

  // Usage bar max values for visual representation (the plan's own limits as 100%)
  const MAX_DOCS      = 150;
  const MAX_USERS     = 15;
  const MAX_TEMPLATES = 10;

  const docsPct      = plan.docs      === null ? 100 : Math.round((plan.docs / MAX_DOCS) * 100);
  const usersPct     = plan.users     === null ? 100 : Math.round((plan.users / MAX_USERS) * 100);
  const templatesPct = plan.templates === null ? 100 : Math.round((plan.templates / MAX_TEMPLATES) * 100);

  return (
    <div className="plan-carousel__slide">
      <div className={`plan-slide${isCurrent ? ' plan-slide--current' : ''}`}>
        {/* Current plan badge */}
        {isCurrent && (
          <div className="plan-slide__current-badge">✓ Current plan</div>
        )}

        {/* Plan name + price */}
        <div className="plan-slide__head">
          <span className="plan-slide__name">{plan.name}</span>
          <span className="plan-slide__price">${plan.price}/mo</span>
        </div>

        {/* Usage bars */}
        <div className="plan-slide__bars">
          <div className="plan-slide__bar-row">
            <div className="plan-slide__bar-labels">
              <span className="plan-slide__bar-label">Documents</span>
              <span className="plan-slide__bar-value">
                {plan.docs === null ? '∞' : plan.docs}/mo
              </span>
            </div>
            <div className="plan-slide__bar-track">
              <div className="plan-slide__bar-fill" style={{ width: `${docsPct}%` }} />
            </div>
          </div>

          <div className="plan-slide__bar-row">
            <div className="plan-slide__bar-labels">
              <span className="plan-slide__bar-label">Users</span>
              <span className="plan-slide__bar-value">
                {plan.users === null ? '∞' : plan.users} seats
              </span>
            </div>
            <div className="plan-slide__bar-track">
              <div className="plan-slide__bar-fill" style={{ width: `${usersPct}%` }} />
            </div>
          </div>

          <div className="plan-slide__bar-row">
            <div className="plan-slide__bar-labels">
              <span className="plan-slide__bar-label">Templates</span>
              <span className="plan-slide__bar-value">
                {plan.templates === null ? '∞' : plan.templates} active
              </span>
            </div>
            <div className="plan-slide__bar-track">
              <div className="plan-slide__bar-fill" style={{ width: `${templatesPct}%` }} />
            </div>
          </div>
        </div>

        {/* Feature matrix */}
        <div className="plan-slide__features">
          {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((key) => (
            <div key={key} className="plan-slide__feature-row">
              {features[key] ? (
                <Check size={13} className="plan-slide__feat-icon plan-slide__feat-icon--ok" />
              ) : (
                <XIcon size={13} className="plan-slide__feat-icon plan-slide__feat-icon--no" />
              )}
              <span className="plan-slide__feature-label">{FEATURE_LABELS[key]}</span>
            </div>
          ))}
        </div>

        {/* Action button */}
        {isCurrent ? (
          <button
            type="button"
            className="plan-slide__btn plan-slide__btn--current"
            disabled
          >
            Current plan
          </button>
        ) : isDowngrade ? (
          <button
            type="button"
            className="plan-slide__btn plan-slide__btn--downgrade"
            onClick={() => onSelectPlan(planId)}
          >
            Downgrade
          </button>
        ) : isUpgrade ? (
          <button
            type="button"
            className="plan-slide__btn plan-slide__btn--upgrade"
            onClick={() => onSelectPlan(planId)}
          >
            Upgrade ↗
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChangePlanModal({ currentPlan, onSelectPlan, onClose }: ChangePlanModalProps) {
  useBlockScroll(true);

  const currentTier = PLAN_TIERS[currentPlan] ?? 0;

  // ── Mobile carousel state ─────────────────────────────────────────────────
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartX = useRef<number>(0);

  // Snap to current plan on mount/open
  useEffect(() => {
    const idx = PLAN_ORDER.findIndex(
      (p) => p === currentPlan.toUpperCase()
    );
    setActiveSlide(idx >= 0 ? idx : 0);
  }, [currentPlan]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // swipe left → next
        setActiveSlide((prev) => Math.min(PLAN_ORDER.length - 1, prev + 1));
      } else {
        // swipe right → prev
        setActiveSlide((prev) => Math.max(0, prev - 1));
      }
    }
  }

  const prevPlanName = activeSlide > 0 ? PLANS[PLAN_ORDER[activeSlide - 1]].name : null;
  const nextPlanName = activeSlide < PLAN_ORDER.length - 1 ? PLANS[PLAN_ORDER[activeSlide + 1]].name : null;

  return (
    <div
      className="modal-layer"
      data-modal="change-plan"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal modal--change-plan"
        role="dialog"
        aria-labelledby="changePlanTitle"
        aria-modal="true"
      >
        {/* Drag handle — mobile only */}
        <div className="sheet-handle" />

        {/* header */}
        <header className="modal__head">
          <div className="modal__head-inner">
            <h2 className="modal__title" id="changePlanTitle">Change plan</h2>
            {/* Mobile subtitle — only allowed inside the sheet design */}
            <p className="modal__subtitle--mobile">Save ~17% annually</p>
          </div>
          <button
            className="modal__close"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* ── DESKTOP/TABLET: 4-card grid (unchanged) ── */}
        <div className="modal__body change-plan-grid-wrapper">
          <div className="change-plan-grid">
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId];
              const isCurrent  = planId === currentPlan.toUpperCase();
              const planTier   = PLAN_TIERS[planId];
              const isDowngrade = !isCurrent && planTier < currentTier;
              const isUpgrade   = !isCurrent && planTier > currentTier;

              return (
                <div
                  key={planId}
                  className={`change-plan-card${isCurrent ? ' change-plan-card--current' : ''}`}
                >
                  {isCurrent && (
                    <span className="change-plan-card__current-badge">Current</span>
                  )}

                  <h3 className="change-plan-card__name">{plan.name}</h3>
                  <p className="change-plan-card__price">
                    <strong>${plan.price}</strong>/mo
                  </p>

                  <ul className="change-plan-card__features">
                    <li>
                      <strong>{plan.docs === null ? '∞' : plan.docs}</strong> docs/mo
                    </li>
                    <li>
                      <strong>{plan.users === null ? '∞' : plan.users}</strong> user{plan.users !== 1 ? 's' : ''}
                    </li>
                    <li>
                      <strong>{plan.templates === null ? '∞' : plan.templates}</strong> template{plan.templates !== 1 ? 's' : ''}
                    </li>
                  </ul>

                  {isCurrent ? (
                    <button
                      type="button"
                      className="change-plan-card__btn change-plan-card__btn--current"
                      disabled
                    >
                      Current plan
                    </button>
                  ) : isDowngrade ? (
                    <button
                      type="button"
                      className="change-plan-card__btn change-plan-card__btn--downgrade"
                      onClick={() => onSelectPlan(planId)}
                    >
                      Downgrade
                    </button>
                  ) : isUpgrade ? (
                    <button
                      type="button"
                      className="change-plan-card__btn change-plan-card__btn--upgrade"
                      onClick={() => onSelectPlan(planId)}
                    >
                      Upgrade ↗
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── MOBILE: carousel ── */}
        <div
          className="plan-carousel-wrapper"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Dot indicators */}
          <div className="plan-dots" role="tablist" aria-label="Plan slides">
            {PLAN_ORDER.map((planId, idx) => (
              <button
                key={planId}
                type="button"
                role="tab"
                aria-selected={idx === activeSlide}
                aria-label={PLANS[planId].name}
                className={`plan-dot${idx === activeSlide ? ' plan-dot--active' : ''}`}
                onClick={() => setActiveSlide(idx)}
              />
            ))}
          </div>

          {/* Slides track */}
          <div className="plan-carousel">
            <div
              className="plan-carousel__track"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {PLAN_ORDER.map((planId) => {
                const isCurrent   = planId === currentPlan.toUpperCase();
                const planTier    = PLAN_TIERS[planId];
                const isDowngrade = !isCurrent && planTier < currentTier;
                const isUpgrade   = !isCurrent && planTier > currentTier;

                return (
                  <PlanSlide
                    key={planId}
                    planId={planId}
                    isCurrent={isCurrent}
                    isDowngrade={isDowngrade}
                    isUpgrade={isUpgrade}
                    onSelectPlan={onSelectPlan}
                  />
                );
              })}
            </div>
          </div>

          {/* Nav row */}
          <div className="plan-nav">
            <button
              type="button"
              className="plan-nav__btn plan-nav__btn--prev"
              onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
              disabled={activeSlide === 0}
              aria-label="Previous plan"
            >
              ← {prevPlanName ?? ''}
            </button>

            <span className="plan-nav__counter">
              {activeSlide + 1} of {PLAN_ORDER.length}
            </span>

            <button
              type="button"
              className="plan-nav__btn plan-nav__btn--next"
              onClick={() => setActiveSlide((prev) => Math.min(PLAN_ORDER.length - 1, prev + 1))}
              disabled={activeSlide === PLAN_ORDER.length - 1}
              aria-label="Next plan"
            >
              {nextPlanName ?? ''} →
            </button>
          </div>
        </div>

        {/* footer note */}
        <div className="change-plan-footer-note">
          Save ~17% with annual billing · Changes take effect immediately
        </div>
      </div>
    </div>
  );
}
