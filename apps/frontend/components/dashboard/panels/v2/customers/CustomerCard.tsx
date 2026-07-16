'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { SubSheetHeader } from '@/components/dashboard/shared/SubSheetHeader';
import type { Customer } from './types';

interface CustomerCardProps {
  customer: Customer;
  role: 'superadmin' | 'user';
  currentUserId: string;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAssign: (customer: Customer) => void;
  onChangeStatus: (customer: Customer, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') => void | Promise<void>;
  onRestore?: (customer: Customer) => void | Promise<void>;
  /** R3/§9: true while this card animates out after a delete (mobile parity). */
  removing?: boolean;
}

export function CustomerCard({
  customer,
  role,
  currentUserId,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onChangeStatus,
  removing = false,
}: CustomerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);

  // Block body scroll while either bottom sheet is open.
  useBlockScroll(actionsOpen || statusSheetOpen);

  const displayName = customer.customerType === 'BUSINESS'
    ? (customer.business?.businessName || customer.fullName)
    : customer.fullName;

  const ownerName = customer.user
    ? (`${customer.user.firstName ?? ''} ${customer.user.lastName ?? ''}`.trim() || customer.user.email)
    : 'Unknown';

  const canAssign = role === 'superadmin';
  const showOwner = role === 'superadmin';
  const isDeleted = customer.status === 'DELETED';

  const currentStatus = customer.status ?? 'ACTIVE';
  const statusOptions: { value: 'ACTIVE' | 'INACTIVE' | 'DELETED'; label: string }[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    ...(role === 'superadmin' ? [{ value: 'DELETED' as const, label: 'Deleted' }] : []),
  ];

  const closeAll = () => {
    setStatusSheetOpen(false);
    setActionsOpen(false);
  };

  return (
    <div className={`customer-card${isDeleted ? ' customer-card--deleted' : ''}${removing ? ' row-exiting' : ''}`}>
      <div className="customer-card__header" onClick={() => setExpanded(!expanded)}>
        <div>
          <div className="customer-card__name">{displayName}</div>
          <div className="customer-card__badges">
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
            {isDeleted ? (
              <span className="customer-status-badge customer-status-badge--deleted">Deleted</span>
            ) : (
              <span className={`customer-status-badge customer-status-badge--${(customer.status ?? 'ACTIVE').toLowerCase()}`}>
                {(customer.status ?? 'ACTIVE') === 'ACTIVE' ? 'Active' : 'Inactive'}
              </span>
            )}
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`customer-card__chevron ${expanded ? 'customer-card__chevron--open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {expanded && (
        <div className="customer-card__body">
          <div className="customer-card__info">
            <div className="customer-card__info-row">
              <span className="customer-card__label">Email:</span>
              <span>{customer.email || '—'}</span>
            </div>
            <div className="customer-card__info-row">
              <span className="customer-card__label">Phone:</span>
              <span>{customer.phone || '—'}</span>
            </div>
            {showOwner && (
              <div className="customer-card__info-row">
                <span className="customer-card__label">Owner:</span>
                <span>{ownerName}</span>
              </div>
            )}
          </div>

          <div className="customer-card__actions">
            <button
              type="button"
              className="customer-card__actions-btn"
              onClick={() => setActionsOpen(true)}
            >
              Actions
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Actions bottom sheet (TASK 3) — portaled so the card's overflow:hidden
          can't clip it. */}
      {actionsOpen && typeof document !== 'undefined' && createPortal(
        <div className="card-actions-overlay" onClick={closeAll}>
          <div className="card-actions-sheet" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="card-actions-item" onClick={() => { setActionsOpen(false); onView(customer); }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              View details
            </button>
            <hr className="card-actions-divider" />
            <button type="button" className="card-actions-item card-actions-item--submenu" onClick={() => setStatusSheetOpen(true)}>
              <span className="card-actions-item__label">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Change status
              </span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            {canAssign && !isDeleted && (
              <button type="button" className="card-actions-item" onClick={() => { setActionsOpen(false); onAssign(customer); }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                Assign to...
              </button>
            )}
            {canAssign && !isDeleted && (
              <>
                <hr className="card-actions-divider" />
                <button type="button" className="card-actions-item card-actions-item--danger" onClick={() => { setActionsOpen(false); onDelete(customer); }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Second sheet: Change status — sits on top of the actions sheet. */}
      {statusSheetOpen && typeof document !== 'undefined' && createPortal(
        <div className="card-actions-overlay" onClick={() => setStatusSheetOpen(false)}>
          <div className="card-actions-sheet" onClick={(e) => e.stopPropagation()}>
            <SubSheetHeader title="Change status" onBack={() => setStatusSheetOpen(false)} />
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="card-actions-item"
                onClick={() => { closeAll(); void onChangeStatus(customer, opt.value); }}
              >
                <span className="card-actions-item__check">
                  {currentStatus === opt.value && (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
