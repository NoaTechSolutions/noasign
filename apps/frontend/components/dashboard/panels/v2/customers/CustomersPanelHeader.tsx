'use client';

import React from 'react';

interface CustomersPanelHeaderProps {
  role: 'master' | 'admin' | 'user';
  onNewCustomer: () => void;
}

export function CustomersPanelHeader({ role, onNewCustomer }: CustomersPanelHeaderProps) {
  return (
    <header className="panel-head">
      <div className="panel-head__main">
        <h1 className="panel-head__title">Customers</h1>
        <p className="panel-head__sub">
          Manage the people and companies you send documents to.
        </p>
        {role === 'master' && (
          <span className="panel-head__role-chip" data-role="master">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Master · workspace owner
          </span>
        )}
        {role === 'user' && (
          <span className="panel-head__role-chip" data-role="user">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            User · your customers only
          </span>
        )}
      </div>
      <div>
        <button type="button" className="btn-primary" onClick={onNewCustomer}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New customer
        </button>
      </div>
    </header>
  );
}
