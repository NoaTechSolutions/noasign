'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

export interface CustomersPanelProps {
  role: 'master' | 'admin' | 'user';
  currentUserId: string;
  // Handler props — wired from page.tsx via apiRequest (auth-aware).
  // Refactored from the tarball's raw fetch() calls which bypass JwtAuthGuard.
  onFetchCustomers: () => Promise<Customer[]>;
  onCreateCustomer: (data: CustomerFormData) => Promise<Customer>;
  onUpdateCustomer: (id: string, data: CustomerFormData) => Promise<Customer>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onAssignCustomer: (id: string, newUserId: string) => Promise<Customer>;
  onFetchUsersForAssign: () => Promise<CustomerOwnerUser[]>;
}

export function CustomersPanel({
  role,
  currentUserId,
  onFetchCustomers,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAssignCustomer,
  onFetchUsersForAssign,
}: CustomersPanelProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'PERSONAL' | 'BUSINESS'>('all');

  const [activeModal, setActiveModal] = useState<'type-selector' | 'form' | 'detail' | 'delete' | 'assign' | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [customerType, setCustomerType] = useState<'PERSONAL' | 'BUSINESS'>('PERSONAL');

  const reloadCustomers = useCallback(async () => {
    setLoading(true);
    try {
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

  // Client-side filtering: includes businessName + phone beyond backend's
  // fullName + email search.
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

    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.customerType === typeFilter);
    }

    setFilteredCustomers(filtered);
  }, [customers, search, typeFilter]);

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
    await reloadCustomers();
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
  };

  const showEmpty = !loading && filteredCustomers.length === 0;

  return (
    <div className="customers-panel">
      <CustomersPanelHeader role={role} onNewCustomer={handleNewCustomer} />

      <CustomersToolbar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        count={filteredCustomers.length}
        loading={loading}
      />

      {showEmpty ? (
        <CustomersEmptyState
          hasSearch={search.trim().length > 0 || typeFilter !== 'all'}
          onNewCustomer={handleNewCustomer}
        />
      ) : (
        <>
          <CustomersTable
            customers={filteredCustomers}
            role={role}
            currentUserId={currentUserId}
            onView={handleViewCustomer}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            onAssign={handleAssignCustomer}
          />
          <CustomerCards
            customers={filteredCustomers}
            role={role}
            currentUserId={currentUserId}
            onView={handleViewCustomer}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            onAssign={handleAssignCustomer}
          />
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
        />
      )}

      {activeModal === 'detail' && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          role={role}
          currentUserId={currentUserId}
          onEdit={() => handleEditCustomer(selectedCustomer)}
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
