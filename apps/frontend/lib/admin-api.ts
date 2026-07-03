import { apiRequest } from "./api";

export type LockedUser = {
  id: string;
  email: string;
  role: "SUPERADMIN" | "USER";
  failedLoginAttempts: number;
  // ISO date string — Prisma's Date becomes string after JSON serialization
  lockedUntil: string;
};

// Form-definition admin client was removed with its UI (NOA — Form Definitions
// UI retired; forms are seeded by script). The backend endpoints remain. This
// keeps only the locked-users client used by the legacy locked-users panel.
export const adminApi = {
  listLockedUsers: () => apiRequest<LockedUser[]>("/admin/users/locked"),

  unlockUser: (id: string) =>
    apiRequest<{ success: true; userId: string }>(
      `/admin/users/${id}/unlock`,
      { method: "POST" },
    ),
};
