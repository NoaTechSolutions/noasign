'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, Activity } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { FieldRow } from '@/components/dashboard/shared/ui';
import { DocumentVersionTimeline } from './DocumentVersionTimeline';
import type { V2DocumentItem, V2DocumentAction, DocumentVersion } from './types';
import {
  formatRelativeTime,
  getActionLabel,
  getAvailableActions,
  getCreatorDisplayName,
  getCustomerDisplayName,
  getStatusBadgeClass,
  getStatusLabel,
} from './types';

interface DocumentDetailSidebarProps {
  document: V2DocumentItem;
  onClose: () => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
  onFetchVersions?: (docId: string) => Promise<DocumentVersion[]>;
}

export function DocumentDetailSidebar({
  document,
  onClose,
  onAction,
  onFetchVersions,
}: DocumentDetailSidebarProps) {
  const [versions, setVersions] = useState<DocumentVersion[] | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);

  const availableActions = getAvailableActions(document);
  const actionButtons = availableActions.filter(
    (a) => a !== 'view' && a !== 'edit',
  );

  useBlockScroll();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!onFetchVersions) return;
    let cancelled = false;
    setVersionsLoading(true);
    setVersionsError(null);
    onFetchVersions(document.id)
      .then((result) => {
        if (!cancelled) setVersions(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setVersionsError(
            err instanceof Error ? err.message : 'Could not load history',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setVersionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document.id, onFetchVersions]);

  const customerEmail = document.customer?.email ?? null;

  return (
    <div className="documents-v2-detail">
      <div
        className="documents-v2-detail__overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="documents-v2-detail__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Document ${document.documentNumber}`}
        style={{ '--card-legend-bg': 'var(--surface)' } as React.CSSProperties}
      >
        <button
          type="button"
          className="documents-v2-detail__close"
          onClick={onClose}
          aria-label="Close detail"
        >
          <X size={20} />
        </button>

        <div className="documents-v2-detail__content">
          <div className="documents-v2-detail__header">
            <h2 className="documents-v2-detail__number">{document.documentNumber}</h2>
            <div className="documents-v2-detail__header-badges">
              <span
                className={`doc-status-badge ${getStatusBadgeClass(document.status)}`}
              >
                {getStatusLabel(document.status)}
              </span>
            </div>
          </div>

          <div className="documents-v2-detail__section card-legend">
            <span className="card-legend__label">
              <span className="card-legend__icon"><FileText size={14} /></span>
              <span className="card-legend__title">Document Info</span>
            </span>
            <div className="field-rows">
              <div className="documents-v2-detail__field">
                <div className="documents-v2-detail__label">Client</div>
                <div className="documents-v2-detail__value">
                  {getCustomerDisplayName(document)}
                </div>
                {customerEmail ? (
                  <div className="documents-v2-detail__hint">{customerEmail}</div>
                ) : null}
              </div>

              <FieldRow label="Document Type" value={document.documentType?.name ?? 'Unknown'} />

              {document.contractDate ? (
                <FieldRow label="Contract Date" value={new Date(document.contractDate).toLocaleDateString()} />
              ) : null}

              <FieldRow
                label="Created"
                value={`${formatRelativeTime(document.createdAt)}${document.user ? ` by ${getCreatorDisplayName(document)}` : ''}`}
              />

              {document.sentAt ? (
                <div className="documents-v2-detail__field">
                  <div className="documents-v2-detail__label">Sent</div>
                  <div className="documents-v2-detail__value">
                    {formatRelativeTime(document.sentAt)}
                  </div>
                  {document.lastSentRecipientEmail ? (
                    <div className="documents-v2-detail__hint">
                      to {document.lastSentRecipientEmail}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {document.completedAt ? (
                <FieldRow label="Completed" value={formatRelativeTime(document.completedAt)} />
              ) : null}
            </div>
          </div>

          {actionButtons.length > 0 ? (
            <div className="documents-v2-detail__section">
              <div className="documents-v2-detail__label">Actions</div>
              <div className="documents-v2-detail__actions">
                {actionButtons.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="documents-v2-detail__action-btn"
                    onClick={() => void onAction(action, document.id)}
                  >
                    {getActionLabel(action)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {onFetchVersions ? (
            <div className="documents-v2-detail__section card-legend">
              <span className="card-legend__label">
                <span className="card-legend__icon"><Activity size={14} /></span>
                <span className="card-legend__title">Version History</span>
              </span>
              {versionsLoading ? (
                <div className="documents-v2-detail__hint">Loading...</div>
              ) : versionsError ? (
                <div className="documents-v2-detail__hint">{versionsError}</div>
              ) : versions && versions.length > 0 ? (
                <DocumentVersionTimeline versions={versions} />
              ) : (
                <div className="documents-v2-detail__hint">
                  No version history available
                </div>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
