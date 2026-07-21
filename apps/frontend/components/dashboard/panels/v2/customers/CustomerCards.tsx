'use client';

import React from 'react';
import { CustomerCard } from './CustomerCard';
import type { Customer } from './types';

interface CustomerCardsProps {
  customers: Customer[];
  role: 'superadmin' | 'user';
  currentUserId: string;
  loading?: boolean;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAssign: (customer: Customer) => void;
  onChangeStatus: (customer: Customer, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') => void | Promise<void>;
  onRestore?: (customer: Customer) => void | Promise<void>;
  /** R3/§9: id of a card animating out after a delete (mobile parity with the table). */
  removingId?: string | null;
}

const SKELETON_CARDS = 5;

function SkeletonCard() {
  return (
    <div className="customer-card" aria-hidden="true">
      <div className="customer-card__header" style={{ pointerEvents: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Name */}
          <span
            className="skeleton-pulse skeleton-line"
            style={{ display: 'block', width: '160px', height: '16px' }}
          />
          {/* Type badge */}
          <span
            className="skeleton-pulse skeleton-line"
            style={{ display: 'inline-block', width: '76px', height: '20px', borderRadius: '999px' }}
          />
        </div>
        {/* Chevron placeholder */}
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0 }}
        />
      </div>
    </div>
  );
}

export function CustomerCards({
  customers,
  role,
  currentUserId,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onChangeStatus,
  onRestore,
  removingId,
}: CustomerCardsProps) {
  return (
    <div className="customer-cards">
      {loading
        ? Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <SkeletonCard key={i} />
          ))
        : customers.map(customer => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              role={role}
              currentUserId={currentUserId}
              removing={customer.id === removingId}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssign={onAssign}
              onChangeStatus={onChangeStatus}
              onRestore={onRestore}
            />
          ))}
    </div>
  );
}
