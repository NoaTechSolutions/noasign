"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  UserRound,
  CreditCard,
  Users,
  Contact,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { apiRequest, API_URL } from "@/lib/api";
import { clearSession } from "@/lib/auth-storage";

// Customers-scoped sidebar — mirrors the visual pattern of dashboard-sidebar-demo.tsx
// but targets the /dashboard/customers route segment. Nav items that belong to the
// monster's internal state-based sections link to /dashboard?section=KEY; the monster
// reads that query param on mount and renders the matching panel.

type SidebarUser = {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
};

type NavItem = {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  active: boolean;
  masterOnly?: boolean;
};

export function CustomersSidebar({ activeKey }: { activeKey: "customers" }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState<SidebarUser | null>(null);

  useEffect(() => {
    let alive = true;
    apiRequest<SidebarUser>("/users/me")
      .then((me) => {
        if (alive) setUser(me);
      })
      .catch(() => {
        // 401 handled by apiRequest itself.
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function sync() {
      setOpen(window.innerWidth >= 1280);
    }
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  async function handleSignOut() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore network errors on logout */
    }
    clearSession();
    router.replace("/");
  }

  const isMaster = user?.role === "MASTER";

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5 shrink-0" />,
      href: "/dashboard",
      active: false,
    },
    ...(isMaster
      ? [
          {
            key: "users",
            label: "User control",
            icon: <Users className="h-5 w-5 shrink-0" />,
            href: "/dashboard?section=users",
            active: false,
            masterOnly: true,
          },
        ]
      : []),
    {
      key: "documents",
      label: "Documents",
      icon: <FileText className="h-5 w-5 shrink-0" />,
      href: "/dashboard?section=documents",
      active: false,
    },
    {
      key: "profile",
      label: "Profile",
      icon: <UserRound className="h-5 w-5 shrink-0" />,
      href: "/dashboard?section=profile",
      active: false,
    },
    {
      key: "billing",
      label: "Billing",
      icon: <CreditCard className="h-5 w-5 shrink-0" />,
      href: "/dashboard?section=billing",
      active: false,
    },
    {
      key: "customers",
      label: "Customers",
      icon: <Contact className="h-5 w-5 shrink-0" />,
      href: "/dashboard/customers",
      active: activeKey === "customers",
    },
  ];

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Account";

  return (
    <>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-3 xl:gap-8">
          <div>
            <div className="flex items-center justify-between px-3 pb-6 pt-2">
              <div className="text-lg font-semibold tracking-tight text-[color:var(--text-primary)]">
                NTSsign
              </div>
              {open ? (
                <button
                  type="button"
                  aria-label="Close sidebar"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[color:var(--text-secondary)] xl:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <nav className="mt-2 flex flex-col gap-2 xl:mt-4">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                    item.active
                      ? "bg-[#bdd4ff] text-[#022977] shadow-[var(--shadow-soft)] dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--menu-text)]"
                      : "text-[color:var(--menu-text-muted)] hover:bg-[#d8e6ff] hover:text-[#022977] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[color:var(--menu-text)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition",
                      item.active
                        ? "bg-[#9fbeff] text-[#022977] dark:bg-[rgba(255,255,255,0.12)] dark:text-white"
                        : "bg-[#e4efff] text-[#5574a6] group-hover:bg-[#bdd4ff] group-hover:text-[#022977] dark:bg-[color:var(--bg-surface)] dark:text-[color:var(--menu-text-muted)] dark:group-hover:bg-[rgba(255,255,255,0.08)] dark:group-hover:text-white",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm shadow-[var(--shadow-soft)]">
              <div className="truncate font-medium text-[color:var(--text-primary)]">
                {displayName}
              </div>
              {user?.email ? (
                <div className="truncate text-xs text-[color:var(--text-muted)]">{user.email}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm font-medium text-[color:var(--danger-text)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--danger-bg)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      {!open ? (
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)] xl:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      ) : null}
    </>
  );
}
