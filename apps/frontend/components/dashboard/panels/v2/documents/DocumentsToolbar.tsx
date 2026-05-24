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
}

export function DocumentsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreateNew,
}: DocumentsToolbarProps) {
  return (
    <div className="documents-v2-toolbar">
      <div className="documents-v2-toolbar__search">
        <Search size={18} />
        <input
          type="text"
          className="documents-v2-toolbar__search-input"
          placeholder="Search by number, customer, or type..."
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

      <div className="documents-v2-toolbar__filters">
        <select
          className="documents-v2-toolbar__filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
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
          <span>New Document</span>
        </button>
      </div>
    </div>
  );
}
