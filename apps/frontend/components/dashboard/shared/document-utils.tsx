import { Ban, Mail, Send, Undo2 } from "lucide-react";
import type { Doc, WorkflowAction } from "./document-types";

/**
 * Shared document-domain utilities.
 *
 * FASE 3 — extracted from `components/dashboard-sidebar-demo.tsx`. These
 * helpers are consumed by DocumentsPanel, DocumentListActions, DocumentViewer
 * and the create-draft flow, so they live here instead of being duplicated.
 *
 * Implementations are byte-for-byte copies of the originals — do not modify
 * the logic without verifying every call site.
 */

export function getDisplayName(email?: string | null) {
  if (!email) return "User";
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").replace(/\d+/g, " ").trim();
  if (!cleaned) return email;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getFinalCustomerName(document: Doc) {
  const data = document.data?.dataJson ?? {};
  const personalName = [data.first_name, data.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
  const candidates = [
    data.customer_name,
    data.client_name,
    data.customer_full_name,
    data.business_name,
    personalName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "Final client not provided";
}

export function getFinalCustomerEmail(document: Doc) {
  const data = document.data?.dataJson ?? {};
  const candidates = [
    data.customer_email,
    data.client_email,
    data.email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function formatCountdownLabel(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function getDocumentActions(
  document?: Pick<
    Doc,
    "status" | "canSend" | "sendAvailableInSeconds" | "canResend" | "resendAvailableInSeconds"
  > | null,
  options?: {
    showCountdownWhenBlocked?: boolean;
    sendCountdownSeconds?: number;
    resendCountdownSeconds?: number;
    canSendOverride?: boolean;
    canResendOverride?: boolean;
  },
): WorkflowAction[] {
  const status = document?.status;
  const sendCooldownSeconds =
    options?.sendCountdownSeconds ??
    document?.sendAvailableInSeconds ??
    0;
  const resendCooldownSeconds =
    options?.resendCountdownSeconds ??
    document?.resendAvailableInSeconds ??
    0;

  if (status === "DRAFT") {
    const actions: WorkflowAction[] = [];
    const canSend = options?.canSendOverride ?? document?.canSend ?? true;

    if (canSend) {
      actions.push({
        key: "send",
        label: "Send document",
        icon: <Send className="h-4 w-4" />,
        tone: "bg-[color:var(--button-primary)] text-white hover:bg-[color:var(--button-primary-hover)]",
      });
    } else if (options?.showCountdownWhenBlocked) {
      actions.push({
        key: "send",
        label: `Send again in ${formatCountdownLabel(sendCooldownSeconds)}`,
        icon: <Send className="h-4 w-4" />,
        tone: "bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)]",
        disabled: true,
      });
    }

    actions.push({
      key: "cancel",
      label: "Cancel draft",
      icon: <Ban className="h-4 w-4" />,
      tone: "bg-[color:var(--danger-bg)] text-[color:var(--danger-text)] hover:bg-[color:var(--badge-danger-bg)]",
    });

    return actions;
  }

  if (status === "SENT" || status === "VIEWED") {
    const canResend =
      options?.canResendOverride ?? document?.canResend ?? true;
    const actions: WorkflowAction[] = [];

    if (canResend) {
      actions.push({
        key: "resend",
        label: "Resend document",
        icon: <Mail className="h-4 w-4" />,
        tone: "bg-[color:var(--button-neutral)] text-[color:var(--text-primary)] hover:bg-[color:var(--button-neutral-hover)]",
      });
    } else if (options?.showCountdownWhenBlocked) {
      actions.push({
        key: "resend",
        label: `Resend in ${formatCountdownLabel(resendCooldownSeconds)}`,
        icon: <Mail className="h-4 w-4" />,
        tone: "bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)]",
        disabled: true,
      });
    }

    actions.push({
      key: "cancel",
      label: "Cancel document",
      icon: <Ban className="h-4 w-4" />,
      tone: "bg-[color:var(--danger-bg)] text-[color:var(--danger-text)] hover:bg-[color:var(--badge-danger-bg)]",
    });

    return actions;
  }

  if (status === "CANCELLED") {
    return [
      {
        key: "reactivate",
        label: "Reactivate draft",
        icon: <Undo2 className="h-4 w-4" />,
        tone: "bg-[color:var(--success-bg)] text-[color:var(--success-text)] hover:bg-[color:var(--badge-success-bg)]",
      },
    ];
  }

  return [];
}
