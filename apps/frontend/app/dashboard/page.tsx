"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getStoredToken, getStoredUser, type StoredUser } from "../../lib/auth-storage";

export default function DashboardPage() {
  const router = useRouter();
  const user = useStoredUser();

  useEffect(() => {
    const accessToken = getStoredToken();

    if (!accessToken || !user) {
      router.replace("/");
    }
  }, [router, user]);

  function handleSignOut() {
    clearSession();
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl gap-6 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_30px_90px_rgba(13,26,38,0.12)] sm:p-8">
        <div className="flex flex-col gap-4 rounded-[1.75rem] bg-[linear-gradient(135deg,#16344c_0%,#0f2538_100%)] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                NoaSign Workspace
              </span>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Login is working. Dashboard comes next.
              </h1>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
            This placeholder confirms the frontend login flow, local session
            handling, and responsive shell are ready before we move into the
            full dashboard and modules.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="grid gap-4 rounded-[1.75rem] border border-[color:var(--border)] bg-white p-5 sm:p-6">
            <div className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">
                Session
              </span>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">
                Auth bridge is ready.
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="Email" value={user?.email ?? "..."} />
              <InfoCard label="Role" value={user?.role ?? "..."} />
              <InfoCard label="Status" value={user?.status ?? "..."} />
              <InfoCard
                label="Company Profile"
                value={user?.companyProfileId ?? "Not available"}
              />
            </div>
          </section>

          <section className="grid gap-4 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 sm:p-6">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">
              Next block
            </span>
            <ul className="grid gap-3 text-sm leading-7 text-[color:var(--ink-soft)]">
              <li>Billing overview and current usage cards</li>
              <li>Documents table with lifecycle status</li>
              <li>Company profile summary and quick actions</li>
              <li>Protected app shell for future modules</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
        {label}
      </div>
      <div className="mt-2 break-all text-sm font-medium text-[color:var(--ink)]">
        {value}
      </div>
    </div>
  );
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("noasign-auth-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("noasign-auth-change", onStoreChange);
  };
}

function getStoredUserSnapshot(): StoredUser | null {
  return getStoredUser();
}

function getServerSnapshot(): StoredUser | null {
  return null;
}

function useStoredUser() {
  return useSyncExternalStore(subscribe, getStoredUserSnapshot, getServerSnapshot);
}
