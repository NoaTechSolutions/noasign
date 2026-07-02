"use client";

import { type ReactNode } from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { MobileMenu } from "./MobileMenu";

interface DashboardShellProps {
  children: ReactNode;
  user: {
    name: string;
    email: string;
    role: "SUPERADMIN" | "USER";
    companyName: string;
    avatarUrl?: string | null;
    accountType?: string | null;
    plan?: string | null;
  };
  currentPanel: string;
  // Optional signout handler — forwarded to Sidebar footer's Sign-out
  // button. Pass the host page's handleSignOut to wire real logout.
  onSignOut?: () => Promise<void> | void;
  // While true, the Topbar shows skeletons for the avatar + name/plan
  // instead of fallback values ("User"/"Company") flashing on reload.
  isLoading?: boolean;
}

// Top-level wrapper for the new dashboard layout. Composes:
//   Sidebar (sticky at left, desktop only, 240px wide)
//   Right column: Topbar (sticky at top of column) + main content
//
// Mobile (<768px): Sidebar is hidden via CSS, MobileMenu hamburger takes
// over navigation. Topbar shows the logo on mobile (sidebar carries it
// on desktop).
export function DashboardShell({
  children,
  user,
  currentPanel,
  onSignOut,
  isLoading,
}: DashboardShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        display: "flex",
      }}
    >
      <Sidebar
        userRole={user.role}
        currentPanel={currentPanel}
        onSignOut={onSignOut}
        isLoading={isLoading}
      />

      {/* Right column: topbar + content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0, // critical for flex children with overflow
        }}
      >
        <Topbar
          user={user}
          currentPanel={currentPanel}
          isLoading={isLoading}
          onSignOut={onSignOut}
        >
          <MobileMenu
            userRole={user.role}
            currentPanel={currentPanel}
            onSignOut={onSignOut}
          />
        </Topbar>

        <main
          className="dashboard-content"
          style={{ flex: 1, width: "100%" }}
        >
          <div className="mx-auto" style={{ maxWidth: "1400px" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
