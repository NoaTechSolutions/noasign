'use client';

import React, { useState } from 'react';
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
  const { slug, name, isActive, isOwn, previewUrl } = template;
  // L1: a tenant's own private template shows a single generic title (owner
  // decision — works for any tenant without composing per-tenant names) so it
  // reads apart from the shared catalog designs.
  const displayName = isOwn ? 'Your custom template' : name;

  // Preview is served from a PUBLIC, cross-origin route (:3000) — no cookie
  // needed. previewUrl is relative, so prefix the API base.
  const imageSrc = `${API_URL}${previewUrl}`;

  // §10: a custom per-tenant template may not have a curated PNG yet → the image
  // 404s. Show an HONEST neutral placeholder ("No preview yet"), NEVER another
  // template's image (that would misrepresent what this template looks like).
  const [previewFailed, setPreviewFailed] = useState(false);

  return (
    <div className={`template-card${isActive ? ' template-card--active' : ''}`}>
      <div className="template-card__thumb">
        {previewFailed ? (
          <div className="template-card__no-preview" aria-label="No preview available yet">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="1.6" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>No preview yet</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt={`${displayName} preview`}
            className="template-card__img"
            loading="lazy"
            onError={() => setPreviewFailed(true)}
          />
        )}
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
          <div className="template-card__title">{displayName}</div>
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
