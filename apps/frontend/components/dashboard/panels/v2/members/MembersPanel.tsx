'use client';

import React, { useState, useEffect } from 'react';
import { MembersPanelHeader } from './MembersPanelHeader';
import { MembersToolbar } from './MembersToolbar';
import { MembersTable } from './MembersTable';
import { MemberCards } from './MemberCards';
import { MembersEmptyState } from './MembersEmptyState';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { DeactivateUserModal } from './DeactivateUserModal';
import { MemberDetailModal } from './MemberDetailModal';
import { AccountRequestsTable } from './AccountRequestsTable';
import { AccountRequestsEmptyState } from './AccountRequestsEmptyState';
import { AccountRequestsSummary } from './AccountRequestsSummary';
import { AccountRequestDetailModal } from './AccountRequestDetailModal';
import type {
  ManagedUser,
  AccountRequest,
  CreateUserData,
  UpdateUserData,
  ResetPasswordData
} from './types';
import './members-panel.css';

export interface MembersPanelProps {
  role: 'master' | 'admin' | 'user';
  currentUserId: string;
  onFetchUsers: () => Promise<ManagedUser[]>;
  onFetchAccountRequests: () => Promise<AccountRequest[]>;
  onCreateUser: (data: CreateUserData) => Promise<void>;
  onUpdateUser: (id: string, data: UpdateUserData) => Promise<void>;
  onDeactivateUser: (id: string) => Promise<void>;
  onReactivateUser: (id: string) => Promise<void>;
  onResetPassword: (id: string, data: ResetPasswordData) => Promise<void>;
  onUpdateAccountRequestStatus: (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => Promise<void>;
}

type TabType = 'members' | 'requests';
type ModalType = 'create' | 'edit' | 'reset-password' | 'deactivate' | 'detail' | 'request-detail' | null;

export function MembersPanel({
  role,
  currentUserId,
  onFetchUsers,
  onFetchAccountRequests,
  onCreateUser,
  onUpdateUser,
  onDeactivateUser,
  onReactivateUser,
  onResetPassword,
  onUpdateAccountRequestStatus,
}: MembersPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ManagedUser[]>([]);
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'MASTER' | 'USER'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await onFetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await onFetchAccountRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === 'members') {
      void fetchUsers();
    } else {
      void fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Filter users
  useEffect(() => {
    let filtered = users;

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(searchLower) ||
        u.firstName?.toLowerCase().includes(searchLower) ||
        u.lastName?.toLowerCase().includes(searchLower) ||
        u.companyProfile?.companyName?.toLowerCase().includes(searchLower)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, search, roleFilter, statusFilter]);

  // Filter requests
  useEffect(() => {
    let filtered = requests;

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.fullName.toLowerCase().includes(searchLower) ||
        r.email.toLowerCase().includes(searchLower)
      );
    }

    if (requestStatusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === requestStatusFilter);
    }

    // Sort: PENDING first, then by createdAt desc
    filtered.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredRequests(filtered);
  }, [requests, search, requestStatusFilter]);

  // Handlers
  const handleCreateUser = async (data: CreateUserData) => {
    await onCreateUser(data);
    await fetchUsers();
    setActiveModal(null);
  };

  const handleUpdateUser = async (data: UpdateUserData) => {
    if (!selectedUser) return;
    await onUpdateUser(selectedUser.id, data);
    await fetchUsers();
    setActiveModal(null);
    setSelectedUser(null);
  };

  const handleDeactivate = async () => {
    if (!selectedUser) return;
    await onDeactivateUser(selectedUser.id);
    await fetchUsers();
    setActiveModal(null);
    setSelectedUser(null);
  };

  const handleReactivate = async (user: ManagedUser) => {
    await onReactivateUser(user.id);
    await fetchUsers();
  };

  const handleResetPassword = async (data: ResetPasswordData) => {
    if (!selectedUser) return;
    await onResetPassword(selectedUser.id, data);
    await fetchUsers();
    setActiveModal(null);
    setSelectedUser(null);
  };

  const handleApproveRequest = async (request: AccountRequest) => {
    await onUpdateAccountRequestStatus(request.id, 'APPROVED');
    await fetchRequests();
  };

  const handleRejectRequest = async (request: AccountRequest) => {
    await onUpdateAccountRequestStatus(request.id, 'REJECTED');
    await fetchRequests();
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setSelectedRequest(null);
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const showEmpty = !loading && (
    activeTab === 'members' ? filteredUsers.length === 0 : filteredRequests.length === 0
  );

  return (
    <div className="members-panel">
      <MembersPanelHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewMember={() => setActiveModal('create')}
      />

      {activeTab === 'members' ? (
        <>
          <MembersToolbar
            search={search}
            onSearchChange={setSearch}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            count={filteredUsers.length}
            loading={loading}
          />

          {showEmpty ? (
            <MembersEmptyState
              hasFilters={search.length > 0 || roleFilter !== 'all' || statusFilter !== 'all'}
              onNewMember={() => setActiveModal('create')}
            />
          ) : (
            <>
              <MembersTable
                users={filteredUsers}
                currentUserId={currentUserId}
                onView={(user) => { setSelectedUser(user); setActiveModal('detail'); }}
                onEdit={(user) => { setSelectedUser(user); setActiveModal('edit'); }}
                onResetPassword={(user) => { setSelectedUser(user); setActiveModal('reset-password'); }}
                onDeactivate={(user) => { setSelectedUser(user); setActiveModal('deactivate'); }}
                onReactivate={handleReactivate}
              />
              <MemberCards
                users={filteredUsers}
                currentUserId={currentUserId}
                onView={(user) => { setSelectedUser(user); setActiveModal('detail'); }}
                onEdit={(user) => { setSelectedUser(user); setActiveModal('edit'); }}
                onResetPassword={(user) => { setSelectedUser(user); setActiveModal('reset-password'); }}
                onDeactivate={(user) => { setSelectedUser(user); setActiveModal('deactivate'); }}
                onReactivate={handleReactivate}
              />
            </>
          )}
        </>
      ) : (
        <>
          <AccountRequestsSummary pendingCount={pendingCount} />

          <MembersToolbar
            search={search}
            onSearchChange={setSearch}
            requestStatusFilter={requestStatusFilter}
            onRequestStatusFilterChange={setRequestStatusFilter}
            count={filteredRequests.length}
            loading={loading}
            isRequestsMode
          />

          {showEmpty ? (
            <AccountRequestsEmptyState
              hasFilters={search.length > 0 || requestStatusFilter !== 'all'}
            />
          ) : (
            <AccountRequestsTable
              requests={filteredRequests}
              onView={(request) => { setSelectedRequest(request); setActiveModal('request-detail'); }}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          )}
        </>
      )}

      {/* Modals */}
      {activeModal === 'create' && (
        <CreateUserModal onSubmit={handleCreateUser} onClose={closeModal} />
      )}

      {activeModal === 'edit' && selectedUser && (
        <EditUserModal user={selectedUser} onSubmit={handleUpdateUser} onClose={closeModal} />
      )}

      {activeModal === 'reset-password' && selectedUser && (
        <ResetPasswordModal user={selectedUser} onSubmit={handleResetPassword} onClose={closeModal} />
      )}

      {activeModal === 'deactivate' && selectedUser && (
        <DeactivateUserModal user={selectedUser} onConfirm={handleDeactivate} onClose={closeModal} />
      )}

      {activeModal === 'detail' && selectedUser && (
        <MemberDetailModal
          user={selectedUser}
          currentUserId={currentUserId}
          onEdit={() => setActiveModal('edit')}
          onResetPassword={() => setActiveModal('reset-password')}
          onDeactivate={() => setActiveModal('deactivate')}
          onReactivate={() => handleReactivate(selectedUser)}
          onClose={closeModal}
        />
      )}

      {activeModal === 'request-detail' && selectedRequest && (
        <AccountRequestDetailModal
          request={selectedRequest}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
