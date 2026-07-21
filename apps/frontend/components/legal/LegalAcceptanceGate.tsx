"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import "./legal-acceptance-gate.css";

interface LegalAcceptanceGateProps {
  // The host's REAL sign-out handler — the "Log out" button must actually log out,
  // never be a dead exit (the SEND_FAILED-contract dead-end lesson).
  onSignOut: () => void;
}

interface AcceptanceStatus {
  mustAccept: boolean;
  pending: { docType: string; version: string }[];
}

/**
 * Blocking gate: if the current user hasn't accepted the active Terms/Privacy, it
 * covers the app until they accept (or log out). Styled with the shared design-system
 * tokens (mirrors the approved IssueDateDisclaimerModal) — not a parallel palette.
 *
 * Key design (approved):
 * - Checked ONCE at app load — NEVER mid-session, so a version published while a user
 *   is mid-document never interrupts them / loses work. They see it at the next load.
 * - Checkbox starts UNCHECKED — accepting is an act of the user.
 * - On accept, clears ONLY after a CONFIRMED save. If the POST fails, it shows an
 *   error and stays open — never says "accepted" when nothing saved.
 * - If the status check itself fails, it fails OPEN — a transient error must not lock
 *   real clients out; it re-checks next load.
 */
export function LegalAcceptanceGate({ onSignOut }: LegalAcceptanceGateProps) {
  const [status, setStatus] = useState<AcceptanceStatus | null>(null);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<AcceptanceStatus>("/legal/acceptance-status")
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {
        // Fail OPEN — never lock the app on a transient status error.
        if (active) setStatus({ mustAccept: false, pending: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  if (!status || !status.mustAccept) return null;

  async function accept() {
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/legal/accept", { method: "POST" });
      // Confirmed save → clear. (apiRequest throws on non-2xx, so we only reach here
      // on success — the popup can never say "accepted" on a failed POST.)
      setStatus({ mustAccept: false, pending: [] });
    } catch {
      setError(
        "We could not save your acceptance. Please check your connection and try again.",
      );
      setSubmitting(false); // stay open for retry — no false "accepted"
    }
  }

  return (
    <div
      className="legal-gate-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="legal-gate-title"
    >
      <div className="legal-gate-card">
        <h2 id="legal-gate-title" className="legal-gate-title">
          Before you continue
        </h2>
        <div className="legal-gate-body">
          <p>
            To use NTSsign, please review and accept our{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
            .
          </p>
          <p>
            <strong>
              NTSsign is a document tool. You are responsible for the content,
              accuracy, and legality of every document you create and send —
              including all dates, prices, and terms. NTSsign does not provide
              legal, tax, or accounting advice.
            </strong>
          </p>
        </div>

        <label className="legal-gate-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            disabled={submitting}
          />
          <span>
            I have read and agree to the Terms of Service and the Privacy Policy.
          </span>
        </label>

        {error ? <p className="legal-gate-error">{error}</p> : null}

        <div className="legal-gate-actions">
          <button
            type="button"
            className="legal-gate-btn legal-gate-btn--ghost"
            onClick={onSignOut}
            disabled={submitting}
          >
            Log out
          </button>
          <button
            type="button"
            className="legal-gate-btn legal-gate-btn--primary"
            onClick={accept}
            disabled={!checked || submitting}
          >
            {submitting ? "Saving…" : "Accept and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
