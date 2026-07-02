'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatUsPhone } from '@/lib/format-phone';
import { useDropdownPosition } from '@/components/dashboard/shared/use-dropdown-position';
import type { Customer } from './types';

interface CustomerTableRowProps {
  customer: Customer;
  role: 'superadmin' | 'user';
  currentUserId: string;
  showOwner: boolean;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAssign: (customer: Customer) => void;
  onChangeStatus: (customer: Customer, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') => void | Promise<void>;
  onRestore?: (customer: Customer) => void | Promise<void>;
}

export function CustomerTableRow({
  customer,
  role,
  currentUserId,
  showOwner,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onChangeStatus,
}: CustomerTableRowProps) {
  const { open: menuOpen, toggle, close, style: menuStyle, triggerRef, menuRef } = useDropdownPosition();

  // Change-status submenu: click-to-toggle (NOT hover) so moving the cursor to
  // the options can't accidentally close it by passing over another table row.
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  // Reset the submenu whenever the kebab itself closes (click-outside, action…).
  // Done during render via a prev-value compare — the canonical replacement for
  // an effect that only adjusts state in response to another state changing.
  const [prevMenuOpen, setPrevMenuOpen] = useState(menuOpen);
  if (prevMenuOpen !== menuOpen) {
    setPrevMenuOpen(menuOpen);
    if (!menuOpen && showStatusMenu) setShowStatusMenu(false);
  }

  const displayName = customer.customerType === 'BUSINESS'
    ? (customer.business?.businessName || customer.fullName)
    : customer.fullName;

  // Name-cell secondary line — the client's email. (TASK 1 removed the primary
  // contact that briefly lived here; the Owner column now carries the business
  // identity instead.)
  const nameSubline = customer.email || '';

  const ownerName = customer.user
    ? (`${customer.user.firstName ?? ''} ${customer.user.lastName ?? ''}`.trim() || customer.user.email)
    : 'Unknown';

  // Owner column (TASK 1, user-approved literal): BUSINESS shows the business
  // name; PERSONAL shows the workspace user that owns the record.
  const ownerCell = customer.customerType === 'BUSINESS' ? displayName : ownerName;

  const canAssign = role === 'superadmin';
  const isDeleted = customer.status === 'DELETED';

  // Change-status submenu options. DELETED is MASTER-only (matches the filter).
  const currentStatus = customer.status ?? 'ACTIVE';
  const statusOptions: { value: 'ACTIVE' | 'INACTIVE' | 'DELETED'; label: string }[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    ...(role === 'superadmin' ? [{ value: 'DELETED' as const, label: 'Deleted' }] : []),
  ];

  return (
    <tr className={`customer-row${isDeleted ? ' customer-row--deleted' : ''}`}>
      {/* 1. Name + email sub-line */}
      <td className="customer-row__name" onClick={() => onView(customer)}>
        {displayName}
        {nameSubline && <span className="customer-row__email">{nameSubline}</span>}
      </td>

      {/* 2. Type badge */}
      <td>
        <span className={`customer-type-badge customer-type-badge--${customer.customerType.toLowerCase()}`}>
          {customer.customerType === 'PERSONAL' ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          )}
          {customer.customerType === 'PERSONAL' ? 'Personal' : 'Business'}
        </span>
      </td>

      {/* 3. Phone */}
      <td>{customer.phone ? formatUsPhone(customer.phone) : '—'}</td>

      {/* 4. Status badge — deleted overrides active/inactive */}
      <td>
        {isDeleted ? (
          <span className="customer-status-badge customer-status-badge--deleted">Deleted</span>
        ) : (
          <span className={`customer-status-badge customer-status-badge--${(customer.status ?? 'ACTIVE').toLowerCase()}`}>
            {(customer.status ?? 'ACTIVE') === 'ACTIVE' ? 'Active' : 'Inactive'}
          </span>
        )}
      </td>

      {/* 5. Owner (master/admin only) — business name for BUSINESS, owner user for PERSONAL */}
      {showOwner && <td>{ownerCell}</td>}

      {/* 6. Actions kebab */}
      <td className="customer-row__actions">
        <div className="kebab-menu">
          <button
            ref={triggerRef}
            type="button"
            className="kebab-menu__trigger"
            onClick={toggle}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
          {menuOpen && typeof document !== 'undefined' && createPortal(
            <div className="kebab-menu__dropdown" ref={menuRef} style={menuStyle} onClick={close}>
              <button onClick={() => onView(customer)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                View details
              </button>

              {/* Change status — click-to-toggle flyout (opens to the left). */}
              <div className="kebab-submenu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="kebab-submenu__trigger"
                  aria-expanded={showStatusMenu}
                  onClick={() => setShowStatusMenu((v) => !v)}
                >
                  <span className="kebab-submenu__label">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Change status
                  </span>
                  <svg className={`kebab-submenu__caret${showStatusMenu ? ' kebab-submenu__caret--open' : ''}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
                {showStatusMenu && (
                <div className="kebab-submenu__panel">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { close(); void onChangeStatus(customer, opt.value); }}
                    >
                      <span className="kebab-submenu__check">
                        {currentStatus === opt.value && (
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
                )}
              </div>

              {canAssign && !isDeleted && (
                <>
                  <button onClick={() => onAssign(customer)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/>
                      <line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                    Assign to...
                  </button>
                  <hr className="kebab-menu__divider" />
                  <button onClick={() => onDelete(customer)} className="kebab-menu__danger">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete
                  </button>
                </>
              )}
            </div>,
            document.body,
          )}
        </div>
      </td>
    </tr>
  );
}
