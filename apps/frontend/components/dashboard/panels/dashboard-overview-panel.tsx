"use client";

import { useTheme } from "next-themes";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleLayout } from "@/components/layouts";
// FASE 3.5 — helpers centralizados.
import { formatBillingMonthShort } from "@/lib/format";
import { MiniMetric } from "@/components/dashboard/shared/ui";
// buildContractStats stays in monolith (orchestrator logic, not a shared helper).
// Importing for type-only usage in the panel props would create circular
// import — but we replaced that with explicit ContractStats type below, so
// no monolith import is needed here anymore.

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContractStats = {
  draft: number;
  sent: number;
  viewed: number;
  signed: number;
  completed: number;
  cancelled: number;
  total: number;
};

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

type StateTone = "slate" | "blue" | "cyan" | "green" | "forest" | "rose";

type TopState = {
  label: string;
  value: number;
  tone: StateTone;
};

// ─── Local helpers (panel-exclusive) ──────────────────────────────────────────

function statusDetail(label: string) {
  if (label === "Draft") return "Ready to edit";
  if (label === "Sent") return "Awaiting recipient action";
  if (label === "Viewed") return "Opened by recipient";
  if (label === "Signed") return "Signed, pending completion";
  if (label === "Completed") return "Finished contracts";
  return "Closed or cancelled";
}

function DonutChart({ stats, billingPeriod }: { stats: ContractStats; billingPeriod?: string }) {
  const total = Math.max(stats.total, 1);
  const segments = [{ value: stats.draft, color: "rgba(2, 41, 119, 0.5)" }, { value: stats.sent, color: "#05a5ff" }, { value: stats.viewed, color: "#0400f0" }, { value: stats.signed, color: "#0f9f6e" }, { value: stats.completed, color: "#022977" }, { value: stats.cancelled, color: "#c2410c" }];
  let cumulative = 0;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
        <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(2,41,119,0.12)" strokeWidth="12" />
        {segments.map((segment, index) => {
          const fraction = segment.value / total;
          const dash = fraction * 264;
          const gap = 264 - dash;
          const offset = -cumulative * 264;
          cumulative += fraction;
          if (segment.value === 0) return null;
          return <circle key={`segment-${index}`} cx="60" cy="60" r="42" fill="none" stroke={segment.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset} />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">{formatBillingMonthShort(billingPeriod)}</div>
        <div className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">{stats.total}</div>
      </div>
    </div>
  );
}

function ChartRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 8 : 0) : 0;
  return <div className="grid gap-2"><div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium text-[color:var(--text-secondary)]">{label}</span><span className="font-semibold text-[color:var(--text-primary)]">{value}</span></div><div className="h-3 rounded-full bg-[color:var(--bg-elevated)]"><div className={cn("h-3 rounded-full transition-all", color)} style={{ width: `${width}%` }} /></div></div>;
}

function StatusCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: StateTone }) {
  const tones = { slate: "bg-[color:var(--badge-neutral-bg)] border-[color:var(--border)] text-[color:var(--text-primary)]", blue: "bg-[color:var(--badge-primary-bg)] border-[color:var(--info-border)] text-[color:var(--badge-primary-text)]", cyan: "bg-[color:var(--info-bg)] border-[color:var(--info-border)] text-[color:var(--info-text)]", green: "bg-[color:var(--success-bg)] border-[color:var(--success-border)] text-[color:var(--success-text)]", forest: "bg-[color:var(--success-bg)] border-[color:var(--success-border)] text-[color:var(--success-text)]", rose: "bg-[color:var(--danger-bg)] border-[color:var(--danger-border)] text-[color:var(--danger-text)]" };
  return <div className={cn("rounded-[1.5rem] border p-4", tones[tone])}><div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">{label}</div><div className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{value}</div><div className="mt-2 text-sm opacity-80">{detail}</div></div>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardOverviewPanel({
  isLoading,
  displayName,
  planName,
  billingPeriod,
  monthlySummary,
  stats,
  topStates,
}: {
  isLoading: boolean;
  displayName: string;
  planName?: string | null;
  billingPeriod?: string | null;
  monthlySummary?: MonthlySummary;
  stats: ContractStats;
  topStates: TopState[];
}) {
  const { resolvedTheme } = useTheme();
  const progressStates = [
    { label: "Draft", value: stats.draft, tone: "bg-[color:var(--text-muted)]" },
    { label: "Sent", value: stats.sent, tone: "bg-[color:var(--button-primary)]" },
    { label: "Viewed", value: stats.viewed, tone: "bg-[color:var(--info-text)]" },
    { label: "Signed", value: stats.signed, tone: "bg-[color:var(--success)]" },
    { label: "Completed", value: stats.completed, tone: "bg-[color:var(--brand-secondary)]" },
    { label: "Cancelled", value: stats.cancelled, tone: "bg-[color:var(--button-danger)]" },
  ] as const;

  const isDarkTheme = resolvedTheme !== "light";
  const heroCardClassName = isDarkTheme
    ? "rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,#0b1220_0%,#111827_40%,#1d4ed8_100%)] p-5 text-white shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8"
    : "rounded-[1.9rem] border border-[#b7cbf3] bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_38%,#edf4ff_100%)] p-5 text-[#022977] shadow-[0_24px_70px_rgba(36,76,144,0.10)] md:p-8";
  const activityCardClassName = isDarkTheme
    ? "rounded-[1.9rem] border border-white/10 bg-[color:var(--bg-elevated)]/90 p-4 shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6"
    : "rounded-[1.9rem] border border-[#b7cbf3] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_18px_44px_rgba(36,76,144,0.06)] md:p-6";
  const monthlyOverviewClassName = isDarkTheme
    ? "rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-5"
    : "rounded-[1.6rem] border border-[#c8d8f6] bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] p-5";
  const statusBreakdownClassName = isDarkTheme
    ? "rounded-[1.6rem] border border-white/10 bg-white/5 p-5"
    : "rounded-[1.6rem] border border-[#c8d8f6] bg-[#f7faff] p-5";

  return (
    <ModuleLayout
      title="Dashboard"
      description="Overview of your workspace activity"
      icon={<LayoutDashboard className="w-6 h-6 text-[color:var(--brand-accent)]" />}
    >
      <section className={heroCardClassName}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={cn("text-xs font-semibold uppercase tracking-[0.28em]", isDarkTheme ? "text-white/65" : "text-[#476ca8]")}>NTSsign</div>
            <h1 className={cn("mt-3 text-3xl font-semibold tracking-[-0.05em] md:text-5xl", isDarkTheme ? "text-white" : "text-[#022977]")}>{isLoading ? "Welcome" : "Welcome back"}</h1>
            <p className={cn("mt-3 text-base md:text-lg", isDarkTheme ? "text-white/88" : "text-[#4c6798]")}>{isLoading ? "Loading user..." : displayName}</p>
            <div className={cn("mt-3 text-xs font-medium uppercase tracking-[0.24em]", isDarkTheme ? "text-white/55" : "text-[#6c86b3]")}>Built by NoaTechSolutions</div>
          </div>
          <div className={cn("inline-flex items-center gap-3 rounded-full px-4 py-3 backdrop-blur", isDarkTheme ? "border border-white/14 bg-white/10 text-white shadow-none" : "border border-[#b7cbf3] bg-white text-[#022977] shadow-[0_10px_30px_rgba(36,76,144,0.08)]")}>
            <span className={cn("text-xs font-semibold uppercase tracking-[0.24em]", isDarkTheme ? "text-white/60" : "text-[#6c86b3]")}>Current plan</span>
            <span className={cn("rounded-full px-4 py-2 text-sm font-semibold text-white", isDarkTheme ? "bg-[color:var(--button-primary)] shadow-[0_10px_24px_rgba(37,99,235,0.32)]" : "bg-[color:var(--button-primary)] shadow-[0_10px_24px_rgba(37,99,235,0.24)]")}>{isLoading ? "Loading..." : planName ?? "-"}</span>
          </div>
        </div>
      </section>

      <section className={cn("mt-4", activityCardClassName)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={cn("text-xs font-semibold uppercase tracking-[0.24em]", isDarkTheme ? "text-[color:var(--text-muted)]" : "text-[#6c86b3]")}>Current month</div>
            <h2 className={cn("mt-2 text-2xl font-semibold tracking-[-0.04em]", isDarkTheme ? "text-white" : "text-[#022977]")}>Contract activity</h2>
            <p className={cn("mt-2 max-w-2xl text-sm leading-6", isDarkTheme ? "text-[color:var(--text-muted)]" : "text-[#4c6798]")}>This dashboard only shows contracts from {billingPeriod ?? "the current month"}.</p>
          </div>
          <div className={cn("rounded-full px-4 py-2 text-sm font-medium", isDarkTheme ? "border border-white/10 bg-white/5 text-[color:var(--text-secondary)]" : "border border-[#b7cbf3] bg-[#edf4ff] text-[#4c6798]")}>{isLoading ? "Loading..." : `${stats.total} contracts this month`}</div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-4">
            <div className={monthlyOverviewClassName}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Monthly overview</div>
                  <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{isLoading ? "Loading..." : `${stats.total} contracts`}</div>
                </div>
                <DonutChart stats={stats} billingPeriod={billingPeriod ?? undefined} />
              </div>
              <div className="mt-5 grid gap-3">
                <MiniMetric label="Sent this month" value={isLoading ? "..." : String(monthlySummary?.documentsSent ?? stats.sent)} />
                <MiniMetric label="Billing counted" value={isLoading ? "..." : String(monthlySummary?.documentsSent ?? 0)} />
                <MiniMetric label="Overage docs" value={isLoading ? "..." : String(monthlySummary?.overageDocuments ?? 0)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {topStates.map((state) => <StatusCard key={state.label} label={state.label} value={state.value} detail={statusDetail(state.label)} tone={state.tone} />)}
            </div>
          </div>

          <div className={statusBreakdownClassName}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Status distribution</div>
                <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">Current month breakdown</div>
              </div>
              <div className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]", isDarkTheme ? "bg-[color:var(--bg-page)] text-[color:var(--text-muted)]" : "bg-white text-[#6c86b3]")}>Live</div>
            </div>
            <div className="mt-6 space-y-4">
              {progressStates.map((state) => <ChartRow key={state.label} label={state.label} value={state.value} total={stats.total} color={state.tone} />)}
            </div>
          </div>
        </div>
      </section>
    </ModuleLayout>
  );
}
