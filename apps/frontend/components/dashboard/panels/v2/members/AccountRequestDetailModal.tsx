'use client';

import React from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import type { AccountRequest } from './types';

interface AccountRequestDetailModalProps {
  request: AccountRequest;
  onApprove: (request: AccountRequest) => void;
  onReject: (request: AccountRequest) => void;
  onClose: () => void;
}

export function AccountRequestDetailModal({
  request,
  onApprove,
  onReject,
  onClose,
}: AccountRequestDetailModalProps) {
  useBlockScroll();
  const isProcessed = request.status !== 'PENDING';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Account Request Details</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="request-detail">
            <div className="request-detail__header">
              <div className="request-detail__avatar">
                <span>{request.fullName.slice(0, 2).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="request-detail__name">{request.fullName}</h3>
                <p className="request-detail__email">{request.email}</p>
              </div>
            </div>

            <div className="request-detail__status">
              <span className={`status-badge status-badge--${request.status.toLowerCase()}`}>{request.status}</span>
            </div>

            <div className="request-detail__grid">
              <div className="request-detail__field">
                <label>Requested Documents</label>
                {request.requestedDocumentTypes.length > 0 ? (
                  <div className="document-tags">
                    {request.requestedDocumentTypes.map((doc, idx) => (
                      <span key={idx} className="document-tag">{doc}</span>
                    ))}
                  </div>
                ) : (
                  <span>None specified</span>
                )}
              </div>

              <div className="request-detail__field">
                <label>Submitted</label>
                <span>{new Date(request.createdAt).toLocaleString()}</span>
              </div>

              {request.processedAt && (
                <div className="request-detail__field">
                  <label>Processed</label>
                  <span>{new Date(request.processedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isProcessed && (
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            <button type="button" className="btn-danger" onClick={() => { onReject(request); onClose(); }}>Reject</button>
            <button type="button" className="btn-primary" onClick={() => { onApprove(request); onClose(); }}>Approve</button>
          </div>
        )}
      </div>
    </div>
  );
}
