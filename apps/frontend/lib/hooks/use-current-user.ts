"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export type CurrentUser = {
  id: string;
  email: string;
  role: string;
  status?: string;
  accountType?: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl?: string | null;
};

// Module-level cache + in-flight dedupe. Multiple components mounting at
// the same time (e.g. CustomersSidebar + CustomersTopBar) share a single
// GET /users/me instead of firing one each. Cleared on sign-out via
// clearCurrentUser() so the next logged-in user doesn't see stale data.
let cache: CurrentUser | null = null;
let inFlight: Promise<CurrentUser> | null = null;

export function clearCurrentUser() {
  cache = null;
  inFlight = null;
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(cache);

  useEffect(() => {
    if (cache) {
      setUser(cache);
      return;
    }

    let alive = true;

    if (!inFlight) {
      inFlight = apiRequest<CurrentUser>("/users/me").finally(() => {
        inFlight = null;
      });
    }

    inFlight
      .then((me) => {
        cache = me;
        if (alive) setUser(me);
      })
      .catch(() => {
        // 401 handled by apiRequest itself.
      });

    return () => {
      alive = false;
    };
  }, []);

  return user;
}
