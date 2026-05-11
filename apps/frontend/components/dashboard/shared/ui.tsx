"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCompanyInitials } from "@/lib/format";

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
