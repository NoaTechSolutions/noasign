'use client';

import React from 'react';

interface LockedUsersPanelHeaderProps {
  isLoading?: boolean;
}

export function LockedUsersPanelHeader({ isLoading }: LockedUsersPanelHeaderProps) {
  return (
    <header className="panel-head">
      <div className="panel-head__main">
        {/* GLOBAL RULE: panel headers have title only — NO subtitles. */}
        {isLoading ? (
          <div
            className="skeleton-pulse skeleton-line"
            style={{ width: "220px", height: "24px" }}
            aria-hidden="true"
          />
        ) : (
          <h1 className="panel-head__title">Security &amp; Access Control</h1>
        )}
        <span className="panel-head__role-chip" data-role="superadmin">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Master access required
        </span>
      </div>
    </header>
  );
}
