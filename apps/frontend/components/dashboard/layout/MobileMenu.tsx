"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NAVIGATION_ITEMS, filterNavigationItems } from "./NavigationItems";

interface MobileMenuProps {
  userRole: string;
  currentPanel: string;
  // Optional signout handler — wires the drawer footer's Sign-out button
  // to the host page's real logout flow. Without it, a fallback prompts
  // for confirmation and navigates to /login (no session clearing).
  onSignOut?: () => Promise<void> | void;
}

// Hamburger button + slide-in drawer for mobile nav. The button is hidden
// on desktop via .mobile-menu-button media query. Tabs (TabBar) take over
// on screens ≥768px.
export function MobileMenu({
  userRole,
  currentPanel,
  onSignOut,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const items = filterNavigationItems(NAVIGATION_ITEMS, userRole);

  const handleNavigate = (panel: string) => {
    router.push(`/dashboard?panel=${panel}`);
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger button (mobile only, hidden via CSS on desktop) */}
      <button
        className="mobile-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "transparent",
          border: "none",
          fontSize: "24px",
          cursor: "pointer",
          padding: "8px",
          color: "var(--text-heading)",
          position: "relative",
          zIndex: 150,
        }}
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Overlay + Drawer (rendered conditionally) */}
      {isOpen && (
        <>
          {/* Dimmed overlay — click to close */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
          />

          {/* Left-side drawer */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "280px",
              background: "var(--bg-chrome)",
              boxShadow: "var(--shadow-elev)",
              zIndex: 1000,
              padding: "24px 0",
              overflowY: "auto",
              animation: "slideInLeft 0.25s ease-out",
            }}
          >
            {/* Close button (top-right of drawer) */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "var(--text-label)",
              }}
              aria-label="Close menu"
            >
              ✕
            </button>

            {/* Drawer header / brand mark */}
            <div
              style={{
                padding: "0 24px 24px",
                borderBottom: "0.5px solid var(--border-soft)",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 500,
                  color: "var(--text-heading)",
                }}
              >
                NTSsign
              </div>
            </div>

            {/* Navigation items */}
            <nav>
              {items.map((item) => {
                const isActive = currentPanel === item.panel;
                return (
                  <button
                    key={item.panel}
                    onClick={() => handleNavigate(item.panel)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "12px 24px",
                      background: isActive
                        ? "var(--bg-hover)"
                        : "transparent",
                      border: "none",
                      borderLeft: isActive
                        ? "3px solid var(--brand)"
                        : "3px solid transparent",
                      color: isActive
                        ? "var(--brand)"
                        : "var(--text-body)",
                      fontSize: "15px",
                      fontWeight: isActive ? 500 : 400,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "var(--bg-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {item.icon && (
                      <span
                        style={{
                          marginRight: "12px",
                          display: "flex",
                          alignItems: "center",
                          color: isActive
                            ? "var(--brand)"
                            : "var(--text-body)",
                        }}
                      >
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Sign-out button in drawer footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "0.5px solid var(--border-soft)",
                marginTop: "12px",
              }}
            >
              <button
                onClick={async () => {
                  setIsOpen(false);
                  if (onSignOut) {
                    await onSignOut();
                    return;
                  }
                  if (window.confirm("Sign out?")) {
                    window.location.href = "/login";
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "8px",
                  color: "var(--text-body)",
                  fontSize: "15px",
                  fontWeight: 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--border-soft)";
                }}
                aria-label="Sign out"
              >
                <span
                  style={{
                    minWidth: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "12px",
                    color: "var(--text-body)",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </span>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
