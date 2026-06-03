'use client';

import React from 'react';
import { LockedUserTableRow } from './LockedUserTableRow';
import type { LockedUserWithStatus } from './types';

// ---------------------------------------------------------------------------
// Skeleton — 5 placeholder rows matching the real table's 6-column structure.
// Column order: Status · Email · Locked · Unlock · Attempts · Actions
// ---------------------------------------------------------------------------
const SKELETON_ROWS = 5;

export function LockedUsersTableSkeleton() {
  return (
    <div className="locked-users-table-wrapper" aria-hidden="true">
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
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <tr key={i} className="locked-user-row">
              {/* Status dot */}
              <td>
                <span
                  className="skeleton-pulse skeleton-circle"
                  style={{ display: 'inline-block', width: 8, height: 8 }}
                />
              </td>
              {/* Email */}
              <td>
                <span
                  className="skeleton-pulse skeleton-line"
                  style={{ display: 'inline-block', width: 180, height: 14 }}
                />
              </td>
              {/* Locked (time ago) */}
              <td>
                <span
                  className="skeleton-pulse skeleton-line"
                  style={{ display: 'inline-block', width: 60, height: 14 }}
                />
              </td>
              {/* Unlock (countdown) */}
              <td>
                <span
                  className="skeleton-pulse skeleton-line"
                  style={{ display: 'inline-block', width: 70, height: 14 }}
                />
              </td>
              {/* Attempts badge */}
              <td>
                <span
                  className="skeleton-pulse skeleton-line"
                  style={{ display: 'inline-block', width: 44, height: 22, borderRadius: 6 }}
                />
              </td>
              {/* Actions */}
              <td>
                <span
                  className="skeleton-pulse skeleton-line"
                  style={{ display: 'inline-block', width: 60, height: 30, borderRadius: 20 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// ---------------------------------------------------------------------------

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
