'use client';

import React, { useState } from 'react';
import { User as UserIcon, Building2, Check } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';

interface TypeSelectorModalProps {
  onSelect: (type: 'PERSONAL' | 'BUSINESS') => void;
  onClose: () => void;
}

export function TypeSelectorModal({ onSelect, onClose }: TypeSelectorModalProps) {
  useBlockScroll();
  const [selected, setSelected] = useState<'PERSONAL' | 'BUSINESS' | null>(null);

  const handleContinue = () => {
    if (selected) onSelect(selected);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>New client</h2>
            <p className="type-selector-subtitle">Select the type of client you want to add</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <button
            type="button"
            role="radio"
            aria-checked={selected === 'PERSONAL'}
            className={`type-selector-card${selected === 'PERSONAL' ? ' type-selector-card--active' : ''}`}
            onClick={() => setSelected('PERSONAL')}
          >
            <span className="type-selector-card__icon"><UserIcon size={18} /></span>
            <span className="type-selector-card__text">
              <span className="type-selector-card__title">Individual</span>
              <span className="type-selector-card__desc">A person — contractor, freelancer or private client</span>
            </span>
            <span className="type-selector-card__check"><Check size={12} strokeWidth={3} /></span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={selected === 'BUSINESS'}
            className={`type-selector-card${selected === 'BUSINESS' ? ' type-selector-card--active' : ''}`}
            onClick={() => setSelected('BUSINESS')}
          >
            <span className="type-selector-card__icon"><Building2 size={18} /></span>
            <span className="type-selector-card__text">
              <span className="type-selector-card__title">Business</span>
              <span className="type-selector-card__desc">A company, LLC or any registered business entity</span>
            </span>
            <span className="type-selector-card__check"><Check size={12} strokeWidth={3} /></span>
          </button>
        </div>

        <div className="modal-footer modal-footer--single">
          <button
            type="button"
            className="btn-primary type-selector-continue"
            onClick={handleContinue}
            disabled={!selected}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
