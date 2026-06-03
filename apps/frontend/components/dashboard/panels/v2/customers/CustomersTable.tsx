'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CustomerTableRow } from './CustomerTableRow';
import type { Customer } from './types';

interface CustomersTableProps {
  customers: Customer[];
  role: 'master' | 'admin' | 'user';
  currentUserId: string;
  loading?: boolean;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAssign: (customer: Customer) => void;
  onChangeStatus: (customer: Customer, status: 'ACTIVE' | 'INACTIVE' | 'DELETED') => void | Promise<void>;
  onRestore?: (customer: Customer) => void | Promise<void>;
  onQuickFilterType?: (v: 'all' | 'PERSONAL' | 'BUSINESS') => void;
  onQuickFilterStatus?: (v: 'all' | 'ACTIVE' | 'INACTIVE' | 'DELETED') => void;
  /** Whether the corresponding column has an active filter — drives the
   *  icon's color (brand when active, muted otherwise) and forces opacity 1. */
  typeFilterActive?: boolean;
  statusFilterActive?: boolean;
}

const SKELETON_ROWS = 5;

function SkeletonRow({ showOwner }: { showOwner: boolean }) {
  return (
    <tr className="customer-row" aria-hidden="true">
      {/* Name */}
      <td>
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'block', width: '140px', height: '14px' }}
        />
      </td>
      {/* Type badge */}
      <td>
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'inline-block', width: '76px', height: '22px', borderRadius: '999px' }}
        />
      </td>
      {/* Phone */}
      <td>
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'block', width: '100px', height: '14px' }}
        />
      </td>
      {/* Status badge */}
      <td>
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'inline-block', width: '64px', height: '22px', borderRadius: '999px' }}
        />
      </td>
      {/* Owner (master/admin only) */}
      {showOwner && (
        <td>
          <span
            className="skeleton-pulse skeleton-line"
            style={{ display: 'block', width: '110px', height: '14px' }}
          />
        </td>
      )}
      {/* Actions */}
      <td className="customer-row__actions">
        <span
          className="skeleton-pulse skeleton-line"
          style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '6px' }}
        />
      </td>
    </tr>
  );
}

// Quick-filter popover for a single header cell
interface QuickFilterThProps {
  label: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  isActive?: boolean;
}

function QuickFilterTh({ label, options, onSelect, isActive = false }: QuickFilterThProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <span className="customers-th" ref={ref}>
      {label}
      <button
        type="button"
        className={`customers-th-filter${isActive ? ' customers-th-filter--active' : ''}`}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title={`Filter by ${label}`}
      >
        {/* funnel icon */}
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
      </button>
      {open && (
        <div className="customers-th-filter-menu">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onSelect(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export function CustomersTable({
  customers,
  role,
  currentUserId,
  loading = false,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onChangeStatus,
  onRestore,
  onQuickFilterType,
  onQuickFilterStatus,
  typeFilterActive = false,
  statusFilterActive = false,
}: CustomersTableProps) {
  const showOwner = role === 'master' || role === 'admin';

  return (
    <div className="customers-table-wrapper">
      <table className="customers-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>
              {onQuickFilterType ? (
                <QuickFilterTh
                  label="Type"
                  isActive={typeFilterActive}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'PERSONAL', label: 'Personal' },
                    { value: 'BUSINESS', label: 'Business' },
                  ]}
                  onSelect={(v) => onQuickFilterType(v as 'all' | 'PERSONAL' | 'BUSINESS')}
                />
              ) : 'Type'}
            </th>
            <th>Phone</th>
            <th>
              {onQuickFilterStatus ? (
                <QuickFilterTh
                  label="Status"
                  isActive={statusFilterActive}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                    // Deleted is MASTER-only (matches the toolbar Status filter).
                    ...(role === 'master' ? [{ value: 'DELETED', label: 'Deleted' }] : []),
                  ]}
                  onSelect={(v) => onQuickFilterStatus(v as 'all' | 'ACTIVE' | 'INACTIVE' | 'DELETED')}
                />
              ) : 'Status'}
            </th>
            {showOwner && <th>Owner</th>}
            <th className="customers-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <SkeletonRow key={i} showOwner={showOwner} />
              ))
            : customers.map(customer => (
                <CustomerTableRow
                  key={customer.id}
                  customer={customer}
                  role={role}
                  currentUserId={currentUserId}
                  showOwner={showOwner}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAssign={onAssign}
                  onChangeStatus={onChangeStatus}
                  onRestore={onRestore}
                />
              ))}
        </tbody>
      </table>
    </div>
  );
}
