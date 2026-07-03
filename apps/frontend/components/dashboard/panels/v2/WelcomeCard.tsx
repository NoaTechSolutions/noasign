import React from 'react';
import { Plus, Crown } from 'lucide-react';
import { getPlanEntry } from '@/lib/plan-catalog';
import { resolveAccountName } from '@/lib/account-identity';

interface DashboardUser {
  name: string;
  email: string;
  role: string;
  // INDIVIDUAL → show the person name; BUSINESS/SUPERADMIN → the company name.
  accountType?: string | null;
}

interface CompanyProfile {
  name: string;
  plan: string;
}

interface WelcomeCardProps {
  user: DashboardUser | null;
  company: CompanyProfile | null;
  // Plan key, sourced from billing usage (NOT companyProfile) so it shows for
  // INDIVIDUAL accounts too — their companyProfile is nulled in the dashboard.
  plan?: string | null;
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

export function WelcomeCard({ user, company, plan, isLoading, onNewDocument, ctaLabel = 'New document' }: WelcomeCardProps) {
  const greeting = greetingForHour(new Date().getHours());

  if (isLoading) {
    return (
      <div className="welcome-card loading">
        <div className="welcome-skeleton-line welcome-skeleton-date"></div>
        <div className="welcome-skeleton-line welcome-skeleton-title"></div>
        <div className="welcome-skeleton-line welcome-skeleton-subtitle"></div>
      </div>
    );
  }

  // Render as soon as we have the user. INDIVIDUAL accounts have no company
  // profile (the dashboard nulls it), so company may be null here — the person
  // name carries the card, and the plan line is simply omitted.
  if (!user) return null;

  // Person vs business name — identical resolution to the Topbar, so a Receipts
  // user and a Documents user of the same account type look the same here.
  const displayName = resolveAccountName({
    accountType: user.accountType,
    personName: user.name,
    companyName: company?.name,
  });

  return (
    <div className="welcome-card">
      <div className="welcome-content">
        <span className="welcome-greeting">{greeting} 👋</span>
        <h1 className="welcome-name">{displayName}</h1>
        {plan ? (
          <span className="welcome-plan-badge">
            <Crown size={14} className="welcome-plan-crown" aria-hidden="true" />
            {getPlanEntry(plan).name}
          </span>
        ) : null}
      </div>

      {onNewDocument ? (
        <div className="welcome-action">
          <button type="button" className="welcome-cta" onClick={onNewDocument}>
            <Plus size={16} />
            {ctaLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
