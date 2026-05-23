'use client';

import React from 'react';

export function LockedUsersPanelHeader() {
  return (
    <header className="panel-head">
      <div className="panel-head__main">
        <h1 className="panel-head__title">Security &amp; Access Control</h1>
        <p className="panel-head__sub">
          Monitor and manage locked user accounts
        </p>
        <span className="panel-head__role-chip" data-role="master">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Master access required
        </span>
      </div>
    </header>
  );
}
