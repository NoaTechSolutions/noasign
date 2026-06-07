'use client';

import React, { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import type { V2DocumentItem, V2DocumentAction } from './types';
import {
  formatDate,
  getActionLabel,
  getAvailableActions,
  getCustomerDisplayName,
  getDocumentTypeDisplayName,
  getStatusBadgeClass,
  getStatusLabel,
  isReceiptDoc,
} from './types';
import { ReceiptResendMenuItem } from './ReceiptResendMenuItem';

interface DocumentCardProps {
  document: V2DocumentItem;
  selected: boolean;
  onSelect: (docId: string) => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
}

export function DocumentCard({ document, selected, onAction }: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const actions = getAvailableActions(document);

  return (
    <div
      className={`documents-v2-card${selected ? ' documents-v2-card--selected' : ''}`}
    >
      <div
        className="documents-v2-card__header"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="documents-v2-card__header-main">
          <div className="documents-v2-card__number">
            <FileText size={15} />
            <span>{document.documentNumber}</span>
          </div>
          <div className="documents-v2-card__customer">
            {getCustomerDisplayName(document)}
          </div>
          <div className="documents-v2-card__badges">
            <span className={`doc-status-badge ${getStatusBadgeClass(document.status)}`}>
              {getStatusLabel(document.status)}
            </span>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`documents-v2-card__chevron${expanded ? ' documents-v2-card__chevron--open' : ''}`}
        />
      </div>

      {expanded ? (
        <div className="documents-v2-card__body">
          <div className="documents-v2-card__info">
            <div className="documents-v2-card__info-row">
              <span className="documents-v2-card__label">Type</span>
              <span>{getDocumentTypeDisplayName(document)}</span>
            </div>
            <div className="documents-v2-card__info-row">
              <span className="documents-v2-card__label">Date</span>
              <span>{formatDate(document.createdAt)}</span>
            </div>
            <div className="documents-v2-card__info-row">
              <span className="documents-v2-card__label">Status</span>
              <span>{getStatusLabel(document.status)}</span>
            </div>
          </div>

          <div className="documents-v2-card__actions">
            {actions.map((action) => {
              if (
                (action === 'resend' || action === 'retry') &&
                isReceiptDoc(document)
              ) {
                return (
                  <ReceiptResendMenuItem
                    key={action}
                    doc={document}
                    action={action}
                    itemClass={`documents-v2-card__action-btn documents-v2-card__action-btn--${action}`}
                    onAction={onAction}
                  />
                );
              }
              return (
                <button
                  key={action}
                  type="button"
                  className={`documents-v2-card__action-btn documents-v2-card__action-btn--${action}`}
                  onClick={() => void onAction(action, document.id)}
                >
                  {getActionLabel(action)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
