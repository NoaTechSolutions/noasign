'use client';

import React, { useState } from 'react';
import type { Customer } from './types';

interface DeleteCustomerModalProps {
  customer: Customer;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteCustomerModal({ customer, onConfirm, onClose }: DeleteCustomerModalProps) {
  const [deleting, setDeleting] = useState(false);

  const displayName = customer.customerType === 'BUSINESS'
    ? (customer.business?.businessName || customer.fullName)
    : customer.fullName;

  const documentCount = customer._count?.documents || 0;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Delete failed:', error);
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete customer</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p>
            Are you sure you want to delete <strong>{displayName}</strong>?
          </p>
          {documentCount > 0 && (
            <div className="warning-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <strong>Warning:</strong> This customer has {documentCount} associated document{documentCount !== 1 ? 's' : ''}.
              </div>
            </div>
          )}
          <p className="text-muted">This action cannot be undone.</p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
