'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';

interface ChangePlanModalProps {
  currentPlan: string;
  onSelectPlan: (planId: string) => void;
  onClose: () => void;
}

const PLANS = {
  STARTER: { id: 'STARTER', name: 'Starter', price: 19, docs: 10, users: 2, templates: 5, overage: 5.00, star: false },
  LAUNCH: { id: 'LAUNCH', name: 'Launch', price: 39, docs: 15, users: 3, templates: 8, overage: 3.50, star: false },
  PRO: { id: 'PRO', name: 'Pro', price: 89, docs: 50, users: 5, templates: null, overage: 2.50, star: true },
  SCALE: { id: 'SCALE', name: 'Scale', price: 229, docs: null, users: null, templates: null, overage: 0, star: true }
};

const PLAN_ORDER = ['STARTER', 'LAUNCH', 'PRO', 'SCALE'] as const;

export function ChangePlanModal({ currentPlan, onSelectPlan, onClose }: ChangePlanModalProps) {
  useBlockScroll();
  const gridRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(PLAN_ORDER.length - 1, currentIndex + 1));
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="modal-layer" data-modal="change-plan" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--change-plan" role="dialog" aria-labelledby="changePlanTitle" aria-modal="true">
        <header className="modal__head">
          <h2 className="modal__title" id="changePlanTitle">Choose Your Plan</h2>
          <button className="modal__close" type="button" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>
        
        <div className="modal__body">
          <div className="plan-carousel">
            <div className="plan-grid" ref={gridRef} role="region" aria-label="Available plans" tabIndex={0}>
              {PLAN_ORDER.map((planId) => {
                const plan = PLANS[planId];
                const isCurrent = planId === currentPlan;
                return (
                  <div
                    key={planId}
                    className={`plan-card${isCurrent ? ' plan-card--current' : ''}`}
                    onClick={() => !isCurrent && onSelectPlan(planId)}
                    style={{ cursor: isCurrent ? 'default' : 'pointer' }}
                  >
                    {isCurrent && (
                      <span className="plan-card__badge">Current Plan</span>
                    )}
                    <h3 className="plan-card__name">
                      {plan.name}
                      {plan.star && <span className="plan-card__star">⭐</span>}
                    </h3>
                    <p className="plan-card__price">
                      <strong>${plan.price}</strong>/month
                    </p>
                    <ul className="plan-card__features">
                      <li>
                        <strong>{plan.docs === null ? 'Unlimited' : plan.docs}</strong> documents/mo
                      </li>
                      <li>
                        <strong>{plan.users === null ? 'Unlimited' : plan.users}</strong> users
                      </li>
                      <li>
                        <strong>{plan.templates === null ? 'Unlimited' : plan.templates}</strong> templates
                      </li>
                      {plan.overage > 0 && (
                        <li className="plan-card__overage">
                          ${plan.overage.toFixed(2)}/doc overage
                        </li>
                      )}
                      {plan.overage === 0 && (
                        <li className="plan-card__overage">
                          No overage charges
                        </li>
                      )}
                    </ul>
                    {!isCurrent && (
                      <button type="button" className="plan-card__btn">
                        Select Plan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="plan-carousel-controls">
            <button
              type="button"
              className="plan-carousel-arrow"
              onClick={handlePrev}
              aria-label="Previous plan"
              disabled={currentIndex === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            
            <div className="plan-carousel-dots" role="tablist" aria-label="Select a plan">
              {PLAN_ORDER.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`plan-carousel-dot${index === currentIndex ? ' plan-carousel-dot--active' : ''}`}
                  onClick={() => handleDotClick(index)}
                  aria-label={`Plan ${index + 1}`}
                  role="tab"
                />
              ))}
            </div>
            
            <button
              type="button"
              className="plan-carousel-arrow"
              onClick={handleNext}
              aria-label="Next plan"
              disabled={currentIndex === PLAN_ORDER.length - 1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="modal__info">
          <span className="modal__info-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </span>
          <span>Changes take effect immediately. You'll be charged the prorated amount for the remainder of this billing cycle.</span>
        </div>
      </div>
    </div>
  );
}
