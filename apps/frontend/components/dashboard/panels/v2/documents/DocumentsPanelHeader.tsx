'use client';

import React from 'react';

interface DocumentsPanelHeaderProps {
  isLoading?: boolean;
}

export function DocumentsPanelHeader({ isLoading }: DocumentsPanelHeaderProps) {
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
          <h1 className="documents-v2-head__title">Documents</h1>
        )}
      </div>
    </header>
  );
}
