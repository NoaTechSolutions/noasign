'use client';

import React from 'react';
import { CustomerTableRow } from './CustomerTableRow';
import type { Customer } from './types';

interface CustomersTableProps {
  customers: Customer[];
  role: 'master' | 'admin' | 'user';
  currentUserId: string;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAssign: (customer: Customer) => void;
}

export function CustomersTable({
  customers,
  role,
  currentUserId,
  onView,
  onEdit,
  onDelete,
  onAssign
}: CustomersTableProps) {
  const showOwner = role === 'master' || role === 'admin';

  return (
    <div className="customers-table-wrapper">
      <table className="customers-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Email</th>
            <th>Phone</th>
            {showOwner && <th>Owner</th>}
            <th className="customers-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(customer => (
            <CustomerTableRow
              key={customer.id}
              customer={customer}
              role={role}
              currentUserId={currentUserId}
              showOwner={showOwner}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssign={onAssign}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
