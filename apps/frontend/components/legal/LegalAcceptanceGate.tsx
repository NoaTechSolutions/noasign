"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

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
 * covers the app until they accept (or log out).
 *
 * Key design (approved):
 * - Checked ONCE at app load (this component mounts with the dashboard) — NEVER
 *   mid-session, so a version published while a user is mid-document does not
 *   interrupt them or lose their work. They see it at the next load.
 * - Checkbox starts UNCHECKED — accepting is an act of the user.
 * - The Terms/Privacy links open the pages (new tab, keeps the popup mounted).
 * - On accept, the popup clears ONLY after a CONFIRMED save. If the POST fails
 *   (network/500), it shows an error and stays open — it never says "accepted"
 *   when nothing was saved (the lying "Saved!" we killed in batch N).
 * - If the status check itself fails, it fails OPEN (does not lock the app) —
 *   a transient status error must not lock real clients out; it re-checks next load.
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
      // Confirmed save → clear. (apiRequest throws on non-2xx, so we only reach
      // here on success — the popup can never say "accepted" on a failed POST.)
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
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="legal-gate-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--bg-card, #fff)",
          color: "var(--text-primary, #0f172a)",
          borderRadius: 12,
          maxWidth: 520,
          width: "100%",
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h2 id="legal-gate-title" style={{ marginTop: 0, fontSize: 20 }}>
          Before you continue
        </h2>
        <p>
          To use NTSsign, please review and accept our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            <strong>Terms of Service</strong>
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            <strong>Privacy Policy</strong>
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

        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            disabled={submitting}
            style={{ marginTop: 3 }}
          />
          <span>
            I have read and agree to the Terms of Service and the Privacy Policy.
          </span>
        </label>

        {error ? (
          <p style={{ color: "crimson", marginBottom: 0 }}>{error}</p>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={onSignOut}
            disabled={submitting}
            style={{ padding: "10px 16px", cursor: "pointer" }}
          >
            Log out
          </button>
          <button
            type="button"
            onClick={accept}
            disabled={!checked || submitting}
            style={{
              padding: "10px 16px",
              cursor: !checked || submitting ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {submitting ? "Saving…" : "Accept and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
