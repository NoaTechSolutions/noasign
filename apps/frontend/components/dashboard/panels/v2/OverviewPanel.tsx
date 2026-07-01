import './overview-panel.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Send, Eye, PenLine, CheckCircle2, Ban } from 'lucide-react';
import { WelcomeCard } from './WelcomeCard';
import { MonthVolumeCard } from './MonthVolumeCard';
import { HighlightCard } from './HighlightCard';
import { StatusStrip, type StatusStripItem } from './StatusStrip';
import { RecentDocumentsTable } from './RecentDocumentsTable';
import { ReceiptMetricCards, type ReceiptStats } from './ReceiptMetricCards';
import { ReceiptStatusBreakdown } from './ReceiptStatusBreakdown';
import { getPlanEntry } from '@/lib/plan-catalog';

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

  // Savings maths for the document highlight card: pay-per-doc ($12/doc) vs the
  // plan's monthly price.
  const planKey = usage?.planName ?? companyProfile?.plan ?? null;
  const planCost = getPlanEntry(planKey).price;
  const ppcPerDoc = getPlanEntry('PAY_PER_CONTRACT').price; // $12
  const docsThisMonth = usage?.documentsUsed ?? 0;
  const ppcCost = docsThisMonth * ppcPerDoc;

  // Document status counts for the compact status strip.
  const docStatus = useMemo<StatusStripItem[]>(() => {
    const counts: Record<string, number> = {
      DRAFT: 0, SENT: 0, VIEWED: 0, SIGNED: 0, COMPLETED: 0, CANCELLED: 0,
    };
    (documents ?? []).forEach((d) => {
      const k = (d.status ?? '').toUpperCase();
      if (k in counts) counts[k] += 1;
    });
    return [
      { key: 'draft', label: 'Draft', count: counts.DRAFT, icon: <FileText size={16} /> },
      { key: 'sent', label: 'Sent', count: counts.SENT, icon: <Send size={16} /> },
      { key: 'viewed', label: 'Viewed', count: counts.VIEWED, icon: <Eye size={16} /> },
      { key: 'signed', label: 'Signed', count: counts.SIGNED, icon: <PenLine size={16} /> },
      { key: 'completed', label: 'Completed', count: counts.COMPLETED, icon: <CheckCircle2 size={16} /> },
      { key: 'cancelled', label: 'Cancelled', count: counts.CANCELLED, icon: <Ban size={16} /> },
    ];
  }, [documents]);

  // Skeleton — Row 1 welcome · Row 2 [volume | highlight] · Row 3 status strip ·
  // Row 4 recent. Same shape for documents and receipts; the receipts wiring lands
  // in a follow-up commit (still on the old receipt cards below for now).
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

      {receiptsOnly ? (
        <>
          {/* Receipts — still on the old cards; migrated to the new skeleton next. */}
          <ReceiptStatusBreakdown
            stats={receiptStats}
            isLoading={isLoading || statsLoading}
          />
          <RecentDocumentsTable
            documents={documents?.slice(0, 5) || []}
            isLoading={isLoading}
            entity="receipt"
            onView={onOpenDocument}
          />
          <ReceiptMetricCards stats={receiptStats} isLoading={isLoading || statsLoading} />
        </>
      ) : (
        <>
          {/* Row 2 — volume (quota) | savings (green highlight). */}
          <div className="overview-row2">
            <MonthVolumeCard
              entity="document"
              used={docsThisMonth}
              limit={usage?.documentsLimit ?? null}
              isLoading={isLoading}
            />
            <HighlightCard
              variant="savings"
              docsThisMonth={docsThisMonth}
              ppcCost={ppcCost}
              planCost={planCost}
              isLoading={isLoading}
            />
          </div>

          {/* Row 3 — compact document status. */}
          <StatusStrip
            title="Document status"
            items={docStatus}
            variant="documents"
            isLoading={isLoading}
          />

          {/* Row 4 — recent documents. */}
          <RecentDocumentsTable
            documents={documents?.slice(0, 5) || []}
            isLoading={isLoading}
            entity="document"
            onView={onOpenDocument}
          />
        </>
      )}
    </div>
  );
}
