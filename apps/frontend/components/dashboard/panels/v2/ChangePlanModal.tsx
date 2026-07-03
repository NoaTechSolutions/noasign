'use client';

import React, { useState, useRef } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { PLAN_CATALOG } from '@/lib/plan-catalog';

interface ChangePlanModalProps {
  currentPlan: string;
  // Model C — drives the anti-downgrade rule: RECEIPTS_ONLY is only offered to
  // tenants without a contracts plan (contractsEnabled === false). Tenants that
  // already have contracts never see it (can't "downgrade" into receipts-only).
  contractsEnabled: boolean;
  onClose: () => void;
}

// ─── Plan data (derived from the shared catalog) ─────────────────────────────
// All plan numbers come from lib/plan-catalog (single source of truth). This
// modal only renders the public lineup + RECEIPTS_ONLY; the adapters below keep
// the existing render shape without re-hardcoding any values.

const MODAL_PLAN_IDS = ['STARTER', 'LAUNCH', 'PRO', 'SCALE', 'RECEIPTS_ONLY'] as const;
type PlanId = (typeof MODAL_PLAN_IDS)[number];

interface PlanInfo {
  name: string;
  price: number;
  docs: number | null;
  users: number | null;
  templates: number | null;
  receiptsOnly?: boolean;
}

const PLANS = MODAL_PLAN_IDS.reduce((acc, id) => {
  const e = PLAN_CATALOG[id];
  acc[id] = {
    name: e.name,
    price: e.price,
    docs: e.docsLimit,
    users: e.usersLimit,
    templates: e.templatesLimit,
    receiptsOnly: e.receiptsOnly,
  };
  return acc;
}, {} as Record<PlanId, PlanInfo>);

// Upgrades are not self-service yet (no billing endpoint / Stripe) — every
// non-current plan routes to a contact request instead of a fake confirmation.
const UPGRADE_EMAIL = 'support@noatechsolutions.com';
function upgradeMailto(planName: string): string {
  const subject = encodeURIComponent(`Upgrade request: ${planName} plan`);
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to upgrade my NoaSign plan to ${planName}.\n\nThanks,`,
  );
  return `mailto:${UPGRADE_EMAIL}?subject=${subject}&body=${body}`;
}

// ─── Feature matrix (cumulative per plan) ────────────────────────────────────
// The 5 features shown on the cards map onto catalog feature flags.

type FeatureKey = 'teamManagement' | 'multiSigner' | 'autoReminders' | 'customBranding' | 'analytics';

const FEATURE_LABELS: Record<FeatureKey, string> = {
  teamManagement: 'Team management',
  multiSigner:    'Multi-signer',
  autoReminders:  'Auto reminders',
  customBranding: 'Custom branding',
  analytics:      'Analytics',
};

const PLAN_FEATURES = MODAL_PLAN_IDS.reduce((acc, id) => {
  const f = PLAN_CATALOG[id].features;
  acc[id] = {
    teamManagement: f.userManagement,
    multiSigner:    f.multiSigner,
    autoReminders:  f.autoReminders,
    customBranding: f.branding,
    analytics:      f.analytics,
  };
  return acc;
}, {} as Record<PlanId, Record<FeatureKey, boolean>>);

// Receipts-only feature highlights (replaces the contract feature rows on its card).
const RECEIPTS_ONLY_HIGHLIGHTS = [
  'Unlimited receipts',
  'No monthly receipt cap',
  'Contract signing not included',
];

// Public contract plans in display order (RECEIPTS_ONLY is offered separately).
const PUBLIC_ORDER: PlanId[] = MODAL_PLAN_IDS.filter((id) => id !== 'RECEIPTS_ONLY');

// Plans offered to this tenant. Anti-downgrade: RECEIPTS_ONLY is hidden once the
// tenant has a contracts plan; it stays visible for receipts-only / no-contracts
// tenants (so their current plan still renders).
function offeredPlans(contractsEnabled: boolean): PlanId[] {
  return contractsEnabled
    ? [...PUBLIC_ORDER]
    : ['RECEIPTS_ONLY', ...PUBLIC_ORDER];
}

function priceText(plan: PlanInfo): string {
  return `$${plan.price}/mo`;
}

// ─── PlanSlide (mobile carousel card) ────────────────────────────────────────

interface PlanSlideProps {
  planId: PlanId;
  isCurrent: boolean;
}

function PlanSlide({ planId, isCurrent }: PlanSlideProps) {
  const plan     = PLANS[planId];
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
          <span className="plan-slide__price">{priceText(plan)}</span>
        </div>

        {plan.receiptsOnly ? (
          /* Receipts-only: highlight receipts instead of contract dimensions */
          <div className="plan-slide__features">
            {RECEIPTS_ONLY_HIGHLIGHTS.map((label, i) => (
              <div key={label} className="plan-slide__feature-row">
                {i < 2 ? (
                  <Check size={13} className="plan-slide__feat-icon plan-slide__feat-icon--ok" />
                ) : (
                  <XIcon size={13} className="plan-slide__feat-icon plan-slide__feat-icon--no" />
                )}
                <span className="plan-slide__feature-label">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
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
          </>
        )}

        {/* Action — current is disabled, everything else is a contact CTA */}
        {isCurrent ? (
          <button
            type="button"
            className="plan-slide__btn plan-slide__btn--current"
            disabled
          >
            Current plan
          </button>
        ) : (
          <a
            className="plan-slide__btn plan-slide__btn--upgrade"
            href={upgradeMailto(plan.name)}
          >
            Contact us to upgrade ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChangePlanModal({ currentPlan, contractsEnabled, onClose }: ChangePlanModalProps) {
  useBlockScroll(true);

  const planOrder = offeredPlans(contractsEnabled);

  // ── Mobile carousel state ─────────────────────────────────────────────────
  // Snap to the current plan on open. Props are fixed for the modal's lifetime
  // (it remounts when reopened), so a lazy initializer beats a setState effect.
  const [activeSlide, setActiveSlide] = useState(() => {
    const idx = planOrder.findIndex((p) => p === currentPlan.toUpperCase());
    return idx >= 0 ? idx : 0;
  });
  const touchStartX = useRef<number>(0);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // swipe left → next
        setActiveSlide((prev) => Math.min(planOrder.length - 1, prev + 1));
      } else {
        // swipe right → prev
        setActiveSlide((prev) => Math.max(0, prev - 1));
      }
    }
  }

  const prevPlanName = activeSlide > 0 ? PLANS[planOrder[activeSlide - 1]].name : null;
  const nextPlanName = activeSlide < planOrder.length - 1 ? PLANS[planOrder[activeSlide + 1]].name : null;

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
            <h2 className="modal__title" id="changePlanTitle">Compare plans</h2>
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

        {/* ── DESKTOP/TABLET: card grid ── */}
        <div className="modal__body change-plan-grid-wrapper">
          <div className="change-plan-grid">
            {planOrder.map((planId) => {
              const plan      = PLANS[planId];
              const isCurrent = planId === currentPlan.toUpperCase();

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
                    {plan.receiptsOnly ? (
                      <>
                        <li><strong>∞</strong> receipts/mo</li>
                        <li>Unlimited — no monthly cap</li>
                        <li>No contracts included</li>
                      </>
                    ) : (
                      <>
                        <li>
                          <strong>{plan.docs === null ? '∞' : plan.docs}</strong> docs/mo
                        </li>
                        <li>
                          <strong>{plan.users === null ? '∞' : plan.users}</strong> user{plan.users !== 1 ? 's' : ''}
                        </li>
                        <li>
                          <strong>{plan.templates === null ? '∞' : plan.templates}</strong> template{plan.templates !== 1 ? 's' : ''}
                        </li>
                      </>
                    )}
                  </ul>

                  {isCurrent ? (
                    <button
                      type="button"
                      className="change-plan-card__btn change-plan-card__btn--current"
                      disabled
                    >
                      Current plan
                    </button>
                  ) : (
                    <a
                      className="change-plan-card__btn change-plan-card__btn--upgrade"
                      href={upgradeMailto(plan.name)}
                    >
                      Contact us to upgrade ↗
                    </a>
                  )}
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
            {planOrder.map((planId, idx) => (
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
              {planOrder.map((planId) => (
                <PlanSlide
                  key={planId}
                  planId={planId}
                  isCurrent={planId === currentPlan.toUpperCase()}
                />
              ))}
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
              {activeSlide + 1} of {planOrder.length}
            </span>

            <button
              type="button"
              className="plan-nav__btn plan-nav__btn--next"
              onClick={() => setActiveSlide((prev) => Math.min(planOrder.length - 1, prev + 1))}
              disabled={activeSlide === planOrder.length - 1}
              aria-label="Next plan"
            >
              {nextPlanName ?? ''} →
            </button>
          </div>
        </div>

        {/* footer note */}
        <div className="change-plan-footer-note">
          Save ~17% with annual billing · Upgrades are handled by our team
        </div>
      </div>
    </div>
  );
}
