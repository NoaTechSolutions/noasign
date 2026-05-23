'use client';

import React from 'react';
import { LockedUserCard } from './LockedUserCard';
import type { LockedUserWithStatus } from './types';

interface LockedUsersCardsProps {
  users: LockedUserWithStatus[];
  onUnlock: (userId: string) => void;
}

export function LockedUsersCards({ users, onUnlock }: LockedUsersCardsProps) {
  return (
    <div className="locked-users-cards">
      {users.map((u) => (
        <LockedUserCard key={u.userId} user={u} onUnlock={onUnlock} />
      ))}
    </div>
  );
}
