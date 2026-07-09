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
}

export function TemplateCard({
  template,
  activating,
  busy,
  onActivate,
}: TemplateCardProps) {
  const { slug, name, isActive, previewUrl } = template;

  // Preview is served from a PUBLIC, cross-origin route (:3000) — no cookie
  // needed. previewUrl is relative, so prefix the API base.
  const imageSrc = `${API_URL}${previewUrl}`;

  // Non-active cards are clickable to activate; the active card is inert.
  const clickable = !isActive && !busy;

  const handleClick = () => {
    if (clickable) onActivate(slug);
  };

  return (
    <div
      className={`template-card${isActive ? ' template-card--active' : ''}${
        clickable ? ' template-card--clickable' : ''
      }`}
      onClick={clickable ? handleClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate(slug);
              }
            }
          : undefined
      }
      aria-pressed={isActive}
    >
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
        <div className="template-card__title">{name}</div>

        <div className="template-card__foot">
          {isActive ? (
            <span className="template-card__current">Current selection</span>
          ) : (
            <button
              type="button"
              className="template-card__set-btn"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onActivate(slug);
              }}
            >
              {activating ? 'Activating…' : 'Set as active'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
