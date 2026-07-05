import './history-panel.css';
import React from 'react';
import { History } from 'lucide-react';

/**
 * History module — placeholder. The functional activity timeline (F1) is a
 * separate future feature; for now this is a clear "Coming soon" screen so the
 * nav entry and the overview "View history →" link have a real destination.
 */
export function HistoryPanel() {
  return (
    <div className="history-panel">
      <div className="history-panel__placeholder">
        <span className="history-panel__icon" aria-hidden="true">
          <History size={40} strokeWidth={1.5} />
        </span>
        <h1 className="history-panel__title">History</h1>
        <p className="history-panel__soon">Coming soon</p>
        <p className="history-panel__desc">
          A full activity timeline of your documents and receipts is on the way.
        </p>
      </div>
    </div>
  );
}
