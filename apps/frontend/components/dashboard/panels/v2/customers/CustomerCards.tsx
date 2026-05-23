'use client';

import React from 'react';
import { CustomerCard } from './CustomerCard';
import type { Customer } from './types';

interface CustomerCardsProps {
  customers: Customer[];
  role: 'master' | 'admin' | 'user';
  currentUserId: string;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAssign: (customer: Customer) => void;
}

export function CustomerCards({
  customers,
  role,
  currentUserId,
  onView,
  onEdit,
  onDelete,
  onAssign
}: CustomerCardsProps) {
  return (
    <div className="customer-cards">
      {customers.map(customer => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          role={role}
          currentUserId={currentUserId}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssign={onAssign}
        />
      ))}
    </div>
  );
}
