"use client";

import { type ReactNode } from "react";
import { Topbar } from "./Topbar";
import { TabBar } from "./TabBar";
import { MobileMenu } from "./MobileMenu";

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

// Top-level wrapper for the new dashboard layout. Composes:
//   Topbar (fixed at top, with MobileMenu hamburger as children)
//   TabBar (below topbar, desktop only)
//   main  (content area)
//
// The Topbar is `position: fixed` so the inner wrapper uses paddingTop: 64px
// to keep content from being hidden behind it.
export function DashboardShell({
  children,
  user,
  currentPanel,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <Topbar user={user} currentPanel={currentPanel}>
        <MobileMenu userRole={user.role} currentPanel={currentPanel} />
      </Topbar>

      {/* Inner wrapper offset by fixed-topbar height */}
      <div style={{ paddingTop: "64px" }}>
        <TabBar userRole={user.role} currentPanel={currentPanel} />

        <main
          className="px-6 py-6"
          style={{ minHeight: "calc(100vh - 64px)" }}
        >
          <div className="mx-auto" style={{ maxWidth: "1400px" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
