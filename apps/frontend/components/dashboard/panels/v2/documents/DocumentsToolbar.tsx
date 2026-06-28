'use client';

import React from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { StatusFilter } from './types';
import { STATUS_FILTER_OPTIONS } from './types';

interface DocumentsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onCreateNew: () => void;
  // "receipt" trims the signature-flow statuses and rewords the search/CTA.
  entity?: 'document' | 'receipt';
}

// Statuses a receipt can really have (no VIEWED/SIGNED/COMPLETED).
const RECEIPT_STATUS_VALUES = new Set<StatusFilter>([
  'all',
  'DRAFT',
  'SENT',
  'SEND_FAILED',
  'CANCELLED',
  'VOID',
]);

export function DocumentsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateNew,
  entity = 'document',
}: DocumentsToolbarProps) {
  const isReceipt = entity === 'receipt';
  const options = isReceipt
    ? STATUS_FILTER_OPTIONS.filter((o) => RECEIPT_STATUS_VALUES.has(o.value))
    : STATUS_FILTER_OPTIONS;
  const statusTabs = options.map((o) => ({
    value: o.value,
    label: o.value === 'all' ? 'All' : o.label,
  }));

  return (
    <div className="documents-v2-toolbar">
      <div className="documents-v2-toolbar__search">
        <Search size={18} />
        <input
          type="text"
          className="documents-v2-toolbar__search-input"
          placeholder={
            isReceipt
              ? 'Search by number or client...'
              : 'Search by number, client, or type...'
          }
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search ? (
          <button
            type="button"
            className="documents-v2-toolbar__search-clear"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {/* Desktop (≥1024px): single-select status tabs. */}
      <div className="documents-filter-tabs" role="group" aria-label="Status filter">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={
              `documents-filter-tab` +
              (tab.value === 'all' ? ' documents-filter-tab--all' : '') +
              (statusFilter === tab.value ? ' documents-filter-tab--active' : '')
            }
            onClick={() => onStatusFilterChange(tab.value)}
            aria-pressed={statusFilter === tab.value}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="documents-v2-toolbar__filters">
        {/* Mobile (<1024px): keep the existing Filters dropdown. */}
        <select
          className="documents-v2-toolbar__filter documents-filters-mobile"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="documents-v2-toolbar__create-btn"
          onClick={onCreateNew}
        >
          <Plus size={16} />
          <span>{isReceipt ? 'New Receipt' : 'New Document'}</span>
        </button>
      </div>
    </div>
  );
}
