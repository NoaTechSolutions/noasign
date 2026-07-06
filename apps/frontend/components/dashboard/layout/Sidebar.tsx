"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import {
  NAVIGATION_ITEMS,
  filterNavigationItems,
  isNavGroup,
  NavBadge,
  type NavigationItem,
} from "./NavigationItems";
import { useDirtyForm } from "@/components/dashboard/shared/dirty-form-context";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import { DashboardFooter } from "./DashboardFooter";

interface SidebarProps {
  userRole: string;
  currentPanel: string;
  // Optional signout handler. When passed, the footer Sign-out button calls
  // this. Without it, a fallback navigates to /login (no real session
  // clearing — avoid in production).
  onSignOut?: () => Promise<void> | void;
  // While true, nav items render as skeletons (avoids role-filtered items
  // flashing in/out as workspace data lands).
  isLoading?: boolean;
}

const STORAGE_KEY = "sidebar-collapsed";
const OPEN_GROUPS_KEY = "sidebar-open-groups";
// Stable default so the localStorage hook returns a steady identity pre-hydration.
const EMPTY_GROUPS: Record<string, boolean> = {};

// Modern collapsible sidebar (Linear/Notion/Discord style). Persists the
// collapse state to localStorage. On first paint, defaults to expanded —
// if the user had it collapsed, there's a brief flicker after useEffect
// reads localStorage. Acceptable tradeoff for simpler SSR.
export function Sidebar({
  userRole,
  currentPanel,
  onSignOut,
  isLoading,
}: SidebarProps) {
  const router = useRouter();
  // Persisted to localStorage via useSyncExternalStore. SSR-safe: the server
  // snapshot is the default (expanded / no open groups), adopted from storage
  // right after hydration — no setState-in-effect, no hydration mismatch. The
  // brief expand->collapse flicker is inherent to SSR without a cookie.
  const [isCollapsed, setIsCollapsed] = useLocalStorageState<boolean>(
    STORAGE_KEY,
    false,
  );
  // Custom hover tooltip for collapsed mode. Positioned fixed (viewport
  // coords from the button's rect) so it escapes the sidebar's
  // overflow:hidden clipping — a normal absolute tooltip to the right
  // would be cut off at the 72px edge.
  const [tooltip, setTooltip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  // Sign-out confirmation (custom dialog — replaces the native window.confirm).
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const items = filterNavigationItems(NAVIGATION_ITEMS, userRole);

  // Expand/collapse state for nav groups (e.g. "User management"), persisted.
  const [openGroups, setOpenGroups] = useLocalStorageState<Record<string, boolean>>(
    OPEN_GROUPS_KEY,
    EMPTY_GROUPS,
  );

  const toggleGroup = (key: string) => {
    setOpenGroups((cur) => ({ ...cur, [key]: !(cur[key] ?? false) }));
  };

  const toggleCollapse = () => {
    setTooltip(null);
    setIsCollapsed((current) => !current);
  };

  const { requestNavigate } = useDirtyForm();

  const handleNavigate = (panel: string) => {
    requestNavigate(() => router.push(`/dashboard?panel=${panel}`));
  };

  // Single nav item button. `indented` adds left padding for group children.
  const renderNavButton = (item: NavigationItem, indented: boolean) => {
    const isActive = currentPanel === item.panel;
    const isDisabled = item.disabled ?? false;
    return (
      <button
        key={item.panel}
        type="button"
        aria-disabled={isDisabled || undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (isDisabled) return;
          handleNavigate(item.panel);
        }}
        style={{
          display: "flex",
          flexDirection: isCollapsed ? "column" : "row",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          gap: isCollapsed ? "4px" : "0",
          width: "100%",
          padding: isCollapsed ? "8px 4px" : "10px 12px",
          paddingLeft: isCollapsed
            ? undefined
            : indented
              ? isActive
                ? "21px"
                : "24px"
              : isActive
                ? "9px"
                : undefined,
          marginBottom: "4px",
          background: isActive ? "var(--bg-hover)" : "transparent",
          border: "none",
          borderLeft:
            !isCollapsed && isActive
              ? "3px solid var(--brand)"
              : "3px solid transparent",
          borderRadius: "8px",
          color: isDisabled
            ? "var(--text-label)"
            : isActive
              ? "var(--brand)"
              : "var(--text-body)",
          fontSize: "14px",
          fontWeight: isActive ? 500 : 400,
          cursor: isDisabled ? "not-allowed" : "pointer",
          textAlign: isCollapsed ? "center" : "left",
          transition: "background 0.15s ease, color 0.15s ease",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!isActive && !isDisabled) {
            e.currentTarget.style.background = "var(--bg-card-soft)";
          }
          if (isCollapsed) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({
              label: item.label,
              top: rect.top + rect.height / 2,
              left: rect.right + 8,
            });
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
          }
          setTooltip(null);
        }}
      >
        {item.icon && (
          <span
            style={{
              minWidth: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isDisabled ? 0.45 : isActive ? 1 : 0.8,
              color: isActive ? "var(--brand)" : "var(--text-body)",
            }}
          >
            {item.icon}
          </span>
        )}

        {isCollapsed ? (
          <span
            style={{
              fontSize: "9px",
              lineHeight: 1,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? "var(--brand)" : "var(--text-label)",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.shortLabel ?? item.label}
          </span>
        ) : (
          <span
            style={{
              marginLeft: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
              flex: 1,
            }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                opacity: isDisabled ? 0.7 : 1,
              }}
            >
              {item.label}
            </span>
            {item.badge && <NavBadge label={item.badge} />}
          </span>
        )}
      </button>
    );
  };

  // A collapsible group (its sub-items). Collapsed (icon-only) sidebar renders
  // the children flat — there's no room for a collapsible header.
  const renderNavGroup = (group: (typeof items)[number]) => {
    if (!isNavGroup(group)) return null;
    if (isCollapsed) {
      return (
        <div key={group.key}>
          {group.children.map((child) => renderNavButton(child, false))}
        </div>
      );
    }
    const open =
      openGroups[group.key] ??
      group.children.some((c) => c.panel === currentPanel);
    return (
      <div key={group.key}>
        <button
          onClick={() => toggleGroup(group.key)}
          aria-expanded={open}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: "10px 12px",
            marginBottom: "4px",
            background: "transparent",
            border: "none",
            borderRadius: "8px",
            color: "var(--text-body)",
            fontSize: "14px",
            fontWeight: 400,
            cursor: "pointer",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-card-soft)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {group.icon && (
            <span
              style={{
                minWidth: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.8,
              }}
            >
              {group.icon}
            </span>
          )}
          <span
            style={{
              marginLeft: "10px",
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {group.label}
          </span>
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
          ? group.children.map((child) => renderNavButton(child, true))
          : null}
      </div>
    );
  };

  return (
    <aside
      className="sidebar-desktop"
      data-collapsed={isCollapsed}
      onClick={() => {
        // Click-to-expand when collapsed. Children (nav buttons, sign-out)
        // call stopPropagation so this only fires on empty-space clicks.
        if (isCollapsed) toggleCollapse();
      }}
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
        cursor: isCollapsed ? "pointer" : "default",
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

        {/* Collapse button — only when expanded. When collapsed, the whole
            sidebar is clickable (see aside onClick) to expand, and the
            header shows just the logo mark with no toggle. */}
        {!isCollapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse();
            }}
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
              fontSize: "16px",
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
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            ‹
          </button>
        )}
      </div>

      {/* Navigation items */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {isLoading
          ? items.map((entry, idx) => (
              <div
                key={idx}
                aria-hidden="true"
                style={{
                  display: "flex",
                  flexDirection: isCollapsed ? "column" : "row",
                  alignItems: "center",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  gap: isCollapsed ? "4px" : "10px",
                  padding: isCollapsed ? "8px 4px" : "10px 12px",
                  marginBottom: "4px",
                }}
              >
                <span
                  className="skeleton-pulse skeleton-circle"
                  style={{ width: "20px", height: "20px", flexShrink: 0 }}
                />
                {!isCollapsed && (
                  <span
                    className="skeleton-pulse skeleton-line"
                    style={{ width: "120px", height: "12px" }}
                  />
                )}
              </div>
            ))
          : items.map((entry) =>
              isNavGroup(entry)
                ? renderNavGroup(entry)
                : renderNavButton(entry, false),
            )}
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
        {isLoading ? (
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: isCollapsed ? "0" : "10px",
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--border-soft)",
              borderRadius: "8px",
            }}
          >
            <span
              className="skeleton-pulse skeleton-circle"
              style={{ width: "20px", height: "20px", flexShrink: 0 }}
            />
            {!isCollapsed && (
              <span
                className="skeleton-pulse skeleton-line"
                style={{ width: "80px", height: "12px" }}
              />
            )}
          </div>
        ) : (
        <button
          onClick={async (e) => {
            // Prevent aside's click-to-expand when collapsed.
            e.stopPropagation();
            if (onSignOut) {
              await onSignOut();
              return;
            }
            // Fallback: no real session clear — flagged in props comment.
            // Custom confirm dialog (not the native window.confirm).
            setShowSignOutConfirm(true);
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
        )}

        {!isCollapsed && <DashboardFooter />}
      </div>

      {/* Custom hover tooltip (collapsed only). Fixed positioning escapes
          the sidebar's overflow clipping. */}
      {isCollapsed && tooltip && (
        <div
          className="sidebar-tooltip-pop"
          style={{
            position: "fixed",
            top: tooltip.top,
            left: tooltip.left,
            transform: "translateY(-50%)",
          }}
        >
          {tooltip.label}
        </div>
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
    </aside>
  );
}
