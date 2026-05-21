"use client";

import { useRouter } from "next/navigation";
import { NAVIGATION_ITEMS, filterNavigationItems } from "./NavigationItems";

interface TabBarProps {
  userRole: string;
  currentPanel: string;
}

// Horizontal tabs nav for desktop. Renders below the Topbar. Hidden on
// mobile via the .tabbar-desktop media query in globals.css — mobile users
// get MobileMenu instead.
export function TabBar({ userRole, currentPanel }: TabBarProps) {
  const router = useRouter();
  const items = filterNavigationItems(NAVIGATION_ITEMS, userRole);

  const handleTabClick = (panel: string) => {
    router.push(`/dashboard?panel=${panel}`);
  };

  return (
    <nav
      className="tabbar-desktop"
      style={{
        background: "var(--bg-chrome)",
        borderBottom: "0.5px solid var(--border-soft)",
        gap: "4px",
        padding: "0 24px",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {items.map((item) => {
        const isActive = currentPanel === item.panel;
        return (
          <button
            key={item.panel}
            onClick={() => handleTabClick(item.panel)}
            style={{
              position: "relative",
              padding: "12px 16px",
              background: "transparent",
              border: "none",
              color: isActive ? "var(--brand)" : "var(--text-label)",
              fontSize: "14px",
              fontWeight: isActive ? 500 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
              borderBottom: isActive
                ? "2px solid var(--brand)"
                : "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--text-body)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--text-label)";
              }
            }}
          >
            {item.icon && (
              <span style={{ marginRight: "6px", opacity: 0.8 }}>
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
