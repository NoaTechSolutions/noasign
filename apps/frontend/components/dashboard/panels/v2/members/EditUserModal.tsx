'use client';

import React, { useState } from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import type { ManagedUser, UpdateUserData } from './types';

interface EditUserModalProps {
  user: ManagedUser;
  onSubmit: (data: UpdateUserData) => Promise<void>;
  onClose: () => void;
}

export function EditUserModal({ user, onSubmit, onClose }: EditUserModalProps) {
  useBlockScroll();
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<'SUPERADMIN' | 'USER'>(
    user.role as 'SUPERADMIN' | 'USER'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hasChanges = email !== user.email || role !== user.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasChanges) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const data: UpdateUserData = {};
      if (email !== user.email) data.email = email.trim();
      if (role !== user.role) data.role = role;

      await onSubmit(data);
    } catch (err) {
      setError('Failed to update user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Member</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="form-error">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="warning-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <strong>Limited editing:</strong> Only email and role can be changed here. To edit name or phone, the user must update their own profile.
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" required />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value as 'SUPERADMIN' | 'USER')} className="form-select">
                <option value="USER">User</option>
                <option value="SUPERADMIN">Master</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting || !hasChanges}>
              {submitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
