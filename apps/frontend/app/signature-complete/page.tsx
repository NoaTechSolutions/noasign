import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  Eye,
  FileCheck2,
  BarChart3,
  Users,
  FileText,
  Bell,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { API_URL } from "@/lib/api-url";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const signerEmail = getSingleParam(params.email);
  const status = normalizeSignatureStatus(publicSignature?.status ?? "completed");
  const showCompletedState = status === "completed";
  const showPendingState = ["sent", "viewed", "signed"].includes(status);
  const tokenError = token && !publicSignature;

  return (
    <main className="relative min-h-screen w-full lg:h-screen lg:overflow-hidden flex flex-col lg:grid lg:grid-cols-2">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,var(--bg-page)_0%,var(--bg-page-subtle)_52%,var(--bg-surface)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(5,165,255,0.08),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(2,41,119,0.06),transparent_20%)]" />

      {/* LEFT — Confirmation */}
      <div className="relative flex flex-col min-h-screen lg:min-h-0 bg-white dark:bg-[#111827] border-b lg:border-b-0 lg:border-r border-[color:var(--border-strong)]">
        <div className="absolute right-4 top-4 z-20 md:right-5 md:top-5">
          <ThemeToggle />
        </div>
        {/* Header with enlarged logo */}
        <div className="flex items-center px-6 pt-6 pb-2 shrink-0 md:px-10 md:pt-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(2,41,119,0.18)] border border-[color:var(--border-strong)]">
              {/* Light mode logo */}
              <Image
                src="/ntssign-logo-light.svg"
                alt="NTSsign"
                fill
                className="object-contain dark:hidden"
                sizes="64px"
                priority
              />
              {/* Dark mode logo */}
              <Image
                src="/ntssign-light.svg"
                alt="NTSsign"
                fill
                className="object-contain hidden dark:block"
                sizes="64px"
                priority
              />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">NTSsign</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">by NoaTechSolutions</div>
            </div>
          </Link>
        </div>

        {/* Confirmation content */}
        <div className="flex flex-col flex-1 justify-center px-6 py-8 md:px-10">
          {/* Status badge */}
          <div className="flex">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                showCompletedState || tokenError
                  ? "border border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-[#065f46] dark:text-[color:var(--success-text)]"
                  : "border border-[color:var(--info-border)] bg-[color:var(--info-bg)] text-[color:var(--info-text)]"
              }`}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              {showPendingState && !tokenError ? "Processing" : "Document signed successfully"}
            </div>
          </div>

          {/* Icon + Title */}
          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] border border-[color:var(--success-border)] bg-[color:var(--success-bg)] shadow-[0_0_32px_rgba(34,197,94,0.15)]">
              <FileCheck2 className="h-8 w-8 text-[#065f46] dark:text-[color:var(--success-text)]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] md:text-3xl">
              {showPendingState && !tokenError
                ? "Document is being finalized"
                : "Signed and sent successfully"}
            </h1>
          </div>

          {/* Paragraph — full on md+, short on mobile */}
          <p className="mt-4 text-sm leading-6 text-[color:var(--text-secondary)] hidden md:block">
            {showPendingState && !tokenError
              ? `${documentName} is being processed. The final signed copy will be ready shortly.`
              : signerEmail
                ? <>We sent a copy of the signed document to <strong className="text-[color:var(--text-primary)]">{signerEmail}</strong>.</>
                : `${signerName} completed the signature on ${documentName}. A signed copy has been sent to all parties.`}
          </p>
          <p className="mt-4 text-sm leading-6 text-[color:var(--text-secondary)] md:hidden">
            {showPendingState && !tokenError
              ? "The signed copy will be ready shortly."
              : signerEmail
                ? <>Sent to <strong className="text-[color:var(--text-primary)]">{signerEmail}</strong>.</>
                : "A signed copy has been sent to your email."}
          </p>

          {/* CTAs — visible on md+ only, moved to strip on mobile */}
          {showCompletedState && (previewUrl || downloadUrl) ? (
            <div className="mt-6 hidden md:flex flex-wrap gap-3">
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--button-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-primary-hover)]"
                >
                  <Eye className="h-4 w-4" />
                  View document
                </a>
              ) : null}
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--bg-surface)] px-5 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition hover:bg-[color:var(--bg-surface-strong)]"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              ) : null}
            </div>
          ) : showCompletedState ? (
            <div className="mt-6 hidden md:block rounded-2xl border border-[color:var(--info-border)] bg-[color:var(--info-bg)] px-4 py-3 text-sm text-[color:var(--info-text)]">
              The signed copy will be delivered by the sender or via the completion email.
            </div>
          ) : null}

          {/* Confirmation details */}
          {!tokenError ? (
            <div className="mt-6 rounded-[1.4rem] border border-[color:var(--border-strong)] bg-[#dce9ff] dark:bg-[color:var(--bg-surface)] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)] mb-3">
                Confirmation details
              </div>
              <div className="grid gap-2">
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

          <div className="mt-5">
            <Link
              href={returnUrl}
              className="text-xs font-medium text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
            >
              ← Return
            </Link>
          </div>
        </div>

        {/* Mobile/tablet — marketing strip, fills remaining space */}
        <div className="relative lg:hidden flex-1 overflow-hidden bg-[linear-gradient(135deg,#05a5ff_0%,#022977_50%,#0400f0_100%)] dark:bg-[linear-gradient(135deg,#022977_0%,#011a55_50%,#010f33_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(255,153,0,0.25),transparent_45%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(5,165,255,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,153,0,0.08),transparent_40%)]" />
          <div className="relative flex flex-col h-full px-6 py-6 md:px-10 md:py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-2">Powered by NTSsign</p>
            <p className="text-sm font-semibold text-white leading-6 md:text-lg md:leading-8 mb-4">
              Send contracts, invoices, and any document — with e-signatures and full tracking, all in one platform.
            </p>

            {/* Feature list — 2 col. Mobile: 4 items, tablet: all 6 */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
              <StripFeatureItem icon={<FileText className="h-4 w-4" />} title="Any document type" description="Contracts, invoices, NDAs, service agreements — send anything with a signature." />
              <StripFeatureItem icon={<Zap className="h-4 w-4" />} title="Automated sending" description="Build your workflow once. Send to hundreds of clients automatically." />
              <StripFeatureItem icon={<Bell className="h-4 w-4" />} title="Real-time tracking" description="Know instantly when documents are opened, signed, or completed." />
              <StripFeatureItem icon={<Users className="h-4 w-4" />} title="Team management" description="Invite your team, assign permissions, and manage everything centrally." />
              <StripFeatureItem icon={<ShieldCheck className="h-4 w-4" />} title="Audit trail" description="Every signature is legally valid and backed by a complete audit history." mobileHidden />
              <StripFeatureItem icon={<BarChart3 className="h-4 w-4" />} title="Usage dashboard" description="Full visibility of your document usage and costs — no surprises." mobileHidden />
            </div>

            {/* View/Download buttons */}
            {showCompletedState && (previewUrl || downloadUrl) ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
                  >
                    <Eye className="h-4 w-4" />
                    View document
                  </a>
                ) : null}
                {downloadUrl ? (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="mt-auto pt-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff9900,#e67e00)] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,153,0,0.4)] transition hover:brightness-110 dark:bg-none dark:bg-white dark:text-[#022977] dark:shadow-none dark:hover:bg-white/90 md:px-6 md:py-4 md:text-base"
              >
                Get started with NTSsign
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Marketing (desktop only) */}
      <div className="relative hidden lg:flex flex-col h-full overflow-hidden bg-[linear-gradient(135deg,#05a5ff_0%,#022977_50%,#0400f0_100%)] dark:bg-[linear-gradient(135deg,#022977_0%,#011a55_50%,#010f33_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(255,153,0,0.25),transparent_45%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(5,165,255,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,153,0,0.08),transparent_40%)]" />

        <div className="relative flex flex-col flex-1 justify-center px-10 py-10">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 w-fit mb-6">
            <Zap className="h-3.5 w-3.5 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Document automation</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white leading-tight xl:text-4xl">
            Send any document.<br />Get it signed.<br />Track everything.
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/55">
            NTSsign automates your entire document workflow — from creation to e-signature to delivery. Contracts, invoices, service agreements, NDAs, and more.
          </p>

          {/* Features */}
          <div className="mt-8 grid gap-3">
            <FeatureItem
              icon={<FileText className="h-4 w-4" />}
              title="Any document type"
              description="Contracts, invoices, NDAs, service agreements — send anything with a signature."
            />
            <FeatureItem
              icon={<Zap className="h-4 w-4" />}
              title="Automated sending to your clients"
              description="Build your workflow once. Send to hundreds of clients automatically."
            />
            <FeatureItem
              icon={<Bell className="h-4 w-4" />}
              title="Real-time status tracking"
              description="Know instantly when documents are opened, signed, or completed."
            />
            <FeatureItem
              icon={<Users className="h-4 w-4" />}
              title="Team and role management"
              description="Invite your team, assign permissions, and manage everything centrally."
            />
            <FeatureItem
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Legally binding with audit trail"
              description="Every signature is legally valid and backed by a complete audit history."
            />
            <FeatureItem
              icon={<BarChart3 className="h-4 w-4" />}
              title="Billing and usage dashboard"
              description="Full visibility of your document usage and costs — no surprises."
            />
          </div>

          {/* CTA */}
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff9900,#e67e00)] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,153,0,0.4)] transition hover:brightness-110 dark:bg-none dark:bg-white dark:text-[#022977] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] dark:hover:bg-white/90"
            >
              Get started with NTSsign
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs leading-5 text-white/55">{description}</div>
      </div>
    </div>
  );
}

function StripFeatureItem({
  icon,
  title,
  description,
  mobileHidden = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  mobileHidden?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3${mobileHidden ? " hidden md:flex" : ""}`}>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="hidden md:block text-xs leading-5 text-white/55">{description}</div>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[color:var(--border-strong)] bg-[#eef5ff] dark:bg-[color:var(--bg-surface-strong)] px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
        {label}
      </span>
      <span
        className={`text-xs font-semibold ${
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
