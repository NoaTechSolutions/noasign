'use client';

import React from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import type { Customer } from './types';

interface CustomerDetailModalProps {
  customer: Customer;
  role: 'master' | 'admin' | 'user';
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onClose: () => void;
}

export function CustomerDetailModal({
  customer,
  role,
  currentUserId,
  onEdit,
  onDelete,
  onAssign,
  onClose
}: CustomerDetailModalProps) {
  useBlockScroll();
  const displayName = customer.customerType === 'BUSINESS'
    ? (customer.business?.businessName || customer.fullName)
    : customer.fullName;

  const ownerName = customer.user
    ? (`${customer.user.firstName ?? ''} ${customer.user.lastName ?? ''}`.trim() || customer.user.email)
    : 'Unknown';

  const canAssign = role === 'master';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{displayName}</h2>
            <span className={`customer-type-badge customer-type-badge--${customer.customerType.toLowerCase()}`}>
              {customer.customerType === 'PERSONAL' ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              )}
              {customer.customerType === 'PERSONAL' ? 'Personal' : 'Business'}
            </span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {customer.customerType === 'PERSONAL' ? (
            <div className="detail-section">
              <h3>Contact Information</h3>
              <dl className="detail-list">
                <dt>Full name</dt>
                <dd>{customer.fullName}</dd>
                <dt>Email</dt>
                <dd>{customer.email || '—'}</dd>
                <dt>Phone</dt>
                <dd>{customer.phone || '—'}</dd>
              </dl>

              <h3>Address</h3>
              <dl className="detail-list">
                <dt>Street</dt>
                <dd>{customer.addressLine1 || '—'}</dd>
                {customer.addressLine2 && (
                  <>
                    <dt>Street 2</dt>
                    <dd>{customer.addressLine2}</dd>
                  </>
                )}
                <dt>City</dt>
                <dd>{customer.city || '—'}</dd>
                <dt>State</dt>
                <dd>{customer.state || '—'}</dd>
                <dt>ZIP code</dt>
                <dd>{customer.zipCode || '—'}</dd>
              </dl>

              {customer.notes && (
                <>
                  <h3>Notes</h3>
                  <p className="detail-notes">{customer.notes}</p>
                </>
              )}

              <h3>Metadata</h3>
              <dl className="detail-list">
                <dt>Owner</dt>
                <dd>{ownerName}</dd>
                <dt>Documents</dt>
                <dd>{customer._count?.documents || 0}</dd>
                <dt>Created</dt>
                <dd>{new Date(customer.createdAt).toLocaleDateString()}</dd>
              </dl>
            </div>
          ) : (
            <div className="detail-section">
              <h3>Business Information</h3>
              <dl className="detail-list">
                <dt>Business name</dt>
                <dd>{customer.business?.businessName || '—'}</dd>
                <dt>Legal name</dt>
                <dd>{customer.business?.businessLegalName || '—'}</dd>
                <dt>License number</dt>
                <dd>{customer.business?.licenseNumber || '—'}</dd>
                <dt>Industry</dt>
                <dd>{customer.business?.industry || '—'}</dd>
                <dt>Website</dt>
                <dd>{customer.business?.website || '—'}</dd>
                <dt>Business email</dt>
                <dd>{customer.business?.businessEmail || '—'}</dd>
                <dt>Business phone</dt>
                <dd>{customer.business?.businessPhone || '—'}</dd>
              </dl>

              <h3>Business Address</h3>
              <dl className="detail-list">
                <dt>Street</dt>
                <dd>{customer.business?.businessAddressLine1 || '—'}</dd>
                {customer.business?.businessAddressLine2 && (
                  <>
                    <dt>Street 2</dt>
                    <dd>{customer.business.businessAddressLine2}</dd>
                  </>
                )}
                <dt>City</dt>
                <dd>{customer.business?.businessCity || '—'}</dd>
                <dt>State</dt>
                <dd>{customer.business?.businessState || '—'}</dd>
                <dt>ZIP code</dt>
                <dd>{customer.business?.businessZipCode || '—'}</dd>
              </dl>

              <h3>Primary Contact</h3>
              <dl className="detail-list">
                <dt>Name</dt>
                <dd>{customer.business?.primaryContactName || '—'}</dd>
                <dt>Email</dt>
                <dd>{customer.business?.primaryContactEmail || '—'}</dd>
                <dt>Phone</dt>
                <dd>{customer.business?.primaryContactPhone || '—'}</dd>
                <dt>Title</dt>
                <dd>{customer.business?.primaryContactTitle || '—'}</dd>
              </dl>

              {customer.notes && (
                <>
                  <h3>Notes</h3>
                  <p className="detail-notes">{customer.notes}</p>
                </>
              )}

              <h3>Metadata</h3>
              <dl className="detail-list">
                <dt>Owner</dt>
                <dd>{ownerName}</dd>
                <dt>Documents</dt>
                <dd>{customer._count?.documents || 0}</dd>
                <dt>Created</dt>
                <dd>{new Date(customer.createdAt).toLocaleDateString()}</dd>
              </dl>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-footer__left">
            <button type="button" className="btn-danger" onClick={onDelete}>
              Delete customer
            </button>
          </div>
          <div className="modal-footer__right">
            {canAssign && (
              <button type="button" className="btn-secondary" onClick={onAssign}>
                Assign to...
              </button>
            )}
            <button type="button" className="btn-primary" onClick={onEdit}>
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
