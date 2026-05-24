'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { V2DocumentItem, V2DocumentAction } from './types';
import {
  formatDate,
  getActionLabel,
  getAvailableActions,
  getCustomerDisplayName,
  getDocumentTypeDisplayName,
  getStatusBadgeClass,
} from './types';

interface DocumentCardProps {
  document: V2DocumentItem;
  selected: boolean;
  onSelect: (docId: string) => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
}

export function DocumentCard({
  document,
  selected,
  onSelect,
  onAction,
}: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const actions = getAvailableActions(document);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div
      className={`documents-v2-card${selected ? ' documents-v2-card--selected' : ''}`}
      onClick={() => onSelect(document.id)}
    >
      <div className="documents-v2-card__top">
        <div className="documents-v2-card__title">
          <span className="documents-v2-card__number">{document.documentNumber}</span>
          <span className="documents-v2-card__type">
            {getDocumentTypeDisplayName(document)}
          </span>
        </div>
        <div className="documents-v2-card__badges">
          <span className={`docs-v2-status-badge ${getStatusBadgeClass(document.status)}`}>
            {document.status}
          </span>
        </div>
      </div>

      <div className="documents-v2-card__customer">
        {getCustomerDisplayName(document)}
      </div>

      <div className="documents-v2-card__meta">
        Created {formatDate(document.createdAt)}
        {document.sentAt ? ` • Sent ${formatDate(document.sentAt)}` : ''}
      </div>

      <div
        className="documents-v2-card__actions"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="documents-v2-card__menu-wrapper" ref={menuRef}>
          <button
            type="button"
            className="documents-v2-card__menu-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen ? (
            <div className="documents-v2-card__menu" role="menu">
              {actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  role="menuitem"
                  className="documents-v2-card__menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    void onAction(action, document.id);
                  }}
                >
                  {getActionLabel(action)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
