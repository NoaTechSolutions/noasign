'use client';

import React from 'react';
import { formatDisplayDate } from '@/lib/format';
import type { AccountRequest } from './types';

interface AccountRequestRowProps {
  request: AccountRequest;
  onView: (request: AccountRequest) => void;
  onApprove: (request: AccountRequest) => void;
  onReject: (request: AccountRequest) => void;
}

export function AccountRequestRow({
  request,
  onView,
  onApprove,
  onReject,
}: AccountRequestRowProps) {
  const isProcessed = request.status !== 'PENDING';

  return (
    <tr className="request-row">
      <td className="request-row__name">{request.fullName}</td>
      <td className="request-row__email">{request.email}</td>
      <td className="request-row__documents">
        {request.requestedDocumentTypes.length > 0 ? (
          <div className="document-tags">
            {request.requestedDocumentTypes.map((doc, idx) => (
              <span key={idx} className="document-tag">{doc}</span>
            ))}
          </div>
        ) : (
          '—'
        )}
      </td>
      <td>
        <span className={`status-badge status-badge--${request.status.toLowerCase()}`}>{request.status}</span>
      </td>
      <td className="request-row__date">{formatDisplayDate(request.createdAt)}</td>
      <td>
        <div className="request-row__actions">
          <button type="button" className="btn-secondary btn-sm" onClick={() => onView(request)}>View</button>
          {!isProcessed && (
            <>
              <button type="button" className="btn-primary btn-sm" onClick={() => onApprove(request)}>Approve</button>
              <button type="button" className="btn-danger btn-sm" onClick={() => onReject(request)}>Reject</button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
