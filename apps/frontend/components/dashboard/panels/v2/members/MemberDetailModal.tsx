'use client';

import React from 'react';
import type { ManagedUser } from './types';
import { getDisplayName, getInitials } from './types';

interface MemberDetailModalProps {
  user: ManagedUser;
  currentUserId: string;
  onEdit: () => void;
  onResetPassword: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onClose: () => void;
}

export function MemberDetailModal({
  user,
  currentUserId,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onClose,
}: MemberDetailModalProps) {
  const isSelf = user.id === currentUserId;
  const displayName = getDisplayName(user);
  const initials = getInitials(user);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Member Details</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="member-detail">
            <div className="member-detail__header">
              <div className="member-detail__avatar">
                {user.companyProfile?.logoUrl ? (
                  <img src={user.companyProfile.logoUrl} alt={displayName} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div>
                <h3 className="member-detail__name">
                  {displayName}
                  {isSelf && <span className="member-detail__you">You</span>}
                </h3>
                <p className="member-detail__email">{user.email}</p>
              </div>
            </div>

            <div className="member-detail__badges">
              <span className={`role-badge role-badge--${user.role.toLowerCase()}`}>
                {user.role === 'MASTER' && (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                )}
                {user.role}
              </span>
              <span className={`status-badge status-badge--${user.status.toLowerCase()}`}>{user.status}</span>
            </div>

            <div className="member-detail__grid">
              <div className="member-detail__field">
                <label>Account Type</label>
                <span>{user.accountType || '—'}</span>
              </div>

              <div className="member-detail__field">
                <label>Phone</label>
                <span>{user.phone || '—'}</span>
              </div>

              <div className="member-detail__field">
                <label>Company</label>
                <span>{user.companyProfile?.companyName || '—'}</span>
              </div>

              <div className="member-detail__field">
                <label>Plan</label>
                <span>{user.companyProfile?.planName || '—'}</span>
              </div>

              <div className="member-detail__field">
                <label>Joined</label>
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="member-detail__field">
                <label>Last Updated</label>
                <span>{new Date(user.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {user.mustChangePassword && (
              <div className="info-box">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span>User must change password on next login</span>
              </div>
            )}
          </div>
        </div>

        {!isSelf && (
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onEdit}>Edit</button>
            <button type="button" className="btn-secondary" onClick={onResetPassword}>Reset password</button>
            {user.status === 'ACTIVE' ? (
              <button type="button" className="btn-danger" onClick={onDeactivate}>Deactivate</button>
            ) : (
              <button type="button" className="btn-primary" onClick={onReactivate}>Reactivate</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
