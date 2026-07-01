import './overview-panel.css';
import React, { useEffect, useRef, useState } from 'react';
import { WelcomeCard } from './WelcomeCard';
import { MetricCards } from './MetricCards';
import { ReceiptsUsageCard } from './ReceiptsUsageCard';
import { ReceiptMetricCards, type ReceiptStats } from './ReceiptMetricCards';
import { ReceiptStatusBreakdown } from './ReceiptStatusBreakdown';
import { StatusBreakdown } from './StatusBreakdown';
import { RecentDocumentsTable } from './RecentDocumentsTable';

interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: string;
  // Drives business-vs-person name in the WelcomeCard (same as the Topbar).
  accountType?: string | null;
}

interface CompanyProfile {
  id: string;
  name: string;
  plan: string;
  legalName?: string;
}

interface CurrentUsage {
  // Plan key from billing (works for individuals too — companyProfile is nulled
  // for them, so the WelcomeCard reads the plan from here).
  planName?: string;
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
  isLoading,
  contractsEnabled = true,
  onFetchReceiptStats,
  onNewDocument,
  onOpenDocument,
}: OverviewPanelProps) {
  const receiptsOnly = !contractsEnabled;
  const [receiptStats, setReceiptStats] = useState<ReceiptStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // Skeletons only on the FIRST load — a background refetch updates the numbers
  // in place (no flash/flicker). "Refresco suave."
  const statsLoadedRef = useRef(false);

  useEffect(() => {
    if (!receiptsOnly || !onFetchReceiptStats) return;
    let active = true;
    const load = async () => {
      if (!statsLoadedRef.current) setStatsLoading(true);
      try {
        const s = await onFetchReceiptStats();
        if (active) setReceiptStats(s);
      } catch {
        if (active && !statsLoadedRef.current) setReceiptStats(null);
      } finally {
        if (active) {
          statsLoadedRef.current = true;
          setStatsLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [receiptsOnly, onFetchReceiptStats]);

  // Row order (identical on desktop/tablet/phone — the panel is a flex column, so
  // DOM order is the visual order at every breakpoint; only the inner grids reflow):
  //   1 WelcomeCard · 2 Status · 3 Recent · 4 Receipts usage (non-receipts) ·
  //   5 Metrics (4-up). (Needs attention was removed from the Overview — the
  //   NeedsAttention component is kept for a future redesign of that slot.)
  return (
    <div className="overview-panel">
      {/* Row 1 — welcome. */}
      <WelcomeCard
        user={user}
        company={companyProfile}
        plan={usage?.planName ?? companyProfile?.plan ?? null}
        isLoading={isLoading}
        onNewDocument={onNewDocument}
        ctaLabel={receiptsOnly ? 'New receipt' : 'New document'}
      />

      {/* Row 2 — status, full-width. Receipt status for receipts-only tenants,
          document (signature) status otherwise. */}
      {receiptsOnly ? (
        <ReceiptStatusBreakdown
          stats={receiptStats}
          isLoading={isLoading || statsLoading}
        />
      ) : (
        <StatusBreakdown documents={documents} isLoading={isLoading} />
      )}

      {/* Row 3 — recent items, full-width. */}
      <RecentDocumentsTable
        documents={documents?.slice(0, 5) || []}
        isLoading={isLoading}
        entity={receiptsOnly ? 'receipt' : 'document'}
        onView={onOpenDocument}
      />

      {/* Row 4 — receipts usage/quota. Hidden for receipts-only tenants (their
          receipt volume comes from the metric cards below, and it's unlimited);
          limited contract plans (Starter, etc.) keep it for real quota/overage. */}
      {!receiptsOnly && (
        <ReceiptsUsageCard
          used={usage?.receiptsUsed ?? 0}
          limit={usage?.monthlyReceiptLimit ?? 0}
          unlimited={usage?.receiptsUnlimited ?? false}
          overagePrice={usage?.receiptOveragePrice ?? 0.25}
          isLoading={isLoading}
        />
      )}

      {/* Row 5 — metrics (4-up): contract document metrics, or receipt metrics. */}
      {receiptsOnly ? (
        <ReceiptMetricCards stats={receiptStats} isLoading={isLoading || statsLoading} />
      ) : (
        <MetricCards
          usage={usage}
          monthlySummary={monthlySummary}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
