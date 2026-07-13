'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { SubSheetHeader } from '@/components/dashboard/shared/SubSheetHeader';
import type { V2DocumentItem, V2DocumentAction } from './types';
import {
  formatDate,
  getActionLabel,
  getAvailableActions,
  getCustomerDisplayName,
  getDocumentTypeDisplayName,
  isDeferredPending,
  isReceiptDoc,
  isVoidedReceipt,
  scheduledLabel,
} from './types';
import { StatusBadge } from './StatusBadge';
import { friendlySendError } from '@/lib/send-error';
import { ReceiptResendMenuItem } from './ReceiptResendMenuItem';

interface DocumentCardProps {
  document: V2DocumentItem;
  selected: boolean;
  onSelect: (docId: string) => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
  // Receipts-only context: the recipient is already in the card header, so the
  // redundant "Type" body row is hidden.
  receiptsOnly?: boolean;
}

// State-change actions grouped under the "Actions" sub-sheet (mirrors the
// desktop kebab submenu): Resend / Reissue / Void. A VOID receipt has none.
const SUBMENU_ACTIONS = new Set<V2DocumentAction>(['resend', 'reissue', 'void']);

export function DocumentCard({ document, selected, onAction, receiptsOnly = false }: DocumentCardProps) {
  const [expanded, setExpanded] = useState(false);
  // Mobile bottom sheets (same pattern as the Clients CustomerCard).
  const [actionsOpen, setActionsOpen] = useState(false);
  const [subSheetOpen, setSubSheetOpen] = useState(false);
  useBlockScroll(actionsOpen || subSheetOpen);

  const actions = getAvailableActions(document);
  const directActions = actions.filter((a) => !SUBMENU_ACTIONS.has(a));
  const groupedActions = actions.filter((a) => SUBMENU_ACTIONS.has(a));

  const closeSheets = () => {
    setActionsOpen(false);
    setSubSheetOpen(false);
  };

  // Render one action as a bottom-sheet row. Resend/retry keep the policy-aware
  // item (cooldown countdown / limit). Closes the sheet(s) on pick.
  const renderItem = (action: V2DocumentAction) => {
    if ((action === 'resend' || action === 'retry') && isReceiptDoc(document)) {
      return (
        <ReceiptResendMenuItem
          key={action}
          doc={document}
          action={action}
          itemClass="card-actions-item"
          onAction={(a, id) => {
            closeSheets();
            return onAction(a, id);
          }}
        />
      );
    }
    const danger =
      action === 'cancel' || action === 'discard' || action === 'void';
    return (
      <button
        key={action}
        type="button"
        className={`card-actions-item${danger ? ' card-actions-item--danger' : ''}`}
        onClick={() => {
          closeSheets();
          void onAction(action, document.id);
        }}
      >
        {getActionLabel(action)}
      </button>
    );
  };

  return (
    <>
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
              {isVoidedReceipt(document) ? (
                <StatusBadge status="VOID" />
              ) : isDeferredPending(document) ? (
                <StatusBadge
                  status="SCHEDULED"
                  title={scheduledLabel(document) ?? undefined}
                />
              ) : (
                <StatusBadge status={document.status} />
              )}
            </div>
            {/* Mobile has no hover — show the failure reason inline, always visible. */}
            {document.status === 'SEND_FAILED' && friendlySendError(document.sendError) ? (
              <div className="documents-v2-card__send-error">
                {friendlySendError(document.sendError)}
              </div>
            ) : null}
          </div>
          <ChevronDown
            size={20}
            className={`documents-v2-card__chevron${expanded ? ' documents-v2-card__chevron--open' : ''}`}
          />
        </div>

        {expanded ? (
          <div className="documents-v2-card__body">
            <div className="documents-v2-card__info">
              {!receiptsOnly && (
                <div className="documents-v2-card__info-row">
                  <span className="documents-v2-card__label">Type</span>
                  <span>{getDocumentTypeDisplayName(document)}</span>
                </div>
              )}
              <div className="documents-v2-card__info-row">
                <span className="documents-v2-card__label">Date</span>
                <span>{formatDate(document.createdAt)}</span>
              </div>
              <div className="documents-v2-card__info-row">
                <span className="documents-v2-card__label">Status</span>
                <span>
                  {isVoidedReceipt(document) ? (
                    <StatusBadge status="VOID" />
                  ) : isDeferredPending(document) ? (
                    <StatusBadge status="SCHEDULED" />
                  ) : (
                    <StatusBadge status={document.status} />
                  )}
                </span>
              </div>
            </div>

            {actions.length > 0 && (
              <div className="documents-v2-card__actions">
                <button
                  type="button"
                  className="customer-card__actions-btn"
                  onClick={() => setActionsOpen(true)}
                >
                  Actions
                  <ChevronUp size={14} />
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Actions bottom sheet — portaled to body (same pattern as Clients).
          `document` here is the prop, so reach the real DOM via window.document. */}
      {actionsOpen && typeof window !== 'undefined' &&
        createPortal(
          <div className="card-actions-overlay" onClick={closeSheets}>
            <div className="card-actions-sheet" onClick={(e) => e.stopPropagation()}>
              {directActions.map(renderItem)}
              {groupedActions.length > 0 && (
                <button
                  type="button"
                  className="card-actions-item card-actions-item--submenu"
                  onClick={() => setSubSheetOpen(true)}
                >
                  <span className="card-actions-item__label">Actions</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>,
          window.document.body,
        )}

      {/* Second sheet: Resend / Reissue / Void — on top of the actions sheet. */}
      {subSheetOpen && typeof window !== 'undefined' &&
        createPortal(
          <div
            className="card-actions-overlay"
            onClick={() => setSubSheetOpen(false)}
          >
            <div className="card-actions-sheet" onClick={(e) => e.stopPropagation()}>
              <SubSheetHeader title="Actions" onBack={() => setSubSheetOpen(false)} />
              {groupedActions.map(renderItem)}
            </div>
          </div>,
          window.document.body,
        )}
    </>
  );
}
