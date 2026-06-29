'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DocumentTableRow } from './DocumentTableRow';
import type { V2DocumentItem, V2DocumentAction, StatusFilter } from './types';
import { STATUS_FILTER_OPTIONS } from './types';

interface DocumentsTableProps {
  documents: V2DocumentItem[];
  selectedId: string | null;
  onSelect: (docId: string) => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
  isLoading?: boolean;
  // Header quick-filters (Type + Status). Share state with the toolbar tabs.
  statusFilter?: StatusFilter;
  typeFilter?: string;
  availableTypes?: string[];
  onQuickFilterStatus?: (value: StatusFilter) => void;
  onQuickFilterType?: (value: string) => void;
  // Ids of rows just inserted — they play the entrance animation once.
  newIds?: Set<string>;
  // Receipts-only tenants (contractsEnabled === false): col 1 becomes "Receipt #"
  // (number only) and the redundant "Type" column becomes "Recipient".
  receiptsOnly?: boolean;
}

// Skeleton row matching the 5 columns so there's no layout jump.
function SkeletonRow() {
  const line = (width: string) => (
    <span
      className="skeleton-pulse skeleton-line"
      style={{ display: 'block', width, height: '12px' }}
      aria-hidden="true"
    />
  );
  return (
    <tr>
      <td>
        {line('120px')}
        <span style={{ display: 'block', height: '6px' }} />
        {line('80px')}
      </td>
      <td>{line('70%')}</td>
      <td>{line('80px')}</td>
      <td>{line('64px')}</td>
      <td>
        <span
          className="skeleton-pulse skeleton-circle"
          style={{ display: 'inline-block', width: '20px', height: '20px' }}
          aria-hidden="true"
        />
      </td>
    </tr>
  );
}

// Quick-filter popover for a single header cell (mirrors the Clients module).
interface QuickFilterThProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  isActive: boolean;
}

function QuickFilterTh({ label, options, onSelect, isActive }: QuickFilterThProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <span className="documents-th" ref={ref}>
      {label}
      <button
        type="button"
        className={`documents-th-filter${isActive ? ' documents-th-filter--active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={`Filter by ${label}`}
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </button>
      {open && (
        <div className="documents-th-filter-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export function DocumentsTable({
  documents,
  selectedId,
  onSelect,
  onAction,
  isLoading,
  statusFilter = 'all',
  typeFilter = 'all',
  availableTypes = [],
  onQuickFilterStatus,
  onQuickFilterType,
  newIds,
  receiptsOnly = false,
}: DocumentsTableProps) {
  const statusOptions = STATUS_FILTER_OPTIONS.map((o) => ({
    value: o.value,
    label: o.value === 'all' ? 'All' : o.label,
  }));
  const typeOptions = [
    { value: 'all', label: 'All' },
    ...availableTypes.map((t) => ({ value: t, label: t })),
  ];

  return (
    <div className="documents-v2-table-wrapper">
      <table className="documents-v2-table">
        <thead>
          <tr>
            <th>{receiptsOnly ? 'Receipt #' : 'Document'}</th>
            <th>
              {receiptsOnly ? (
                // Receipts have a single type — the type quick-filter is moot.
                // The column shows the recipient instead.
                'Recipient'
              ) : onQuickFilterType ? (
                <QuickFilterTh
                  label="Type"
                  options={typeOptions}
                  onSelect={onQuickFilterType}
                  isActive={typeFilter !== 'all'}
                />
              ) : (
                'Type'
              )}
            </th>
            <th>Date</th>
            <th>
              {onQuickFilterStatus ? (
                <QuickFilterTh
                  label="Status"
                  options={statusOptions}
                  onSelect={(v) => onQuickFilterStatus(v as StatusFilter)}
                  isActive={statusFilter !== 'all'}
                />
              ) : (
                'Status'
              )}
            </th>
            <th className="documents-v2-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : documents.map((doc) => (
                <DocumentTableRow
                  key={doc.id}
                  document={doc}
                  selected={doc.id === selectedId}
                  onSelect={onSelect}
                  onAction={onAction}
                  isNew={newIds?.has(doc.id) ?? false}
                  receiptsOnly={receiptsOnly}
                />
              ))}
        </tbody>
      </table>
    </div>
  );
}
