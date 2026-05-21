"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NAVIGATION_ITEMS, filterNavigationItems } from "./NavigationItems";

interface SidebarProps {
  userRole: string;
  currentPanel: string;
}

const STORAGE_KEY = "sidebar-collapsed";

// Modern collapsible sidebar (Linear/Notion/Discord style). Persists the
// collapse state to localStorage. On first paint, defaults to expanded —
// if the user had it collapsed, there's a brief flicker after useEffect
// reads localStorage. Acceptable tradeoff for simpler SSR.
export function Sidebar({ userRole, currentPanel }: SidebarProps) {
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

      {/* Footer (hidden when collapsed) */}
      {!isCollapsed && (
        <div
          style={{
            padding: "12px 20px",
            borderTop: "0.5px solid var(--border-soft)",
            fontSize: "11px",
            color: "var(--text-label)",
          }}
        >
          Dashboard v2.0
        </div>
      )}
    </aside>
  );
}
