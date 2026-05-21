// Shared navigation config for TabBar (desktop) and MobileMenu (mobile).
// Single source of truth for the main nav. Add panel here to surface it in
// both navs simultaneously. requiresRole gates per-role visibility — only
// users matching the role see those items.
export interface NavigationItem {
  label: string;
  panel: string;
  icon?: string;
  requiresRole?: "MASTER" | "ADMIN";
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Overview", panel: "overview", icon: "📊" },
  { label: "Documents", panel: "documents", icon: "📄" },
  { label: "Customers", panel: "customers", icon: "👥" },
  { label: "Profile", panel: "profile", icon: "👤" },
  { label: "Billing", panel: "billing", icon: "💳" },
  {
    label: "Members",
    panel: "members",
    icon: "🔑",
    requiresRole: "MASTER",
  },
  {
    label: "Locked Users",
    panel: "lockedUsers",
    icon: "🔒",
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
