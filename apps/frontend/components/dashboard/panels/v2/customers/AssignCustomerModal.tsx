'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useBlockScroll } from '@/lib/use-block-scroll';
import type { Customer, CustomerOwnerUser } from './types';

interface AssignCustomerModalProps {
  customer: Customer;
  onFetchUsers: () => Promise<CustomerOwnerUser[]>;
  onConfirm: (userId: string) => Promise<void>;
  onClose: () => void;
}

// Two-letter initials for a user avatar, falling back to the email initial.
function initialsOf(u: Pick<CustomerOwnerUser, 'firstName' | 'lastName' | 'email'>): string {
  const f = u.firstName?.trim()?.[0] ?? '';
  const l = u.lastName?.trim()?.[0] ?? '';
  const ini = (f + l).toUpperCase();
  return ini || u.email?.[0]?.toUpperCase() || '?';
}

export function AssignCustomerModal({ customer, onFetchUsers, onConfirm, onClose }: AssignCustomerModalProps) {
  useBlockScroll();
  const [users, setUsers] = useState<CustomerOwnerUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(customer.userId);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  // Confirmation step (reassign is important — transfers ownership + documents).
  const [showConfirm, setShowConfirm] = useState(false);

  const displayName = customer.customerType === 'BUSINESS'
    ? (customer.business?.businessName || customer.fullName)
    : customer.fullName;

  const assignee = users.find((u) => u.id === selectedUserId);
  const assigneeName = assignee
    ? (`${assignee.firstName} ${assignee.lastName}`.trim() || assignee.email)
    : 'the selected user';

  // Real-time filter by name or email. The currently-selected owner is always
  // kept visible so the selection never disappears mid-search.
  const q = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (u.id === selectedUserId) return true;
    if (!q) return true;
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q);
  });

  // `loading` is initialised to `true`, so a fresh fetch starts in the loading
  // state without a synchronous setState here. The `.finally` flips it off.
  useEffect(() => {
    let cancelled = false;
    onFetchUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
      })
      .catch((error) => {
        console.error('Error fetching users:', error);
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onFetchUsers]);

  // "Assign" in the picker — no-op if unchanged, otherwise open the confirm step.
  const handleAssignClick = () => {
    if (selectedUserId === customer.userId) {
      onClose();
      return;
    }
    setShowConfirm(true);
  };

  // "Confirm assign" in the confirmation popup — runs the actual reassignment.
  const handleConfirmAssign = async () => {
    setAssigning(true);
    try {
      await onConfirm(selectedUserId);
      toast.success(`Client assigned to ${assigneeName}`);
      // onConfirm closes the whole modal (parent setActiveModal(null)) on success.
    } catch (error) {
      console.error('Assign failed:', error);
      toast.error('Failed to assign client. Please try again.');
      setAssigning(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign client</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p>Assign <strong>{displayName}</strong> to:</p>

          <div className="form-group">
            <div className="assign-step__search">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="assign-step__hint">Loading users...</div>
          ) : (
            <div className="assign-step__list">
              {filteredUsers.map((user) => {
                const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`assign-option${selectedUserId === user.id ? ' assign-option--selected' : ''}`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <span className="assign-option__avatar">{initialsOf(user)}</span>
                    <span className="assign-option__info">
                      <span className="assign-option__name">{name}</span>
                      <span className="assign-option__email">{user.email}</span>
                    </span>
                    <span className="assign-option__radio" aria-hidden="true" />
                  </button>
                );
              })}
              {search.trim() && filteredUsers.length === 0 && (
                <div className="assign-step__hint">No users match &ldquo;{search}&rdquo;</div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleAssignClick}
            disabled={loading || assigning || selectedUserId === customer.userId}
          >
            Assign
          </button>
        </div>
      </div>
    </div>

    {/* Confirmation step — sits on top of the picker; Cancel returns to it. */}
    {showConfirm && (
      <div className="modal-overlay" onClick={() => !assigning && setShowConfirm(false)}>
        <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Reassign client?</h2>
          </div>

          <div className="modal-body">
            <p>
              You are about to assign <strong>&ldquo;{displayName}&rdquo;</strong> to <strong>{assigneeName}</strong>.
            </p>
            <p className="text-muted">
              This will transfer ownership of this client and their associated documents.
            </p>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowConfirm(false)}
              disabled={assigning}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-warning"
              onClick={handleConfirmAssign}
              disabled={assigning}
            >
              {assigning ? 'Assigning...' : 'Confirm assign'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
