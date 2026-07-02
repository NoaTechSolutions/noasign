'use client';

import React from 'react';

interface MembersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  count: number;
  loading: boolean;

  // Members mode
  roleFilter?: 'all' | 'SUPERADMIN' | 'USER';
  onRoleFilterChange?: (value: 'all' | 'SUPERADMIN' | 'USER') => void;
  statusFilter?: 'all' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  onStatusFilterChange?: (value: 'all' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => void;

  // Requests mode
  requestStatusFilter?: 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';
  onRequestStatusFilterChange?: (value: 'all' | 'PENDING' | 'APPROVED' | 'REJECTED') => void;
  isRequestsMode?: boolean;
}

export function MembersToolbar({
  search,
  onSearchChange,
  count,
  loading,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  requestStatusFilter,
  onRequestStatusFilterChange,
  isRequestsMode = false,
}: MembersToolbarProps) {
  return (
    <div className="members-toolbar">
      <div className="members-toolbar__search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder={isRequestsMode ? 'Search by name or email...' : 'Search members...'}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="members-toolbar__search-input"
        />
        {search && (
          <button type="button" className="members-toolbar__search-clear" onClick={() => onSearchChange('')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      <div className="members-toolbar__filters">
        {!isRequestsMode ? (
          <>
            <select value={roleFilter} onChange={(e) => onRoleFilterChange?.(e.target.value as 'all' | 'SUPERADMIN' | 'USER')} className="members-toolbar__filter">
              <option value="all">All roles</option>
              <option value="SUPERADMIN">Master</option>
              <option value="USER">User</option>
            </select>

            <select value={statusFilter} onChange={(e) => onStatusFilterChange?.(e.target.value as 'all' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED')} className="members-toolbar__filter">
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </>
        ) : (
          <select value={requestStatusFilter} onChange={(e) => onRequestStatusFilterChange?.(e.target.value as 'all' | 'PENDING' | 'APPROVED' | 'REJECTED')} className="members-toolbar__filter">
            <option value="all">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        )}
      </div>

      <div className="members-toolbar__count">
        {loading ? 'Loading...' : `${count} ${count === 1 ? 'result' : 'results'}`}
      </div>
    </div>
  );
}
