'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CustomersPanelHeader } from './CustomersPanelHeader';
import { CustomersToolbar } from './CustomersToolbar';
import { CustomersTable } from './CustomersTable';
import { CustomerCards } from './CustomerCards';
import { CustomersEmptyState } from './CustomersEmptyState';
import { TypeSelectorModal } from './TypeSelectorModal';
import { CustomerFormDrawer } from './CustomerFormDrawer';
import { CustomerDetailModal } from './CustomerDetailModal';
import { DeleteCustomerModal } from './DeleteCustomerModal';
import { AssignCustomerModal } from './AssignCustomerModal';
import type { Customer, CustomerFormData, CustomerOwnerUser } from './types';
import './customers-panel.css';

const PAGE_SIZE = 10;

// Parse a comma-separated URL param into a validated list (ignores junk values).
function parseFilterParam<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export interface CustomersPanelProps {
  role: 'superadmin' | 'user';
  currentUserId: string;
  // Handler props — wired from page.tsx via apiRequest (auth-aware).
  // Refactored from the tarball's raw fetch() calls which bypass JwtAuthGuard.
  onFetchCustomers: () => Promise<Customer[]>;
  onCreateCustomer: (data: CustomerFormData) => Promise<Customer>;
  onUpdateCustomer: (id: string, data: CustomerFormData) => Promise<Customer>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onAssignCustomer: (id: string, newUserId: string) => Promise<Customer>;
  onChangeStatus: (id: string, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') => Promise<Customer>;
  onFetchUsersForAssign: () => Promise<CustomerOwnerUser[]>;
  onFetchDeletedCustomers: () => Promise<Customer[]>;
  onRestoreCustomer: (id: string) => Promise<Customer>;
}

export function CustomersPanel({
  role,
  currentUserId,
  onFetchCustomers,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAssignCustomer,
  onChangeStatus,
  onFetchUsersForAssign,
  onRestoreCustomer,
}: CustomersPanelProps) {
  // Filters + search are seeded from the URL so they survive a reload and can
  // be shared as a link (e.g. ?panel=customers&type=BUSINESS&status=ACTIVE&search=garcia).
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  // Multi-select filter arrays. Empty array = "no filter for this group" (= All).
  // Filter logic: OR inside a group (e.g. PERSONAL + BUSINESS = both types pass),
  // AND between groups (type AND status).
  const [typeFilters, setTypeFilters] = useState<Array<'PERSONAL' | 'BUSINESS'>>(
    () => parseFilterParam(searchParams.get('type'), ['PERSONAL', 'BUSINESS']),
  );
  const [statusFilters, setStatusFilters] = useState<Array<'ACTIVE' | 'INACTIVE' | 'DELETED'>>(
    () => parseFilterParam(searchParams.get('status'), ['ACTIVE', 'INACTIVE', 'DELETED']),
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Mirror filters + search back into the URL via replaceState (NOT the Next
  // router) so persisting them never re-runs the page's data effects. Empty
  // values are deleted, so clearing filters clears the URL too.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('panel', 'customers');
    const sync = (key: string, value: string) => (value ? params.set(key, value) : params.delete(key));
    sync('search', search.trim());
    sync('type', typeFilters.join(','));
    sync('status', statusFilters.join(','));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [search, typeFilters, statusFilters]);

  const [activeModal, setActiveModal] = useState<'type-selector' | 'form' | 'detail' | 'delete' | 'assign' | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [customerType, setCustomerType] = useState<'PERSONAL' | 'BUSINESS'>('PERSONAL');
  // O1: while the create form is open, Back re-opens the type selector as an
  // OVERLAY (the drawer stays mounted → entered data is preserved).
  const [reselectType, setReselectType] = useState(false);

  const reloadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      // Single source: the backend returns all statuses for SUPERADMIN (including
      // DELETED) and excludes DELETED for USER/ADMIN. The DELETED visibility is
      // a client-side filter concern now — no separate "deleted" fetch.
      const list = await onFetchCustomers();
      setCustomers(list);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [onFetchCustomers]);

  useEffect(() => {
    void reloadCustomers();
  }, [reloadCustomers]);

  // Client-side filtering
  useEffect(() => {
    let filtered = customers;

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.fullName.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower) ||
        (c.business?.businessName?.toLowerCase().includes(searchLower))
      );
    }

    if (typeFilters.length > 0) {
      filtered = filtered.filter(c => typeFilters.includes(c.customerType));
    }

    if (statusFilters.length > 0) {
      filtered = filtered.filter(c => statusFilters.includes(c.status ?? 'ACTIVE'));
    } else {
      // Default view never surfaces DELETED clients — SUPERADMIN must explicitly
      // pick the "Deleted" filter to see them.
      filtered = filtered.filter(c => (c.status ?? 'ACTIVE') !== 'DELETED');
    }

    setFilteredCustomers(filtered);
  }, [customers, search, typeFilters, statusFilters]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilters, statusFilters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const pageItems = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleNewCustomer = () => setActiveModal('type-selector');

  const handleTypeSelected = (type: 'PERSONAL' | 'BUSINESS') => {
    setCustomerType(type);
    setFormMode('create');
    setSelectedCustomer(null);
    setActiveModal('form');
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerType(customer.customerType);
    setFormMode('edit');
    setActiveModal('form');
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveModal('detail');
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveModal('delete');
  };

  const handleAssignCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveModal('assign');
  };

  const handleFormSubmit = async (data: CustomerFormData) => {
    if (formMode === 'create') {
      await onCreateCustomer(data);
    } else if (selectedCustomer) {
      await onUpdateCustomer(selectedCustomer.id, data);
    }
    toast.success(formMode === 'create' ? 'Client created successfully' : 'Client updated successfully');
    // Reload is best-effort — if it fails, the save already succeeded so we
    // still close the modal; the next manual refresh will pick up the row.
    try { await reloadCustomers(); } catch (err) { console.error('Failed to reload clients after save', err); }
    setActiveModal(null);
    setSelectedCustomer(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    await onDeleteCustomer(selectedCustomer.id);
    await reloadCustomers();
    setActiveModal(null);
    setSelectedCustomer(null);
  };

  const handleConfirmAssign = async (newUserId: string) => {
    if (!selectedCustomer) return;
    await onAssignCustomer(selectedCustomer.id, newUserId);
    await reloadCustomers();
    setActiveModal(null);
    setSelectedCustomer(null);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedCustomer(null);
    setReselectType(false);
  };

  const handleRestoreCustomer = async (customer: Customer) => {
    await onRestoreCustomer(customer.id);
    await reloadCustomers();
  };

  const handleChangeStatus = async (
    customer: Customer,
    status: 'ACTIVE' | 'INACTIVE' | 'DELETED',
  ) => {
    if ((customer.status ?? 'ACTIVE') === status) return;
    const labels = { ACTIVE: 'Active', INACTIVE: 'Inactive', DELETED: 'Deleted' } as const;
    try {
      await onChangeStatus(customer.id, status);
      toast.success(`Status updated to ${labels[status]}`);
      await reloadCustomers();
    } catch (err) {
      console.error('Failed to change status', err);
      toast.error('Failed to update status. Please try again.');
    }
  };

  const showEmpty = !loading && filteredCustomers.length === 0;

  return (
    <div className="customers-panel">
      <CustomersPanelHeader role={role} onNewCustomer={handleNewCustomer} isLoading={loading} />

      <CustomersToolbar
        search={search}
        onSearchChange={setSearch}
        typeFilters={typeFilters}
        statusFilters={statusFilters}
        onSetTypeFilters={setTypeFilters}
        onSetStatusFilters={setStatusFilters}
        canSeeDeleted={role === 'superadmin'}
        loading={loading}
      />

      {showEmpty ? (
        <CustomersEmptyState
          hasSearch={search.trim().length > 0 || typeFilters.length > 0 || statusFilters.length > 0}
          onNewCustomer={handleNewCustomer}
        />
      ) : (
        <>
          <CustomersTable
            customers={pageItems}
            role={role}
            currentUserId={currentUserId}
            loading={loading}
            onView={handleViewCustomer}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            onAssign={handleAssignCustomer}
            onChangeStatus={handleChangeStatus}
            onRestore={handleRestoreCustomer}
            typeFilterActive={typeFilters.length > 0}
            statusFilterActive={statusFilters.length > 0}
            onQuickFilterType={(v) => setTypeFilters(v === 'all' ? [] : [v])}
            onQuickFilterStatus={(v) => setStatusFilters(v === 'all' ? [] : [v])}
          />
          <CustomerCards
            customers={pageItems}
            role={role}
            currentUserId={currentUserId}
            loading={loading}
            onView={handleViewCustomer}
            onChangeStatus={handleChangeStatus}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            onAssign={handleAssignCustomer}
            onRestore={handleRestoreCustomer}
          />

          {totalPages > 1 && (
            <div className="customers-pagination">
              <button
                type="button"
                className="customers-pagination__btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <span className="customers-pagination__info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="customers-pagination__btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {activeModal === 'type-selector' && (
        <TypeSelectorModal onSelect={handleTypeSelected} onClose={closeModal} />
      )}

      {activeModal === 'form' && (
        <CustomerFormDrawer
          mode={formMode}
          type={customerType}
          customer={selectedCustomer}
          onSubmit={handleFormSubmit}
          onClose={closeModal}
          // O1: create-only Back → re-choose the type (drawer stays mounted).
          onBack={formMode === 'create' ? () => setReselectType(true) : undefined}
          role={role}
          currentUserId={currentUserId}
          onFetchUsers={onFetchUsersForAssign}
        />
      )}

      {/* O1: type selector shown OVER the still-mounted create form, so switching
          type (or re-picking the same one) never discards what was entered. */}
      {activeModal === 'form' && reselectType && (
        <TypeSelectorModal
          onSelect={(t) => {
            setCustomerType(t);
            setReselectType(false);
          }}
          onClose={() => setReselectType(false)}
        />
      )}

      {activeModal === 'detail' && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          role={role}
          currentUserId={currentUserId}
          onUpdateCustomer={async (id, data) => {
            const updated = await onUpdateCustomer(id, data);
            await reloadCustomers();
            setSelectedCustomer(updated);
            return updated;
          }}
          onDelete={() => handleDeleteCustomer(selectedCustomer)}
          onAssign={() => handleAssignCustomer(selectedCustomer)}
          onClose={closeModal}
        />
      )}

      {activeModal === 'delete' && selectedCustomer && (
        <DeleteCustomerModal
          customer={selectedCustomer}
          onConfirm={handleConfirmDelete}
          onClose={closeModal}
        />
      )}

      {activeModal === 'assign' && selectedCustomer && (
        <AssignCustomerModal
          customer={selectedCustomer}
          onFetchUsers={onFetchUsersForAssign}
          onConfirm={handleConfirmAssign}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
