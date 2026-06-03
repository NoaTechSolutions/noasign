'use client';

import React from 'react';
import { MemberTableRow } from './MemberTableRow';
import type { ManagedUser } from './types';

interface MembersTableProps {
  users: ManagedUser[];
  currentUserId: string;
  loading?: boolean;
  onView: (user: ManagedUser) => void;
  onEdit: (user: ManagedUser) => void;
  onResetPassword: (user: ManagedUser) => void;
  onDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
}

function MembersTableSkeletonRow() {
  return (
    <tr className="member-row">
      {/* Member: avatar circle + two lines */}
      <td>
        <div className="member-row__user">
          <span className="skeleton-pulse skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0, display: 'inline-block' }} />
          <div className="member-row__info">
            <span className="skeleton-pulse skeleton-line" style={{ width: 120, height: 14, display: 'block' }} />
          </div>
        </div>
      </td>
      {/* Email */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 160, height: 13, display: 'block' }} /></td>
      {/* Role badge */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 60, height: 22, display: 'block', borderRadius: 6 }} /></td>
      {/* Status badge */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 64, height: 22, display: 'block', borderRadius: 6 }} /></td>
      {/* Company */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 100, height: 13, display: 'block' }} /></td>
      {/* Joined */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 80, height: 13, display: 'block' }} /></td>
      {/* Actions kebab */}
      <td><span className="skeleton-pulse skeleton-circle" style={{ width: 32, height: 32, display: 'inline-block' }} /></td>
    </tr>
  );
}

export function MembersTable({
  users,
  currentUserId,
  loading = false,
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
          {loading
            ? Array.from({ length: 5 }, (_, i) => <MembersTableSkeletonRow key={i} />)
            : users.map((user) => (
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
              ))
          }
        </tbody>
      </table>
    </div>
  );
}
