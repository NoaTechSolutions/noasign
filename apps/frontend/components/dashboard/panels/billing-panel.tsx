"use client";

import { useEffect, useState } from "react";
import { CreditCard, FileText, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleLayout } from "@/components/layouts";
// FASE 3 POC (Opción A) — circular import. Helpers compartidos viven en el
// monolito y se exportan desde ahí. Deuda técnica: mover StatPill,
// DetailRow, EmptyBlock, MiniMetric, formatCurrency, session utils a
// `lib/format.ts` + `lib/session-storage.ts` + `components/dashboard/shared/ui.tsx`
// en FASE 3.5 cuando se extraigan más panels.
import {
  DetailRow,
  EmptyBlock,
  MiniMetric,
  StatPill,
  formatCurrency,
  readSessionBoolean,
  writeSessionBoolean,
} from "../../dashboard-sidebar-demo";

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

function formatBillingMonthLabel(billingPeriod?: string) {
  if (!billingPeriod) return "Unknown month";
  const [year, month] = billingPeriod.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return billingPeriod;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

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
  const [plansModalOpen, setPlansModalOpen] = useState(false);
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
      accent: "border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white",
    },
    {
      name: "LAUNCH",
      displayName: "Launch",
      price: "$39/mo",
      annualPrice: "$32/mo annual",
      limit: "15 docs / month",
      description: "For small teams that send contracts regularly.",
      isMostPopular: true,
      accent: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
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
      accent: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
    },
  ];
  const currentPlanDisplay = planCards.find((p) => p.name === currentPlan)?.displayName ?? currentPlan;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlansModalOpen(readSessionBoolean(BILLING_PLANS_MODAL_KEY));
  }, []);

  useEffect(() => {
    writeSessionBoolean(BILLING_PLANS_MODAL_KEY, plansModalOpen);
  }, [plansModalOpen]);

  return (
    <ModuleLayout
      title="Billing"
      description="Track your plan, usage, and overage charges"
    >
      <section className="grid gap-4">
        <div className="rounded-[1.9rem] border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_40%,#dbeafe_100%)] p-5 shadow-[0_24px_70px_rgba(36,76,144,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b1220_0%,#111827_42%,#1d4ed8_100%)] dark:shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600/70 dark:text-white/65">Billing</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white md:text-5xl">Understand your plan in seconds</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-white/88 md:text-base">
                See how many documents you used this month, how close you are to your limit, and what would be charged on your next payment if you go over.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">Used this month</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{documentsUsed}</div>
                </div>
                <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">Still available</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{remaining === null ? "Unlimited" : remaining}</div>
                </div>
                <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">Next extra charge</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(nextInvoiceOverage)}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 xl:items-end">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_10px_30px_rgba(37,99,235,0.10)] backdrop-blur dark:border-white/14 dark:bg-white/10 dark:text-white dark:shadow-none">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-white/60">Current plan</span>
                <span className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.32)]">{currentPlanDisplay}</span>
              </div>
              <button
                type="button"
                onClick={() => setPlansModalOpen(true)}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                Need more documents?
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Current month</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                    {usage?.billingPeriod ? `Usage for ${usage.billingPeriod}` : "Usage overview"}
                  </h3>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {usage?.isUnlimited ? "Unlimited plan" : `${documentsUsed} of ${monthlyLimit} docs used`}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatPill label="Documents used" value={String(documentsUsed)} />
                <StatPill label="Remaining" value={remaining === null ? "Unlimited" : String(remaining)} />
                <StatPill label="Overage docs" value={String(overageDocuments)} />
                <StatPill label="Next invoice overage" value={formatCurrency(nextInvoiceOverage)} />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Plan usage progress</div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {usage?.isUnlimited ? "Unlimited" : `${Math.round(usagePercent)}%`}
                  </div>
                </div>
                <div className="mt-4 h-4 rounded-full bg-white dark:bg-slate-950/70">
                  <div
                    className={cn(
                      "h-4 rounded-full transition-all",
                      overageDocuments > 0 ? "bg-rose-500" : usagePercent > 75 ? "bg-amber-500" : "bg-[#2563eb]",
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

            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">3-month trend</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Documents used recently</h3>
                </div>
                <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:bg-white/[0.04] dark:text-slate-300">Live data</div>
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
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Month vs month</div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Current month compared to last month</h3>
                </div>
                <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:bg-white/[0.04] dark:text-slate-300">Comparison</div>
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

            <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Overage visibility</div>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">What happens next</h3>
              <div className="mt-5 grid gap-3">
                <DetailRow icon={<CreditCard className="h-4 w-4" />} label="Current plan" value={currentPlanDisplay} />
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Docs above plan" value={String(overageDocuments)} />
                <DetailRow icon={<WalletCards className="h-4 w-4" />} label="Price per extra doc" value={formatCurrency(overagePrice)} />
                <DetailRow icon={<WalletCards className="h-4 w-4" />} label="Estimated next charge" value={formatCurrency(nextInvoiceOverage)} />
              </div>
              <div className={cn(
                "mt-5 rounded-[1.35rem] border p-4 text-sm",
                overageDocuments > 0
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
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
            <div className="relative z-10 w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900 md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Need more documents?</div>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Upgrade your plan before you hit the limit</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Your current plan is <span className="font-semibold text-slate-900 dark:text-white">{currentPlanDisplay}</span>. Compare the next plans and choose the one that fits your monthly document volume.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlansModalOpen(false)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
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
                      plan.name === currentPlan && "ring-2 ring-[#2563eb]/30",
                    )}
                  >
                    {plan.isMostPopular && plan.name !== currentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-[#2563eb] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
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
                        plan.name === currentPlan ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-[#2563eb] text-white",
                      )}>
                        {plan.name === currentPlan ? "Current" : "Upgrade"}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-xl font-bold tracking-[-0.03em]">{plan.price}</span>
                      <span className="ml-2 text-xs opacity-55">{plan.annualPrice}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium opacity-75">{plan.limit}</div>
                    <div className="mt-4 rounded-[1.2rem] bg-white/70 p-3 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:bg-slate-950/40 dark:shadow-none">
                      {plan.description}
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                        plan.name === currentPlan
                          ? "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                          : "bg-[#2563eb] text-white hover:bg-blue-700",
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
