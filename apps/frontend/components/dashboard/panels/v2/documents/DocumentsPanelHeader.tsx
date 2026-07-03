'use client';

import React from 'react';

interface DocumentsPanelHeaderProps {
  isLoading?: boolean;
  // "Receipts" for receipts-only tenants, "Documents" otherwise.
  title?: string;
}

export function DocumentsPanelHeader({ isLoading, title = 'Documents' }: DocumentsPanelHeaderProps) {
  return (
    <header className="documents-v2-head">
      <div className="documents-v2-head__main">
        {/* GLOBAL RULE: panel headers have title only — NO subtitles. */}
        {isLoading ? (
          <div
            className="skeleton-pulse skeleton-line"
            style={{ width: "140px", height: "24px" }}
            aria-hidden="true"
          />
        ) : (
          <h1 className="documents-v2-head__title">{title}</h1>
        )}
      </div>
    </header>
  );
}
