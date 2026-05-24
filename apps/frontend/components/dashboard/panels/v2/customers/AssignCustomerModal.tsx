'use client';

import React, { useState, useEffect } from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import type { Customer, CustomerOwnerUser } from './types';

interface AssignCustomerModalProps {
  customer: Customer;
  onFetchUsers: () => Promise<CustomerOwnerUser[]>;
  onConfirm: (userId: string) => Promise<void>;
  onClose: () => void;
}

export function AssignCustomerModal({ customer, onFetchUsers, onConfirm, onClose }: AssignCustomerModalProps) {
  useBlockScroll();
  const [users, setUsers] = useState<CustomerOwnerUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(customer.userId);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const displayName = customer.customerType === 'BUSINESS'
    ? (customer.business?.businessName || customer.fullName)
    : customer.fullName;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    onFetchUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
      })
      .catch((error) => {
        console.error('Error fetching users:', error);
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onFetchUsers]);

  const handleConfirm = async () => {
    if (selectedUserId === customer.userId) {
      onClose();
      return;
    }

    setAssigning(true);
    try {
      await onConfirm(selectedUserId);
    } catch (error) {
      console.error('Assign failed:', error);
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign customer</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p>Assign <strong>{displayName}</strong> to:</p>

          {loading ? (
            <div className="text-center">Loading users...</div>
          ) : (
            <div className="form-group">
              <label htmlFor="assignUser">Select user</label>
              <select
                id="assignUser"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="form-select"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirm}
            disabled={loading || assigning || selectedUserId === customer.userId}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
