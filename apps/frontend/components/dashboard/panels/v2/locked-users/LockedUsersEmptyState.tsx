'use client';

import React from 'react';

interface LockedUsersEmptyStateProps {
  hasFilters: boolean;
}

export function LockedUsersEmptyState({ hasFilters }: LockedUsersEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <h3>No users found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
      <h3>No security incidents detected</h3>
      <p>All user accounts are accessible</p>
    </div>
  );
}
