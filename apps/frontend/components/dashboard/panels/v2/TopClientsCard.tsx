import React from 'react';
import { Trophy } from 'lucide-react';

interface TopClient {
  name: string;
  count: number;
}

interface TopClientsCardProps {
  clients: TopClient[];
  isLoading: boolean;
}

/**
 * Row-2 right card for receipts — the top 5 clients by all-time receipt count.
 * Shows only the clients that exist (no padding rows); a sober empty state when
 * there are none.
 */
export function TopClientsCard({ clients, isLoading }: TopClientsCardProps) {
  return (
    <div className="ov-card ov-top-clients">
      <span className="ov-card__label">
        <Trophy size={15} className="ov-trophy" /> Top clients by receipts
      </span>
      {isLoading ? (
        <div className="ov-top-clients__empty">Loading…</div>
      ) : clients.length === 0 ? (
        <div className="ov-top-clients__empty">No receipts sent yet</div>
      ) : (
        <ol className="ov-top-clients__list">
          {clients.map((c, i) => (
            <li key={`${c.name}-${i}`} className="ov-top-clients__row">
              <span className="ov-top-clients__pos">{i + 1}</span>
              <span className="ov-top-clients__name">{c.name}</span>
              <span className="ov-top-clients__count">{c.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
