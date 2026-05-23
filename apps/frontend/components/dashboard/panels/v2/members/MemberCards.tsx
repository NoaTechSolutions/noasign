'use client';

import React from 'react';
import { MemberCard } from './MemberCard';
import type { ManagedUser } from './types';

interface MemberCardsProps {
  users: ManagedUser[];
  currentUserId: string;
  onView: (user: ManagedUser) => void;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
}

export function MemberCards({
  users,
  currentUserId,
  onView,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: MemberCardsProps) {
  return (
    <div className="member-cards">
      {users.map((user) => (
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
      ))}
    </div>
  );
}
