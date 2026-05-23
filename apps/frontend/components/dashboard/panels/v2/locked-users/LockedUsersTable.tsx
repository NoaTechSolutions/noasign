'use client';

import React from 'react';
import { LockedUserTableRow } from './LockedUserTableRow';
import type { LockedUserWithStatus } from './types';

interface LockedUsersTableProps {
  users: LockedUserWithStatus[];
  onUnlock: (userId: string) => void;
}

export function LockedUsersTable({ users, onUnlock }: LockedUsersTableProps) {
  return (
    <div className="locked-users-table-wrapper">
      <table className="locked-users-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Email</th>
            <th>Locked</th>
            <th>Unlock</th>
            <th>Attempts</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <LockedUserTableRow key={u.userId} user={u} onUnlock={onUnlock} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
