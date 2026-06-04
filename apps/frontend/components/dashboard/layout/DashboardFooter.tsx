import React from "react";

// Shared dashboard footer (Sidebar desktop + MobileMenu drawer). Two centered
// rows; the version is the single source of truth (NEXT_PUBLIC_APP_VERSION,
// injected from package.json via next.config.ts).
export function DashboardFooter() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "11px", color: "var(--text-label)" }}>
        NTSsign v{version}
      </div>
      <div
        style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}
      >
        By NoaTechSolutions
      </div>
    </div>
  );
}
