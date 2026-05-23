'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Customer } from './types';

interface CustomerTableRowProps {
  customer: Customer;
  role: 'master' | 'admin' | 'user';
  currentUserId: string;
  showOwner: boolean;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAssign: (customer: Customer) => void;
}

export function CustomerTableRow({
  customer,
  role,
  currentUserId,
  showOwner,
  onView,
  onEdit,
  onDelete,
  onAssign
}: CustomerTableRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = customer.customerType === 'BUSINESS'
    ? (customer.business?.businessName || customer.fullName)
    : customer.fullName;

  const ownerName = customer.user
    ? (`${customer.user.firstName ?? ''} ${customer.user.lastName ?? ''}`.trim() || customer.user.email)
    : 'Unknown';

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const canAssign = role === 'master';

  return (
    <tr className="customer-row">
      <td className="customer-row__name" onClick={() => onView(customer)}>
        {displayName}
      </td>
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
      <td>{customer.email || '—'}</td>
      <td>{customer.phone || '—'}</td>
      {showOwner && <td>{ownerName}</td>}
      <td className="customer-row__actions">
        <div className="kebab-menu" ref={menuRef}>
          <button
            type="button"
            className="kebab-menu__trigger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="kebab-menu__dropdown">
              <button onClick={() => { onView(customer); setMenuOpen(false); }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                View details
              </button>
              <button onClick={() => { onEdit(customer); setMenuOpen(false); }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              {canAssign && (
                <button onClick={() => { onAssign(customer); setMenuOpen(false); }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  Assign to...
                </button>
              )}
              <hr className="kebab-menu__divider" />
              <button onClick={() => { onDelete(customer); setMenuOpen(false); }} className="kebab-menu__danger">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
