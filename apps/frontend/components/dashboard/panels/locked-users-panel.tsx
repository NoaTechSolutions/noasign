"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { ModuleLayout } from "@/components/layouts/module-layout";
import { EmptyBlock } from "@/components/dashboard/shared/ui";
import { Button } from "@/components/ui";
import { adminApi, type LockedUser } from "@/lib/admin-api";

// Manual polling — NoaSign doesn't ship React Query. 30s matches KinderCtrl's
// `useLockedUsers` cadence and is light enough for an admin-only panel.
// When the panel unmounts (user navigates to another section), the interval
// is automatically cleared via the useEffect cleanup — polling pauses while
// the panel isn't being viewed.
const POLL_INTERVAL_MS = 30_000;

// Live MM:SS countdown for the "Unlocks in" column. Recomputes once per
// second so the table feels alive without re-fetching. lockedUntil is the
// source of truth — the 30s network refetch catches drift and removes
// expired rows.
function useRemainingSeconds(lockedUntilIso: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(
    0,
    Math.floor((new Date(lockedUntilIso).getTime() - now) / 1000),
  );
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "Expiring…";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function LockedUserRow({
  user,
  onUnlock,
  unlocking,
}: {
  user: LockedUser;
  onUnlock: (id: string) => void;
  unlocking: boolean;
}) {
  const remaining = useRemainingSeconds(user.lockedUntil);
  return (
    <tr className="border-b border-[color:var(--border)] last:border-0">
      <td className="px-4 py-3 text-sm font-medium text-[color:var(--text-primary)]">
        {user.email}
      </td>
      <td className="px-4 py-3 text-sm text-[color:var(--text-secondary)]">
        {user.role}
      </td>
      <td className="px-4 py-3 text-right text-sm text-[color:var(--text-secondary)]">
        {user.failedLoginAttempts}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-[color:var(--text-secondary)]">
        {formatRemaining(remaining)}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="secondary"
          onClick={() => onUnlock(user.id)}
          disabled={unlocking}
          className="px-4 py-1.5 text-xs"
        >
          {unlocking ? "Unlocking…" : "Unlock"}
        </Button>
      </td>
    </tr>
  );
}

export function LockedUsersPanel() {
  const [users, setUsers] = useState<LockedUser[] | null>(null);
  const [error, setError] = useState<string>("");
  const [unlockingId, setUnlockingId] = useState<string>("");

  const fetchUsers = useCallback(async () => {
    try {
      const list = await adminApi.listLockedUsers();
      setUsers(list);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load locked users");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const id = window.setInterval(fetchUsers, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchUsers]);

  const handleUnlock = useCallback(
    async (id: string) => {
      setUnlockingId(id);
      try {
        await adminApi.unlockUser(id);
        await fetchUsers();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unlock failed");
      } finally {
        setUnlockingId("");
      }
    },
    [fetchUsers],
  );

  return (
    <ModuleLayout
      title="Locked Users"
      description="Users currently blocked by automatic lockout after too many failed login attempts. Refreshes every 30 seconds."
      icon={<Lock size={20} className="text-[color:var(--brand-secondary)]" />}
      isLoading={users === null && !error}
    >
      <section className="grid gap-4">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[1.8rem] border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-5 py-4 text-sm text-[color:var(--danger-text)]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {users && users.length === 0 ? (
          <EmptyBlock text="No users currently locked." />
        ) : null}

        {users && users.length > 0 ? (
          <div className="overflow-hidden rounded-[1.8rem] border border-[color:var(--border)] bg-white shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
            <table className="w-full">
              <thead className="border-b border-[color:var(--border)] bg-[color:var(--bg-elevated)]">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
                    Role
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
                    Failed attempts
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
                    Unlocks in
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <LockedUserRow
                    key={u.id}
                    user={u}
                    onUnlock={handleUnlock}
                    unlocking={unlockingId === u.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </ModuleLayout>
  );
}
