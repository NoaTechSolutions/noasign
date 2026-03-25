"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, CheckCircle2, ChevronsUpDown, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ManagedUser = { id: string; companyProfileId: string | null; email: string; role: string; status: string; createdAt: string; updatedAt: string; companyProfile?: { id: string; companyName: string; planName: string } | null };
type RoleFilter = "ALL" | "MASTER" | "USER";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
type CreateFormState = { email: string; password: string; role: "MASTER" | "USER" };
type EditingState = { id: string; email: string; role: "MASTER" | "USER" };

type Props = {
  users: ManagedUser[] | null;
  currentUserId?: string | null;
  isLoading: boolean;
  onCreateUser: (payload: { email: string; password: string; role: string }) => Promise<void>;
  onUpdateUser: (userId: string, payload: { email?: string; role?: string; status?: string }) => Promise<void>;
  onDeactivateUser: (userId: string) => Promise<void>;
  onReactivateUser: (userId: string) => Promise<void>;
};

const roleFilters: RoleFilter[] = ["ALL", "MASTER", "USER"];
const statusFilters: StatusFilter[] = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"];

export function MasterUsersPanel({ users, currentUserId, isLoading, onCreateUser, onUpdateUser, onDeactivateUser, onReactivateUser }: Props) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditingState | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>({ email: "", password: "", role: "USER" });
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [openRoleMenu, setOpenRoleMenu] = useState(false);
  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null);
  const pageSizeMenuRef = useRef<HTMLDivElement | null>(null);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const filteredUsers = useMemo(() => {
    const safeUsers = users ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    return safeUsers.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && user.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return [user.email, user.role, user.status].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [query, roleFilter, statusFilter, users]);

  const totalUsers = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = totalUsers === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalUsers);
  const paginatedUsers = useMemo(
    () => filteredUsers.slice(pageStart, pageEnd),
    [filteredUsers, pageEnd, pageStart],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | PointerEvent | TouchEvent) {
      const target = event.target as Node;
      if (pageSizeMenuOpen && !pageSizeMenuRef.current?.contains(target)) setPageSizeMenuOpen(false);
      if (openRoleMenu && !roleMenuRef.current?.contains(target)) setOpenRoleMenu(false);
      if (openActionMenuFor && !actionMenuRef.current?.contains(target)) setOpenActionMenuFor(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [openActionMenuFor, openRoleMenu, pageSizeMenuOpen]);

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingAction("create");
    try {
      await onCreateUser(createForm);
      setCreateForm({ email: "", password: "", role: "USER" });
      setIsCreateOpen(false);
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setSubmittingAction(`update:${editingUser.id}`);
    try {
      await onUpdateUser(editingUser.id, { email: editingUser.email, role: editingUser.role });
      setEditingUser(null);
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleStatusAction(userId: string, nextAction: "deactivate" | "reactivate") {
    setSubmittingAction(`${nextAction}:${userId}`);
    try {
      if (nextAction === "deactivate") await onDeactivateUser(userId);
      else await onReactivateUser(userId);
      setOpenActionMenuFor(null);
    } finally {
      setSubmittingAction(null);
    }
  }

  const workspaceUsers = users ?? [];
  const totalWorkspaceUsers = workspaceUsers.length;
  const activeUsers = workspaceUsers.filter((user) => user.status === "ACTIVE").length;
  const masterUsers = workspaceUsers.filter((user) => user.role === "MASTER").length;

  return (
    <>
      <section className="grid gap-4">
        <div className="overflow-visible rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-white/10 md:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Access control</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Workspace users</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Manage access, roles and activation state for every user in the workspace.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <StatPill label="Total" value={String(totalWorkspaceUsers)} />
                <StatPill label="Active" value={String(activeUsers)} />
                <StatPill label="Masters" value={String(masterUsers)} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="Search by email, role or status" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white dark:caret-blue-300 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3 md:justify-end lg:grid-cols-[auto_auto]">
                <div ref={roleMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenRoleMenu((current) => !current);
                    }}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <span>Filter</span>
                    <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </button>
                  {openRoleMenu ? (
                    <div className="absolute left-0 top-[calc(100%+0.35rem)] z-20 min-w-56 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
                      <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Role
                      </div>
                      <div className="grid gap-1">
                        {roleFilters.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setRoleFilter(option as RoleFilter);
                              setCurrentPage(1);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                              roleFilter === option
                                ? "bg-blue-600 text-white"
                                : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
                            )}
                          >
                            <span>{option === "ALL" ? "All roles" : option}</span>
                            {roleFilter === option ? (
                              <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">
                                On
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                      <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />
                      <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Status
                      </div>
                      <div className="grid gap-1">
                        {statusFilters.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setStatusFilter(option as StatusFilter);
                              setCurrentPage(1);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                              statusFilter === option
                                ? "bg-blue-600 text-white"
                                : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
                            )}
                          >
                            <span>{option === "ALL" ? "All status" : option}</span>
                            {statusFilter === option ? (
                              <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">
                                On
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <button type="button" onClick={() => { setEditingUser(null); setIsCreateOpen(true); }} className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700">
                  Create user
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-5 md:p-6"><EmptyBlock text="Loading users..." /></div>
          ) : filteredUsers.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:px-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Results</div>
                  <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{`${totalUsers} users`}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div ref={pageSizeMenuRef} className="relative flex items-center gap-2">
                    <label className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:block">Rows</label>
                    <button
                      type="button"
                      onClick={() => setPageSizeMenuOpen((current) => !current)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      <span>{pageSize}</span>
                      <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </button>
                    {pageSizeMenuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-28 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
                        {[10, 20, 30].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setPageSize(size);
                              setCurrentPage(1);
                              setPageSizeMenuOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                              pageSize === size
                                ? "bg-blue-600 text-white"
                                : "text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-white/8",
                            )}
                          >
                            <span>{size}</span>
                            <span className="text-[11px] uppercase tracking-[0.18em] opacity-70">Rows</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_120px_120px_56px] items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 md:grid">
                <div>User</div><div>Company</div><div>Plan</div><div>Role</div><div>Status</div><div className="text-right">Actions</div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-white/10 md:hidden">
                {paginatedUsers.map((user) => {
                  const isSelf = currentUserId === user.id;
                  const isBusy = submittingAction?.endsWith(user.id) ?? false;
                  return (
                    <div key={`${user.id}-mobile`} className="px-4 py-3 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{getUserName(user.email)}</div>
                          <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <InlineBadge tone={statusTone(user.status)}>{user.status}</InlineBadge>
                            <InlineBadge tone="slate">{user.companyProfile?.planName ?? "-"}</InlineBadge>
                            <InlineBadge tone={user.role === "MASTER" ? "blue" : "slate"}>
                              {user.role === "MASTER" ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
                              <span>{user.role}</span>
                            </InlineBadge>
                          </div>
                        </div>
                        <RowActions
                          user={user}
                          isOpen={openActionMenuFor === user.id}
                          isBusy={isBusy}
                          isSelf={isSelf}
                          actionMenuRef={actionMenuRef}
                          onToggle={() => setOpenActionMenuFor((current) => current === user.id ? null : user.id)}
                          onEdit={() => { setEditingUser({ id: user.id, email: user.email, role: user.role === "MASTER" ? "MASTER" : "USER" }); setOpenActionMenuFor(null); }}
                          onDeactivate={() => handleStatusAction(user.id, "deactivate")}
                          onReactivate={() => handleStatusAction(user.id, "reactivate")}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Company:</span>{" "}
                          <span>{user.companyProfile?.companyName ?? "No company"}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Created:</span>{" "}
                          <span>{formatShortDate(user.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden divide-y divide-slate-200 dark:divide-white/10 md:block">
                {paginatedUsers.map((user) => {
                  const isSelf = currentUserId === user.id;
                  const isBusy = submittingAction?.endsWith(user.id) ?? false;
                  return (
                    <div key={user.id} className="px-5 py-4 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_120px_120px_56px] md:items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><UserRound className="h-4.5 w-4.5" /></div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{getUserName(user.email)}</div>
                              <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.companyProfile?.companyName ?? "No company"}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Updated {formatShortDate(user.updatedAt)}</div>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">{user.companyProfile?.planName ?? "-"}</div>
                        <div className="flex items-center"><InlineBadge tone={user.role === "MASTER" ? "blue" : "slate"}>{user.role === "MASTER" ? <ShieldCheck className="h-3.5 w-3.5" /> : null}<span>{user.role}</span></InlineBadge></div>
                        <div className="flex items-center"><InlineBadge tone={statusTone(user.status)}>{user.status}</InlineBadge></div>
                        <div className="flex justify-start lg:justify-end">
                          <RowActions
                            user={user}
                            isOpen={openActionMenuFor === user.id}
                            isBusy={isBusy}
                            isSelf={isSelf}
                            actionMenuRef={actionMenuRef}
                            onToggle={() => setOpenActionMenuFor((current) => current === user.id ? null : user.id)}
                            onEdit={() => { setEditingUser({ id: user.id, email: user.email, role: user.role === "MASTER" ? "MASTER" : "USER" }); setOpenActionMenuFor(null); }}
                            onDeactivate={() => handleStatusAction(user.id, "deactivate")}
                            onReactivate={() => handleStatusAction(user.id, "reactivate")}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <div className="text-slate-500 dark:text-slate-400">
                  Showing <span className="font-semibold text-slate-900 dark:text-white">{totalUsers === 0 ? 0 : pageStart + 1}</span>
                  {" "}-{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">{pageEnd}</span>
                  {" "}of{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">{totalUsers}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safePage === 1}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium transition",
                      safePage === 1
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                    )}
                  >
                    Previous
                  </button>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                    {safePage} / {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safePage === totalPages}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium transition",
                      safePage === totalPages
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                    )}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-5 md:p-6"><EmptyBlock text="No users match the current filters." /></div>
          )}
        </div>
      </section>

      {isCreateOpen ? (
        <UserModal title="Create user" submitLabel={submittingAction === "create" ? "Creating..." : "Create user"} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateSubmit}>
          <FieldShell label="Email"><input type="email" required value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} placeholder="user@company.com" className={modalInputClass} /></FieldShell>
          <FieldShell label="Temporary password"><input type="text" required minLength={6} value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} placeholder="At least 6 characters" className={modalInputClass} /></FieldShell>
          <FieldShell label="Role"><select value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as "MASTER" | "USER" }))} className={modalInputClass}><option value="USER">USER</option><option value="MASTER">MASTER</option></select></FieldShell>
        </UserModal>
      ) : null}

      {editingUser ? (
        <UserModal title="Edit user" submitLabel={submittingAction === `update:${editingUser.id}` ? "Saving..." : "Save changes"} onClose={() => setEditingUser(null)} onSubmit={handleEditSubmit}>
          <FieldShell label="Email"><input type="email" required value={editingUser.email} onChange={(event) => setEditingUser((current) => current ? { ...current, email: event.target.value } : current)} className={modalInputClass} /></FieldShell>
          <FieldShell label="Role"><select value={editingUser.role} onChange={(event) => setEditingUser((current) => current ? { ...current, role: event.target.value as "MASTER" | "USER" } : current)} className={modalInputClass}><option value="USER">USER</option><option value="MASTER">MASTER</option></select></FieldShell>
        </UserModal>
      ) : null}
    </>
  );
}

function DropdownFilter({ menuRef, open, label, options, selected, getLabel, onToggle, onSelect }: { menuRef: React.RefObject<HTMLDivElement | null>; open: boolean; label: string; options: readonly string[]; selected: string; getLabel: (option: string) => string; onToggle: () => void; onSelect: (option: string) => void }) {
  return (
    <div ref={menuRef} className="relative">
      <button type="button" onClick={onToggle} className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/5">
        <span>{label}</span>
        <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-20 min-w-40 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
          {options.map((option) => (
            <button key={option} type="button" onClick={() => onSelect(option)} className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition", selected === option ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8")}>
              <span>{getLabel(option)}</span>
              {selected === option ? <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">On</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RowActions({ user, isOpen, isBusy, isSelf, actionMenuRef, onToggle, onEdit, onDeactivate, onReactivate }: { user: ManagedUser; isOpen: boolean; isBusy: boolean; isSelf: boolean; actionMenuRef: React.RefObject<HTMLDivElement | null>; onToggle: () => void; onEdit: () => void; onDeactivate: () => void; onReactivate: () => void }) {
  return (
    <div ref={isOpen ? actionMenuRef : undefined} className="relative">
      <button type="button" onClick={onToggle} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-20 min-w-44 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
          <button type="button" disabled={isSelf} onClick={onEdit} className={cn(rowActionClass, isSelf ? "cursor-not-allowed opacity-60" : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8")}><Pencil className="h-4 w-4" /><span>{isSelf ? "Current user" : "Edit user"}</span></button>
          {user.status === "ACTIVE" ? (
            <button type="button" disabled={isBusy || isSelf} onClick={onDeactivate} className={cn(rowActionClass, isBusy || isSelf ? "cursor-not-allowed opacity-60" : "text-[color:var(--danger-text)] hover:bg-[color:var(--danger-bg)]")}><Ban className="h-4 w-4" /><span>{isSelf ? "Protected" : isBusy ? "Working..." : "Deactivate"}</span></button>
          ) : (
            <button type="button" disabled={isBusy} onClick={onReactivate} className={cn(rowActionClass, isBusy ? "cursor-not-allowed opacity-60" : "text-[color:var(--success-text)] hover:bg-[color:var(--success-bg)]")}><CheckCircle2 className="h-4 w-4" /><span>{isBusy ? "Working..." : "Reactivate"}</span></button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function UserModal({ title, submitLabel, onClose, onSubmit, children }: { title: string; submitLabel: string; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--modal-overlay)] p-4">
      <div className="w-full max-w-xl rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(10,18,32,0.18)] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div><div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">User management</div><div className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{title}</div></div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="grid gap-4 p-5 md:p-6">
          {children}
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button>
            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</span>{children}</label>;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-white/10 dark:bg-white/[0.04]"><div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{value}</div></div>;
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">{text}</div>;
}

function InlineBadge({ tone, children }: { tone: "slate" | "blue" | "green" | "rose" | "amber"; children: React.ReactNode }) {
  const tones = {
    slate: "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
    blue: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
  };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]", tones[tone])}>{children}</span>;
}

function statusTone(status: string): "green" | "rose" | "amber" | "slate" {
  if (status === "ACTIVE") return "green";
  if (status === "INACTIVE") return "rose";
  if (status === "SUSPENDED") return "amber";
  return "slate";
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function getUserName(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return email;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

const rowActionClass = "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition";
const modalInputClass = "h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:text-slate-900 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:ring-blue-500/20";
