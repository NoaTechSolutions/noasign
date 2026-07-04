'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, User, Building2, Search } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import type { CustomerOption } from './DocumentSetupCard';

type ClientFilter = 'all' | 'personal' | 'business' | 'active' | 'inactive';

const FILTERS: { key: ClientFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'personal', label: 'Personal' },
  { key: 'business', label: 'Business' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

interface ClientSelectPopupProps {
  customers: CustomerOption[];
  selectedId: string;
  /** Empty string = "no client". */
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ClientSelectPopup({
  customers,
  selectedId,
  onSelect,
  onClose,
}: ClientSelectPopupProps) {
  useBlockScroll(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [pendingId, setPendingId] = useState(selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => {
        if (q) {
          const hay = `${c.fullName} ${c.email ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        switch (filter) {
          case 'personal':
            return c.customerType === 'PERSONAL';
          case 'business':
            return c.customerType === 'BUSINESS';
          // Missing status is treated as Active (it's the default).
          case 'active':
            return c.status !== 'INACTIVE';
          case 'inactive':
            return c.status === 'INACTIVE';
          default:
            return true;
        }
      })
      // Alphabetical by name (case-insensitive, locale-aware) so the list is
      // predictable regardless of creation order.
      .sort((a, b) =>
        (a.fullName ?? '').localeCompare(b.fullName ?? '', undefined, {
          sensitivity: 'base',
        }),
      );
  }, [customers, search, filter]);

  return (
    <div className="client-select-overlay" onClick={onClose}>
      <div
        className="client-select-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Select client"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="client-select-modal__header">
          <h3 className="client-select-modal__title">Select client</h3>
          <button
            type="button"
            className="client-select-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="client-select-modal__search">
          <Search size={16} />
          <input
            type="text"
            autoFocus
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="client-select-modal__tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`client-select-tab${filter === f.key ? ' client-select-tab--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="client-select-modal__list">
          {filtered.length === 0 ? (
            <div className="client-select-modal__empty">No clients match.</div>
          ) : (
            filtered.map((c) => {
              const isBusiness = c.customerType === 'BUSINESS';
              const inactive = c.status === 'INACTIVE';
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`client-select-row${pendingId === c.id ? ' client-select-row--selected' : ''}`}
                  onClick={() => setPendingId(c.id)}
                >
                  <span className="client-select-row__icon">
                    {isBusiness ? <Building2 size={18} /> : <User size={18} />}
                  </span>
                  <span className="client-select-row__info">
                    <span className="client-select-row__name">{c.fullName}</span>
                    <span className="client-select-row__meta">
                      {c.email ?? 'No email'}
                      {' · '}
                      <span className="client-select-row__badge">
                        {isBusiness ? 'Business' : 'Personal'}
                      </span>
                      {' · '}
                      <span
                        className={`client-select-row__status${inactive ? ' client-select-row__status--inactive' : ''}`}
                      >
                        {inactive ? 'Inactive' : 'Active'}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <footer className="client-select-modal__footer">
          <button
            type="button"
            className="client-select-modal__btn client-select-modal__btn--ghost"
            onClick={() => {
              onSelect('');
              onClose();
            }}
          >
            No client
          </button>
          <button
            type="button"
            className="client-select-modal__btn client-select-modal__btn--primary"
            onClick={() => {
              onSelect(pendingId);
              onClose();
            }}
          >
            Select
          </button>
        </footer>
      </div>
    </div>
  );
}
