'use client';

import React, { useState, useEffect } from 'react';
import { useDropdownPosition } from '@/components/dashboard/shared/use-dropdown-position';
import { useBlockScroll } from '@/lib/use-block-scroll';

type TypeOption = 'PERSONAL' | 'BUSINESS';
type StatusOption = 'ACTIVE' | 'INACTIVE' | 'DELETED';
type TypeRadio = 'all' | TypeOption;
type StatusRadio = 'all' | StatusOption;

interface CustomersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilters: TypeOption[];
  statusFilters: StatusOption[];
  onSetTypeFilters: (next: TypeOption[]) => void;
  onSetStatusFilters: (next: StatusOption[]) => void;
  // MASTER-only: unlocks the "Deleted" status filter (desktop tab + mobile radio).
  canSeeDeleted: boolean;
  loading: boolean;
}

// Helpers
function toggleIn<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}
function radioFromArray<T extends 'PERSONAL' | 'BUSINESS' | 'ACTIVE' | 'INACTIVE' | 'DELETED'>(arr: T[]): 'all' | T {
  // Best-fit projection: empty or multi → 'all'; single → that value.
  return arr.length === 1 ? arr[0] : 'all';
}

export function CustomersToolbar({
  search,
  onSearchChange,
  typeFilters,
  statusFilters,
  onSetTypeFilters,
  onSetStatusFilters,
  canSeeDeleted,
  loading,
}: CustomersToolbarProps) {
  // Fixed-position dropdown (escapes the toolbar's flex/overflow on narrow
  // viewports). Click-outside / Escape / scroll-close handled by the hook.
  // Estimated height = 320 (Type + Status sections + footer).
  const {
    open: dropdownOpen,
    toggle,
    close: closeDropdown,
    style: dropdownStyle,
    triggerRef,
    menuRef,
  } = useDropdownPosition(320);
  const [pendingType, setPendingType] = useState<TypeRadio>(radioFromArray(typeFilters));
  const [pendingStatus, setPendingStatus] = useState<StatusRadio>(radioFromArray(statusFilters));

  // Mobile detection via matchMedia — drives bottom-sheet rendering when the
  // dropdown is open. Initial render is `false` (server / desktop) to avoid
  // hydration mismatch; the effect updates after mount if mobile.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Block body scroll only while the bottom sheet is open on mobile.
  useBlockScroll(dropdownOpen && isMobile);

  // Wrap toggle so opening seeds the pending state from the live filter arrays.
  const guardedToggle = () => {
    if (!dropdownOpen) {
      setPendingType(radioFromArray(typeFilters));
      setPendingStatus(radioFromArray(statusFilters));
    }
    toggle();
  };

  const handleApply = () => {
    onSetTypeFilters(pendingType === 'all' ? [] : [pendingType]);
    onSetStatusFilters(pendingStatus === 'all' ? [] : [pendingStatus]);
    closeDropdown();
  };

  const handleClear = () => {
    setPendingType('all');
    setPendingStatus('all');
  };

  const clearAll = () => {
    onSetTypeFilters([]);
    onSetStatusFilters([]);
  };

  // Desktop tab active checks.
  const allActive = typeFilters.length === 0 && statusFilters.length === 0;
  const isType = (v: TypeOption) => typeFilters.includes(v);
  const isStatus = (v: StatusOption) => statusFilters.includes(v);

  // Mobile dropdown badge count (any active filter shows).
  const activeFilterCount = (typeFilters.length > 0 ? 1 : 0) + (statusFilters.length > 0 ? 1 : 0);

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
        {/* Desktop multi-select tab row (CSS hides on <1024px). */}
        <div className="clients-filter-tabs" role="group" aria-label="Client filters">
          <button
            type="button"
            className={`clients-filter-tab clients-filter-tab--all${allActive ? ' clients-filter-tab--active' : ''}`}
            onClick={clearAll}
            disabled={loading}
            aria-pressed={allActive}
          >
            All
          </button>
          <button
            type="button"
            className={`clients-filter-tab${isType('PERSONAL') ? ' clients-filter-tab--active' : ''}`}
            onClick={() => onSetTypeFilters(toggleIn(typeFilters, 'PERSONAL'))}
            disabled={loading}
            aria-pressed={isType('PERSONAL')}
          >
            Personal
          </button>
          <button
            type="button"
            className={`clients-filter-tab${isType('BUSINESS') ? ' clients-filter-tab--active' : ''}`}
            onClick={() => onSetTypeFilters(toggleIn(typeFilters, 'BUSINESS'))}
            disabled={loading}
            aria-pressed={isType('BUSINESS')}
          >
            Business
          </button>
          <button
            type="button"
            className={`clients-filter-tab${isStatus('ACTIVE') ? ' clients-filter-tab--active' : ''}`}
            onClick={() => onSetStatusFilters(toggleIn(statusFilters, 'ACTIVE'))}
            disabled={loading}
            aria-pressed={isStatus('ACTIVE')}
          >
            Active
          </button>
          <button
            type="button"
            className={`clients-filter-tab${isStatus('INACTIVE') ? ' clients-filter-tab--active' : ''}`}
            onClick={() => onSetStatusFilters(toggleIn(statusFilters, 'INACTIVE'))}
            disabled={loading}
            aria-pressed={isStatus('INACTIVE')}
          >
            Inactive
          </button>
          {canSeeDeleted && (
            <button
              type="button"
              className={`clients-filter-tab${isStatus('DELETED') ? ' clients-filter-tab--active' : ''}`}
              onClick={() => onSetStatusFilters(toggleIn(statusFilters, 'DELETED'))}
              disabled={loading}
              aria-pressed={isStatus('DELETED')}
            >
              Deleted
            </button>
          )}
        </div>

        {/* Mobile filters button + dropdown (CSS hides on ≥1024px). */}
        <div className="customers-filters-wrap">
          <button
            ref={triggerRef}
            type="button"
            className="customers-filters-btn"
            onClick={guardedToggle}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="customers-filters-btn__count">{activeFilterCount}</span>
            )}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {dropdownOpen && (() => {
            const inner = (
              <>
                <div className="customers-filters-body">
                  <div className="customers-filters-section">
                    <div className="customers-filters-dropdown__section-label">Type</div>
                    {([
                      { value: 'all', label: 'All types' },
                      { value: 'PERSONAL', label: 'Personal' },
                      { value: 'BUSINESS', label: 'Business' },
                    ] as const).map(opt => (
                      <label key={opt.value} className="customers-filters-dropdown__option">
                        <input
                          type="radio"
                          name="type-filter"
                          value={opt.value}
                          checked={pendingType === opt.value}
                          onChange={() => setPendingType(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>

                  <div className="customers-filters-section">
                    <div className="customers-filters-dropdown__section-label">Status</div>
                    {([
                      { value: 'all', label: 'All statuses' },
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                      ...(canSeeDeleted ? [{ value: 'DELETED', label: 'Deleted' }] : []),
                    ] as { value: StatusRadio; label: string }[]).map(opt => (
                      <label key={opt.value} className="customers-filters-dropdown__option">
                        <input
                          type="radio"
                          name="status-filter"
                          value={opt.value}
                          checked={pendingStatus === opt.value}
                          onChange={() => setPendingStatus(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="customers-filters-dropdown__footer customers-filters-actions">
                  <button type="button" className="btn-secondary" onClick={handleClear}>Clear</button>
                  <button type="button" className="btn-primary" onClick={handleApply}>Apply</button>
                </div>
              </>
            );
            return isMobile ? (
              <div className="customers-filters-overlay" onClick={closeDropdown}>
                <div
                  className="customers-filters-dropdown customers-filters-dropdown--sheet"
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  {inner}
                </div>
              </div>
            ) : (
              <div className="customers-filters-dropdown" ref={menuRef} style={dropdownStyle}>
                {inner}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
