import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  FileText,
  Bell,
  Zap,
} from "lucide-react";
import { API_URL } from "@/lib/api-url";
import { ThemeToggle } from "@/components/theme-toggle";
import { DownloadSignedCopy } from "./DownloadSignedCopy";
import { LeadCaptureForm } from "./LeadCaptureForm";

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
  const publicSignature = token
    ? await loadPublicSignatureCompletion(token)
    : null;

  // BoldSign appends ?documentId=xxx to the redirect URL — strip anything after
  // the email value.
  const signerEmail = getSingleParam(params.email)?.split("?")[0] ?? null;

  const documentName = publicSignature?.documentName?.trim() || null;
  const senderName = publicSignature?.senderName?.trim() || null;

  return (
    <main className="relative min-h-screen w-full lg:h-screen lg:overflow-hidden flex flex-col lg:grid lg:grid-cols-2">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,var(--bg-page)_0%,var(--bg-page-subtle)_52%,var(--bg-surface)_100%)]" />

      {/* LEFT — Confirmation + download */}
      <div className="relative flex flex-col min-h-screen lg:min-h-0 bg-white dark:bg-[#111827] border-b lg:border-b-0 lg:border-r border-[color:var(--border-strong)]">
        <div className="absolute right-4 top-4 z-20 md:right-5 md:top-5">
          <ThemeToggle />
        </div>

        {/* NTSsign branding (ours, not the tenant's) */}
        <div className="flex items-center px-6 pt-6 pb-2 shrink-0 md:px-10 md:pt-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(2,41,119,0.18)] border border-[color:var(--border-strong)]">
              <Image
                src="/ntssign-logo-light.svg"
                alt="NTSsign"
                fill
                className="object-contain dark:hidden"
                sizes="56px"
                priority
              />
              <Image
                src="/ntssign-light.svg"
                alt="NTSsign"
                fill
                className="object-contain hidden dark:block"
                sizes="56px"
                priority
              />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
                NTSsign
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                by NoaTechSolutions
              </div>
            </div>
          </Link>
        </div>

        <div className="flex flex-col flex-1 justify-center px-6 py-8 md:px-10">
          {/* Quality badge */}
          <div className="flex">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] border border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-[#065f46] dark:text-[color:var(--success-text)]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Signed &amp; legally binding
            </div>
          </div>

          {/* Confirmation — document + sender context */}
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--text-primary)] md:text-[2rem] md:leading-[1.15]">
            {documentName ? (
              <>
                You signed{" "}
                <span className="text-[color:var(--brand,#05a5ff)]">
                  {documentName}
                </span>
              </>
            ) : (
              "Your signature was received"
            )}
          </h1>
          {senderName && (
            <p className="mt-2 text-base font-medium text-[color:var(--text-secondary)]">
              sent by {senderName}
            </p>
          )}

          <p className="mt-4 max-w-md text-sm leading-6 text-[color:var(--text-secondary)]">
            Your signature was received and recorded with a complete audit trail.{" "}
            {signerEmail ? (
              <>
                A copy was sent to{" "}
                <strong className="text-[color:var(--text-primary)]">
                  {signerEmail}
                </strong>
                .
              </>
            ) : (
              "A copy of the signed document will be sent to your email."
            )}
          </p>

          {/* Download the signed copy (polls until ready) */}
          <div className="mt-7">
            <DownloadSignedCopy
              token={token}
              initialDownloadUrl={publicSignature?.downloadUrl ?? null}
            />
          </div>

          {/* Trust row */}
          <div className="mt-7 flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secured by NTSsign — every signature is verifiable and tamper-evident.
          </div>
        </div>
      </div>

      {/* RIGHT — NTSsign promotion + lead capture */}
      <div className="relative flex flex-col overflow-hidden bg-[linear-gradient(135deg,#05a5ff_0%,#022977_50%,#0400f0_100%)] dark:bg-[linear-gradient(135deg,#022977_0%,#011a55_50%,#010f33_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(255,153,0,0.25),transparent_45%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(5,165,255,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,153,0,0.08),transparent_40%)]" />

        <div className="relative flex flex-col flex-1 justify-center px-6 py-10 md:px-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 w-fit mb-5">
            <Zap className="h-3.5 w-3.5 text-white/70" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
              Powered by NTSsign
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white leading-tight xl:text-3xl">
            Send any document.
            <br />
            Get it signed. Track everything.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
            NTSsign automates your document workflow end to end — contracts,
            invoices, NDAs and more, with e-signatures and full tracking.
          </p>

          <div className="mt-6 grid gap-3">
            <FeatureItem
              icon={<FileText className="h-4 w-4" />}
              title="Any document type"
              description="Contracts, invoices, NDAs — send anything for signature."
            />
            <FeatureItem
              icon={<Zap className="h-4 w-4" />}
              title="Automated sending"
              description="Build the workflow once, send to clients automatically."
            />
            <FeatureItem
              icon={<Bell className="h-4 w-4" />}
              title="Real-time tracking"
              description="Know the moment a document is opened, signed, or completed."
            />
          </div>

          {/* Lead capture — explicitly about NTSsign, separate from the signing
              that already finished. */}
          <div className="mt-8 rounded-3xl border border-white/15 bg-white/8 p-5 backdrop-blur-sm md:p-6">
            <p className="text-base font-semibold text-white">
              Want this for your business?
            </p>
            <p className="mt-1 text-sm leading-6 text-white/60">
              Drop your email and get free access to NTSsign. Your signing here is
              already complete — this is just to set up your own account.
            </p>
            <div className="relative mt-4">
              <LeadCaptureForm />
            </div>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
            >
              Or explore NTSsign first
              <ArrowRight className="h-3.5 w-3.5" />
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

function getSingleParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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
