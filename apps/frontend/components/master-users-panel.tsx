"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  Building2,
  Copy,
  CheckCircle2,
  ChevronsUpDown,
  Clock3,
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ManagedUser = {
  id: string;
  companyProfileId: string | null;
  email: string;
  role: string;
  status: string;
  mustChangePassword?: boolean;
  accountType?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  companyProfile?: {
    id: string;
    companyName: string;
    planName: string;
    logoUrl?: string | null;
  } | null;
};

type AccountRequest = {
  id: string;
  fullName: string;
  email: string;
  requestedDocumentTypes: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  mode: "users" | "accountRequests";
  users: ManagedUser[] | null;
  accountRequests: AccountRequest[] | null;
  currentUserId?: string | null;
  isLoading: boolean;
  onCreateUser: (payload: {
    email: string;
    password: string;
    role: string;
    accountType?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
  }) => Promise<void>;
  onUpdateUser: (userId: string, payload: { email?: string; role?: string; status?: string }) => Promise<void>;
  onDeactivateUser: (userId: string) => Promise<void>;
  onReactivateUser: (userId: string) => Promise<void>;
  onResetUserPassword: (
    userId: string,
    payload: { password: string; temporary: boolean },
  ) => Promise<void>;
  onUpdateAccountRequestStatus: (
    requestId: string,
    status: "PENDING" | "APPROVED" | "REJECTED",
  ) => Promise<void>;
};

const userRoleFilters = ["ALL", "MASTER", "USER"] as const;
const userStatusFilters = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const;
const requestStatusFilters = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

type CreateFormState = {
  email: string;
  password: string;
  role: "MASTER" | "USER";
  accountType: "INDIVIDUAL" | "BUSINESS";
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
};
type EditingState = { id: string; email: string; role: "MASTER" | "USER" };
type ResetPasswordState = {
  id: string;
  email: string;
  temporary: boolean;
  password: string;
  confirmPassword: string;
};

const inputClass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-white/[0.06]";

const ghostButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/8";

const menuClass =
  "absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]";

const modalInputClass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-blue-500 dark:focus:bg-white/[0.06]";

const rowMenuButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/8";

const rowMenuClass =
  "absolute right-0 top-[calc(100%+0.5rem)] z-20 grid min-w-52 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]";

const rowActionClass =
  "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition";

const paginationButtonClass =
  "inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/8";

function toTitleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatUsPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatShortDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getUserName(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const normalized = localPart.replace(/[._-]+/g, " ").replace(/\d+/g, " ").trim();
  if (!normalized) return email;
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCompanyInitials(companyName?: string | null) {
  if (!companyName?.trim()) return "N";
  return companyName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

function CompanyAvatar({
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
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-[color:var(--brand-secondary)] font-semibold text-white",
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${companyName ?? "Company"} logo`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

function userStatusTone(status: string): "green" | "amber" | "rose" | "slate" {
  if (status === "ACTIVE") return "green";
  if (status === "SUSPENDED") return "amber";
  if (status === "INACTIVE") return "rose";
  return "slate";
}

function requestStatusTone(status: string): "green" | "amber" | "rose" | "slate" {
  if (status === "APPROVED") return "green";
  if (status === "PENDING") return "amber";
  if (status === "REJECTED") return "rose";
  return "slate";
}

function pendingCardTone(count: number) {
  if (count > 5) {
    return {
      container:
        "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10",
      label: "text-rose-700 dark:text-rose-200",
      value: "text-rose-800 dark:text-rose-100",
      subtitle: "text-rose-700 dark:text-rose-200",
    };
  }

  if (count > 0) {
    return {
      container:
        "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10",
      label: "text-amber-700 dark:text-amber-200",
      value: "text-amber-800 dark:text-amber-100",
      subtitle: "text-amber-700 dark:text-amber-200",
    };
  }

  return {
    container:
      "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]",
    label: "text-slate-500 dark:text-slate-400",
    value: "text-slate-950 dark:text-white",
    subtitle: "text-slate-500 dark:text-slate-400",
  };
}

function MenuLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
      {label}
    </div>
  );
}

function MenuOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/8",
      )}
    >
      <span>{label}</span>
      {active ? <CheckCircle2 className="h-4 w-4" /> : null}
    </button>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
      {text}
    </div>
  );
}

function InlineBadge({
  tone,
  children,
}: {
  tone: "slate" | "blue" | "green" | "amber" | "rose";
  children: ReactNode;
}) {
  const toneClass = {
    slate:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
    rose:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function UserModal({
  title,
  onClose,
  onSubmit,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Workspace access
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
              {title}
            </h3>
          </div>
          <button type="button" onClick={onClose} className={rowMenuButtonClass}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          {children}
          {footer}
        </form>
      </div>
    </div>
  );
}

function PaginationFooter({
  totalRows,
  pageStart,
  pageEnd,
  safePage,
  totalPages,
  onPrevious,
  onNext,
}: {
  totalRows: number;
  pageStart: number;
  pageEnd: number;
  safePage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {totalRows === 0 ? "Showing 0 of 0" : `Showing ${pageStart + 1}-${pageEnd} of ${totalRows}`}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={safePage <= 1}
          className={cn(paginationButtonClass, safePage <= 1 && "cursor-not-allowed opacity-50")}
        >
          Previous
        </button>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {safePage} / {totalPages}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={safePage >= totalPages}
          className={cn(
            paginationButtonClass,
            safePage >= totalPages && "cursor-not-allowed opacity-50",
          )}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function UserActionMenu({
  user,
  isOpen,
  isBusy,
  isSelf,
  actionMenuRef,
  onToggle,
  onEdit,
  onTemporaryPassword,
  onSetPassword,
  onDeactivate,
  onReactivate,
}: {
  user: ManagedUser;
  isOpen: boolean;
  isBusy: boolean;
  isSelf: boolean;
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onEdit: () => void;
  onTemporaryPassword: () => void;
  onSetPassword: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  return (
    <div ref={isOpen ? actionMenuRef : undefined} className="relative">
      <button type="button" onClick={onToggle} className={rowMenuButtonClass}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen ? (
        <div className={rowMenuClass}>
          <button
            type="button"
            disabled={isSelf}
            onClick={onEdit}
            className={cn(
              rowActionClass,
              isSelf
                ? "cursor-not-allowed opacity-60"
                : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
            )}
          >
            <Pencil className="h-4 w-4" />
            <span>{isSelf ? "Current user" : "Edit user"}</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onTemporaryPassword}
            className={cn(
              rowActionClass,
              isBusy
                ? "cursor-not-allowed opacity-60"
                : "text-amber-700 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-500/10",
            )}
          >
            <Clock3 className="h-4 w-4" />
            <span>Temporary password</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onSetPassword}
            className={cn(
              rowActionClass,
              isBusy
                ? "cursor-not-allowed opacity-60"
                : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Set password</span>
          </button>
          {user.status === "ACTIVE" ? (
            <button
              type="button"
              disabled={isBusy || isSelf}
              onClick={onDeactivate}
              className={cn(
                rowActionClass,
                isBusy || isSelf
                  ? "cursor-not-allowed opacity-60"
                  : "text-[color:var(--danger-text)] hover:bg-[color:var(--danger-bg)]",
              )}
            >
              <Ban className="h-4 w-4" />
              <span>{isSelf ? "Protected" : isBusy ? "Working..." : "Deactivate"}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={onReactivate}
              className={cn(
                rowActionClass,
                isBusy
                  ? "cursor-not-allowed opacity-60"
                  : "text-[color:var(--success-text)] hover:bg-[color:var(--success-bg)]",
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isBusy ? "Working..." : "Reactivate"}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RequestActionMenu({
  request,
  isOpen,
  isBusy,
  actionMenuRef,
  onToggle,
  onView,
  onApprove,
  onReject,
}: {
  request: AccountRequest;
  isOpen: boolean;
  isBusy: boolean;
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div ref={isOpen ? actionMenuRef : undefined} className="relative">
      <button type="button" onClick={onToggle} className={rowMenuButtonClass}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen ? (
        <div className={rowMenuClass}>
          <button
            type="button"
            onClick={onView}
            className={cn(
              rowActionClass,
              "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
            )}
          >
            <Eye className="h-4 w-4" />
            <span>View</span>
          </button>
          <button
            type="button"
            disabled={isBusy || request.status === "APPROVED"}
            onClick={onApprove}
            className={cn(
              rowActionClass,
              isBusy || request.status === "APPROVED"
                ? "cursor-not-allowed opacity-60"
                : "text-[color:var(--success-text)] hover:bg-[color:var(--success-bg)]",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {request.status === "APPROVED"
                ? "Already approved"
                : isBusy
                  ? "Working..."
                  : "Approve"}
            </span>
          </button>
          <button
            type="button"
            disabled={isBusy || request.status === "REJECTED"}
            onClick={onReject}
            className={cn(
              rowActionClass,
              isBusy || request.status === "REJECTED"
                ? "cursor-not-allowed opacity-60"
                : "text-[color:var(--danger-text)] hover:bg-[color:var(--danger-bg)]",
            )}
          >
            <Ban className="h-4 w-4" />
            <span>
              {request.status === "REJECTED"
                ? "Already rejected"
                : isBusy
                  ? "Working..."
                  : "Reject"}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AccountRequestDetailsModal({
  request,
  onClose,
}: {
  request: AccountRequest;
  onClose: () => void;
}) {
  return (
    <UserModal
      title="Request details"
      onClose={onClose}
      onSubmit={(event) => event.preventDefault()}
      footer={
        <div className="mt-2 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Close
          </button>
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="text-sm font-semibold text-slate-950 dark:text-white">
          {request.fullName}
        </div>
        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{request.email}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Status">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <InlineBadge tone={requestStatusTone(request.status)}>{request.status}</InlineBadge>
          </div>
        </FieldShell>
        <FieldShell label="Created">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            {formatShortDate(request.createdAt)}
          </div>
        </FieldShell>
      </div>
      <FieldShell label="Requested document types">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
          {request.requestedDocumentTypes.map((item) => (
            <InlineBadge key={item} tone="slate">
              {item}
            </InlineBadge>
          ))}
        </div>
      </FieldShell>
      <FieldShell label="Processed">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
          {request.processedAt ? formatShortDate(request.processedAt) : "Pending review"}
        </div>
      </FieldShell>
    </UserModal>
  );
}

function ResetPasswordModal({
  state,
  isSubmitting,
  onClose,
  onChange,
  onSubmit,
}: {
  state: ResetPasswordState;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (next: ResetPasswordState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<"password" | "confirm" | null>(null);

  function generateRandomPassword() {
    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const bytes = crypto.getRandomValues(new Uint32Array(14));
    const generated = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
    onChange({
      ...state,
      password: generated,
      confirmPassword: generated,
    });
    setShowPassword(true);
  }

  async function copyValue(value: string, field: "password" | "confirm") {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1500);
    } catch {}
  }

  const error =
    !state.password.trim()
      ? ""
      : state.password.length < 8
        ? "Password must have at least 8 characters"
        : state.confirmPassword && state.password !== state.confirmPassword
          ? "Both password fields must match"
          : "";

  return (
    <UserModal
      title={state.temporary ? "Set temporary password" : "Set new password"}
      onClose={onClose}
      onSubmit={onSubmit}
      footer={
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={generateRandomPassword}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/8"
          >
            Generate random
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className={ghostButtonClass}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(error)}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700",
                (isSubmitting || Boolean(error)) && "cursor-not-allowed opacity-60",
              )}
            >
              {state.temporary ? "Save temporary password" : "Save password"}
            </button>
          </div>
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
        {state.email}
      </div>
      <FieldShell label={state.temporary ? "Temporary password" : "New password"}>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={state.password}
            onChange={(event) => onChange({ ...state, password: event.target.value })}
            className={cn(modalInputClass, "pr-24")}
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => copyValue(state.password, "password")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </FieldShell>
      <FieldShell label="Confirm password">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={state.confirmPassword}
            onChange={(event) =>
              onChange({ ...state, confirmPassword: event.target.value })
            }
            onPaste={(event) => event.preventDefault()}
            onCopy={(event) => event.preventDefault()}
            onCut={(event) => event.preventDefault()}
            className={cn(modalInputClass, "pr-24")}
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => copyValue(state.confirmPassword, "confirm")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </FieldShell>
      {copiedField ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          {copiedField === "password" ? "Password copied" : "Confirm password copied"}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </UserModal>
  );
}

function UserRow({
  user,
  currentUserId,
  actionMenuRef,
  isOpen,
  isBusy,
  onToggle,
  onEdit,
  onTemporaryPassword,
  onSetPassword,
  onDeactivate,
  onReactivate,
}: {
  user: ManagedUser;
  currentUserId?: string | null;
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  isBusy: boolean;
  onToggle: () => void;
  onEdit: React.Dispatch<React.SetStateAction<EditingState | null>>;
  onTemporaryPassword: (userId: string, email: string) => void;
  onSetPassword: (userId: string, email: string) => void;
  onDeactivate: (userId: string) => Promise<void>;
  onReactivate: (userId: string) => Promise<void>;
}) {
  const isSelf = currentUserId === user.id;

  return (
    <div className="px-4 py-4 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_120px_120px_56px] md:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <CompanyAvatar
              companyName={
                user.role === "MASTER"
                  ? user.companyProfile?.companyName
                  : user.accountType === "INDIVIDUAL"
                    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
                    : user.companyProfile?.companyName
              }
              logoUrl={user.role === "MASTER" ? user.companyProfile?.logoUrl : undefined}
              className="h-10 w-10 rounded-2xl border border-slate-200 text-xs shadow-[var(--shadow-soft)] dark:border-white/10"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {getUserName(user.email)}
              </div>
              <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 md:block">
          <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
            {user.companyProfile?.companyName ?? "No company"}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Updated {formatShortDate(user.updatedAt)}
          </div>
        </div>

        <div className="hidden text-sm text-slate-600 dark:text-slate-300 md:block">
          {user.companyProfile?.planName ?? "-"}
        </div>

        <div className="hidden md:flex">
          <InlineBadge tone={user.role === "MASTER" ? "blue" : "slate"}>
            {user.role === "MASTER" ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
            <span>{user.role}</span>
          </InlineBadge>
        </div>

        <div className="hidden md:flex">
          <InlineBadge tone={userStatusTone(user.status)}>{user.status}</InlineBadge>
        </div>

        <div className="flex justify-end">
          <UserActionMenu
            user={user}
            isOpen={isOpen}
            isBusy={isBusy}
            isSelf={isSelf}
            actionMenuRef={actionMenuRef}
            onToggle={onToggle}
            onEdit={() =>
              onEdit({
                id: user.id,
                email: user.email,
                role: user.role === "MASTER" ? "MASTER" : "USER",
              })
            }
            onTemporaryPassword={() => onTemporaryPassword(user.id, user.email)}
            onSetPassword={() => onSetPassword(user.id, user.email)}
            onDeactivate={() => onDeactivate(user.id)}
            onReactivate={() => onReactivate(user.id)}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 md:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <InlineBadge tone={userStatusTone(user.status)}>{user.status}</InlineBadge>
          <InlineBadge tone="slate">{user.companyProfile?.planName ?? "-"}</InlineBadge>
          <InlineBadge tone={user.role === "MASTER" ? "blue" : "slate"}>
            {user.role === "MASTER" ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
            <span>{user.role}</span>
          </InlineBadge>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{user.companyProfile?.companyName ?? "No company"}</span>
          <span>{formatShortDate(user.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function UsersTable({
  users,
  currentUserId,
  actionMenuRef,
  openActionMenuFor,
  setOpenActionMenuFor,
  submittingAction,
  onEdit,
  onTemporaryPassword,
  onSetPassword,
  onDeactivate,
  onReactivate,
}: {
  users: ManagedUser[];
  currentUserId?: string | null;
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
  openActionMenuFor: string | null;
  setOpenActionMenuFor: React.Dispatch<React.SetStateAction<string | null>>;
  submittingAction: string | null;
  onEdit: React.Dispatch<React.SetStateAction<EditingState | null>>;
  onTemporaryPassword: (userId: string, email: string) => void;
  onSetPassword: (userId: string, email: string) => void;
  onDeactivate: (userId: string) => Promise<void>;
  onReactivate: (userId: string) => Promise<void>;
}) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-white/10">
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          currentUserId={currentUserId}
          actionMenuRef={actionMenuRef}
          isOpen={openActionMenuFor === user.id}
          isBusy={submittingAction?.endsWith(user.id) ?? false}
          onToggle={() =>
            setOpenActionMenuFor((current) => (current === user.id ? null : user.id))
          }
          onEdit={onEdit}
          onTemporaryPassword={onTemporaryPassword}
          onSetPassword={onSetPassword}
          onDeactivate={onDeactivate}
          onReactivate={onReactivate}
        />
      ))}
    </div>
  );
}

function AccountRequestsTable({
  requests,
  actionMenuRef,
  openActionMenuFor,
  setOpenActionMenuFor,
  submittingAction,
  onView,
  onApprove,
  onReject,
}: {
  requests: AccountRequest[];
  actionMenuRef: React.RefObject<HTMLDivElement | null>;
  openActionMenuFor: string | null;
  setOpenActionMenuFor: React.Dispatch<React.SetStateAction<string | null>>;
  submittingAction: string | null;
  onView: (request: AccountRequest) => void;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-white/10">
      {requests.map((request) => (
        <div
          key={request.id}
          className="px-4 py-4 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1.2fr)_160px_140px_140px_56px] md:items-center">
            <div className="min-w-0">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                  {request.fullName}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  {request.email}
                </div>
              </div>
            </div>

            <div className="hidden md:flex">
              <InlineBadge tone={requestStatusTone(request.status)}>{request.status}</InlineBadge>
            </div>

            <div className="hidden text-sm text-slate-600 dark:text-slate-300 md:block">
              {formatShortDate(request.createdAt)}
            </div>

            <div className="hidden text-sm text-slate-600 dark:text-slate-300 md:block">
              {request.processedAt ? formatShortDate(request.processedAt) : "-"}
            </div>

            <div className="flex justify-end">
              <RequestActionMenu
                request={request}
                isOpen={openActionMenuFor === request.id}
                isBusy={submittingAction?.endsWith(request.id) ?? false}
                actionMenuRef={actionMenuRef}
                onToggle={() =>
                  setOpenActionMenuFor((current) =>
                    current === request.id ? null : request.id
                  )
                }
                onView={() => onView(request)}
                onApprove={() => onApprove(request.id)}
                onReject={() => onReject(request.id)}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <InlineBadge tone={requestStatusTone(request.status)}>{request.status}</InlineBadge>
              <span>
                {request.processedAt
                  ? `Processed ${formatShortDate(request.processedAt)}`
                  : "Pending review"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MasterUsersPanel({
  mode,
  users,
  accountRequests,
  currentUserId,
  isLoading,
  onCreateUser,
  onUpdateUser,
  onDeactivateUser,
  onReactivateUser,
  onResetUserPassword,
  onUpdateAccountRequestStatus,
}: Props) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof userRoleFilters)[number]>("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState<(typeof userStatusFilters)[number]>("ALL");
  const [requestStatusFilter, setRequestStatusFilter] = useState<(typeof requestStatusFilters)[number]>("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditingState | null>(null);
  const [originalEditingUser, setOriginalEditingUser] = useState<EditingState | null>(null);
  const [resetPasswordState, setResetPasswordState] = useState<ResetPasswordState | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    email: "",
    password: "",
    role: "USER",
    accountType: "INDIVIDUAL",
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
  });
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const pageSizeMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | PointerEvent | TouchEvent) {
      const target = event.target as Node;
      if (filterMenuOpen && !filterMenuRef.current?.contains(target)) setFilterMenuOpen(false);
      if (pageSizeMenuOpen && !pageSizeMenuRef.current?.contains(target)) setPageSizeMenuOpen(false);
      if (openActionMenuFor && !actionMenuRef.current?.contains(target)) setOpenActionMenuFor(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [filterMenuOpen, openActionMenuFor, pageSizeMenuOpen]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (userStatusFilter !== "ALL" && user.status !== userStatusFilter) return false;
      if (!normalizedQuery) return true;
      return [
        user.email,
        user.role,
        user.status,
        user.companyProfile?.companyName,
        user.companyProfile?.planName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, roleFilter, userStatusFilter, users]);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const priority: Record<AccountRequest["status"], number> = {
      PENDING: 0,
      APPROVED: 1,
      REJECTED: 2,
    };

    return (accountRequests ?? [])
      .filter((request) => {
        if (requestStatusFilter !== "ALL" && request.status !== requestStatusFilter) return false;
        if (!normalizedQuery) return true;
        return [request.fullName, request.email, request.status, ...request.requestedDocumentTypes]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        const statusDiff = priority[left.status] - priority[right.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [accountRequests, query, requestStatusFilter]);

  const pendingRequestsCount = useMemo(
    () => (accountRequests ?? []).filter((request) => request.status === "PENDING").length,
    [accountRequests],
  );
  const pendingSummaryTone = useMemo(
    () => pendingCardTone(pendingRequestsCount),
    [pendingRequestsCount],
  );

  const currentRows = mode === "users" ? filteredUsers : filteredRequests;
  const totalRows = currentRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = totalRows === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalRows);

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setSubmittingAction("create");
    try {
      await onCreateUser(createForm);
      setCreateForm({ email: "", password: "", role: "USER", accountType: "INDIVIDUAL", firstName: "", lastName: "", phone: "", companyName: "" });
      setIsCreateOpen(false);
      setSuccessMessage(`User ${createForm.email} created successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    const noChange =
      originalEditingUser &&
      editingUser.email === originalEditingUser.email &&
      editingUser.role === originalEditingUser.role;
    if (noChange) {
      setEditingUser(null);
      setOriginalEditingUser(null);
      return;
    }
    setSubmittingAction(`update:${editingUser.id}`);
    try {
      await onUpdateUser(editingUser.id, {
        email: editingUser.email,
        role: editingUser.role,
      });
      setEditingUser(null);
      setOriginalEditingUser(null);
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleResetPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetPasswordState) return;
    if (!resetPasswordState.password.trim()) return;
    if (resetPasswordState.password.length < 8) return;
    if (!resetPasswordState.confirmPassword.trim()) return;
    if (resetPasswordState.password !== resetPasswordState.confirmPassword) return;

    setSubmittingAction(`password:${resetPasswordState.id}`);
    try {
      await onResetUserPassword(resetPasswordState.id, {
        password: resetPasswordState.password,
        temporary: resetPasswordState.temporary,
      });
      setOpenActionMenuFor(null);
      setResetPasswordState(null);
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <>
      {successMessage ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      ) : null}
      <section className="grid gap-4">
        <div className="overflow-visible rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)]">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-white/10 md:px-6">
            <div className="flex flex-row items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Access control
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                  {mode === "users" ? "Members workspace" : "Access requests"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {mode === "users"
                    ? "Manage access, roles, plans and activation state for every member in the workspace."
                    : "Review incoming account requests before creating production access."}
                </p>
              </div>

              {mode === "accountRequests" ? (
                <div
                  className={cn(
                    "inline-flex min-w-[10rem] shrink-0 flex-col items-center justify-center rounded-[1.4rem] border px-4 py-4 text-center shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:shadow-none sm:min-w-[12rem]",
                    pendingSummaryTone.container,
                  )}
                >
                  <div
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.24em]",
                      pendingSummaryTone.label,
                    )}
                  >
                    Pending requests
                  </div>
                  <div
                    className={cn(
                      "mt-2 text-3xl font-semibold tracking-[-0.04em]",
                      pendingSummaryTone.value,
                    )}
                  >
                    {pendingRequestsCount}
                  </div>
                  <div className={cn("mt-1 text-sm", pendingSummaryTone.subtitle)}>
                    Awaiting review
                  </div>
                </div>
              ) : null}
            </div>

            {mode === "users" ? (
              <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by email, role or status"
                    className={inputClass}
                  />
                </div>

                <div ref={filterMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setFilterMenuOpen((current) => !current)}
                    className={ghostButtonClass}
                  >
                    <span>Filter</span>
                    <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </button>
                  {filterMenuOpen ? (
                    <div className={menuClass}>
                      <MenuLabel label="Role" />
                      {userRoleFilters.map((option) => (
                        <MenuOption
                          key={option}
                          active={roleFilter === option}
                          label={option === "ALL" ? "All roles" : option}
                          onClick={() => {
                            setRoleFilter(option);
                            setCurrentPage(1);
                          }}
                        />
                      ))}
                      <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />
                      <MenuLabel label="Status" />
                      {userStatusFilters.map((option) => (
                        <MenuOption
                          key={option}
                          active={userStatusFilter === option}
                          label={option === "ALL" ? "All status" : option}
                          onClick={() => {
                            setUserStatusFilter(option);
                            setCurrentPage(1);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create user</span>
                </button>
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <div className="p-5 md:p-6">
              <EmptyBlock text={mode === "users" ? "Loading users..." : "Loading account requests..."} />
            </div>
          ) : totalRows === 0 ? (
            <div className="p-5 md:p-6">
              <EmptyBlock
                text={
                  mode === "users"
                    ? "No users match the current filters."
                    : "No account requests match the current filters."
                }
              />
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "border-b border-slate-200 px-5 py-4 dark:border-white/10",
                  mode === "users"
                    ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    : "flex justify-end",
                )}
              >
                {mode === "users" ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Results
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                      {`${totalRows} members`}
                    </div>
                  </div>
                ) : null}

                <div
                  className={cn(
                    "flex items-center gap-2",
                    mode === "accountRequests" &&
                      "w-full flex-row items-center justify-between",
                  )}
                >
                  {mode === "accountRequests" ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="relative min-w-0 flex-1 sm:w-[24rem] md:w-[28rem]">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={query}
                          onChange={(event) => {
                            setQuery(event.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Search by name, email or request type"
                          className={inputClass}
                        />
                      </div>
                      <div ref={filterMenuRef} className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setFilterMenuOpen((current) => !current)}
                          className={cn(ghostButtonClass, "h-11 px-3 sm:h-12 sm:px-4")}
                        >
                          <span>Filter</span>
                          <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </button>
                        {filterMenuOpen ? (
                          <div className={menuClass}>
                            <MenuLabel label="Status" />
                            {requestStatusFilters.map((option) => (
                              <MenuOption
                                key={option}
                                active={requestStatusFilter === option}
                                label={option === "ALL" ? "All status" : option}
                                onClick={() => {
                                  setRequestStatusFilter(option);
                                  setCurrentPage(1);
                                }}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div ref={pageSizeMenuRef} className="relative flex shrink-0 items-center gap-2">
                    <label className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 lg:block">
                      Rows
                    </label>
                    <button
                      type="button"
                      onClick={() => setPageSizeMenuOpen((current) => !current)}
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 sm:h-9"
                    >
                      <span>{pageSize}</span>
                      <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </button>
                    {pageSizeMenuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-28 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
                        {[10, 20, 30].map((size) => (
                          <MenuOption
                            key={size}
                            active={pageSize === size}
                            label={`${size} rows`}
                            onClick={() => {
                              setPageSize(size);
                              setCurrentPage(1);
                              setPageSizeMenuOpen(false);
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="hidden border-b border-slate-200 px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:border-white/10 dark:text-slate-400 md:block">
                {mode === "users" ? (
                  <div className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_120px_120px_56px] md:items-center">
                    <div>Member</div>
                    <div>Company</div>
                    <div>Plan</div>
                    <div>Role</div>
                    <div>Status</div>
                    <div className="text-right">Actions</div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-[minmax(0,1.2fr)_160px_140px_140px_56px] md:items-center">
                    <div>Request</div>
                    <div>Status</div>
                    <div>Created</div>
                    <div>Processed</div>
                    <div className="text-right">Actions</div>
                  </div>
                )}
              </div>

              {mode === "users" ? (
                <UsersTable
                  users={currentRows.slice(pageStart, pageEnd) as ManagedUser[]}
                  currentUserId={currentUserId}
                  actionMenuRef={actionMenuRef}
                  openActionMenuFor={openActionMenuFor}
                  setOpenActionMenuFor={setOpenActionMenuFor}
                  submittingAction={submittingAction}
                  onEdit={(state) => { setEditingUser(state); setOriginalEditingUser(state); }}
                  onTemporaryPassword={(userId, email) =>
                    setResetPasswordState({
                      id: userId,
                      email,
                      temporary: true,
                      password: "",
                      confirmPassword: "",
                    })
                  }
                  onSetPassword={(userId, email) =>
                    setResetPasswordState({
                      id: userId,
                      email,
                      temporary: false,
                      password: "",
                      confirmPassword: "",
                    })
                  }
                  onDeactivate={async (userId) => {
                    setSubmittingAction(`deactivate:${userId}`);
                    try {
                      await onDeactivateUser(userId);
                      setOpenActionMenuFor(null);
                    } finally {
                      setSubmittingAction(null);
                    }
                  }}
                  onReactivate={async (userId) => {
                    setSubmittingAction(`reactivate:${userId}`);
                    try {
                      await onReactivateUser(userId);
                      setOpenActionMenuFor(null);
                    } finally {
                      setSubmittingAction(null);
                    }
                  }}
                />
              ) : (
                <AccountRequestsTable
                  requests={currentRows.slice(pageStart, pageEnd) as AccountRequest[]}
                  actionMenuRef={actionMenuRef}
                  openActionMenuFor={openActionMenuFor}
                  setOpenActionMenuFor={setOpenActionMenuFor}
                  submittingAction={submittingAction}
                  onView={(request) => {
                    setSelectedRequest(request);
                    setOpenActionMenuFor(null);
                  }}
                  onApprove={async (requestId) => {
                    setSubmittingAction(`approve:${requestId}`);
                    try {
                      await onUpdateAccountRequestStatus(requestId, "APPROVED");
                      setOpenActionMenuFor(null);
                    } finally {
                      setSubmittingAction(null);
                    }
                  }}
                  onReject={async (requestId) => {
                    setSubmittingAction(`reject:${requestId}`);
                    try {
                      await onUpdateAccountRequestStatus(requestId, "REJECTED");
                      setOpenActionMenuFor(null);
                    } finally {
                      setSubmittingAction(null);
                    }
                  }}
                />
              )}

              <PaginationFooter
                totalRows={totalRows}
                pageStart={pageStart}
                pageEnd={pageEnd}
                safePage={safePage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            </>
          )}
        </div>
      </section>

      {mode === "users" && isCreateOpen ? (
        <UserModal
          title="Create user"
          onClose={() => { setIsCreateOpen(false); setCreateError(null); }}
          onSubmit={handleCreateSubmit}
          footer={
            <div className="mt-2 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsCreateOpen(false)} className={ghostButtonClass}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction === "create"}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700",
                  submittingAction === "create" && "cursor-not-allowed opacity-60",
                )}
              >
                {submittingAction === "create" ? "Creating..." : "Create user"}
              </button>
            </div>
          }
        >
          {createError ? (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {createError}
            </div>
          ) : null}
          {/* Account type selector */}
          <FieldShell label="Account type">
            <div className="grid grid-cols-2 gap-2">
              {(["INDIVIDUAL", "BUSINESS"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCreateForm((c) => ({ ...c, accountType: type }))}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition",
                    createForm.accountType === type
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
                  )}
                >
                  {type === "INDIVIDUAL" ? <UserRound className="h-4 w-4 shrink-0" /> : <Building2 className="h-4 w-4 shrink-0" />}
                  {type === "INDIVIDUAL" ? "Individual" : "Business"}
                </button>
              ))}
            </div>
          </FieldShell>

          {createForm.accountType === "BUSINESS" ? (
            <FieldShell label="Company name">
              <input
                type="text"
                required
                value={createForm.companyName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, companyName: event.target.value }))
                }
                placeholder="Acme Corp"
                className={modalInputClass}
              />
            </FieldShell>
          ) : null}

          <FieldShell label="Email">
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="user@company.com"
              className={modalInputClass}
            />
          </FieldShell>

          {createForm.accountType === "INDIVIDUAL" ? (
            <div className="grid grid-cols-2 gap-3">
              <FieldShell label="First name">
                <input
                  type="text"
                  value={createForm.firstName}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, firstName: toTitleCase(event.target.value.replace(/\d/g, "")) }))
                  }
                  placeholder="John"
                  className={modalInputClass}
                />
              </FieldShell>
              <FieldShell label="Last name">
                <input
                  type="text"
                  value={createForm.lastName}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, lastName: toTitleCase(event.target.value.replace(/\d/g, "")) }))
                  }
                  placeholder="Doe"
                  className={modalInputClass}
                />
              </FieldShell>
              <FieldShell label="Phone">
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, phone: formatUsPhone(event.target.value) }))
                  }
                  placeholder="(555) 000-0000"
                  className={modalInputClass}
                />
              </FieldShell>
            </div>
          ) : null}

          <FieldShell label="Temporary password">
            <input
              type="text"
              required
              minLength={6}
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="At least 6 characters"
              className={modalInputClass}
            />
          </FieldShell>
          <FieldShell label="Role">
            <select
              value={createForm.role}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  role: event.target.value as "MASTER" | "USER",
                }))
              }
              className={modalInputClass}
            >
              <option value="USER">USER</option>
              <option value="MASTER">MASTER</option>
            </select>
          </FieldShell>
        </UserModal>
      ) : null}

      {mode === "users" && editingUser ? (
        <UserModal
          title="Edit user"
          onClose={() => {
            const isDirty = originalEditingUser && (editingUser.email !== originalEditingUser.email || editingUser.role !== originalEditingUser.role);
            if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to cancel?")) return;
            setEditingUser(null);
            setOriginalEditingUser(null);
          }}
          onSubmit={handleEditSubmit}
          footer={
            <div className="mt-2 flex items-center justify-end gap-3">
              <button type="button" onClick={() => {
                const isDirty = originalEditingUser && (editingUser.email !== originalEditingUser.email || editingUser.role !== originalEditingUser.role);
                if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to cancel?")) return;
                setEditingUser(null);
                setOriginalEditingUser(null);
              }} className={ghostButtonClass}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction === `update:${editingUser.id}`}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700",
                  submittingAction === `update:${editingUser.id}` &&
                    "cursor-not-allowed opacity-60",
                )}
              >
                {submittingAction === `update:${editingUser.id}` ? "Saving..." : "Save changes"}
              </button>
            </div>
          }
        >
          <FieldShell label="Email">
            <input
              type="email"
              required
              value={editingUser.email}
              onChange={(event) =>
                setEditingUser((current) =>
                  current ? { ...current, email: event.target.value } : current,
                )
              }
              className={modalInputClass}
            />
          </FieldShell>
          <FieldShell label="Role">
            <select
              value={editingUser.role}
              onChange={(event) =>
                setEditingUser((current) =>
                  current
                    ? { ...current, role: event.target.value as "MASTER" | "USER" }
                    : current,
                )
              }
              className={modalInputClass}
            >
              <option value="USER">USER</option>
              <option value="MASTER">MASTER</option>
            </select>
          </FieldShell>
        </UserModal>
      ) : null}
      {mode === "accountRequests" && selectedRequest ? (
        <AccountRequestDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      ) : null}
      {mode === "users" && resetPasswordState ? (
        <ResetPasswordModal
          state={resetPasswordState}
          isSubmitting={submittingAction === `password:${resetPasswordState.id}`}
          onClose={() => setResetPasswordState(null)}
          onChange={setResetPasswordState}
          onSubmit={handleResetPasswordSubmit}
        />
      ) : null}
    </>
  );
}
