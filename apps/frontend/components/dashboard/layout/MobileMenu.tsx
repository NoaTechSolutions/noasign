"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  NAVIGATION_ITEMS,
  filterNavigationItems,
  isNavGroup,
  NavBadge,
  type NavigationItem,
} from "./NavigationItems";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import { DashboardFooter } from "./DashboardFooter";

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  // Sign-out confirmation (custom dialog — replaces the native window.confirm).
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const router = useRouter();
  const items = filterNavigationItems(NAVIGATION_ITEMS, userRole);

  const handleNavigate = (panel: string) => {
    router.push(`/dashboard?panel=${panel}`);
    setIsOpen(false);
  };

  // Single nav item button (also used for group children, with `indented`).
  const renderItem = (item: NavigationItem, indented: boolean) => {
    const isActive = currentPanel === item.panel;
    const isDisabled = item.disabled ?? false;
    return (
      <button
        key={item.panel}
        type="button"
        aria-disabled={isDisabled || undefined}
        onClick={() => {
          if (isDisabled) return;
          handleNavigate(item.panel);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: indented ? "12px 24px 12px 44px" : "12px 24px",
          background: isActive ? "var(--bg-hover)" : "transparent",
          border: "none",
          borderLeft: isActive
            ? "3px solid var(--brand)"
            : "3px solid transparent",
          color: isDisabled
            ? "var(--text-label)"
            : isActive
              ? "var(--brand)"
              : "var(--text-body)",
          fontSize: "15px",
          fontWeight: isActive ? 500 : 400,
          cursor: isDisabled ? "not-allowed" : "pointer",
          textAlign: "left",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!isActive && !isDisabled)
            e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        {item.icon && (
          <span
            style={{
              marginRight: "12px",
              display: "flex",
              alignItems: "center",
              opacity: isDisabled ? 0.45 : 1,
              color: isActive ? "var(--brand)" : "var(--text-body)",
            }}
          >
            {item.icon}
          </span>
        )}
        <span style={{ opacity: isDisabled ? 0.7 : 1 }}>{item.label}</span>
        {item.badge && <NavBadge label={item.badge} />}
      </button>
    );
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
              {items.map((entry) => {
                if (!isNavGroup(entry)) return renderItem(entry, false);
                const open =
                  openGroups[entry.key] ??
                  entry.children.some((c) => c.panel === currentPanel);
                return (
                  <div key={entry.key}>
                    <button
                      onClick={() =>
                        setOpenGroups((cur) => ({ ...cur, [entry.key]: !open }))
                      }
                      aria-expanded={open}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        padding: "12px 24px",
                        background: "transparent",
                        border: "none",
                        borderLeft: "3px solid transparent",
                        color: "var(--text-body)",
                        fontSize: "15px",
                        fontWeight: 400,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {entry.icon && (
                        <span
                          style={{
                            marginRight: "12px",
                            display: "flex",
                            alignItems: "center",
                            color: "var(--text-body)",
                          }}
                        >
                          {entry.icon}
                        </span>
                      )}
                      <span style={{ flex: 1 }}>{entry.label}</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{
                          transition: "transform 0.2s ease",
                          transform: open ? "rotate(180deg)" : "rotate(0deg)",
                          opacity: 0.7,
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {open
                      ? entry.children.map((c) => renderItem(c, true))
                      : null}
                  </div>
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
                  setShowSignOutConfirm(true);
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

            <div style={{ padding: "0 24px 16px" }}>
              <DashboardFooter />
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={showSignOutConfirm}
        title="Sign out?"
        message="You'll be returned to the login screen."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowSignOutConfirm(false);
          window.location.href = "/login";
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </>
  );
}
