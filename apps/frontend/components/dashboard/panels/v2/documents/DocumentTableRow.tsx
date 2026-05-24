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

interface DocumentTableRowProps {
  document: V2DocumentItem;
  selected: boolean;
  onSelect: (docId: string) => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
}

export function DocumentTableRow({
  document,
  selected,
  onSelect,
  onAction,
}: DocumentTableRowProps) {
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
    <tr
      className={`documents-v2-row${selected ? ' documents-v2-row--selected' : ''}`}
      onClick={() => onSelect(document.id)}
    >
      <td className="documents-v2-row__number">{document.documentNumber}</td>
      <td>{getCustomerDisplayName(document)}</td>
      <td>{getDocumentTypeDisplayName(document)}</td>
      <td>
        <span className={`docs-v2-status-badge ${getStatusBadgeClass(document.status)}`}>
          {document.status}
        </span>
      </td>
      <td className="documents-v2-row__time">
        {formatDate(document.createdAt)}
      </td>
      <td className="documents-v2-row__time">
        {formatDate(document.sentAt)}
      </td>
      <td
        className="documents-v2-row__actions"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="documents-v2-row__menu-wrapper" ref={menuRef}>
          <button
            type="button"
            className="documents-v2-row__menu-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen ? (
            <div className="documents-v2-row__menu" role="menu">
              {actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  role="menuitem"
                  className="documents-v2-row__menu-item"
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
      </td>
    </tr>
  );
}
