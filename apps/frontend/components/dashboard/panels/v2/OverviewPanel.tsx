import './overview-panel.css';
import React from 'react';
import { WelcomeCard } from './WelcomeCard';
import { MetricCards } from './MetricCards';
import { NeedsAttention } from './NeedsAttention';
import { StatusBreakdown } from './StatusBreakdown';
import { RecentDocumentsTable } from './RecentDocumentsTable';

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
  sentAt?: string | null;
  viewedAt?: string | null;
  completedAt?: string | null;
  customerId?: string | null;
}

interface CustomerLite {
  id: string;
  fullName: string;
}

export interface OverviewPanelProps {
  user: DashboardUser | null;
  companyProfile: CompanyProfile | null;
  usage: CurrentUsage | null;
  monthlySummary: MonthlySummary | null;
  documents: DashboardDocument[] | null;
  customers?: CustomerLite[];
  isLoading: boolean;
  onNewDocument?: () => void;
  onOpenDocument?: (docId: string) => void;
  onViewAllAttention?: () => void;
}

export function OverviewPanel({
  user,
  companyProfile,
  usage,
  monthlySummary,
  documents,
  customers = [],
  isLoading,
  onNewDocument,
  onOpenDocument,
  onViewAllAttention,
}: OverviewPanelProps) {
  return (
    <div className="overview-panel">
      <WelcomeCard
        user={user}
        company={companyProfile}
        isLoading={isLoading}
        onNewDocument={onNewDocument}
      />

      <MetricCards
        usage={usage}
        monthlySummary={monthlySummary}
        documents={documents}
        isLoading={isLoading}
      />

      <div className="overview-columns">
        <div className="overview-columns__main">
          <RecentDocumentsTable
            documents={documents?.slice(0, 5) || []}
            isLoading={isLoading}
          />
        </div>

        <div className="overview-columns__side">
          <NeedsAttention
            documents={documents}
            customers={customers}
            isLoading={isLoading}
            onOpenDocument={onOpenDocument}
            onViewAll={onViewAllAttention}
          />
          <StatusBreakdown documents={documents} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
