"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NAVIGATION_ITEMS, filterNavigationItems } from "./NavigationItems";

interface MobileMenuProps {
  userRole: string;
  currentPanel: string;
}

// Hamburger button + slide-in drawer for mobile nav. The button is hidden
// on desktop via .mobile-menu-button media query. Tabs (TabBar) take over
// on screens ≥768px.
export function MobileMenu({ userRole, currentPanel }: MobileMenuProps) {
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
          </div>
        </>
      )}
    </>
  );
}
