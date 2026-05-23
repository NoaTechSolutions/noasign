'use client';

import React, { useState } from 'react';
import type { Customer } from './types';

interface CustomerCardProps {
  customer: Customer;
  role: 'master' | 'admin' | 'user';
  currentUserId: string;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAssign: (customer: Customer) => void;
}

export function CustomerCard({
  customer,
  role,
  currentUserId,
  onView,
  onEdit,
  onDelete,
  onAssign
}: CustomerCardProps) {
  const [expanded, setExpanded] = useState(false);

  const displayName = customer.customerType === 'BUSINESS'
    ? (customer.business?.businessName || customer.fullName)
    : customer.fullName;

  const ownerName = customer.user
    ? (`${customer.user.firstName ?? ''} ${customer.user.lastName ?? ''}`.trim() || customer.user.email)
    : 'Unknown';

  const canAssign = role === 'master';
  const showOwner = role === 'master' || role === 'admin';

  return (
    <div className="customer-card">
      <div className="customer-card__header" onClick={() => setExpanded(!expanded)}>
        <div>
          <div className="customer-card__name">{displayName}</div>
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
            <button onClick={() => onView(customer)} className="btn-secondary">
              View details
            </button>
            <button onClick={() => onEdit(customer)} className="btn-secondary">
              Edit
            </button>
            {canAssign && (
              <button onClick={() => onAssign(customer)} className="btn-secondary">
                Assign
              </button>
            )}
            <button onClick={() => onDelete(customer)} className="btn-danger">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
