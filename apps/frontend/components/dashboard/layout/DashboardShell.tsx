"use client";

import { type ReactNode } from "react";
import { Topbar } from "./Topbar";

interface DashboardShellProps {
  children: ReactNode;
  user: {
    name: string;
    email: string;
    role: "MASTER" | "ADMIN" | "USER";
    companyName: string;
  };
  currentPanel: string;
}

// Top-level wrapper for the new dashboard layout (topbar + content area).
// Sits inside `app/dashboard/layout.tsx` providers (ThemeProvider +
// DashboardThemeProvider) — so it can consume CSS vars driven by data-theme.
export function DashboardShell({
  children,
  user,
  currentPanel,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Topbar user={user} currentPanel={currentPanel} />

      <main
        className="px-6 py-6"
        style={{
          marginTop: "64px",
          minHeight: "calc(100vh - 4rem)",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: "1400px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
