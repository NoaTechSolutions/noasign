'use client';

import React, { useState } from 'react';
import type { ManagedUser } from './types';
import { getDisplayName } from './types';

interface DeactivateUserModalProps {
  user: ManagedUser;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeactivateUserModal({ user, onConfirm, onClose }: DeactivateUserModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Deactivate Member</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="warning-box warning-box--danger">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <strong>This action will deactivate the user account.</strong> The user will no longer be able to access the system. You can reactivate this account later if needed.
            </div>
          </div>

          <p className="text-muted">
            Are you sure you want to deactivate <strong>{getDisplayName(user)}</strong> ({user.email})?
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="button" className="btn-danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Deactivating...' : 'Deactivate user'}
          </button>
        </div>
      </div>
    </div>
  );
}
