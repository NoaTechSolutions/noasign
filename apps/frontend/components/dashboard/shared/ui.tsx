"use client";

import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCompanyInitials } from "@/lib/format";
import "./field-row.css";

/**
 * Canonical loading placeholder — the ONE reusable skeleton primitive. Wraps the
 * global `skeleton-pulse` shimmer (globals.css). Size it to match the real
 * content so swapping in the loaded value causes NO layout shift. Prefer this
 * over hand-rolled `skeleton-pulse` spans.
 */
export function Skeleton({
  width,
  height = 14,
  radius,
  circle = false,
  className,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "skeleton-pulse",
        circle ? "skeleton-circle" : "skeleton-line",
        className,
      )}
      style={{
        display: "inline-block",
        width,
        height,
        ...(radius != null ? { borderRadius: radius } : null),
        ...style,
      }}
    />
  );
}

export function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="field-row">
      <span className="field-row__label">{label}</span>
      <span className={cn("field-row__value", !value && "field-row__value--empty")}>
        {value || "—"}
      </span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="field-row">
      <span className="skeleton-pulse skeleton-line" style={{ width: '70px', height: '12px' }} />
      <span className="skeleton-pulse skeleton-line" style={{ width: '60%', height: '12px' }} />
    </div>
  );
}

function SkeletonGroup({ rows = 3 }: { rows?: number }) {
  return (
    <div className="form-group">
      <div className="group-pair-header">
        <span className="skeleton-pulse" style={{ width: '14px', height: '14px', borderRadius: '4px' }} />
        <span className="skeleton-pulse skeleton-line" style={{ width: '80px', height: '11px' }} />
      </div>
      <div className="field-rows">
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}

export function ProfileSectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <>
      <div className="group-pair">
        <SkeletonGroup rows={rows + 1} />
        <SkeletonGroup rows={rows + 1} />
      </div>
      <div className="group-pair">
        <SkeletonGroup rows={rows} />
        <SkeletonGroup rows={rows} />
      </div>
    </>
  );
}

/**
 * Shared UI components for dashboard panels.
 *
 * FASE 3.5 — moved from `components/dashboard-sidebar-demo.tsx`.
 * Implementations are byte-for-byte copies of the originals. Do not modify
 * markup/styling without checking call sites (StatPill / DetailRow / etc.
 * are used by multiple panels).
 */

export function StatPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4"><div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">{label}</div><div className="mt-3 text-sm font-medium leading-5 text-[color:var(--text-primary)]">{value}</div></div>;
}

export function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
  return <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4"><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]"><span className="text-[color:var(--text-muted)]">{icon}</span>{label}</div><div className="mt-3 text-sm font-medium leading-5 text-[color:var(--text-primary)]">{value}</div></div>;
}

export function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--bg-surface)] px-5 py-8 text-center text-sm text-[color:var(--text-secondary)]">{text}</div>;
}

export function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3"><span className="text-sm text-[color:var(--text-secondary)]">{label}</span><span className="text-sm font-semibold text-[color:var(--text-primary)]">{value}</span></div>;
}

export function CompanyAvatar({
  companyName,
  logoUrl,
  className,
}: {
  companyName?: string | null;
  logoUrl?: string | null;
  className?: string;
}) {
  const fallback = getCompanyInitials(companyName);

  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-[color:var(--brand-secondary)] font-semibold text-white", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${companyName ?? "Company"} logo`} className="h-full w-full object-cover" />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

export function CustomerTypeBadge({ type }: { type: "PERSONAL" | "BUSINESS" }) {
  if (type === "BUSINESS") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
        Business
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
      Personal
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    DRAFT: "bg-[color:var(--badge-neutral-bg)] text-[color:var(--badge-neutral-text)]",
    SENT: "bg-[color:var(--badge-primary-bg)] text-[color:var(--badge-primary-text)]",
    VIEWED: "bg-[color:var(--info-bg)] text-[color:var(--info-text)]",
    SIGNED: "bg-[color:var(--success-bg)] text-[color:var(--success-text)]",
    COMPLETED: "bg-[color:var(--success-bg)] text-[color:var(--success-text)]",
    CANCELLED: "bg-[color:var(--badge-danger-bg)] text-[color:var(--badge-danger-text)]",
  };
  return <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", tones[status] ?? "bg-[color:var(--badge-neutral-bg)] text-[color:var(--badge-neutral-text)]")}>{status}</span>;
}

export function EditableField({
  icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  min,
  error,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "textarea";
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  error?: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
        {icon ? <span className="text-[color:var(--text-muted)]">{icon}</span> : null}
        {label}
      </div>
      {type === "textarea" ? (
        <textarea
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "mt-3 min-h-28 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
            error && "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]",
            disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
          )}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          min={type === "date" ? min : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
            error && "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]",
            disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
          )}
        />
      )}
      {error ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[color:var(--danger-text)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
