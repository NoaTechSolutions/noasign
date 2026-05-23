'use client';

import React from 'react';
import { AccountRequestRow } from './AccountRequestRow';
import type { AccountRequest } from './types';

interface AccountRequestsTableProps {
  requests: AccountRequest[];
  onView: (request: AccountRequest) => void;
  onApprove: (request: AccountRequest) => void;
  onReject: (request: AccountRequest) => void;
}

export function AccountRequestsTable({
  requests,
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
          {requests.map((request) => (
            <AccountRequestRow
              key={request.id}
              request={request}
              onView={onView}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
