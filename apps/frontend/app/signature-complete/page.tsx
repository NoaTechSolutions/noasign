import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, ShieldCheck, Zap } from "lucide-react";
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
    // Responsive split (flexbox; columns fill the viewport height — no dead
    // strip at the bottom):
    //  • phone (<700): flex-col. Compact confirmation, promo flex-1 to fill.
    //  • tablet (≥700): flex-row, two equal halves side by side (like desktop)
    //    with generous padding + vertically-centered content. Breakpoint is
    //    700 (not md/768) so real tablets reliably get 2-col with air.
    //    min-h-screen (NOT h-screen) → 320px / very short viewports just
    //    scroll; nothing clips (no overflow:hidden outside lg).
    //  • desktop (lg+): locked full-screen split, each column scrolls inside.
    // NOTE: left text colors are EXPLICIT navy (not var(--text-*)) — those
    // tokens are hijacked further down globals.css to data-theme-only vars that
    // don't exist on this class-themed page and resolve to black. See §1.
    <main className="relative flex min-h-screen w-full flex-col min-[700px]:flex-row lg:h-screen lg:overflow-hidden">
      {/* Theme toggle — page-level, fixed top-right, floats over both columns
          at every width. Reads fine on both the light #f0f4ff and the dark
          gradient (the toggle styles itself per theme). */}
      <div className="fixed right-4 top-4 z-50 md:right-5 md:top-5">
        <ThemeToggle />
      </div>

      {/* ============================================================
          LEFT — Confirmation + download (primary outcome).
          Light: #f0f4ff section bg + navy ink. Dark: deep navy #0b0f1a.
          Phone: compact natural height. ≥700: half width, fills height.
          ============================================================ */}
      <div className="relative flex flex-col border-b border-[color:var(--border-strong)] bg-[#f0f4ff] dark:bg-[#0b0f1a] min-[700px]:w-1/2 min-[700px]:border-b-0 min-[700px]:border-r lg:min-h-0 lg:overflow-y-auto">
        {/* Brand wash so the section reads with depth, not a flat sheet. */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(255,153,0,0.08),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(5,165,255,0.10),transparent_44%)] dark:bg-[radial-gradient(circle_at_0%_0%,rgba(255,153,0,0.10),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(5,165,255,0.14),transparent_46%)]" />

        {/* NTSsign branding (ours, not the tenant's). Shares the same 2xl
            max-width as the content below so the logo stays left-aligned with
            it on very wide screens. */}
        <div className="flex w-full shrink-0 items-center px-5 pb-2 pt-5 min-[700px]:px-10 min-[700px]:pt-10 lg:px-12 2xl:mx-auto 2xl:max-w-[680px]">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[color:var(--border-strong)] bg-white shadow-[0_4px_16px_rgba(2,41,119,0.18)] min-[700px]:h-14 min-[700px]:w-14">
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
                className="hidden object-contain dark:block"
                sizes="56px"
                priority
              />
            </div>
            <div>
              <div className="text-lg font-medium tracking-[-0.02em] text-[#022977] dark:text-[#f0f4ff]">
                NTSsign
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[rgba(2,41,119,0.5)] dark:text-[rgba(200,216,240,0.6)]">
                by NoaTechSolutions
              </div>
            </div>
          </Link>
        </div>

        {/* Phone: compact, top-aligned. ≥700: fill the column, centered, with
            generous padding so it breathes. ≥2xl: cap + center the content so it
            doesn't stretch on wide/2K/ultrawide monitors (bg stays full-bleed). */}
        <div className="flex w-full flex-1 flex-col justify-start px-5 pb-7 pt-4 min-[700px]:justify-center min-[700px]:px-10 min-[700px]:py-12 lg:px-12 2xl:mx-auto 2xl:max-w-[680px]">
          {/* Quality badge */}
          <div className="flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[#0f7a58] dark:text-[color:var(--success-text)]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Signed &amp; legally binding
            </div>
          </div>

          {/* Confirmation — document + sender context. Keyword in brand amber
              per design-system §Hero ("palabra clave en #ff9900"). */}
          <h1 className="mt-4 text-[1.375rem] font-medium leading-[1.2] tracking-[-0.03em] text-[#022977] dark:text-[#f0f4ff] min-[700px]:mt-5 min-[700px]:text-[1.75rem] min-[700px]:leading-[1.15] lg:text-[2rem] 2xl:text-[2.4rem]">
            {documentName ? (
              <>
                You signed <span className="text-[#ff9900]">{documentName}</span>
              </>
            ) : (
              "Your signature was received"
            )}
          </h1>
          {senderName && (
            <p className="mt-1.5 text-sm font-medium text-[rgba(2,41,119,0.7)] dark:text-[#c8d8f0] min-[700px]:mt-2 min-[700px]:text-base">
              sent by {senderName}
            </p>
          )}

          <p className="mt-3 max-w-md text-sm leading-6 text-[rgba(2,41,119,0.7)] dark:text-[#c8d8f0] min-[700px]:leading-7 2xl:text-base">
            Your signature was recorded with a complete audit trail.{" "}
            {signerEmail ? (
              <>
                A copy was sent to{" "}
                <strong className="font-medium text-[#022977] dark:text-[#f0f4ff]">
                  {signerEmail}
                </strong>
                .
              </>
            ) : (
              "A copy will be emailed to you."
            )}
          </p>

          {/* Download the signed copy (polls until ready) — primary action */}
          <div className="mt-5 min-[700px]:mt-7">
            <DownloadSignedCopy
              token={token}
              initialDownloadUrl={publicSignature?.downloadUrl ?? null}
            />
          </div>

          {/* Trust row */}
          <div className="mt-5 flex items-center gap-2 text-xs text-[rgba(2,41,119,0.5)] dark:text-[rgba(200,216,240,0.6)] min-[700px]:mt-7">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Every signature is verifiable and tamper-evident.
          </div>
        </div>
      </div>

      {/* ============================================================
          RIGHT — NTSsign invitation (focused on lead capture).
          Eyebrow → headline → sub → email form → custom trust seals.
          The amber CTA stays the focal point — the seals are amber-soft
          chips, eye-catching but lighter weight than the solid CTA.
          ============================================================ */}
      <div className="relative flex flex-1 flex-col bg-[linear-gradient(135deg,#05a5ff_0%,#022977_52%,#0400f0_100%)] dark:bg-[linear-gradient(135deg,#022977_0%,#011a55_50%,#010f33_100%)] min-[700px]:w-1/2 min-[700px]:flex-none lg:min-h-0 lg:overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(255,153,0,0.28),transparent_45%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(5,165,255,0.18),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,153,0,0.12),transparent_42%)]" />

        <div className="relative flex w-full flex-1 flex-col justify-center px-5 py-8 min-[700px]:px-10 min-[700px]:py-12 lg:px-12 2xl:mx-auto 2xl:max-w-[680px]">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 min-[700px]:mb-5">
            <Zap className="h-3.5 w-3.5 text-[#ff9900]" />
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/80">
              Powered by NTSsign
            </span>
          </div>

          <h2 className="text-2xl font-medium leading-tight tracking-[-0.04em] text-white min-[700px]:text-[1.75rem] xl:text-3xl 2xl:text-[2.4rem]">
            Signing was <span className="text-[#ff9900]">that easy.</span>
          </h2>
          <p className="mt-2.5 max-w-md text-sm leading-6 text-white/70 min-[700px]:leading-7 2xl:text-base">
            Send your own documents for signature in minutes.
          </p>

          {/* Lead capture — input + "Get free access →" (the focal CTA) */}
          <div className="relative mt-5 min-[700px]:mt-6">
            <LeadCaptureForm />
          </div>

          {/* Trust seals — custom branded SVGs, large with the label below,
              three across. Amber-soft chip + glow makes them pop without
              out-weighting the solid-amber CTA above. */}
          <div className="mt-7 grid max-w-md grid-cols-3 gap-2 min-[700px]:mt-8 min-[700px]:gap-3">
            <TrustSeal label="Fast" icon={<FastIcon />} />
            <TrustSeal label="Secure" icon={<SecureIcon />} />
            <TrustSeal label="Legal" icon={<LegalIcon />} />
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * A trust seal: large custom SVG inside an amber-soft chip with a brand glow,
 * label centered below. Three of these sit across the promo column. The chip
 * is intentionally amber-SOFT (not solid) so it reads as premium reassurance
 * without competing with the solid-amber "Get free access" CTA.
 */
function TrustSeal({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(255,153,0,0.28),rgba(255,153,0,0.06))] ring-1 ring-inset ring-[rgba(255,153,0,0.45)] shadow-[0_8px_24px_rgba(255,153,0,0.28)] min-[700px]:h-16 min-[700px]:w-16 2xl:h-[72px] 2xl:w-[72px]">
        {icon}
      </span>
      <span className="text-xs font-medium text-white min-[700px]:text-sm 2xl:text-base">
        {label}
      </span>
    </div>
  );
}

const ICON_CLASS = "h-7 w-7 min-[700px]:h-8 min-[700px]:w-8 2xl:h-9 2xl:w-9";

/** Fast — a filled amber lightning bolt with a bright leading edge. */
function FastIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ICON_CLASS} aria-hidden="true">
      <path
        d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
        fill="#ff9900"
        stroke="#ffd596"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Secure — an amber shield with a crisp white checkmark. */
function SecureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ICON_CLASS} aria-hidden="true">
      <path
        d="M12 22s7.5-3.7 7.5-9.4V5.2L12 2.3 4.5 5.2v7.4C4.5 18.3 12 22 12 22z"
        fill="rgba(255,153,0,0.22)"
        stroke="#ff9900"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m8.6 12.1 2.3 2.3 4.5-4.6"
        stroke="#ffffff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Legal — an amber medal/seal with a ribbon and a white check. */
function LegalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={ICON_CLASS} aria-hidden="true">
      <path
        d="m8.8 13.4-1.6 8.1 4.8-2.7 4.8 2.7-1.6-8.1"
        fill="none"
        stroke="#ff9900"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="9"
        r="6.4"
        fill="rgba(255,153,0,0.22)"
        stroke="#ff9900"
        strokeWidth="1.6"
      />
      <path
        d="m9.3 9 1.9 1.9L15 7.1"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
