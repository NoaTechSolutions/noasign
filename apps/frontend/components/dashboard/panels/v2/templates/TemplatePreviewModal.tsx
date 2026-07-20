'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { API_URL } from '@/lib/api';
import type { TemplateCatalogItem } from './types';

interface TemplatePreviewModalProps {
  template: TemplateCatalogItem;
  onClose: () => void;
}

// Full-document preview: renders the FULL Letter-page image (fullPreviewUrl),
// which is a public cross-origin asset — no cookie needed.
export function TemplatePreviewModal({
  template,
  onClose,
}: TemplatePreviewModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useBlockScroll(true);

  // Focus the close button on mount + close on Escape.
  useEffect(() => {
    closeBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const imageSrc = `${API_URL}${template.fullPreviewUrl}`;
  // L1: mirror the card — a tenant's own private template reads as the generic
  // "Your custom template" rather than its per-tenant name.
  const displayName = template.isOwn ? 'Your custom template' : template.name;

  return createPortal(
    <div
      className="template-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="template-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${displayName} full preview`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="template-modal__head">
          <h2 className="template-modal__title">{displayName}</h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="template-modal__close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="template-modal__body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={`${displayName} full document`}
            className="template-modal__img"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
