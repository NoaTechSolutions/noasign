'use client';

import React from 'react';
import { API_URL } from '@/lib/api';
import type { TemplateCatalogItem } from './types';

interface TemplateCardProps {
  template: TemplateCatalogItem;
  // A request is in flight for THIS template.
  activating: boolean;
  // Any request is in flight (disables sibling cards).
  busy: boolean;
  onActivate: (slug: string) => void;
  onPreview: (template: TemplateCatalogItem) => void;
  // When provided (invoice tab), the primary action becomes "Create invoice"
  // instead of "Set as active" — it opens the creation form for this template.
  onCreate?: (slug: string) => void;
}

// Vertical feature card: full-width preview image on top (uncropped, contain),
// then name + status, then the actions row. The card itself is NOT clickable —
// actions are the explicit "Preview" and "Set as active"/"Create invoice" buttons.
export function TemplateCard({
  template,
  activating,
  busy,
  onActivate,
  onPreview,
  onCreate,
}: TemplateCardProps) {
  const { slug, name, isActive, previewUrl } = template;

  // Preview is served from a PUBLIC, cross-origin route (:3000) — no cookie
  // needed. previewUrl is relative, so prefix the API base.
  const imageSrc = `${API_URL}${previewUrl}`;

  return (
    <div className={`template-card${isActive ? ' template-card--active' : ''}`}>
      <div className="template-card__thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={`${name} preview`}
          className="template-card__img"
          loading="lazy"
        />
        {isActive && (
          <span className="template-card__badge" aria-label="Active template">
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Active
          </span>
        )}
        {activating && (
          <div className="template-card__overlay" aria-hidden="true">
            <span className="template-card__spinner" />
          </div>
        )}
      </div>

      <div className="template-card__body">
        <div className="template-card__head">
          <div className="template-card__title">{name}</div>
          {isActive && (
            <span className="template-card__current">Current selection</span>
          )}
        </div>

        <div className="template-card__actions">
          <button
            type="button"
            className="template-card__preview-btn"
            onClick={() => onPreview(template)}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>

          {onCreate ? (
            <button
              type="button"
              className="template-card__set-btn"
              disabled={busy}
              onClick={() => onCreate(slug)}
            >
              {activating ? 'Opening…' : 'Create invoice'}
            </button>
          ) : !isActive ? (
            <button
              type="button"
              className="template-card__set-btn"
              disabled={busy}
              onClick={() => onActivate(slug)}
            >
              {activating ? 'Activating…' : 'Set as active'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
