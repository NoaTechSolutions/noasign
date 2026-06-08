'use client';

import React from 'react';
import { AccountRequestRow } from './AccountRequestRow';
import type { AccountRequest } from './types';

interface AccountRequestsTableProps {
  requests: AccountRequest[];
  loading?: boolean;
  onView: (request: AccountRequest) => void;
  onApprove: (request: AccountRequest) => void;
  onReject: (request: AccountRequest) => void;
}

function AccountRequestsSkeletonRow() {
  return (
    <tr className="request-row">
      {/* Name */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 120, height: 14, display: 'block' }} /></td>
      {/* Email */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 160, height: 13, display: 'block' }} /></td>
      {/* Requested Documents — two tags */}
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className="skeleton-pulse skeleton-line" style={{ width: 70, height: 20, display: 'inline-block', borderRadius: 4 }} />
          <span className="skeleton-pulse skeleton-line" style={{ width: 70, height: 20, display: 'inline-block', borderRadius: 4 }} />
        </div>
      </td>
      {/* Status badge */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 68, height: 22, display: 'block', borderRadius: 6 }} /></td>
      {/* Submitted date */}
      <td><span className="skeleton-pulse skeleton-line" style={{ width: 80, height: 13, display: 'block' }} /></td>
      {/* Actions buttons */}
      <td>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="skeleton-pulse skeleton-line" style={{ width: 52, height: 28, display: 'inline-block', borderRadius: 6 }} />
          <span className="skeleton-pulse skeleton-line" style={{ width: 66, height: 28, display: 'inline-block', borderRadius: 6 }} />
          <span className="skeleton-pulse skeleton-line" style={{ width: 52, height: 28, display: 'inline-block', borderRadius: 6 }} />
        </div>
      </td>
    </tr>
  );
}

export function AccountRequestsTable({
  requests,
  loading = false,
  onView,
  onApprove,
  onReject,
}: AccountRequestsTableProps) {
  return (
    <div className="requests-table-wrapper">
      <table className="requests-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Requested Documents</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }, (_, i) => <AccountRequestsSkeletonRow key={i} />)
            : requests.map((request) => (
                <AccountRequestRow
                  key={request.id}
                  request={request}
                  onView={onView}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))
          }
        </tbody>
      </table>
    </div>
  );
}
