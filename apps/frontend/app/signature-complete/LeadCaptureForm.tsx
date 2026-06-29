"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api-url";

type Status = "idle" | "loading" | "done" | "error";

/**
 * Lead capture for NTSsign (separate from the signing flow that just finished).
 * Persists the email to the backend (/public/leads). English (US) copy.
 */
export function LeadCaptureForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "signature-complete" }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm font-medium text-white">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
        Thanks! We&apos;ll email you free access shortly.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        aria-label="Your work email"
        className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition focus:border-white/40 focus:bg-white/15"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff9900,#e67e00)] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(255,153,0,0.4)] transition hover:brightness-110 disabled:opacity-70 dark:bg-none dark:bg-white dark:text-[#022977]"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Get free access
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      {status === "error" && (
        <p className="text-xs text-white/70 sm:absolute sm:mt-12">
          Something went wrong — please try again.
        </p>
      )}
    </form>
  );
}
