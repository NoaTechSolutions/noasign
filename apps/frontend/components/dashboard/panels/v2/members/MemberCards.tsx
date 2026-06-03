'use client';

import React from 'react';
import { MemberCard } from './MemberCard';
import type { ManagedUser } from './types';

interface MemberCardsProps {
  users: ManagedUser[];
  currentUserId: string;
  loading?: boolean;
  onView: (user: ManagedUser) => void;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
}

function MemberCardSkeleton() {
  return (
    <div className="member-card">
      {/* Header: avatar + name/email + toggle placeholder */}
      <div className="member-card__header" style={{ cursor: 'default' }}>
        <div className="member-card__user">
          <span className="skeleton-pulse skeleton-circle" style={{ width: 48, height: 48, flexShrink: 0, display: 'inline-block' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <span className="skeleton-pulse skeleton-line" style={{ width: 130, height: 14, display: 'block' }} />
            <span className="skeleton-pulse skeleton-line" style={{ width: 160, height: 12, display: 'block' }} />
          </div>
        </div>
        {/* chevron placeholder */}
        <span className="skeleton-pulse skeleton-circle" style={{ width: 32, height: 32, display: 'inline-block', flexShrink: 0 }} />
      </div>
      {/* Badges row */}
      <div className="member-card__badges">
        <span className="skeleton-pulse skeleton-line" style={{ width: 58, height: 22, display: 'inline-block', borderRadius: 6 }} />
        <span className="skeleton-pulse skeleton-line" style={{ width: 62, height: 22, display: 'inline-block', borderRadius: 6 }} />
      </div>
    </div>
  );
}

export function MemberCards({
  users,
  currentUserId,
  loading = false,
  onView,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: MemberCardsProps) {
  return (
    <div className="member-cards">
      {loading
        ? Array.from({ length: 5 }, (_, i) => <MemberCardSkeleton key={i} />)
        : users.map((user) => (
            <MemberCard
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              onView={onView}
              onEdit={onEdit}
              onResetPassword={onResetPassword}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
          ))
      }
    </div>
  );
}
