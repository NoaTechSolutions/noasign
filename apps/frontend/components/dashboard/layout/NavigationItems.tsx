import type { ReactNode } from "react";

// Shared navigation config for Sidebar (desktop) and MobileMenu (mobile).
// Single source of truth for the main nav. Icons use SVG with
// `stroke="currentColor"` so they inherit theme color from their parent
// — light mode = navy, dark mode = sky blue, active = brand color.
export interface NavigationItem {
  label: string;
  panel: string;
  icon?: ReactNode;
  requiresRole?: "MASTER" | "ADMIN";
}

// Reusable inline icon. Heroicons-style outline paths. Inherits color
// from parent via `stroke="currentColor"`.
function Icon({ path, size = 20 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: "Overview",
    panel: "overview",
    icon: (
      <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  {
    label: "Documents",
    panel: "documents",
    icon: (
      <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
  {
    label: "Customers",
    panel: "customers",
    icon: (
      <Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    ),
  },
  {
    label: "Profile",
    panel: "profile",
    icon: <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  },
  {
    label: "Billing",
    panel: "billing",
    icon: (
      <Icon path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    ),
  },
  {
    label: "Members",
    panel: "members",
    icon: (
      <Icon path="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    requiresRole: "MASTER",
  },
  {
    label: "Locked Users",
    panel: "lockedUsers",
    icon: (
      <Icon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    ),
    requiresRole: "MASTER",
  },
];

export function filterNavigationItems(
  items: NavigationItem[],
  userRole: string,
): NavigationItem[] {
  return items.filter((item) => {
    if (!item.requiresRole) return true;
    return userRole === item.requiresRole;
  });
}
