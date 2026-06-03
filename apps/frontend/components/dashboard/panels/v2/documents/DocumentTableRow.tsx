'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { useDropdownPosition } from '@/components/dashboard/shared/use-dropdown-position';
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
  const { open: menuOpen, toggle, close, style: menuStyle, triggerRef, menuRef } = useDropdownPosition();
  const actions = getAvailableActions(document);

  return (
    <tr
      className={`documents-v2-row${selected ? ' documents-v2-row--selected' : ''}`}
      onClick={() => onSelect(document.id)}
    >
      {/* 1. Document = number (primary) + client (secondary), two-line + truncate */}
      <td className="documents-v2-row__doc">
        <div className="doc-cell">
          <span className="doc-number">{document.documentNumber}</span>
          <span className="doc-client">{getCustomerDisplayName(document)}</span>
        </div>
      </td>
      {/* 2. Type */}
      <td>{getDocumentTypeDisplayName(document)}</td>
      {/* 3. Date (created) */}
      <td className="documents-v2-row__time">{formatDate(document.createdAt)}</td>
      {/* 4. Status */}
      <td>
        <span className={`doc-status-badge ${getStatusBadgeClass(document.status)}`}>
          {document.status}
        </span>
      </td>
      {/* 5. Actions */}
      <td
        className="documents-v2-row__actions"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="documents-v2-row__menu-wrapper">
          <button
            ref={triggerRef}
            type="button"
            className="documents-v2-row__menu-trigger"
            onClick={toggle}
            aria-label="Actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && typeof window !== 'undefined'
            ? createPortal(
                <div className="documents-v2-row__menu" role="menu" ref={menuRef} style={menuStyle} onClick={close}>
                  {actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      role="menuitem"
                      className="documents-v2-row__menu-item"
                      onClick={() => void onAction(action, document.id)}
                    >
                      {getActionLabel(action)}
                    </button>
                  ))}
                </div>,
                // `document` is shadowed by the row prop here — reach the real DOM
                // via window.document.
                window.document.body,
              )
            : null}
        </div>
      </td>
    </tr>
  );
}
