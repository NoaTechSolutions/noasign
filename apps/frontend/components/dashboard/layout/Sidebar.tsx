"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NAVIGATION_ITEMS, filterNavigationItems } from "./NavigationItems";

interface SidebarProps {
  userRole: string;
  currentPanel: string;
  // Optional signout handler. When passed, the footer Sign-out button calls
  // this. Without it, a fallback navigates to /login (no real session
  // clearing — avoid in production).
  onSignOut?: () => Promise<void> | void;
}

const STORAGE_KEY = "sidebar-collapsed";

// Modern collapsible sidebar (Linear/Notion/Discord style). Persists the
// collapse state to localStorage. On first paint, defaults to expanded —
// if the user had it collapsed, there's a brief flicker after useEffect
// reads localStorage. Acceptable tradeoff for simpler SSR.
export function Sidebar({
  userRole,
  currentPanel,
  onSignOut,
}: SidebarProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const items = filterNavigationItems(NAVIGATION_ITEMS, userRole);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleNavigate = (panel: string) => {
    router.push(`/dashboard?panel=${panel}`);
  };

  return (
    <aside
      className="sidebar-desktop"
      data-collapsed={isCollapsed}
      style={{
        width: isCollapsed ? "72px" : "240px",
        minWidth: isCollapsed ? "72px" : "240px",
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--bg-chrome)",
        borderRight: "0.5px solid var(--border-soft)",
        flexDirection: "column",
        padding: "16px 0",
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width 0.25s ease, min-width 0.25s ease",
        boxShadow: "1px 0 3px rgba(0, 0, 0, 0.03)",
        zIndex: 10,
      }}
    >
      {/* Header: logo + collapse toggle */}
      <div
        style={{
          padding: isCollapsed ? "8px 12px 24px" : "8px 20px 24px",
          borderBottom: "0.5px solid var(--border-soft)",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          transition: "padding 0.25s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              minWidth: "32px",
              background: "var(--brand)",
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 500,
              color: "#ffffff",
            }}
          >
            NS
          </div>

          {!isCollapsed && (
            <div
              style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "var(--text-heading)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              NTSsign
            </div>
          )}
        </div>

        <button
          onClick={toggleCollapse}
          style={{
            width: "28px",
            height: "28px",
            minWidth: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid var(--border-soft)",
            borderRadius: "6px",
            cursor: "pointer",
            color: "var(--text-label)",
            fontSize: "14px",
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
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Navigation items */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
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
                padding: "10px 12px",
                paddingLeft: isActive ? "9px" : "12px",
                marginBottom: "4px",
                background: isActive ? "var(--bg-hover)" : "transparent",
                border: "none",
                borderLeft: isActive
                  ? "3px solid var(--brand)"
                  : "3px solid transparent",
                borderRadius: "8px",
                color: isActive ? "var(--brand)" : "var(--text-body)",
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
                justifyContent: isCollapsed ? "center" : "flex-start",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-card-soft)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon && (
                <span
                  style={{
                    minWidth: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isActive ? 1 : 0.8,
                    color: isActive
                      ? "var(--brand)"
                      : "var(--text-body)",
                  }}
                >
                  {item.icon}
                </span>
              )}

              {!isCollapsed && (
                <span
                  style={{
                    marginLeft: "10px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer: Sign out + (optional) version */}
      <div
        style={{
          padding: isCollapsed ? "12px" : "12px 20px",
          borderTop: "0.5px solid var(--border-soft)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <button
          onClick={async () => {
            if (onSignOut) {
              await onSignOut();
              return;
            }
            // Fallback: no real session clear — flagged in props comment
            if (window.confirm("Sign out?")) {
              window.location.href = "/login";
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            width: "100%",
            padding: "10px 12px",
            background: "transparent",
            border: "1px solid var(--border-soft)",
            borderRadius: "8px",
            color: "var(--text-body)",
            fontSize: "14px",
            fontWeight: 400,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--border-soft)";
          }}
          title={isCollapsed ? "Sign out" : undefined}
          aria-label="Sign out"
        >
          <span
            style={{
              minWidth: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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

          {!isCollapsed && (
            <span
              style={{
                marginLeft: "10px",
                whiteSpace: "nowrap",
              }}
            >
              Sign out
            </span>
          )}
        </button>

        {!isCollapsed && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-label)",
              textAlign: "center",
            }}
          >
            Dashboard v2.0
          </div>
        )}
      </div>
    </aside>
  );
}
