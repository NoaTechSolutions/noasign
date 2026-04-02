import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  Eye,
  FileCheck2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
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
  description:
    "NTSsign confirmation page for completed signatures and next steps.",
};

export default async function SignatureCompletePage({
  searchParams,
}: SignatureCompletePageProps) {
  const params = (await searchParams) ?? {};
  const token = getSingleParam(params.token);
  const publicSignature = token
    ? await loadPublicSignatureCompletion(token)
    : null;
  const signerName =
    publicSignature?.signerName ?? getSingleParam(params.signer) ?? "Your signer";
  const documentName =
    publicSignature?.documentName ??
    getSingleParam(params.document) ??
    "your document";
  const senderName =
    publicSignature?.senderName ?? getSingleParam(params.sender) ?? "the sender";
  const previewUrl =
    sanitizeLink(publicSignature?.previewUrl ?? null) ??
    sanitizeLink(getSingleParam(params.preview));
  const downloadUrl =
    sanitizeLink(publicSignature?.downloadUrl ?? null) ??
    sanitizeLink(getSingleParam(params.download));
  const returnUrl = sanitizeLink(getSingleParam(params.return)) ?? "/";
  const status = normalizeSignatureStatus(publicSignature?.status ?? "completed");
  const showCompletedState = status === "completed";
  const showPendingState = ["sent", "viewed", "signed"].includes(status);
  const tokenError = token && !publicSignature;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--bg-page)]">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,var(--bg-page)_0%,var(--bg-page-subtle)_54%,var(--bg-surface)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(5,165,255,0.10),_transparent_26%),radial-gradient(circle_at_82%_16%,_rgba(2,41,119,0.10),_transparent_18%),linear-gradient(135deg,rgba(255,153,0,0.05),transparent_45%)]" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-6 md:py-6">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-2 shadow-[var(--shadow-soft)]"
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[color:var(--border)] bg-[#022977]">
              <Image
                src="/ntssign-light.svg"
                alt="NTSsign"
                fill
                className="object-contain p-1.5"
                sizes="48px"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
                NTSsign
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                by NoaTechSolutions
              </div>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface)]"
          >
            Explore NTSsign
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="mt-6 grid flex-1 gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[2rem] border border-[color:var(--border)] bg-[linear-gradient(135deg,#ffffff_0%,#f5f9ff_48%,#edf4ff_100%)] p-6 shadow-[var(--shadow-strong)] dark:bg-[linear-gradient(135deg,#0b1220_0%,#111827_42%,#172554_100%)] md:p-8">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] ${
                showCompletedState
                  ? "border border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-[color:var(--success-text)]"
                  : tokenError
                    ? "border border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] text-[color:var(--warning-text)]"
                    : "border border-[color:var(--info-border)] bg-[color:var(--info-bg)] text-[color:var(--info-text)]"
              }`}
            >
              <BadgeCheck className="h-4 w-4" />
              {showCompletedState
                ? "Signature completed"
                : tokenError
                  ? "Secure link unavailable"
                  : "Signature update"}
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-primary)] md:text-5xl">
              {tokenError
                ? "This secure signature page is no longer available."
                : showPendingState
                  ? `${documentName} is being finalized.`
                  : `${documentName} was signed and sent.`}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)]">
              {tokenError
                ? "The document may have expired, the secure link may be invalid, or the sender may need to share a new link."
                : showPendingState
                  ? "NTSsign is checking the latest provider status and will show the final signed document as soon as it is ready."
                  : `${signerName} completed the signature. The signed copy has been sent to all parties.`}
            </p>

            {showCompletedState && (previewUrl || downloadUrl) ? (
              <div className="mt-7 flex flex-wrap gap-3">
                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--button-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-primary-hover)]"
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
                    className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-5 py-3 text-sm font-semibold text-[color:var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface)]"
                  >
                    <Download className="h-4 w-4" />
                    Download signed PDF
                  </a>
                ) : null}
              </div>
            ) : showCompletedState ? (
              <div className="mt-7 rounded-2xl border border-[color:var(--info-border)] bg-[color:var(--info-bg)] px-4 py-3 text-sm text-[color:var(--info-text)]">
                The signed PDF will be delivered by the sender or via the completion email.
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <InfoTile
                icon={<FileCheck2 className="h-5 w-5" />}
                title="Signed successfully"
                description="The document was completed and registered with its final audit history."
              />
              <InfoTile
                icon={<LockKeyhole className="h-5 w-5" />}
                title="Secure workflow"
                description="NTSsign keeps the signature process organized, traceable, and easier to follow."
              />
              <InfoTile
                icon={<Sparkles className="h-5 w-5" />}
                title="Branded experience"
                description="Your customers close the signing flow inside your brand, not a generic portal."
              />
            </div>
          </div>

          <aside className="grid gap-6">
            <div className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-medium)]">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                Confirmation
              </div>
              <div className="mt-4 grid gap-4">
                <DetailRow label="Document" value={documentName} />
                <DetailRow label="Signed by" value={signerName} />
                <DetailRow label="Sent by" value={senderName} />
                <DetailRow
                  label="Status"
                  value={formatStatusLabel(status)}
                  tone={showCompletedState ? "success" : "default"}
                />
                {publicSignature?.documentNumber ? (
                  <DetailRow
                    label="Reference"
                    value={publicSignature.documentNumber}
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[color:var(--border)] bg-[linear-gradient(180deg,var(--bg-elevated)_0%,#f7fbff_100%)] p-6 shadow-[var(--shadow-medium)] dark:bg-[linear-gradient(180deg,var(--bg-elevated)_0%,#172036_100%)]">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                Why NTSsign
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">
                Contracts should adapt to your business, not the other way around.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
                NTSsign adds the operational layer around signatures: guided document
                creation, organized templates, contract history, billing visibility, and a
                cleaner customer-facing flow.
              </p>

              <div className="mt-5 grid gap-3">
                <BenefitPill text="Guided contract creation" />
                <BenefitPill text="Reusable workflows and templates" />
                <BenefitPill text="Status tracking from draft to completed" />
                <BenefitPill text="Cleaner customer experience under your brand" />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--button-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--button-primary-hover)]"
                >
                  Try NTSsign
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={returnUrl}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface)]"
                >
                  Return
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function getSingleParam(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function sanitizeLink(value: string | null) {
  if (!value) return null;

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

async function loadPublicSignatureCompletion(token: string) {
  try {
    const response = await fetch(
      `${API_URL}/public/signatures/${encodeURIComponent(token)}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

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
    case "completed":
      return "Completed";
    case "signed":
      return "Signed";
    case "viewed":
      return "Viewed";
    case "sent":
      return "Sent";
    case "draft":
      return "Draft";
    case "cancelled":
      return "Cancelled";
    case "error":
      return "Needs attention";
    default:
      return "Processing";
  }
}

function InfoTile({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--bg-surface)] text-[color:var(--brand-secondary)]">
        {icon}
      </div>
      <div className="mt-3 text-base font-semibold text-[color:var(--text-primary)]">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
        {description}
      </div>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface)]"
    >
      {icon}
      {children}
    </a>
  );
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
    <div className="rounded-[1.2rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
        {label}
      </div>
      <div
        className={`mt-2 text-sm font-semibold ${
          tone === "success"
            ? "text-[color:var(--success)] dark:text-[color:var(--success-text)]"
            : "text-[color:var(--text-primary)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function BenefitPill({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--bg-surface)] text-[color:var(--brand-accent)]">
        <BadgeCheck className="h-4 w-4" />
      </span>
      <span>{text}</span>
    </div>
  );
}
