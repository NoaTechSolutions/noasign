"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Menu, UserRound, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";
import { clearSession } from "@/lib/auth-storage";
import { useCurrentUser, clearCurrentUser } from "@/lib/hooks/use-current-user";
import { useCustomersSidebar } from "@/app/dashboard/customers/sidebar-context";

type Breadcrumb = { label: string; href?: string };

export function CustomersTopBar({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) {
  const router = useRouter();
  const user = useCurrentUser();
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useCustomersSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
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
    clearCurrentUser();
    router.replace("/login");
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Account";

  const initials = (
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .map((n) => n![0])
      .join("") ||
    user?.email?.slice(0, 2) ||
    "?"
  ).toUpperCase();

  return (
    <div className="-mx-4 flex min-h-12 items-center justify-between gap-3 border-b border-[color:var(--topbar-border)] px-4 py-2 md:-mx-6 md:px-6 md:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {!sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--bg-surface)] hover:text-[color:var(--text-primary)]"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        <nav className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[color:var(--text-muted)]">
          {breadcrumbs.map((crumb, i) => (
            <div key={`${crumb.label}-${i}`} className="flex items-center gap-2">
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="truncate transition hover:text-[color:var(--text-primary)]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-[color:var(--text-primary)]">
                  {crumb.label}
                </span>
              )}
              {i < breadcrumbs.length - 1 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
              ) : null}
            </div>
          ))}
        </nav>
      </div>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((c) => !c)}
          className="inline-flex items-center gap-3 rounded-2xl px-1 py-1 transition hover:bg-[color:var(--bg-surface)]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white text-sm font-semibold text-blue-700 shadow-[var(--shadow-soft)] dark:border-white/10 dark:bg-slate-950 dark:text-blue-200">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="hidden text-left sm:block">
            <div className="text-sm font-semibold text-[color:var(--text-primary)]">
              {displayName}
            </div>
            {user?.email ? (
              <div className="text-xs text-[color:var(--text-muted)]">
                {user.email}
              </div>
            ) : null}
          </div>
          <ChevronRight
            className={cn(
              "h-4 w-4 rotate-90 text-[color:var(--text-muted)] transition-transform",
              menuOpen && "rotate-180",
            )}
          />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-72 rounded-[1.4rem] border border-[color:var(--menu-border)] bg-[color:var(--menu-bg)] p-3 shadow-[var(--shadow-dropdown)]">
            <div className="rounded-[1.1rem] bg-[color:var(--bg-surface)] p-3">
              <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                {displayName}
              </div>
              {user?.email ? (
                <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
                  {user.email}
                </div>
              ) : null}
              <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
                {(user?.role ?? "Member") + " | " + (user?.status ?? "ACTIVE")}
              </div>
            </div>
            <div className="mt-3 grid gap-1">
              <MenuItem
                label="Profile"
                icon={<UserRound className="h-4 w-4" />}
                href="/dashboard?section=profile"
                onClick={() => setMenuOpen(false)}
              />
              <MenuItem
                label="Billing history"
                icon={<WalletCards className="h-4 w-4" />}
                href="/dashboard?section=billing"
                onClick={() => setMenuOpen(false)}
              />
            </div>
            <div className="mt-3 border-t border-[color:var(--divider)] pt-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-[color:var(--danger-text)] transition hover:bg-[color:var(--danger-bg)]"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuItem({
  label,
  icon,
  href,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-[color:var(--menu-text)] transition hover:bg-[color:var(--menu-hover)]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)]">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
