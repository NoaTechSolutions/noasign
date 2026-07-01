'use client';

import React, { useState } from 'react';
import type { ManagedUser } from './types';
import { getDisplayName, getInitials } from './types';

interface MemberCardProps {
  user: ManagedUser;
  currentUserId: string;
  onView: (user: ManagedUser) => void;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
}

export function MemberCard({
  user,
  currentUserId,
  onView,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isSelf = user.id === currentUserId;
  const displayName = getDisplayName(user);
  const initials = getInitials(user);

  return (
    <div className={`member-card ${expanded ? 'member-card--expanded' : ''}`}>
      <div className="member-card__header" onClick={() => setExpanded(!expanded)}>
        <div className="member-card__user">
          <div className="member-card__avatar">
            {user.companyProfile?.logoUrl ? (
              <img src={user.companyProfile.logoUrl} alt={displayName} />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div>
            <div className="member-card__name">
              {displayName}
              {isSelf && <span className="member-card__you">You</span>}
            </div>
            <div className="member-card__email">{user.email}</div>
          </div>
        </div>

        <button type="button" className="member-card__toggle">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points={expanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
          </svg>
        </button>
      </div>

      <div className="member-card__badges">
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

      {expanded && (
        <div className="member-card__details">
          <div className="member-card__detail-row">
            <span className="member-card__detail-label">Company</span>
            <span className="member-card__detail-value">{user.companyProfile?.companyName || '—'}</span>
          </div>

          <div className="member-card__detail-row">
            <span className="member-card__detail-label">Joined</span>
            <span className="member-card__detail-value">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="member-card__actions">
            <button type="button" className="btn-secondary btn-sm" onClick={() => onView(user)}>View details</button>

            {!isSelf && (
              <>
                <button type="button" className="btn-secondary btn-sm btn-edit" onClick={() => onEdit(user)}>Edit</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => onResetPassword(user)}>Reset password</button>
                {user.status === 'ACTIVE' ? (
                  <button type="button" className="btn-danger btn-sm" onClick={() => onDeactivate(user)}>Deactivate</button>
                ) : (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => onReactivate(user)}>Reactivate</button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
