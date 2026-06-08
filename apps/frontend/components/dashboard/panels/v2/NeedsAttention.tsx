import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AttentionDocument {
  id: string;
  documentNumber: string;
  status: string;
  sentAt?: string | null;
  viewedAt?: string | null;
  customerId?: string | null;
  recipientEmail?: string | null;
}

interface CustomerLite {
  id: string;
  fullName: string;
}

interface NeedsAttentionProps {
  documents: AttentionDocument[] | null;
  customers: CustomerLite[];
  isLoading: boolean;
  onOpenDocument?: (docId: string) => void;
  onViewAll?: () => void;
}

const DAY_MS = 1000 * 60 * 60 * 24;

function daysAgo(iso?: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return null;
  return Math.floor(diff / DAY_MS);
}

export function NeedsAttention({
  documents,
  customers,
  isLoading,
  onOpenDocument,
  onViewAll,
}: NeedsAttentionProps) {
  const nameById = new Map(customers.map((c) => [c.id, c.fullName]));

  const items = (documents ?? [])
    .filter((d) => d.status === 'SENT' || d.status === 'VIEWED')
    .map((d) => ({ doc: d, days: daysAgo(d.sentAt) }))
    .filter((x) => x.days !== null && x.days >= 3)
    .sort((a, b) => (b.days as number) - (a.days as number)) // oldest (most days) first
    .slice(0, 5);

  return (
    <section className="needs-attention">
      <header className="needs-attention__header">
        <h3 className="needs-attention__title">
          <AlertTriangle size={15} />
          Needs attention
        </h3>
        {items.length > 0 && onViewAll ? (
          <button type="button" className="needs-attention__view-all" onClick={onViewAll}>
            View all
          </button>
        ) : null}
      </header>

      {isLoading ? (
        <div className="needs-attention__empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="needs-attention__empty needs-attention__empty--ok">
          <CheckCircle2 size={22} />
          <p>All caught up! No documents need attention.</p>
        </div>
      ) : (
        <ul className="needs-attention__list">
          {items.map(({ doc, days }) => {
            const isViewed = doc.status === 'VIEWED';
            const when = isViewed ? daysAgo(doc.viewedAt) ?? days : days;
            const name =
              (doc.customerId && nameById.get(doc.customerId)) ||
              doc.recipientEmail ||
              'Recipient';
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  className="needs-attention__item"
                  onClick={() => onOpenDocument?.(doc.id)}
                >
                  <div className="needs-attention__item-main">
                    <span className="needs-attention__item-name">{name}</span>
                    <span className="needs-attention__item-sep">·</span>
                    <span className="needs-attention__item-number">{doc.documentNumber}</span>
                  </div>
                  <div className="needs-attention__item-meta">
                    <span className="needs-attention__item-age">
                      {isViewed ? 'Viewed' : 'Sent'} {when} day{when === 1 ? '' : 's'} ago
                    </span>
                    <span
                      className={`doc-status-badge doc-status-badge--${doc.status.toLowerCase()}`}
                    >
                      {isViewed ? 'Viewed' : 'Sent'}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
