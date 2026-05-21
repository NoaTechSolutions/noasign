"use client";

import { useRouter } from "next/navigation";
import { NAVIGATION_ITEMS, filterNavigationItems } from "./NavigationItems";

interface SidebarProps {
  userRole: string;
  currentPanel: string;
}

// Modern vertical sidebar for the dashboard (Linear/Notion/Drive style).
// Sticky at left, 240px width, hidden on mobile via .sidebar-desktop media
// query (mobile users navigate via MobileMenu drawer instead).
export function Sidebar({ userRole, currentPanel }: SidebarProps) {
  const router = useRouter();
  const items = filterNavigationItems(NAVIGATION_ITEMS, userRole);

  const handleNavigate = (panel: string) => {
    router.push(`/dashboard?panel=${panel}`);
  };

  return (
    <aside
      className="sidebar-desktop"
      style={{
        width: "240px",
        minWidth: "240px",
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--bg-chrome)",
        borderRight: "0.5px solid var(--border-soft)",
        flexDirection: "column",
        padding: "16px 0",
        overflowY: "auto",
        boxShadow: "1px 0 3px rgba(0, 0, 0, 0.03)",
      }}
    >
      {/* Brand header */}
      <div
        style={{
          padding: "8px 20px 24px",
          borderBottom: "0.5px solid var(--border-soft)",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
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
          <div
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "var(--text-heading)",
            }}
          >
            NTSsign
          </div>
        </div>
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
                paddingLeft: isActive ? "9px" : "12px", // compensate borderLeft
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
            >
              {item.icon && (
                <span
                  style={{
                    marginRight: "10px",
                    fontSize: "16px",
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
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
    </aside>
  );
}
