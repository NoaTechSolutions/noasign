"use client";

import NextImage from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// Shared brand + info-card primitives extracted from dashboard-sidebar-demo.tsx so
// they can be reused by the mini-monster sidebars (customers, and later profile,
// billing, etc.) without dragging in the 5000+ line monster chunk.

export function Logo() {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme !== "light";
  const brandLogoSrc = isDarkTheme ? "/ntssign-light.svg" : "/ntssign-dark.svg";
  const logoShellClass = isDarkTheme
    ? "border-white/10 bg-white"
    : "border-slate-200 bg-[#022977]";

  return (
    <Link
      href="/dashboard"
      className="relative z-20 mx-auto flex w-full flex-col items-center justify-center gap-2 py-1 text-center text-sm font-normal text-[color:var(--text-primary)]"
    >
      <div
        className={`relative h-28 w-28 shrink-0 overflow-hidden rounded-full border shadow-[var(--shadow-medium)] ${logoShellClass}`}
      >
        <NextImage
          src={brandLogoSrc}
          alt="NTSsign"
          fill
          className="object-contain p-1.5"
          sizes="96px"
          priority
        />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid justify-items-center whitespace-pre text-center"
      >
        <span
          className={cn(
            "text-[8px] uppercase tracking-[0.2em]",
            isDarkTheme ? "text-[color:var(--text-muted)]" : "text-[#022977]",
          )}
        >
          by <span className="font-semibold">NoaTechSolutions</span>
        </span>
      </motion.span>
    </Link>
  );
}

export function LogoIcon() {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme !== "light";
  const brandLogoSrc = isDarkTheme ? "/ntssign-light.svg" : "/ntssign-dark.svg";
  const logoShellClass = isDarkTheme
    ? "border-white/10 bg-white"
    : "border-slate-200 bg-[#022977]";

  return (
    <Link
      href="/dashboard"
      className="relative z-20 mx-auto flex items-center justify-center py-1 text-sm font-normal text-[color:var(--text-primary)]"
    >
      <div
        className={`relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full border shadow-[var(--shadow-medium)] ${logoShellClass}`}
      >
        <NextImage
          src={brandLogoSrc}
          alt="NTSsign"
          fill
          className="object-contain p-1"
          sizes="64px"
          priority
        />
      </div>
    </Link>
  );
}

export function InfoCard({
  label,
  title,
  subtitle,
  accent = false,
  actionLabel,
  onAction,
}: {
  label: string;
  title: string;
  subtitle: string;
  accent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-2.5 shadow-[var(--shadow-soft)] xl:p-4",
        accent
          ? "border-[color:var(--border)] bg-[linear-gradient(135deg,var(--badge-primary-bg)_0%,var(--bg-surface-strong)_100%)]"
          : "border-[color:var(--border)] bg-[color:var(--bg-elevated)]/85",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.28em]",
            accent
              ? "text-[color:var(--brand-accent-strong)]"
              : "text-[color:var(--text-muted)]",
          )}
        >
          {label}
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="mt-1 text-xs font-semibold text-[color:var(--text-primary)] xl:mt-3 xl:text-sm">
        {title}
      </div>
      <div className="mt-0.5 text-[10px] text-[color:var(--text-secondary)] xl:mt-1 xl:text-xs">
        {subtitle}
      </div>
    </div>
  );
}

export function getDisplayName(email?: string | null): string {
  if (!email) return "User";
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").replace(/\d+/g, " ").trim();
  if (!cleaned) return email;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}
