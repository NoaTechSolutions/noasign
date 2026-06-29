"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { getPlanEntry } from "@/lib/plan-catalog";
import { resolveAccountName } from "@/lib/account-identity";

interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: "MASTER" | "ADMIN" | "USER";
    companyName: string;
    avatarUrl?: string | null;
    accountType?: string | null;
    plan?: string | null;
  };
  currentPanel: string;
  // While true, show skeletons for avatar + name/plan instead of fallback
  // values flashing on reload ("User"/"Company" before data lands).
  isLoading?: boolean;
  // Optional slot for elements rendered at the leftmost position (before the
  // logo). DashboardShell uses this to inject the MobileMenu hamburger button.
  children?: React.ReactNode;
  // Wires the avatar-dropdown "Sign out" to the host's real logout flow
  // (POST /auth/logout + clear session). Forwarded by DashboardShell.
  onSignOut?: () => Promise<void> | void;
}

// Stable display labels for breadcrumb + menu. Falls back to "Overview" when
// the panel slug isn't recognized — keeps the breadcrumb sane during typos
// or future panels not yet listed here.
const PANEL_LABELS: Record<string, string> = {
  overview: "Overview",
  documents: "Documents",
  customers: "Clients",
  profile: "Profile",
  billing: "Billing",
  users: "Members",
  members: "Members",
  locked: "Locked Users",
  lockedUsers: "Locked Users",
  settings: "Settings",
  support: "Support",
};

export function Topbar({ user, currentPanel, isLoading, children, onSignOut }: TopbarProps) {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = user.name.charAt(0).toUpperCase();

  // Beside the avatar: INDIVIDUAL accounts show the person's name; everyone
  // else (BUSINESS / MASTER) shows the company name. Plan sits underneath.
  // Shared resolver so the Topbar and WelcomeCard never drift apart.
  const primaryLabel = resolveAccountName({
    accountType: user.accountType,
    personName: user.name,
    companyName: user.companyName,
  });
  // Use the catalog display label (never the raw enum like "RECEIPTS_ONLY").
  const planLabel = user.plan ? getPlanEntry(user.plan).name : null;

  return (
    <div
      className="topbar sticky top-0 flex items-center px-4 gap-3"
      style={{
        height: "56px",
        background: "var(--bg-chrome)",
        borderBottom: "0.5px solid var(--border-soft)",
        zIndex: 100,
      }}
    >
      {/* Left: [MobileMenu] + [Logo (mobile only)] + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Slot for MobileMenu hamburger button on mobile (hidden on desktop
            via .mobile-menu-button CSS). Renders nothing on desktop. */}
        {children}
        {/* Logo — hidden on desktop via .topbar-logo-container CSS
            (sidebar carries the brand on desktop). Click navigates to
            overview, useful on mobile. */}
        <div className="topbar-logo-container">
          <Link
            href="/dashboard?panel=overview"
            className="flex items-center gap-2.5 no-underline"
          >
            <div
              className="w-7 h-7 grid place-items-center text-xs font-medium flex-shrink-0"
              style={{
                borderRadius: "7px",
                background: "var(--brand)",
                color: "#ffffff",
                letterSpacing: "0.02em",
              }}
            >
              NS
            </div>
            <span
              className="topbar-logo-text text-[15px] font-medium"
              style={{ color: "var(--text-heading)" }}
            >
              NTSsign
            </span>
          </Link>
        </div>

        <div
          className="topbar-breadcrumbs flex items-center gap-2 ml-3 pl-4 text-[13px] min-w-0"
          style={{
            borderLeft: "0.5px solid var(--border-soft)",
            color: "var(--text-label)",
          }}
        >
          <span>Dashboard</span>
          <span style={{ opacity: 0.6 }}>›</span>
          <span
            className="font-medium truncate"
            style={{ color: "var(--text-heading)" }}
          >
            {PANEL_LABELS[currentPanel] || "Overview"}
          </span>
        </div>
      </div>

      {/* Right: Theme Toggle + Avatar */}
      <div className="flex items-center gap-2 ml-auto">
        {isLoading ? (
          <div
            className="skeleton-pulse w-9 h-9 rounded-lg"
            aria-hidden="true"
          />
        ) : (
          <ThemeToggle />
        )}

        {/* User Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          {isLoading ? (
            <div className="flex items-center gap-2.5 pl-1">
              <div
                className="skeleton-pulse skeleton-circle w-8 h-8 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="topbar-user-meta">
                <div
                  className="skeleton-pulse skeleton-line"
                  style={{ width: "100px", height: "12px" }}
                />
                <div
                  className="skeleton-pulse skeleton-line"
                  style={{ width: "60px", height: "10px", marginTop: "4px" }}
                />
              </div>
            </div>
          ) : (
          <>
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="flex items-center gap-2.5 border-none bg-transparent p-0 pl-1 cursor-pointer"
            aria-expanded={avatarOpen}
          >
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-xs font-medium flex-shrink-0 transition-transform duration-150 overflow-hidden"
              style={{
                background: "var(--brand)",
                color: "#ffffff",
                letterSpacing: "0.02em",
                transform: avatarOpen ? "scale(1.05)" : "scale(1)",
              }}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>

            {/* Name + plan — hidden on mobile (avatar only) via CSS */}
            <div className="topbar-user-meta min-w-0">
              <p
                className="text-[13px] font-medium m-0 truncate"
                style={{
                  color: "var(--text-heading)",
                  lineHeight: 1.3,
                  maxWidth: "160px",
                }}
              >
                {primaryLabel}
              </p>
              {planLabel && (
                <p
                  className="text-[11px] m-0 truncate"
                  style={{ color: "var(--text-label)", lineHeight: 1.3 }}
                >
                  {planLabel}
                </p>
              )}
            </div>
          </button>

          {/* Dropdown Menu */}
          {avatarOpen && (
            <div
              className="absolute right-0 w-72 p-2"
              style={{
                top: "calc(100% + 8px)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-soft)",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                zIndex: 50,
              }}
            >
              {/* Header */}
              <div className="flex items-start gap-3 p-3">
                <div
                  className="w-[42px] h-[42px] rounded-full grid place-items-center text-sm font-medium flex-shrink-0 overflow-hidden"
                  style={{
                    background: "var(--brand)",
                    color: "#ffffff",
                  }}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-medium m-0"
                    style={{
                      color: "var(--text-heading)",
                      lineHeight: 1.4,
                    }}
                  >
                    {user.name}
                  </p>
                  <p
                    className="text-[11px] font-normal m-0 mt-0.5 break-words"
                    style={{
                      color: "var(--text-label)",
                      lineHeight: 1.4,
                    }}
                  >
                    {user.email}
                  </p>
                </div>
              </div>

              <div
                style={{
                  height: "1px",
                  background: "var(--border-soft)",
                  margin: "4px -8px",
                }}
              />

              {/* Account menu — only personal/account items here. Module
                  navigation (Overview/Documents/Customers/etc) is being
                  redesigned as horizontal tabs or sidebar per the upcoming
                  decision (Phase 2). For now panel navigation is via URL. */}
              <div className="py-1">
                <p
                  className="text-[10px] font-medium uppercase px-2 py-2 m-0"
                  style={{
                    color: "var(--text-label)",
                    letterSpacing: "0.06em",
                  }}
                >
                  Account
                </p>

                <MenuLink
                  href="/dashboard?panel=profile"
                  onClick={() => setAvatarOpen(false)}
                >
                  <DropdownIcon>
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </DropdownIcon>
                  <span>Profile</span>
                </MenuLink>
                <MenuLink
                  href="/dashboard?panel=settings"
                  onClick={() => setAvatarOpen(false)}
                >
                  <DropdownIcon>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </DropdownIcon>
                  <span>Settings</span>
                </MenuLink>
                <MenuLink
                  href="/dashboard?panel=support"
                  onClick={() => setAvatarOpen(false)}
                >
                  <DropdownIcon>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </DropdownIcon>
                  <span>Support</span>
                </MenuLink>
              </div>

              <div
                style={{
                  height: "1px",
                  background: "var(--border-soft)",
                  margin: "4px -8px",
                }}
              />

              {/* Sign out */}
              <div className="py-1">
                <button
                  className="flex items-center gap-2.5 px-2 py-2 rounded-md text-[13px] w-full text-left border-none bg-transparent cursor-pointer font-normal transition-colors duration-150"
                  style={{ color: "var(--text-body)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  onClick={async () => {
                    setAvatarOpen(false);
                    if (onSignOut) {
                      await onSignOut();
                    }
                  }}
                >
                  <DropdownIcon>
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </DropdownIcon>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper for dropdown navigation links. Closes the dropdown on click and
// uses inline mouse handlers because Tailwind hover variants can't drive
// CSS-var-based backgrounds.
function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-2 py-2 rounded-md text-[13px] transition-colors duration-150"
      style={{ color: "var(--text-body)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-page)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </Link>
  );
}

// Dropdown menu icon — matches the sidebar icon language: outline SVG,
// stroke="currentColor" (inherits the row's text color), no fill, no
// background. `children` are the inner SVG elements (path/circle/line).
function DropdownIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        minWidth: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.8,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  );
}
