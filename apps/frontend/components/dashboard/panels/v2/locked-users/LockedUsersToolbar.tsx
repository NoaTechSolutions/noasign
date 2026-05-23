'use client';

import React from 'react';

interface LockedUsersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'LOCKED' | 'UNLOCKED';
  onStatusFilterChange: (value: 'all' | 'LOCKED' | 'UNLOCKED') => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  count: number;
  loading: boolean;
}

export function LockedUsersToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  autoRefresh,
  onAutoRefreshChange,
  count,
  loading,
}: LockedUsersToolbarProps) {
  return (
    <div className="locked-users-toolbar">
      <div className="locked-users-toolbar__search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="locked-users-toolbar__search-input"
        />
        {search && (
          <button type="button" className="locked-users-toolbar__search-clear" onClick={() => onSearchChange('')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      <div className="locked-users-toolbar__filters">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'LOCKED' | 'UNLOCKED')}
          className="locked-users-toolbar__filter"
        >
          <option value="all">All statuses</option>
          <option value="LOCKED">Locked</option>
          <option value="UNLOCKED">Unlocked</option>
        </select>

        <button
          type="button"
          className={`auto-refresh-toggle ${autoRefresh ? 'auto-refresh-toggle--active' : ''}`}
          onClick={() => onAutoRefreshChange(!autoRefresh)}
          title={autoRefresh ? 'Auto-refresh ON (every 30s)' : 'Auto-refresh OFF'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          {autoRefresh ? 'Auto-refresh' : 'Refresh'}
        </button>
      </div>

      <div className="locked-users-toolbar__count">
        {loading ? 'Loading...' : `${count} ${count === 1 ? 'result' : 'results'}`}
      </div>
    </div>
  );
}
