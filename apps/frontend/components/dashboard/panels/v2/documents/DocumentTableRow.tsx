'use client';

import React, { useState } from 'react';
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
  getStatusLabel,
  isReceiptDoc,
  isVoidedReceipt,
} from './types';
import { ReceiptResendMenuItem } from './ReceiptResendMenuItem';

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
  const [actionsOpen, setActionsOpen] = useState(false);
  const actions = getAvailableActions(document);
  // State-change actions live under an "Actions" submenu for tidiness; the rest
  // (View PDF, etc.) stay as direct items. A VOID receipt has none of these.
  const SUBMENU_ACTIONS = new Set<V2DocumentAction>(['resend', 'reissue', 'void']);
  const directActions = actions.filter((a) => !SUBMENU_ACTIONS.has(a));
  const groupedActions = actions.filter((a) => SUBMENU_ACTIONS.has(a));

  const renderMenuItem = (action: V2DocumentAction) => {
    if ((action === 'resend' || action === 'retry') && isReceiptDoc(document)) {
      return (
        <ReceiptResendMenuItem
          key={action}
          doc={document}
          action={action}
          itemClass="documents-v2-row__menu-item"
          onAction={onAction}
        />
      );
    }
    return (
      <button
        key={action}
        type="button"
        role="menuitem"
        className="documents-v2-row__menu-item"
        onClick={() => void onAction(action, document.id)}
      >
        {getActionLabel(action)}
      </button>
    );
  };

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
        {isVoidedReceipt(document) ? (
          <span className="doc-status-badge doc-status-badge--void">VOID</span>
        ) : (
          <span className={`doc-status-badge ${getStatusBadgeClass(document.status)}`}>
            {getStatusLabel(document.status)}
          </span>
        )}
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
                  {directActions.map(renderMenuItem)}
                  {groupedActions.length > 0 && (
                    <div className="documents-v2-row__submenu-wrap">
                      <button
                        type="button"
                        className="documents-v2-row__menu-item documents-v2-row__menu-item--group"
                        aria-expanded={actionsOpen}
                        aria-haspopup="menu"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionsOpen((v) => !v);
                        }}
                      >
                        <span aria-hidden="true">‹</span>
                        <span>Actions</span>
                      </button>
                      {actionsOpen && (
                        <div className="documents-v2-row__submenu" role="menu">
                          {groupedActions.map(renderMenuItem)}
                        </div>
                      )}
                    </div>
                  )}
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
