import './overview-panel.css';
import React, { useEffect, useState } from 'react';
import { WelcomeCard } from './WelcomeCard';
import { MetricCards } from './MetricCards';
import { ReceiptsUsageCard } from './ReceiptsUsageCard';
import { ReceiptMetricCards, type ReceiptStats } from './ReceiptMetricCards';
import { ReceiptStatusBreakdown } from './ReceiptStatusBreakdown';
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
  documentsLimit: number | null; // null = unlimited
  overageCount?: number;
  // Model C — receipt dimension (per-tenant, separate from contracts).
  receiptsUsed?: number;
  monthlyReceiptLimit?: number;
  receiptsUnlimited?: boolean;
  receiptOveragePrice?: number;
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
  // Receipts-only tenants (contractsEnabled === false) have no contracts: swap
  // the document metrics + signature-flow panels for receipt-focused ones.
  contractsEnabled?: boolean;
  // Receipts-only: fetches GET /documents/receipt/stats (provided by the page).
  onFetchReceiptStats?: () => Promise<ReceiptStats>;
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
  contractsEnabled = true,
  onFetchReceiptStats,
  onNewDocument,
  onOpenDocument,
  onViewAllAttention,
}: OverviewPanelProps) {
  const receiptsOnly = !contractsEnabled;
  const [receiptStats, setReceiptStats] = useState<ReceiptStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!receiptsOnly || !onFetchReceiptStats) return;
    let active = true;
    const load = async () => {
      setStatsLoading(true);
      try {
        const s = await onFetchReceiptStats();
        if (active) setReceiptStats(s);
      } catch {
        if (active) setReceiptStats(null);
      } finally {
        if (active) setStatsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [receiptsOnly, onFetchReceiptStats]);

  return (
    <div className="overview-panel">
      <WelcomeCard
        user={user}
        company={companyProfile}
        isLoading={isLoading}
        onNewDocument={onNewDocument}
        ctaLabel={receiptsOnly ? 'New receipt' : 'New document'}
      />

      {/* Metrics: contract document metrics, or receipt metrics for receipts-only. */}
      {receiptsOnly ? (
        <ReceiptMetricCards stats={receiptStats} isLoading={isLoading || statsLoading} />
      ) : (
        <MetricCards
          usage={usage}
          monthlySummary={monthlySummary}
          documents={documents}
          isLoading={isLoading}
        />
      )}

      <ReceiptsUsageCard
        used={usage?.receiptsUsed ?? 0}
        limit={usage?.monthlyReceiptLimit ?? 0}
        unlimited={usage?.receiptsUnlimited ?? false}
        overagePrice={usage?.receiptOveragePrice ?? 0.25}
        isLoading={isLoading}
      />

      <div className="overview-columns">
        <div className="overview-columns__main">
          <RecentDocumentsTable
            documents={documents?.slice(0, 5) || []}
            isLoading={isLoading}
            entity={receiptsOnly ? 'receipt' : 'document'}
          />
        </div>

        {/* Side: contracts show signature-flow panels; receipts-only shows the
            receipt status breakdown (signature states don't apply to receipts). */}
        <div className="overview-columns__side">
          {receiptsOnly ? (
            <ReceiptStatusBreakdown
              stats={receiptStats}
              isLoading={isLoading || statsLoading}
            />
          ) : (
            <>
              <NeedsAttention
                documents={documents}
                customers={customers}
                isLoading={isLoading}
                onOpenDocument={onOpenDocument}
                onViewAll={onViewAllAttention}
              />
              <StatusBreakdown documents={documents} isLoading={isLoading} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
