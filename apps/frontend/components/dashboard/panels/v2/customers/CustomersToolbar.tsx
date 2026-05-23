'use client';

import React from 'react';

interface CustomersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: 'all' | 'PERSONAL' | 'BUSINESS';
  onTypeFilterChange: (value: 'all' | 'PERSONAL' | 'BUSINESS') => void;
  count: number;
  loading: boolean;
}

export function CustomersToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  count,
  loading
}: CustomersToolbarProps) {
  return (
    <div className="customers-toolbar">
      <div className="customers-toolbar__search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name, email, phone, or company..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="customers-toolbar__input"
        />
      </div>

      <div className="customers-toolbar__filters">
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as 'all' | 'PERSONAL' | 'BUSINESS')}
          className="customers-toolbar__select"
        >
          <option value="all">All types</option>
          <option value="PERSONAL">Personal</option>
          <option value="BUSINESS">Business</option>
        </select>

        <div className="customers-toolbar__count">
          {loading ? 'Loading...' : `${count} customer${count !== 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  );
}
