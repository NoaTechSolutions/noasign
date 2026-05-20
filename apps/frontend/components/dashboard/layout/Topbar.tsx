"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: "MASTER" | "ADMIN" | "USER";
    companyName: string;
  };
  currentPanel: string;
}

// Stable display labels for breadcrumb + menu. Falls back to "Overview" when
// the panel slug isn't recognized — keeps the breadcrumb sane during typos
// or future panels not yet listed here.
const PANEL_LABELS: Record<string, string> = {
  overview: "Overview",
  documents: "Documents",
  customers: "Customers",
  profile: "Profile",
  billing: "Billing",
  users: "Members",
  locked: "Locked Users",
  settings: "Settings",
  support: "Support",
};

export function Topbar({ user, currentPanel }: TopbarProps) {
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

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center px-4 gap-3"
      style={{
        height: "64px",
        background: "var(--bg-chrome)",
        borderBottom: "0.5px solid var(--border-soft)",
        zIndex: 40,
      }}
    >
      {/* Left: Logo + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
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

        <div
          className="flex items-center gap-2 ml-3 pl-4 text-[13px] min-w-0"
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
        <ThemeToggle />

        {/* User Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="w-9 h-9 rounded-full border-none bg-transparent p-0 cursor-pointer grid place-items-center"
            aria-expanded={avatarOpen}
          >
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-xs font-medium flex-shrink-0 transition-transform duration-150"
              style={{
                background: "var(--brand)",
                color: "#ffffff",
                letterSpacing: "0.02em",
                transform: avatarOpen ? "scale(1.05)" : "scale(1)",
              }}
            >
              {initial}
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
                  className="w-[42px] h-[42px] rounded-full grid place-items-center text-sm font-medium flex-shrink-0"
                  style={{
                    background: "var(--brand)",
                    color: "#ffffff",
                  }}
                >
                  {initial}
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
                    className="text-[11px] font-medium m-0 mt-0.5"
                    style={{
                      color: "var(--text-label)",
                      lineHeight: 1.4,
                    }}
                  >
                    {user.role}
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
                  <span style={{ marginRight: "4px" }}>👤</span>
                  <span>Profile</span>
                </MenuLink>
                <MenuLink
                  href="/dashboard?panel=settings"
                  onClick={() => setAvatarOpen(false)}
                >
                  <span style={{ marginRight: "4px" }}>⚙️</span>
                  <span>Settings</span>
                </MenuLink>
                <MenuLink
                  href="/dashboard?panel=support"
                  onClick={() => setAvatarOpen(false)}
                >
                  <span style={{ marginRight: "4px" }}>💬</span>
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
                  onClick={() => {
                    // TODO: wire to actual logout (POST /auth/logout + clearSession)
                    alert("Sign out — TODO: integrate with auth");
                  }}
                >
                  <span style={{ marginRight: "4px" }}>🚪</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
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
