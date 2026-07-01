'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useDropdownPosition } from '@/components/dashboard/shared/use-dropdown-position';
import type { ManagedUser } from './types';
import { getDisplayName, getInitials } from './types';

interface MemberTableRowProps {
  user: ManagedUser;
  currentUserId: string;
  onView: (user: ManagedUser) => void;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
}

export function MemberTableRow({
  user,
  currentUserId,
  onView,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: MemberTableRowProps) {
  const { open: menuOpen, toggle, close, style: menuStyle, triggerRef, menuRef } = useDropdownPosition();
  const isSelf = user.id === currentUserId;

  const displayName = getDisplayName(user);
  const initials = getInitials(user);

  return (
    <tr className="member-row">
      <td>
        <div className="member-row__user">
          <div className="member-row__avatar">
            {user.companyProfile?.logoUrl ? (
              <img src={user.companyProfile.logoUrl} alt={displayName} />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="member-row__info">
            <div className="member-row__name">{displayName}</div>
            {isSelf && <span className="member-row__you">You</span>}
          </div>
        </div>
      </td>

      <td className="member-row__email">{user.email}</td>

      <td>
        <span className={`role-badge role-badge--${user.role.toLowerCase()}`}>
          {user.role === 'MASTER' && (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          )}
          {user.role}
        </span>
      </td>

      <td>
        <span className={`status-badge status-badge--${user.status.toLowerCase()}`}>{user.status}</span>
      </td>

      <td className="member-row__company">{user.companyProfile?.companyName || '—'}</td>

      <td className="member-row__date">{new Date(user.createdAt).toLocaleDateString()}</td>

      <td>
        <div className="member-row__actions">
          <button ref={triggerRef} type="button" className="kebab-menu" onClick={toggle}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>

          {menuOpen && typeof document !== 'undefined' && createPortal(
            <div className="dropdown-menu" ref={menuRef} style={menuStyle} onClick={close}>
              <button type="button" onClick={() => onView(user)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                View details
              </button>

              {!isSelf && (
                <>
                  <button type="button" className="btn-edit" onClick={() => onEdit(user)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>

                  <button type="button" onClick={() => onResetPassword(user)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Reset password
                  </button>

                  <div className="dropdown-divider" />

                  {user.status === 'ACTIVE' ? (
                    <button type="button" className="dropdown-item--danger" onClick={() => onDeactivate(user)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                      Deactivate
                    </button>
                  ) : (
                    <button type="button" onClick={() => onReactivate(user)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                      Reactivate
                    </button>
                  )}
                </>
              )}
            </div>,
            document.body,
          )}
        </div>
      </td>
    </tr>
  );
}
