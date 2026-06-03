import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  children: React.ReactNode;
  isLoading?: boolean;
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultExpanded = true,
  collapsible = true,
  children,
  isLoading = false,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const showContent = !collapsible || isExpanded;

  return (
    <div className={`collapsible-section ${showContent ? 'expanded' : 'collapsed'}`}>
      {collapsible ? (
        <button
          type="button"
          className="collapsible-header"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={isLoading}
        >
          <div className="collapsible-header-left">
            <h2 className="collapsible-title">{title}</h2>
            {subtitle && <span className="collapsible-subtitle">{subtitle}</span>}
          </div>
          <svg
            className="collapsible-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <div className="collapsible-header" style={{ cursor: 'default' }}>
          <div className="collapsible-header-left">
            <h2 className="collapsible-title">{title}</h2>
            {subtitle && <span className="collapsible-subtitle">{subtitle}</span>}
          </div>
        </div>
      )}

      {showContent && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
}
