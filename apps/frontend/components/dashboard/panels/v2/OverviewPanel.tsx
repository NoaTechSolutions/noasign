import './overview-panel.css';
import React from 'react';
import { WelcomeCard } from './WelcomeCard';
import { StatsGrid } from './StatsGrid';
import { StatusBreakdown } from './StatusBreakdown';
import { RecentDocumentsTable } from './RecentDocumentsTable';

// Types matching the existing page.tsx state
interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CompanyProfile {
  id: string;
  name: string;
  plan: string;
  legalName?: string;
}

interface CurrentUsage {
  documentsUsed: number;
  documentsLimit: number;
  overageCount?: number;
}

interface MonthlySummary {
  billingAmount: number;
  overage: number;
  periodStart: string;
  periodEnd: string;
}

interface DashboardDocument {
  id: string;
  documentNumber: string;
  status: string;
  recipientEmail: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface OverviewPanelProps {
  user: DashboardUser | null;
  companyProfile: CompanyProfile | null;
  usage: CurrentUsage | null;
  monthlySummary: MonthlySummary | null;
  documents: DashboardDocument[] | null;
  isLoading: boolean;
}

export function OverviewPanel({
  user,
  companyProfile,
  usage,
  monthlySummary,
  documents,
  isLoading,
}: OverviewPanelProps) {
  return (
    <div className="overview-panel">
      {/* Welcome section */}
      <WelcomeCard
        user={user}
        company={companyProfile}
        isLoading={isLoading}
      />

      {/* Stats grid - 4 metric cards */}
      <StatsGrid
        usage={usage}
        monthlySummary={monthlySummary}
        documents={documents}
        isLoading={isLoading}
      />

      {/* Status breakdown - visual bar chart */}
      <StatusBreakdown
        documents={documents}
        isLoading={isLoading}
      />

      {/* Recent documents table */}
      <RecentDocumentsTable
        documents={documents?.slice(0, 5) || []}
        isLoading={isLoading}
      />
    </div>
  );
}
