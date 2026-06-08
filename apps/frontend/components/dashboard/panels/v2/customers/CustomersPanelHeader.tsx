'use client';

import React from 'react';

interface CustomersPanelHeaderProps {
  role: 'master' | 'admin' | 'user';
  onNewCustomer: () => void;
  isLoading?: boolean;
}

export function CustomersPanelHeader({ role, onNewCustomer, isLoading }: CustomersPanelHeaderProps) {
  return (
    <header className="panel-head">
      <div className="panel-head__main">
        {/* GLOBAL RULE: panel headers have title only — NO subtitles. */}
        {isLoading ? (
          <div
            className="skeleton-pulse skeleton-line"
            style={{ width: "130px", height: "24px" }}
            aria-hidden="true"
          />
        ) : (
          <h1 className="panel-head__title">Clients</h1>
        )}
        {role === 'master' && (
          <span className="panel-head__role-chip" data-role="master">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Master · workspace owner
          </span>
        )}
      </div>
      <div>
        <button type="button" className="btn-primary" onClick={onNewCustomer}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New client
        </button>
      </div>
    </header>
  );
}
