"use client";

import { CreditCard, FileText, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleLayout } from "@/components/layouts";
// FASE 3.5 — helpers centralizados en lib/ y components/dashboard/shared/
import { formatCurrency, formatBillingMonthLabel } from "@/lib/format";
import { useSessionStorageState } from "@/lib/use-session-storage-state";
import {
  DetailRow,
  EmptyBlock,
  MiniMetric,
  StatPill,
} from "@/components/dashboard/shared/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Usage = {
  planName: string;
  billingPeriod: string;
  monthlyDocLimit: number;
  documentsUsed: number;
  remainingDocuments: number | null;
  isUnlimited: boolean;
  overagePrice: string | number;
  overageDocuments: number;
} | null;

type MonthlySummary = {
  month: string;
  planName: string;
  monthlyDocLimit: number;
  isUnlimited: boolean;
  documentsSent: number;
  overageDocuments: number;
  estimatedOverageCost: number;
  overagePrice: string | number;
} | null;

type BillingHistoryItem = {
  month: string;
  planName: string;
  monthlyDocLimit: number;
  isUnlimited: boolean;
  overagePrice: string | number;
  documentsSent: number;
  overageDocuments: number;
  estimatedOverageCost: number;
};

// ─── Billing-only helpers (moved from monolith) ───────────────────────────────

const BILLING_PLANS_MODAL_KEY = "ntssign:billing:plans-modal-open";

function BillingHistoryRow({
  month,
  documentsSent,
  overageDocuments,
  maxValue,
}: {
  month: string;
  documentsSent: number;
  overageDocuments: number;
  maxValue: number;
}) {
  const width = Math.max((documentsSent / maxValue) * 100, documentsSent > 0 ? 10 : 0);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--text-primary)]">{formatBillingMonthLabel(month)}</div>
          <div className="text-xs text-[color:var(--text-secondary)]">
            {overageDocuments > 0 ? `${overageDocuments} overage doc(s)` : "Within plan limit"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-[color:var(--text-primary)]">{documentsSent}</div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">docs</div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-[color:var(--bg-surface)]">
        <div
          className={cn("h-3 rounded-full transition-all", overageDocuments > 0 ? "bg-[color:var(--button-danger)]" : "bg-[color:var(--brand-accent)]")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MonthCompareBar({
  label,
  documentsSent,
  overageDocuments,
  maxValue,
  tone,
}: {
  label?: string | null;
  documentsSent: number;
  overageDocuments: number;
  maxValue: number;
  tone: "slate" | "blue";
}) {
  const width = Math.max((documentsSent / maxValue) * 100, documentsSent > 0 ? 10 : 0);
  const color = tone === "blue" ? "bg-[color:var(--brand-accent)]" : "bg-[color:var(--text-muted)]";

  return (
    <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--text-primary)]">{label ?? "Current month"}</div>
          <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
            {overageDocuments > 0 ? `${overageDocuments} overage doc(s)` : "No overage"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">{documentsSent}</div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">docs</div>
        </div>
      </div>
      <div className="mt-4 h-4 rounded-full bg-[color:var(--bg-elevated)]">
        <div className={cn("h-4 rounded-full transition-all", color)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BillingPanel({
  usage,
  monthlySummary,
  billingHistory,
}: {
  usage: Usage;
  monthlySummary: MonthlySummary;
  billingHistory: BillingHistoryItem[];
}) {
  // Restored from sessionStorage so the compare-plans modal survives a reload,
  // via useSyncExternalStore (no setState-in-effect, #418). Wire-compatible with
  // the prior readSessionBoolean/writeSessionBoolean encoding ("true"/"false").
  const [plansModalOpen, setPlansModalOpen] = useSessionStorageState<boolean>(
    BILLING_PLANS_MODAL_KEY,
    false,
  );
  const currentPlan = usage?.planName ?? monthlySummary?.planName ?? "LAUNCH";
  const documentsUsed = usage?.documentsUsed ?? 0;
  const monthlyLimit = usage?.monthlyDocLimit ?? monthlySummary?.monthlyDocLimit ?? 0;
  const remaining = usage?.remainingDocuments;
  const overageDocuments = usage?.overageDocuments ?? monthlySummary?.overageDocuments ?? 0;
  const overagePrice = Number(usage?.overagePrice ?? monthlySummary?.overagePrice ?? 0);
  const nextInvoiceOverage = overageDocuments * overagePrice;
  const usagePercent = usage?.isUnlimited || monthlyLimit <= 0 ? 0 : Math.min((documentsUsed / monthlyLimit) * 100, 100);
  const maxHistoryValue = Math.max(...billingHistory.map((item) => item.documentsSent), 1);
  const currentMonthSummary = billingHistory[billingHistory.length - 1] ?? null;
  const previousMonthSummary = billingHistory[billingHistory.length - 2] ?? null;
  const compareMaxValue = Math.max(
    currentMonthSummary?.documentsSent ?? 0,
    previousMonthSummary?.documentsSent ?? 0,
    1,
  );
  const planCards = [
    {
      name: "STARTER",
      displayName: "Starter",
      price: "$19/mo",
      annualPrice: "$16/mo annual",
      limit: "5 docs / month",
      description: "For solo operators with one main workflow.",
      isMostPopular: false,
      accent: "border-[color:var(--border)] bg-white text-[color:var(--text-primary)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white",
    },
    {
      name: "LAUNCH",
      displayName: "Launch",
      price: "$39/mo",
      annualPrice: "$32/mo annual",
      limit: "15 docs / month",
      description: "For small teams that send contracts regularly.",
      isMostPopular: true,
      accent: "border-[color:var(--info-border)] bg-[color:var(--info-bg)] text-[color:var(--info-text)] dark:border-[color:var(--info-border)] dark:bg-[color:var(--info-bg)] dark:text-[color:var(--info-text)]",
    },
    {
      name: "PRO",
      displayName: "Pro",
      price: "$89/mo",
      annualPrice: "$74/mo annual",
      limit: "50 docs / month",
      description: "For growing businesses that need branding and analytics.",
      isMostPopular: false,
      accent: "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100",
    },
    {
      name: "SCALE",
      displayName: "Scale",
      price: "$229/mo",
      annualPrice: "$190/mo annual",
      limit: "150 docs / month",
      description: "For high-volume teams that need priority support.",
      isMostPopular: false,
      accent: "border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-[color:var(--success-text)] dark:border-[color:var(--success-border)] dark:bg-[color:var(--success-bg)] dark:text-[color:var(--success-text)]",
    },
  ];
  const currentPlanDisplay = planCards.find((p) => p.name === currentPlan)?.displayName ?? currentPlan;

  return (
    <ModuleLayout
      title="Billing"
      description="Track your plan, usage, and overage charges"
    >
      <section className="grid gap-4">
        <div className="rounded-[1.9rem] border border-[color:var(--brand-accent-soft)] bg-[linear-gradient(135deg,#ffffff_0%,#f0f4ff_40%,#dbeafe_100%)] p-5 shadow-[0_24px_70px_rgba(36,76,144,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b0f1a_0%,#0f1628_42%,#1d4ed8_100%)] dark:shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-secondary)]/70 dark:text-[color:var(--text-primary)]/65">Billing</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)] md:text-5xl">Understand your plan in seconds</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)] dark:text-[color:var(--text-primary)]/88 md:text-base">
                See how many documents you used this month, how close you are to your limit, and what would be charged on your next payment if you go over.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)] dark:text-[color:var(--text-primary)]/60">Used this month</div>
                  <div className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{documentsUsed}</div>
                </div>
                <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)] dark:text-[color:var(--text-primary)]/60">Still available</div>
                  <div className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{remaining === null ? "Unlimited" : remaining}</div>
                </div>
                <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)] dark:text-[color:var(--text-primary)]/60">Next extra charge</div>
                  <div className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{formatCurrency(nextInvoiceOverage)}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 xl:items-end">
              <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--brand-accent-soft)] bg-white/90 px-4 py-3 text-[color:var(--text-primary)] shadow-[0_10px_30px_rgba(37,99,235,0.10)] backdrop-blur dark:border-white/14 dark:bg-white/10 dark:text-[color:var(--text-primary)] dark:shadow-none">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-primary)]/60">Current plan</span>
                <span className="rounded-full bg-[color:var(--button-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.32)]">{currentPlanDisplay}</span>
              </div>
              <button
                type="button"
                onClick={() => setPlansModalOpen(true)}
                className="rounded-full bg-[color:var(--brand-secondary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:bg-[color:var(--brand-secondary-strong)] dark:bg-white dark:text-[color:var(--brand-secondary)] dark:hover:bg-[color:var(--bg-page-subtle)]"
              >
                Need more documents?
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4">
            <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Current month</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                    {usage?.billingPeriod ? `Usage for ${usage.billingPeriod}` : "Usage overview"}
                  </h3>
                </div>
                <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-secondary)]">
                  {usage?.isUnlimited ? "Unlimited plan" : `${documentsUsed} of ${monthlyLimit} docs used`}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatPill label="Documents used" value={String(documentsUsed)} />
                <StatPill label="Remaining" value={remaining === null ? "Unlimited" : String(remaining)} />
                <StatPill label="Overage docs" value={String(overageDocuments)} />
                <StatPill label="Next invoice overage" value={formatCurrency(nextInvoiceOverage)} />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[color:var(--text-secondary)] dark:text-[color:var(--text-secondary)]">Plan usage progress</div>
                  <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                    {usage?.isUnlimited ? "Unlimited" : `${Math.round(usagePercent)}%`}
                  </div>
                </div>
                <div className="mt-4 h-4 rounded-full bg-white dark:bg-[color:var(--bg-page)]/70">
                  <div
                    className={cn(
                      "h-4 rounded-full transition-all",
                      overageDocuments > 0 ? "bg-[color:var(--button-danger)]" : usagePercent > 75 ? "bg-[color:var(--button-warning)]" : "bg-[color:var(--button-primary)]",
                    )}
                    style={{ width: `${usage?.isUnlimited ? 100 : Math.max(usagePercent, documentsUsed > 0 ? 10 : 0)}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniMetric label="Monthly limit" value={usage?.isUnlimited ? "Unlimited" : String(monthlyLimit)} />
                  <MiniMetric label="Per overage doc" value={formatCurrency(overagePrice)} />
                  <MiniMetric label="Charge next cycle" value={formatCurrency(nextInvoiceOverage)} />
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">3-month trend</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">Documents used recently</h3>
                </div>
                <div className="rounded-full bg-[color:var(--bg-page-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)] dark:bg-white/[0.04] dark:text-[color:var(--text-secondary)]">Live data</div>
              </div>
              <div className="mt-6 grid gap-4">
                {billingHistory.map((item) => (
                  <BillingHistoryRow
                    key={item.month}
                    month={item.month}
                    documentsSent={item.documentsSent}
                    overageDocuments={item.overageDocuments}
                    maxValue={maxHistoryValue}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Month vs month</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">Current month compared to last month</h3>
                </div>
                <div className="rounded-full bg-[color:var(--bg-page-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)] dark:bg-white/[0.04] dark:text-[color:var(--text-secondary)]">Comparison</div>
              </div>
              <div className="mt-6 grid gap-5">
                {previousMonthSummary ? (
                  <>
                    <MonthCompareBar
                      label={formatBillingMonthLabel(previousMonthSummary.month)}
                      documentsSent={previousMonthSummary.documentsSent}
                      overageDocuments={previousMonthSummary.overageDocuments}
                      maxValue={compareMaxValue}
                      tone="slate"
                    />
                    <MonthCompareBar
                      label={formatBillingMonthLabel(currentMonthSummary?.month)}
                      documentsSent={currentMonthSummary?.documentsSent ?? documentsUsed}
                      overageDocuments={currentMonthSummary?.overageDocuments ?? overageDocuments}
                      maxValue={compareMaxValue}
                      tone="blue"
                    />
                  </>
                ) : (
                  <EmptyBlock text="A comparison chart will appear once at least two billing months are available." />
                )}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Overage visibility</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">What happens next</h3>
              <div className="mt-5 grid gap-3">
                <DetailRow icon={<CreditCard className="h-4 w-4" />} label="Current plan" value={currentPlanDisplay} />
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Docs above plan" value={String(overageDocuments)} />
                <DetailRow icon={<WalletCards className="h-4 w-4" />} label="Price per extra doc" value={formatCurrency(overagePrice)} />
                <DetailRow icon={<WalletCards className="h-4 w-4" />} label="Estimated next charge" value={formatCurrency(nextInvoiceOverage)} />
              </div>
              <div className={cn(
                "mt-5 rounded-[1.35rem] border p-4 text-sm",
                overageDocuments > 0
                  ? "border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] text-[color:var(--warning-text)] dark:border-[color:var(--warning-border)] dark:bg-[color:var(--warning-bg)] dark:text-[color:var(--warning-text)]"
                  : "border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-[color:var(--success-text)] dark:border-[color:var(--success-border)] dark:bg-[color:var(--success-bg)] dark:text-[color:var(--success-text)]",
              )}>
                {overageDocuments > 0
                  ? `You are currently ${overageDocuments} document(s) above your monthly plan. This estimated overage will be included on the next invoice.`
                  : "You are still within plan limits for the current billing month."}
              </div>
            </div>
          </div>
        </div>

        {plansModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center md:items-center bg-black/60 p-4 pt-20 md:pt-0 backdrop-blur">
            <button type="button" aria-label="Close plans modal" onClick={() => setPlansModalOpen(false)} className="absolute inset-0" />
            <div className="relative z-10 w-full max-w-4xl rounded-[2rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)] md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Need more documents?</div>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">Upgrade your plan before you hit the limit</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                    Your current plan is <span className="font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{currentPlanDisplay}</span>. Compare the next plans and choose the one that fits your monthly document volume.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlansModalOpen(false)}
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {planCards.map((plan) => (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative rounded-[1.6rem] border p-5",
                      plan.accent,
                      plan.name === currentPlan && "ring-2 ring-[color:var(--brand-accent)]/30",
                    )}
                  >
                    {plan.isMostPopular && plan.name !== currentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-[color:var(--button-primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
                          Most popular
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                          {plan.name === currentPlan ? "Current plan" : "Available plan"}
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{plan.displayName}</div>
                      </div>
                      <span className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                        plan.name === currentPlan ? "bg-[color:var(--brand-secondary)] text-white dark:bg-white dark:text-[color:var(--brand-secondary)]" : "bg-[color:var(--button-primary)] text-white",
                      )}>
                        {plan.name === currentPlan ? "Current" : "Upgrade"}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xl font-bold tracking-[-0.03em]">{plan.price}</span>
                      <span className="ml-2 text-xs opacity-55">{plan.annualPrice}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium opacity-75">{plan.limit}</div>
                    <div className="mt-4 rounded-[1.2rem] bg-white/70 p-3 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:bg-[color:var(--bg-page)]/40 dark:shadow-none">
                      {plan.description}
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                        plan.name === currentPlan
                          ? "bg-[color:var(--bg-surface-strong)] text-[color:var(--text-muted)] dark:bg-white/10 dark:text-[color:var(--text-muted)]"
                          : "bg-[color:var(--button-primary)] text-white hover:bg-[color:var(--button-primary-hover)]",
                      )}
                    >
                      {plan.name === currentPlan ? "You are on this plan" : `Choose ${plan.displayName}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </ModuleLayout>
  );
}
