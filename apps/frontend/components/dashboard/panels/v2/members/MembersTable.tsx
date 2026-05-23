'use client';

import React from 'react';
import { MemberTableRow } from './MemberTableRow';
import type { ManagedUser } from './types';

interface MembersTableProps {
  users: ManagedUser[];
  currentUserId: string;
  onView: (user: ManagedUser) => void;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
}

export function MembersTable({
  users,
  currentUserId,
  onView,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: MembersTableProps) {
  return (
    <div className="members-table-wrapper">
      <table className="members-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Company</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <MemberTableRow
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
        </tbody>
      </table>
    </div>
  );
}
