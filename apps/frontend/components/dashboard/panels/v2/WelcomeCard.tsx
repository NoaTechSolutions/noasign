import React from 'react';
import { Plus } from 'lucide-react';
import { getPlanEntry } from '@/lib/plan-catalog';

interface DashboardUser {
  name: string;
  email: string;
  role: string;
}

interface CompanyProfile {
  name: string;
  plan: string;
}

interface WelcomeCardProps {
  user: DashboardUser | null;
  company: CompanyProfile | null;
  isLoading: boolean;
  onNewDocument?: () => void;
  // CTA wording — "New receipt" for receipts-only tenants, "New document" else.
  ctaLabel?: string;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeCard({ user, company, isLoading, onNewDocument, ctaLabel = 'New document' }: WelcomeCardProps) {
  const now = new Date();
  const dateLabel = now
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();
  const greeting = greetingForHour(now.getHours());

  if (isLoading) {
    return (
      <div className="welcome-card loading">
        <div className="welcome-skeleton-line welcome-skeleton-date"></div>
        <div className="welcome-skeleton-line welcome-skeleton-title"></div>
        <div className="welcome-skeleton-line welcome-skeleton-subtitle"></div>
      </div>
    );
  }

  if (!user || !company) return null;

  const firstName = user.name.split(' ')[0] || user.name;

  return (
    <div className="welcome-card">
      <div className="welcome-content">
        <span className="welcome-date">{dateLabel}</span>
        <h1 className="welcome-greeting">
          {greeting}, <span className="welcome-user-name">{firstName}</span>
        </h1>
        <div className="welcome-company-info">
          <span className="welcome-company-name">{company.name}</span>
          <span className="welcome-separator">·</span>
          <span className="welcome-plan">{getPlanEntry(company.plan).name}</span>
        </div>
      </div>

      {onNewDocument ? (
        <button type="button" className="welcome-cta" onClick={onNewDocument}>
          <Plus size={16} />
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
