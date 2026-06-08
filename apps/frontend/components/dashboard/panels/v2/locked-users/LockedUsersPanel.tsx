'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LockedUsersPanelHeader } from './LockedUsersPanelHeader';
import { LockedUsersToolbar } from './LockedUsersToolbar';
import { LockedUsersSummary, LockedUsersSummarySkeleton } from './LockedUsersSummary';
import { LockedUsersTable, LockedUsersTableSkeleton } from './LockedUsersTable';
import { LockedUsersCards, LockedUsersCardsSkeleton } from './LockedUsersCards';
import { LockedUsersEmptyState } from './LockedUsersEmptyState';
import type { LockedUser, LockedUserWithStatus } from './types';
import { computeStatus } from './types';
import './locked-users-panel.css';

export interface LockedUsersPanelProps {
  onFetchLockedUsers: () => Promise<LockedUser[]>;
  onUnlockUser: (userId: string) => Promise<void>;
}

export function LockedUsersPanel({
  onFetchLockedUsers,
  onUnlockUser,
}: LockedUsersPanelProps) {
  const [users, setUsers] = useState<LockedUserWithStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<LockedUserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  // Tracks only the very first fetch — auto-refresh must NOT re-trigger skeletons.
  const [initialLoading, setInitialLoading] = useState(true);
  const isFirstFetch = useRef(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'LOCKED' | 'UNLOCKED'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await onFetchLockedUsers();
      setUsers(data.map(computeStatus));
    } catch (error) {
      console.error('Error fetching locked users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
      // Only clear initialLoading once — subsequent auto-refresh calls are silent.
      if (isFirstFetch.current) {
        isFirstFetch.current = false;
        setInitialLoading(false);
      }
    }
  }, [onFetchLockedUsers]);

  // Initial fetch
  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Auto-refresh every 30s (with Page Visibility API)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        void fetchUsers();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchUsers]);

  // Local countdown updates every 1min (no fetch — recomputes status from current time)
  useEffect(() => {
    const timer = setInterval(() => {
      setUsers((prev) => prev.map((user) => computeStatus(user)));
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Filter users (client-side)
  useEffect(() => {
    let filtered = users;

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((u) => u.email.toLowerCase().includes(searchLower));
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, search, statusFilter]);

  // Optimistic unlock with rollback on failure
  const handleUnlock = async (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.userId === userId
          ? { ...u, isLocked: false, status: 'UNLOCKED', minutesUntilUnlock: 0 }
          : u,
      ),
    );

    try {
      await onUnlockUser(userId);
    } catch (error) {
      console.error('Error unlocking user:', error);
      // Rollback by re-fetching authoritative state
      void fetchUsers();
    }
  };

  const activeLockouts = users.filter((u) => u.isLocked).length;
  const showEmpty = !loading && filteredUsers.length === 0;

  return (
    <div className="locked-users-panel">
      <LockedUsersPanelHeader isLoading={initialLoading} />

      <LockedUsersToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        count={filteredUsers.length}
        loading={loading}
      />

      {/* Summary — show skeleton on initial load, real data once loaded */}
      {initialLoading ? (
        <LockedUsersSummarySkeleton />
      ) : activeLockouts > 0 ? (
        <LockedUsersSummary activeLockouts={activeLockouts} users={users} />
      ) : null}

      {/* Table / Cards — show skeletons on initial load only */}
      {initialLoading ? (
        <>
          <LockedUsersTableSkeleton />
          <LockedUsersCardsSkeleton />
        </>
      ) : showEmpty ? (
        <LockedUsersEmptyState
          hasFilters={search.length > 0 || statusFilter !== 'all'}
        />
      ) : (
        <>
          <LockedUsersTable users={filteredUsers} onUnlock={handleUnlock} />
          <LockedUsersCards users={filteredUsers} onUnlock={handleUnlock} />
        </>
      )}
    </div>
  );
}
