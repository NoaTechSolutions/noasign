'use client';

import React from 'react';

interface MembersPanelHeaderProps {
  activeTab: 'members' | 'requests';
  onTabChange: (tab: 'members' | 'requests') => void;
  onNewMember: () => void;
}

export function MembersPanelHeader({ activeTab, onTabChange, onNewMember }: MembersPanelHeaderProps) {
  return (
    <header className="panel-head">
      <div className="panel-head__main">
        <h1 className="panel-head__title">Team Management</h1>
        <p className="panel-head__sub">
          Manage workspace members and review account requests.
        </p>
        <span className="panel-head__role-chip" data-role="master">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Master access required
        </span>
      </div>

      <div className="panel-head__tabs">
        <button
          type="button"
          className={`panel-tab ${activeTab === 'members' ? 'panel-tab--active' : ''}`}
          onClick={() => onTabChange('members')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Team Members
        </button>
        <button
          type="button"
          className={`panel-tab ${activeTab === 'requests' ? 'panel-tab--active' : ''}`}
          onClick={() => onTabChange('requests')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          Account Requests
        </button>
      </div>

      {activeTab === 'members' && (
        <div>
          <button type="button" className="btn-primary" onClick={onNewMember}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New member
          </button>
        </div>
      )}
    </header>
  );
}
