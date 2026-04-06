import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Download, Eye, FileCheck2 } from "lucide-react";
import { API_URL } from "@/lib/api-url";

type SearchParamValue = string | string[] | undefined;

type SignatureCompletePageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

type PublicSignatureCompletion = {
  status: string;
  documentId: string;
  documentNumber: string;
  documentName: string;
  signerName: string;
  senderName: string;
  previewUrl: string | null;
  downloadUrl: string | null;
  expiresAt: string;
};

export const metadata: Metadata = {
  title: "Signature Completed | NTSsign",
  description: "NTSsign confirmation page for completed signatures.",
};

export default async function SignatureCompletePage({
  searchParams,
}: SignatureCompletePageProps) {
  const params = (await searchParams) ?? {};
  const token = getSingleParam(params.token);
  const publicSignature = token ? await loadPublicSignatureCompletion(token) : null;

  const signerName = publicSignature?.signerName ?? getSingleParam(params.signer) ?? "Your signer";
  const documentName = publicSignature?.documentName ?? getSingleParam(params.document) ?? "your document";
  const senderName = publicSignature?.senderName ?? getSingleParam(params.sender) ?? "the sender";
  const previewUrl = sanitizeLink(publicSignature?.previewUrl ?? null) ?? sanitizeLink(getSingleParam(params.preview));
  const downloadUrl = sanitizeLink(publicSignature?.downloadUrl ?? null) ?? sanitizeLink(getSingleParam(params.download));
  const returnUrl = sanitizeLink(getSingleParam(params.return)) ?? "/";
  const status = normalizeSignatureStatus(publicSignature?.status ?? "completed");
  const showCompletedState = status === "completed";
  const showPendingState = ["sent", "viewed", "signed"].includes(status);
  const tokenError = token && !publicSignature;

  return (
    <main className="relative min-h-screen bg-[color:var(--bg-page)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(5,165,255,0.08),transparent)]" />

      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 md:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-2 shadow-[var(--shadow-soft)]"
        >
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-[color:var(--border)] bg-[#022977]">
            <Image
              src="/ntssign-light.svg"
              alt="NTSsign"
              fill
              className="object-contain p-1.5"
              sizes="36px"
              priority
            />
          </div>
          <span className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            NTSsign
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:text-[color:var(--text-primary)]"
        >
          Go to NTSsign
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 md:px-6">

        {/* Status badge */}
        <div className="flex justify-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${
              showCompletedState
                ? "border border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-[color:var(--success-text)]"
                : tokenError
                  ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] text-[color:var(--warning-text)]"
                  : "border border-[color:var(--info-border)] bg-[color:var(--info-bg)] text-[color:var(--info-text)]"
            }`}
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            {showCompletedState ? "Signature completed" : tokenError ? "Link unavailable" : "Processing"}
          </div>
        </div>

        {/* Hero */}
        <div className="mt-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-[color:var(--success-border)] bg-[color:var(--success-bg)] shadow-[0_0_40px_rgba(34,197,94,0.12)]">
            <FileCheck2 className="h-10 w-10 text-[color:var(--success-text)]" />
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-primary)] md:text-4xl">
            {tokenError
              ? "Link no longer available"
              : showPendingState
                ? "Document is being finalized"
                : "Signed and sent successfully"}
          </h1>

          <p className="mt-3 text-base leading-7 text-[color:var(--text-secondary)]">
            {tokenError
              ? "This secure link may have expired or is invalid."
              : showPendingState
                ? `${documentName} is being processed. The final signed copy will be ready shortly.`
                : `${signerName} completed the signature on ${documentName}. All parties have received the signed copy.`}
          </p>
        </div>

        {/* CTAs */}
        {showCompletedState && (previewUrl || downloadUrl) ? (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--button-primary)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-primary-hover)]"
              >
                <Eye className="h-4 w-4" />
                View signed document
              </a>
            ) : null}
            {downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-6 py-3 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface)]"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </a>
            ) : null}
          </div>
        ) : showCompletedState ? (
          <div className="mt-8 rounded-2xl border border-[color:var(--info-border)] bg-[color:var(--info-bg)] px-5 py-4 text-center text-sm text-[color:var(--info-text)]">
            The signed PDF will be delivered by the sender or via the completion email.
          </div>
        ) : null}

        {/* Confirmation card */}
        {!tokenError ? (
          <div className="mt-8 rounded-[1.6rem] border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-medium)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
              Confirmation details
            </div>
            <div className="mt-4 grid gap-3">
              <DetailRow label="Document" value={documentName} />
              <DetailRow label="Signed by" value={signerName} />
              <DetailRow label="Sent by" value={senderName} />
              <DetailRow
                label="Status"
                value={formatStatusLabel(status)}
                tone={showCompletedState ? "success" : "default"}
              />
              {publicSignature?.documentNumber ? (
                <DetailRow label="Reference" value={publicSignature.documentNumber} />
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Return link */}
        <div className="mt-6 text-center">
          <Link
            href={returnUrl}
            className="text-sm text-[color:var(--text-muted)] transition hover:text-[color:var(--text-secondary)]"
          >
            ← Return
          </Link>
        </div>
      </div>
    </main>
  );
}

function getSingleParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function sanitizeLink(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

async function loadPublicSignatureCompletion(token: string) {
  try {
    const response = await fetch(
      `${API_URL}/public/signatures/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as PublicSignatureCompletion;
  } catch {
    return null;
  }
}

function normalizeSignatureStatus(value: string) {
  return value.trim().toLowerCase();
}

function formatStatusLabel(value: string) {
  switch (normalizeSignatureStatus(value)) {
    case "completed": return "Completed";
    case "signed": return "Signed";
    case "viewed": return "Viewed";
    case "sent": return "Sent";
    case "draft": return "Draft";
    case "cancelled": return "Cancelled";
    case "error": return "Needs attention";
    default: return "Processing";
  }
}

function DetailRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          tone === "success"
            ? "text-[color:var(--success-text)]"
            : "text-[color:var(--text-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
