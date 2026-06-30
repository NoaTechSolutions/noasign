"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api-url";

type Step = "email" | "details" | "done";

const FIELD_CLASS =
  "w-full min-w-0 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-white/40 focus:bg-white/15 2xl:px-5 2xl:py-3.5 2xl:text-base";

const AMBER_BTN_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff9900] px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(255,153,0,0.45)] transition hover:bg-[#cc7a00] disabled:opacity-60 2xl:px-6 2xl:py-3.5 2xl:text-base";

/**
 * Two-step lead capture for NTSsign (separate from the signing flow that just
 * finished). English (US).
 *  Step 1 — email → POST /public/leads (email is saved even if they bail here).
 *  Step 2 — optional name/phone → PATCH /public/leads/:id (enriches the lead).
 *  Step 3 — success.
 */
export function LeadCaptureForm() {
  const [step, setStep] = useState<Step>("email");
  const [leadId, setLeadId] = useState<string | null>(null);

  // Step 1
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);

  // Step 2
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || emailLoading) return;
    setEmailLoading(true);
    setEmailError(false);
    try {
      const res = await fetch(`${API_URL}/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source: "signature-complete",
        }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { id?: string };
      setLeadId(data?.id ?? null);
      setStep("details");
    } catch {
      setEmailError(true);
    } finally {
      setEmailLoading(false);
    }
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (detailsLoading || (!name.trim() && !phone.trim())) return;
    // If the id was lost (e.g. odd response), the email is already saved — just
    // finish gracefully rather than block the signer.
    if (!leadId) {
      setStep("done");
      return;
    }
    setDetailsLoading(true);
    setDetailsError(false);
    try {
      const res = await fetch(`${API_URL}/public/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setStep("done");
    } catch {
      setDetailsError(true);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Step 3 — success
  if (step === "done") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm font-medium text-white 2xl:px-5 2xl:py-4 2xl:text-base">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-white 2xl:h-6 2xl:w-6" />
        Thanks! We&apos;ll be in touch soon.
      </div>
    );
  }

  // Step 2 — optional follow-up details
  if (step === "details") {
    const canSend = Boolean(name.trim() || phone.trim());
    return (
      <form onSubmit={submitDetails} className="flex flex-col gap-2.5">
        <p className="text-sm font-medium text-white">
          You&apos;re in! Want us to reach out faster?
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          autoComplete="name"
          className={FIELD_CLASS}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional) — for WhatsApp or SMS"
          aria-label="Phone (optional) — for WhatsApp or SMS"
          autoComplete="tel"
          className={FIELD_CLASS}
        />
        <div className="mt-1 flex items-center gap-4">
          <button
            type="submit"
            disabled={detailsLoading || !canSend}
            className={AMBER_BTN_CLASS}
          >
            {detailsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send"
            )}
          </button>
          <button
            type="button"
            onClick={() => setStep("done")}
            className="text-xs font-medium text-white/70 underline-offset-2 transition hover:text-white hover:underline"
          >
            No thanks
          </button>
        </div>
        {detailsError && (
          <p className="text-xs text-white/80">
            Something went wrong — try again or skip.
          </p>
        )}
      </form>
    );
  }

  // Step 1 — email
  return (
    <form onSubmit={submitEmail} className="flex flex-col gap-2.5 lg:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        aria-label="Your work email"
        autoComplete="email"
        className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-white/40 focus:bg-white/15 2xl:px-5 2xl:py-3.5 2xl:text-base"
      />
      <button type="submit" disabled={emailLoading} className={AMBER_BTN_CLASS}>
        {emailLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Get free access
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      {emailError && (
        <p className="text-xs text-white/80 lg:absolute lg:mt-12">
          Something went wrong — please try again.
        </p>
      )}
    </form>
  );
}
