"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Contact,
  CreditCard,
  FileText,
  LayoutDashboard,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { Logo, LogoIcon, InfoCard, getDisplayName } from "@/components/dashboard/brand";
import { apiRequest, API_URL } from "@/lib/api";
import { clearSession } from "@/lib/auth-storage";
import { useCurrentUser, clearCurrentUser } from "@/lib/hooks/use-current-user";
import { useCustomersSidebar } from "@/app/dashboard/customers/sidebar-context";

// Customers-scoped sidebar — mirrors the monster's dashboard sidebar pixel-for-pixel
// (Logo, Workspace InfoCards, sign-out / Powered by / Version footer). Open/close
// state lives in CustomersSidebarProvider so CustomersTopBar can host the hamburger.

type CompanyProfile = {
  id: string;
  companyName: string;
  logoUrl: string | null;
  planName: string;
  monthlyDocLimit: number;
  isUnlimited: boolean;
  contactEmail?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
};

type CurrentUsage = {
  billingPeriod: string;
  planName: string;
  monthlyDocLimit: number;
  isUnlimited: boolean;
  documentsUsed: number;
  remainingDocuments: number | null;
  overageDocuments: number;
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
  const { open, setOpen } = useCustomersSidebar();
  const user = useCurrentUser();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [usage, setUsage] = useState<CurrentUsage | null>(null);

  useEffect(() => {
    let alive = true;
    apiRequest<CompanyProfile>("/company-profile/me")
      .then((cp) => {
        if (alive) setCompanyProfile(cp);
      })
      .catch(() => {
        // 401 handled by apiRequest itself; individual users may have no company.
      });
    apiRequest<CurrentUsage>("/billing/current-usage")
      .then((u) => {
        if (alive) setUsage(u);
      })
      .catch(() => {
        // Missing billing data is non-blocking for nav rendering.
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSignOut = useCallback(async () => {
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
  }, [router]);

  const isMaster = user?.role === "MASTER";
  const isIndividualUser =
    user?.role !== "MASTER" && user?.accountType === "INDIVIDUAL";
  const isLoading = !user;

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

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-3 xl:gap-8">
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-hidden">
          {/* Top: Logo + Close button — identical to monster */}
          <div className="relative flex items-start justify-center gap-3">
            <div className="min-w-0 flex-1">{open ? <Logo /> : <LogoIcon />}</div>
            {open ? (
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setOpen(false)}
                className="absolute right-0 top-0 z-30 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#022977] bg-white text-[#022977] shadow-[0_10px_24px_rgba(2,41,119,0.12)] dark:border-[color:var(--border)] dark:bg-[color:var(--bg-elevated)] dark:text-[color:var(--text-secondary)] dark:shadow-[var(--shadow-soft)]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          {/* Nav items */}
          <div className="mt-4 xl:mt-8">
            <div className="flex flex-col gap-2">
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
            </div>
          </div>

          {/* Workspace section — matches monster */}
          <div className="mt-4 xl:mt-8">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
              Workspace
            </div>
            <div className="mt-2 grid gap-2 xl:mt-3 xl:gap-3">
              <InfoCard
                label={isIndividualUser ? "Account" : "Company"}
                title={
                  isLoading
                    ? "Loading..."
                    : isIndividualUser
                      ? [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                        getDisplayName(user?.email ?? "") ||
                        "My Account"
                      : companyProfile?.companyName ?? "NTSsign"
                }
                subtitle={
                  isLoading
                    ? "..."
                    : isIndividualUser
                      ? user?.email ?? "Individual"
                      : [
                          companyProfile?.contactFirstName,
                          companyProfile?.contactLastName,
                        ]
                          .filter(Boolean)
                          .join(" ")
                          .trim() ||
                        companyProfile?.contactEmail ||
                        "Primary contact not defined"
                }
              />
              <InfoCard
                label="Plan"
                title={isLoading ? "Loading..." : usage?.planName ?? "-"}
                subtitle={
                  isLoading
                    ? "..."
                    : usage?.isUnlimited
                      ? "Unlimited documents"
                      : `${usage?.documentsUsed ?? 0} used this month`
                }
                accent
                actionLabel="Upgrade plan"
                onAction={() => router.push("/dashboard?section=billing")}
              />
            </div>
          </div>
        </div>

        {/* Bottom: Sign out + Powered by + Version — matches monster */}
        <div className="grid gap-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-14 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm font-medium text-[color:var(--danger-text)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--danger-bg)]"
          >
            Sign out
          </button>
          <div className="px-3 text-left text-[11px] font-medium tracking-[0.18em] text-[color:var(--text-muted)]">
            Powered by{" "}
            <span className="font-semibold text-[color:var(--text-secondary)]">
              NoaTechSolutions
            </span>
          </div>
          <div className="px-3 text-center text-[11px] font-medium tracking-[0.18em] text-[color:var(--text-muted)]">
            Version{" "}
            <span className="font-semibold text-[color:var(--text-secondary)]">
              1.0.0
            </span>
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  );
}
