import './overview-panel.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Send, Eye, PenLine, CheckCircle2, Ban, AlertTriangle } from 'lucide-react';
import { WelcomeCard } from './WelcomeCard';
import { MonthVolumeCard } from './MonthVolumeCard';
import { HighlightCard } from './HighlightCard';
import { ReceiptSummaryCard } from './ReceiptSummaryCard';
import { TopClientsCard } from './TopClientsCard';
import { StatusStrip, type StatusStripItem } from './StatusStrip';
import { RecentDocumentsTable } from './RecentDocumentsTable';
import type { ReceiptStats } from './ReceiptMetricCards';
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
    // Owner order: Completed, Draft, Sent, Viewed, Signed, Cancelled.
    return [
      { key: 'completed', label: 'Completed', count: counts.COMPLETED, icon: <CheckCircle2 size={18} />, tone: 'green' },
      { key: 'draft', label: 'Draft', count: counts.DRAFT, icon: <FileText size={18} />, tone: 'navy' },
      { key: 'sent', label: 'Sent', count: counts.SENT, icon: <Send size={18} />, tone: 'sky' },
      { key: 'viewed', label: 'Viewed', count: counts.VIEWED, icon: <Eye size={18} />, tone: 'amber' },
      { key: 'signed', label: 'Signed', count: counts.SIGNED, icon: <PenLine size={18} />, tone: 'green-soft' },
      { key: 'cancelled', label: 'Cancelled', count: counts.CANCELLED, icon: <Ban size={18} />, tone: 'red' },
    ];
  }, [documents]);

  // Receipt status counts (from GET /documents/receipt/stats). Cancelled + Void
  // are folded into one "Cancelled" mini-card.
  const receiptStatus: StatusStripItem[] = [
    { key: 'sent', label: 'Sent', count: receiptStats?.byStatus.sent ?? 0, icon: <Send size={18} />, tone: 'sky' },
    { key: 'draft', label: 'Draft', count: receiptStats?.byStatus.draft ?? 0, icon: <FileText size={18} />, tone: 'navy' },
    { key: 'failed', label: 'Send failed', count: receiptStats?.byStatus.sendFailed ?? 0, icon: <AlertTriangle size={18} />, tone: 'amber' },
    {
      key: 'void',
      label: 'Cancelled',
      count: (receiptStats?.byStatus.cancelled ?? 0) + (receiptStats?.byStatus.void ?? 0),
      icon: <Ban size={18} />,
      tone: 'red',
    },
  ];

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

      {/* Row 2 — volume | green highlight. Documents: used/limit + savings.
          Receipts: volume (no quota) + $ amount this month. */}
      <div className="overview-row2">
        {receiptsOnly ? (
          <>
            <ReceiptSummaryCard
              receiptsThisMonth={receiptStats?.receiptsThisMonth ?? 0}
              amountThisMonth={receiptStats?.amountThisMonth ?? 0}
              isLoading={isLoading || statsLoading}
            />
            <TopClientsCard
              clients={receiptStats?.topClients ?? []}
              isLoading={isLoading || statsLoading}
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Row 3 — compact status strip (6 document statuses / 4 receipt statuses). */}
      <StatusStrip
        title={receiptsOnly ? 'Receipt status' : 'Document status'}
        items={receiptsOnly ? receiptStatus : docStatus}
        variant={receiptsOnly ? 'receipts' : 'documents'}
        isLoading={receiptsOnly ? isLoading || statsLoading : isLoading}
      />

      {/* Row 4 — recent documents / receipts. */}
      <RecentDocumentsTable
        documents={documents?.slice(0, 5) || []}
        isLoading={isLoading}
        entity={receiptsOnly ? 'receipt' : 'document'}
        onView={onOpenDocument}
      />
    </div>
  );
}
