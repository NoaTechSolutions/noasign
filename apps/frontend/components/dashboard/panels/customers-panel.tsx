"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronsUpDown,
  Download,
  Eye,
  FilePlus,
  FileText,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleLayout } from "@/components/layouts";
import { formatDate, formatUsPhone, toTitleCase } from "@/lib/format";
import { CustomerTypeBadge, EmptyBlock, StatusBadge } from "@/components/dashboard/shared/ui";
import {
  getDisplayEmail,
  getDisplayPhone,
  getOwnerLabel,
  type Customer,
  type CustomerBusiness,
  type CustomerBusinessFormValues,
  type CustomerFormValues,
} from "@/components/dashboard/shared/customer-types";

// ─── Narrowed types — full definitions live in dashboard-sidebar-demo.tsx ──

type SortDirection = "asc" | "desc";

// Narrowed Doc shape — only the fields the customer drawer reads from the
// documents list. Full Doc type stays in the monolith with the documents
// pipeline; do not widen this without need.
type CustomerDoc = {
  id: string;
  documentNumber: string;
  status: string;
  contractDate: string;
  createdAt: string;
  customerId?: string | null;
  documentType?: { name: string; code: string } | null;
  formDefinition?: { name: string; key: string } | null;
  user?: { email: string; role?: string } | null;
};

// Narrowed tenant-user shape — matches `Props["users"]` in the monolith.
type TenantUser = {
  id: string;
  companyProfileId: string | null;
  email: string;
  role: string;
  status: string;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerSortKey = "name" | "createdAt";

export function CustomersPanel(props: {
  customers: Customer[] | null;
  customerDetail: Customer | null;
  selectedCustomerId: string | null;
  customerActionId: string | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSelectCustomer: (id: string) => void;
  onCloseCustomerDetail: () => void;
  onDeleteCustomer: (id: string) => Promise<void>;
  onCreateCustomer: (values: CustomerFormValues) => Promise<void>;
  onUpdateCustomer: (id: string, values: CustomerFormValues) => Promise<void>;
  documents: CustomerDoc[] | null;
  onOpenDocumentView: (documentId: string) => void;
  onPreviewFinalPdf: (documentId: string) => Promise<string>;
  onDownloadFinalPdf: (documentId: string) => Promise<void>;
  onStartCustomerDraft: (customerId: string) => void;
  // Master sees an Owner column + filter dropdown. Tenant users hidden it.
  currentUserRole: string | null;
  currentUserId: string | null;
  tenantUsers: TenantUser[] | null;
}) {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<CustomerSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Owner filter — master only. "" = all customers in tenant. Otherwise the
  // value is a User.id that the master picked from the dropdown ('me' is
  // resolved to currentUserId here so the simple equality filter below
  // doesn't need to know about it).
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [ownerFilterMenuOpen, setOwnerFilterMenuOpen] = useState(false);
  const pageSizeMenuRef = useRef<HTMLDivElement | null>(null);
  const ownerFilterMenuRef = useRef<HTMLDivElement | null>(null);

  const isMaster = props.currentUserRole === "MASTER";
  // Filter the user dropdown to active users in the same tenant only — master
  // shouldn't be able to assign to deactivated accounts.
  const sameTenantUsers = useMemo(() => {
    return (props.tenantUsers ?? []).filter((u) => u.status === "ACTIVE");
  }, [props.tenantUsers]);

  // Click-outside for the owner filter menu (mirrors the Documents
  // filter-menu pattern at line ~1696 above).
  useEffect(() => {
    if (!ownerFilterMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (
        !ownerFilterMenuRef.current?.contains(event.target as Node)
      ) {
        setOwnerFilterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [ownerFilterMenuOpen]);

  // Resolve the current filter to a display label for the column-header
  // pill ("All", "Me", or the user's name/email).
  const ownerFilterLabel = useMemo(() => {
    if (!ownerFilter) return "All";
    if (ownerFilter === props.currentUserId) return "Me";
    const u = sameTenantUsers.find((x) => x.id === ownerFilter);
    if (!u) return "—";
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    return name || u.email;
  }, [ownerFilter, props.currentUserId, sameTenantUsers]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const filtered = useMemo(() => {
    const q = props.searchQuery.trim().toLowerCase();
    return (props.customers ?? []).filter((c) => {
      // Owner filter is master-only and applies BEFORE the search filter.
      // Non-master users never see anyone else's customers anyway (the
      // backend already pinned their list scope), so this branch is a no-op
      // for them.
      if (isMaster && ownerFilter && c.userId !== ownerFilter) return false;
      if (!q) return true;
      const hay = [
        c.fullName,
        c.email,
        c.phone,
        // Include business fields so search works for BUSINESS customers
        // whose public email/phone live in the nested business row.
        c.business?.businessName,
        c.business?.businessEmail,
        c.business?.businessPhone,
        c.business?.primaryContactEmail,
        c.business?.primaryContactPhone,
        c.business?.primaryContactName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [props.customers, props.searchQuery, isMaster, ownerFilter]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    items.sort((a, b) => {
      let r = 0;
      if (sortKey === "name") {
        r = a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base", numeric: true });
      } else {
        r = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDirection === "asc" ? r : -r;
    });
    return items;
  }, [filtered, sortKey, sortDirection]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const paginated = sorted.slice(pageStart, pageEnd);

  function toggleSort(next: CustomerSortKey) {
    setCurrentPage(1);
    if (sortKey === next) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDirection(next === "createdAt" ? "desc" : "asc");
  }

  useEffect(() => {
    if (!pageSizeMenuOpen) return;
    function onDown(e: MouseEvent) {
      if (!pageSizeMenuRef.current?.contains(e.target as Node)) {
        setPageSizeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pageSizeMenuOpen]);

  return (
    <ModuleLayout
      title="Clients"
      description="Manage your client book"
      icon={<UserRound className="h-5 w-5" />}
    >
      <section className="grid gap-4">
      {/* Card 1: Header + Search + New */}
      <div className="rounded-[1.9rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">Clients workspace</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              Manage the people you send documents to. Reuse their contact data on future drafts.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              value={props.searchQuery}
              onChange={(e) => { setCurrentPage(1); props.onSearchQueryChange(e.target.value); }}
              placeholder="Search by name, email or phone"
              className="h-12 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] pl-11 pr-4 text-sm text-[color:var(--text-primary)] caret-[color:var(--brand-accent)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-accent)] focus:bg-white focus:text-[color:var(--text-primary)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:caret-[color:var(--brand-accent)] dark:placeholder:text-[color:var(--text-muted)] dark:focus:border-[color:var(--brand-accent)] dark:focus:bg-[color:var(--bg-elevated)] dark:focus:text-[color:var(--text-primary)]"
            />
          </div>
          <button
            type="button"
            onClick={() => setTypeSelectorOpen(true)}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[color:var(--button-primary)] px-4 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)] md:w-auto"
          >
            New client
          </button>
        </div>
      </div>

      {/* Card 2 (table) — full width. Selection opens CustomerViewDrawer modal. */}
      <div className="overflow-visible rounded-[1.8rem] border border-[color:var(--border)] bg-white shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4 dark:border-white/10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Results</div>
            <div className="mt-1 text-lg font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              {props.isLoading ? "Loading..." : `${total} ${total === 1 ? "client" : "clients"}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div ref={pageSizeMenuRef} className="relative flex items-center gap-2">
              <label className="hidden text-xs font-medium text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)] md:block">Rows</label>
              <button
                type="button"
                onClick={() => setPageSizeMenuOpen((c) => !c)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-3 text-sm font-medium text-[color:var(--text-secondary)] outline-none transition hover:border-[color:var(--border-strong)] hover:bg-white focus:border-[color:var(--brand-accent)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
              >
                <span>{pageSize}</span>
                <ChevronsUpDown className="h-4 w-4 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]" />
              </button>
              {pageSizeMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-28 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)] dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
                  {[10, 20, 30].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setPageSize(size); setCurrentPage(1); setPageSizeMenuOpen(false); }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                        pageSize === size ? "bg-[color:var(--button-primary)] text-white" : "text-[color:var(--text-secondary)] hover:bg-white dark:text-[color:var(--text-primary)] dark:hover:bg-white/8",
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

        {props.isLoading ? (
          <div className="p-5"><EmptyBlock text="Loading clients..." /></div>
        ) : total === 0 ? (
          <div className="p-5"><EmptyBlock text={props.searchQuery ? `No clients matching "${props.searchQuery}".` : "No clients yet. Click 'New client' to start."} /></div>
        ) : (
          <>
            {/* Desktop header. Master view drops Phone (signal-light column
                that's visible inside the view drawer anyway) and gains an
                Owner column. */}
            <div
              className={cn(
                "hidden items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--bg-page-subtle)]/80 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03] md:grid",
                isMaster
                  ? "grid-cols-[minmax(0,1.5fr)_80px_100px_120px_minmax(0,1fr)_64px]"
                  : "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_80px_100px_120px_64px]",
              )}
            >
              <CustomerSortHeader label="Name" columnKey="name" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
              {!isMaster ? (
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Phone</div>
              ) : null}
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Docs</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Type</div>
              <CustomerSortHeader label="Created" columnKey="createdAt" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
              {isMaster ? (
                <div ref={ownerFilterMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setOwnerFilterMenuOpen((c) => !c)}
                    className="inline-flex items-center gap-2 rounded-xl border border-transparent px-1 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition hover:border-[color:var(--border)] hover:bg-[color:var(--bg-surface)] hover:text-[color:var(--text-secondary)] dark:text-[color:var(--text-muted)] dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-[color:var(--text-primary)]"
                  >
                    <span>Owner</span>
                    <span className="rounded-full bg-[color:var(--bg-surface-strong)] px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-[color:var(--text-secondary)] dark:bg-white/10 dark:text-[color:var(--text-secondary)]">
                      {ownerFilterLabel}
                    </span>
                    <ChevronsUpDown className="h-3 w-3 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]" />
                  </button>
                  {ownerFilterMenuOpen ? (
                    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 max-h-72 min-w-56 overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)] dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage(1);
                          setOwnerFilter("");
                          setOwnerFilterMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                          ownerFilter === ""
                            ? "bg-[color:var(--button-primary)] text-white"
                            : "text-[color:var(--text-secondary)] hover:bg-white/80 dark:text-[color:var(--text-primary)] dark:hover:bg-white/8",
                        )}
                      >
                        <span>All clients</span>
                        {ownerFilter === "" ? (
                          <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">On</span>
                        ) : null}
                      </button>
                      {props.currentUserId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(1);
                            setOwnerFilter(props.currentUserId ?? "");
                            setOwnerFilterMenuOpen(false);
                          }}
                          className={cn(
                            "mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                            ownerFilter === props.currentUserId
                              ? "bg-[color:var(--button-primary)] text-white"
                              : "text-[color:var(--text-secondary)] hover:bg-white/80 dark:text-[color:var(--text-primary)] dark:hover:bg-white/8",
                          )}
                        >
                          <span>My clients</span>
                          {ownerFilter === props.currentUserId ? (
                            <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">On</span>
                          ) : null}
                        </button>
                      ) : null}
                      {sameTenantUsers.length > 0 ? (
                        <div className="my-1 border-t border-[color:var(--border)] dark:border-white/10" />
                      ) : null}
                      {sameTenantUsers
                        .filter((u) => u.id !== props.currentUserId)
                        .map((u) => {
                          const fullName = [u.firstName, u.lastName]
                            .filter(Boolean)
                            .join(" ")
                            .trim();
                          const label = fullName || u.email;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setCurrentPage(1);
                                setOwnerFilter(u.id);
                                setOwnerFilterMenuOpen(false);
                              }}
                              className={cn(
                                "mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                                ownerFilter === u.id
                                  ? "bg-[color:var(--button-primary)] text-white"
                                  : "text-[color:var(--text-secondary)] hover:bg-white/80 dark:text-[color:var(--text-primary)] dark:hover:bg-white/8",
                              )}
                            >
                              <span className="truncate">{label}</span>
                              {ownerFilter === u.id ? (
                                <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">On</span>
                              ) : null}
                            </button>
                          );
                        })}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="text-right">Actions</div>
            </div>

            {/* Mobile rows */}
            <div className="divide-y divide-[color:var(--divider)] dark:divide-white/10 md:hidden">
              {paginated.map((c) => (
                <div key={`${c.id}-mobile`} className={cn("px-4 py-3 transition hover:bg-[color:var(--bg-page-subtle)]/80 dark:hover:bg-white/[0.03]", props.selectedCustomerId === c.id && "bg-[color:var(--card-selected-bg)] dark:bg-[color:var(--card-selected-bg)]")}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <button type="button" onClick={() => props.onSelectCustomer(c.id)} className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{c.fullName}</div>
                        <CustomerTypeBadge type={c.customerType} />
                      </div>
                      {getDisplayEmail(c) ? <div className="mt-0.5 truncate text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">{getDisplayEmail(c)}</div> : null}
                      {getDisplayPhone(c) ? <div className="mt-0.5 truncate text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">{formatUsPhone(getDisplayPhone(c) ?? "")}</div> : null}
                      <div className="mt-1 text-[11px] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">{formatDate(c.createdAt)} • {c._count?.documents ?? 0} docs</div>
                    </button>
                    <div className="flex justify-end">
                      <CustomerListActions
                        deleting={props.customerActionId === c.id}
                        onView={() => props.onSelectCustomer(c.id)}
                        onEdit={() => setEditingCustomer(c)}
                        onCreateDocument={() => props.onStartCustomerDraft(c.id)}
                        onDelete={() => setConfirmDelete(c)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop rows */}
            <div className="hidden divide-y divide-[color:var(--divider)] dark:divide-white/10 md:block">
              {paginated.map((c) => (
                <div
                  key={c.id}
                  className={cn("px-4 py-4 transition hover:bg-[color:var(--bg-page-subtle)]/80 dark:hover:bg-white/[0.03]", props.selectedCustomerId === c.id && "bg-[color:var(--card-selected-bg)] dark:bg-[color:var(--card-selected-bg)]")}
                >
                  <div
                    className={cn(
                      "grid gap-3 md:items-center",
                      isMaster
                        ? "md:grid-cols-[minmax(0,1.5fr)_80px_100px_120px_minmax(0,1fr)_64px]"
                        : "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_80px_100px_120px_64px]",
                    )}
                  >
                    <button type="button" onClick={() => props.onSelectCustomer(c.id)} className="min-w-0 text-left">
                      <div className="truncate text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{c.fullName}</div>
                      {getDisplayEmail(c) ? (
                        <div className="mt-0.5 truncate text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">{getDisplayEmail(c)}</div>
                      ) : null}
                    </button>
                    {!isMaster ? (
                      <div className="min-w-0 truncate text-sm font-medium text-[color:var(--text-secondary)] dark:text-[color:var(--text-primary)]">
                        {getDisplayPhone(c) ? formatUsPhone(getDisplayPhone(c) ?? "") : <span className="text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">—</span>}
                      </div>
                    ) : null}
                    <div className="text-sm text-[color:var(--text-secondary)] dark:text-[color:var(--text-secondary)]">{c._count?.documents ?? 0}</div>
                    <div>
                      <CustomerTypeBadge type={c.customerType} />
                    </div>
                    <div className="text-sm text-[color:var(--text-secondary)] dark:text-[color:var(--text-secondary)]">{formatDate(c.createdAt)}</div>
                    {isMaster ? (
                      <div className="min-w-0 truncate text-sm text-[color:var(--text-secondary)] dark:text-[color:var(--text-secondary)]">
                        {getOwnerLabel(c.user)}
                      </div>
                    ) : null}
                    <div className="flex justify-start lg:justify-end">
                      <CustomerListActions
                        deleting={props.customerActionId === c.id}
                        onView={() => props.onSelectCustomer(c.id)}
                        onEdit={() => setEditingCustomer(c)}
                        onCreateDocument={() => props.onStartCustomerDraft(c.id)}
                        onDelete={() => setConfirmDelete(c)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-[color:var(--border)] px-5 py-4 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                Showing <span className="font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{total === 0 ? 0 : pageStart + 1}</span>
                {" "}-{" "}<span className="font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{pageEnd}</span>
                {" "}of{" "}<span className="font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1 || props.isLoading}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    safePage === 1
                      ? "cursor-not-allowed border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-muted)] dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-muted)]"
                      : "border-[color:var(--border)] bg-white text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10",
                  )}
                >
                  Previous
                </button>
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-3 py-2 text-sm font-semibold text-[color:var(--text-secondary)] dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-primary)]">{safePage} / {totalPages}</div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages || props.isLoading}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    safePage === totalPages
                      ? "cursor-not-allowed border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-muted)] dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-muted)]"
                      : "border-[color:var(--border)] bg-white text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10",
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {props.selectedCustomerId ? (
        <CustomerViewDrawer
          key={props.customerDetail?.id ?? props.selectedCustomerId}
          customer={props.customerDetail}
          isLoading={props.isDetailLoading}
          documents={props.documents}
          isMaster={isMaster}
          onClose={props.onCloseCustomerDetail}
          onEdit={() => {
            if (props.customerDetail) {
              const target = props.customerDetail;
              props.onCloseCustomerDetail();
              setEditingCustomer(target);
            }
          }}
          onOpenDocumentView={props.onOpenDocumentView}
          onPreviewFinalPdf={props.onPreviewFinalPdf}
          onDownloadFinalPdf={props.onDownloadFinalPdf}
          onCreateDocument={() => {
            if (props.customerDetail) {
              props.onStartCustomerDraft(props.customerDetail.id);
            }
          }}
        />
      ) : null}

      {typeSelectorOpen ? (
        <CustomerTypeSelectorDialog
          onCancel={() => setTypeSelectorOpen(false)}
          onPick={(type) => {
            setCreateType(type);
            setTypeSelectorOpen(false);
            setCreateOpen(true);
          }}
        />
      ) : null}

      {createOpen ? (
        <CustomerFormDrawer
          mode="create"
          customer={null}
          initialType={createType}
          isMaster={isMaster}
          tenantUsers={props.tenantUsers}
          currentUserId={props.currentUserId}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            await props.onCreateCustomer(values);
            setSuccessMessage("Client saved successfully");
          }}
        />
      ) : null}

      {editingCustomer ? (
        <CustomerFormDrawer
          mode="edit"
          customer={editingCustomer}
          isMaster={isMaster}
          tenantUsers={props.tenantUsers}
          currentUserId={props.currentUserId}
          onClose={() => setEditingCustomer(null)}
          onSubmit={async (values) => {
            await props.onUpdateCustomer(editingCustomer.id, values);
            setSuccessMessage("Client saved successfully");
          }}
        />
      ) : null}

      {successMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-2xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm font-medium text-[color:var(--success-text)] shadow-[0_18px_40px_rgba(16,185,129,0.18)] dark:border-[color:var(--success-border)] dark:bg-[color:var(--success-bg)] dark:text-[color:var(--success-text)]"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[color:var(--success)] dark:text-[color:var(--success-text)]" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {confirmDelete ? (
        <CustomerDeleteDialog
          customer={confirmDelete}
          isDeleting={props.customerActionId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            await props.onDeleteCustomer(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      ) : null}
      </section>
    </ModuleLayout>
  );
}

function CustomerSortHeader({ label, columnKey, sortKey, sortDirection, onToggleSort }: {
  label: string;
  columnKey: CustomerSortKey;
  sortKey: CustomerSortKey;
  sortDirection: SortDirection;
  onToggleSort: (key: CustomerSortKey) => void;
}) {
  const isActive = sortKey === columnKey;
  const Icon = !isActive ? ArrowDownUp : sortDirection === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onToggleSort(columnKey)}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition",
        isActive ? "text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]" : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] dark:text-[color:var(--text-muted)] dark:hover:text-[color:var(--text-primary)]",
      )}
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function CustomerListActions({
  deleting,
  onView,
  onEdit,
  onCreateDocument,
  onDelete,
}: {
  deleting: boolean;
  onView: () => void;
  onEdit: () => void;
  onCreateDocument: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setOpenUpward(window.innerHeight - rect.bottom < 180);
          }
          setOpen((c) => !c);
        }}
        disabled={deleting}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)] transition hover:bg-[color:var(--button-neutral-hover)] hover:text-[color:var(--text-primary)] disabled:opacity-50"
        aria-label="Client actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          className={cn(
            "absolute right-0 z-20 min-w-44 rounded-2xl border border-[color:var(--menu-border)] bg-[color:var(--menu-bg)] p-2 shadow-[var(--shadow-dropdown)]",
            openUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { onView(); setOpen(false); }}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--menu-text)] transition hover:bg-[color:var(--menu-hover)]"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => { onEdit(); setOpen(false); }}
            className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--brand-accent-strong)] transition hover:bg-[color:var(--badge-primary-bg)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => { onCreateDocument(); setOpen(false); }}
            className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--menu-text)] transition hover:bg-[color:var(--menu-hover)]"
          >
            Create Document
          </button>
          <button
            type="button"
            onClick={() => { onDelete(); setOpen(false); }}
            className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--danger-text)] transition hover:bg-[color:var(--danger-bg)]"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CustomerDeleteDialog({ customer, isDeleting, onCancel, onConfirm }: {
  customer: Customer;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
      <div className="w-full max-w-md rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-dropdown)]">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Delete client?</h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          This will permanently remove <strong>{customer.fullName}</strong>. Any existing documents
          linked to this client keep their snapshot — only the relation is cleared.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="inline-flex h-11 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)] disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-11 items-center rounded-2xl bg-[color:var(--button-danger)] px-5 text-sm font-medium text-white transition hover:bg-[color:var(--button-danger-hover)] disabled:opacity-70"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignToPicker({
  value,
  onChange,
  tenantUsers,
  currentUserId,
}: {
  value: string;
  onChange: (next: string) => void;
  tenantUsers: TenantUser[] | null;
  currentUserId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const activeUsers = useMemo(
    () => (tenantUsers ?? []).filter((u) => u.status === "ACTIVE"),
    [tenantUsers],
  );

  const label = useMemo(() => {
    if (!value) return "Me";
    const u = activeUsers.find((x) => x.id === value);
    if (!u) return "—";
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    return name || u.email;
  }, [value, activeUsers]);

  return (
    <div ref={ref} className="relative mb-4">
      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
        Assign to
      </label>
      <button
        type="button"
        onClick={() => setOpen((c) => !c)}
        className="mt-1.5 inline-flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-4 text-sm font-medium text-[color:var(--text-secondary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/5"
      >
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="h-4 w-4 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)] dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
              value === ""
                ? "bg-[color:var(--button-primary)] text-white"
                : "text-[color:var(--text-secondary)] hover:bg-white/80 dark:text-[color:var(--text-primary)] dark:hover:bg-white/8",
            )}
          >
            <span>Me {currentUserId ? "(current user)" : ""}</span>
            {value === "" ? (
              <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">On</span>
            ) : null}
          </button>
          {activeUsers
            .filter((u) => u.id !== currentUserId)
            .map((u) => {
              const fullName = [u.firstName, u.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
              const itemLabel = fullName ? `${fullName} (${u.email})` : u.email;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onChange(u.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                    value === u.id
                      ? "bg-[color:var(--button-primary)] text-white"
                      : "text-[color:var(--text-secondary)] hover:bg-white/80 dark:text-[color:var(--text-primary)] dark:hover:bg-white/8",
                  )}
                >
                  <span className="truncate">{itemLabel}</span>
                  {value === u.id ? (
                    <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">On</span>
                  ) : null}
                </button>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}

function CustomerTypeSelectorDialog({
  onCancel,
  onPick,
}: {
  onCancel: () => void;
  onPick: (type: "PERSONAL" | "BUSINESS") => void;
}) {
  // Lock body scroll while open. Click on the backdrop does NOT close —
  // closing requires the X button or an explicit action.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur p-4"
    >
      <div className="w-full max-w-md rounded-[1.8rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]">
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
          New client
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)] dark:text-[color:var(--text-secondary)]">
          What kind of client would you like to add?
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onPick("PERSONAL")}
            className="flex flex-col items-start gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-accent)] hover:bg-[color:var(--badge-primary-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-accent)] dark:hover:bg-[color:var(--brand-accent-soft)]"
          >
            <UserRound className="h-5 w-5 text-[color:var(--brand-accent-strong)] dark:text-[color:var(--brand-accent)]" />
            <div className="mt-1 text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              Personal
            </div>
            <div className="text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              An individual person
            </div>
          </button>
          <button
            type="button"
            onClick={() => onPick("BUSINESS")}
            className="flex flex-col items-start gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-highlight)] hover:bg-[color:var(--warning-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-highlight)] dark:hover:bg-[color:var(--warning-bg)]"
          >
            <Building2 className="h-5 w-5 text-[color:var(--warning-text)] dark:text-[color:var(--warning-text)]" />
            <div className="mt-1 text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              Business
            </div>
            <div className="text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              A company with contact info
            </div>
          </button>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-2xl border border-[color:var(--border)] bg-white px-5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}



function CustomerField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "textarea";
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const base = cn(
    "w-full rounded-2xl border bg-[color:var(--bg-surface)] px-4 text-sm text-[color:var(--text-primary)] caret-[color:var(--brand-accent)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:bg-[color:var(--bg-elevated)]",
    error
      ? "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]"
      : "border-[color:var(--border)] focus:border-[color:var(--brand-accent)]",
    disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
  );
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
        {label}
      </span>
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className={cn(base, "min-h-[100px] py-3")}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn(base, "h-12")}
        />
      )}
      {error ? (
        <span className="text-xs text-[color:var(--danger-text)] dark:text-[color:var(--danger-text)]">{error}</span>
      ) : null}
    </label>
  );
}

type ViewTabKey = "info" | "company" | "contact" | "documents";

function CustomerViewDrawer({
  customer,
  isLoading,
  documents,
  isMaster,
  onClose,
  onEdit,
  onCreateDocument,
  onOpenDocumentView,
  onPreviewFinalPdf,
  onDownloadFinalPdf,
}: {
  customer: Customer | null;
  isLoading: boolean;
  documents: CustomerDoc[] | null;
  isMaster: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCreateDocument?: () => void;
  onOpenDocumentView: (documentId: string) => void;
  onPreviewFinalPdf: (documentId: string) => Promise<string>;
  onDownloadFinalPdf: (documentId: string) => Promise<void>;
}) {
  const isBusiness = customer?.customerType === "BUSINESS";
  const [activeTab, setActiveTab] = useState<ViewTabKey>(
    isBusiness ? "company" : "info",
  );

  const tabs = useMemo<{ key: ViewTabKey; label: string }[]>(() => {
    if (isBusiness) {
      return [
        { key: "company", label: "Company" },
        { key: "contact", label: "Primary Contact" },
        { key: "documents", label: "Documents" },
      ];
    }
    return [
      { key: "info", label: "Client Info" },
      { key: "documents", label: "Documents" },
    ];
  }, [isBusiness]);

  // Customer arrives async (null → loaded), so the initial useState runs when
  // customer is still null (isBusiness=false, activeTab="info"). Once the
  // BUSINESS customer resolves, the "info" tab is no longer in the list — snap
  // activeTab back to the first valid tab for this customer type.
  useEffect(() => {
    const validKeys: ViewTabKey[] = isBusiness
      ? ["company", "contact", "documents"]
      : ["info", "documents"];
    if (!validKeys.includes(activeTab)) {
      setActiveTab(isBusiness ? "company" : "info");
    }
  }, [isBusiness, activeTab]);

  const b = customer?.business;
  const phoneDisplay = customer
    ? getDisplayPhone(customer)
      ? formatUsPhone(getDisplayPhone(customer) ?? "")
      : ""
    : "";
  const emailDisplay = customer ? getDisplayEmail(customer) ?? "" : "";

  const customerDocuments = useMemo(() => {
    if (!customer || !documents) return [];
    return documents
      .filter((d) => d.customerId === customer.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [customer, documents]);

  // Kebab menu: only one row's dropdown is open at a time. Menu is portalled
  // to document.body with fixed positioning so it escapes the drawer's
  // overflow-hidden/overflow-y-auto clipping (otherwise it renders inside
  // the body and gets cut off near the edges).
  const [openMenuDocId, setOpenMenuDocId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{
    bottom: number;
    right: number;
  } | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuPortalRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openMenuDocId) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      const insideTrigger = menuTriggerRef.current?.contains(t) ?? false;
      const insidePortal = menuPortalRef.current?.contains(t) ?? false;
      if (!insideTrigger && !insidePortal) setOpenMenuDocId(null);
    };
    window.document.addEventListener("mousedown", handler);
    return () => window.document.removeEventListener("mousedown", handler);
  }, [openMenuDocId]);

  function toggleMenu(docId: string, btn: HTMLButtonElement | null) {
    if (openMenuDocId === docId) {
      setOpenMenuDocId(null);
      menuTriggerRef.current = null;
      return;
    }
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuCoords({
        // menu opens upward: anchor its bottom at 8px above the button top
        bottom: window.innerHeight - rect.top + 8,
        right: window.innerWidth - rect.right,
      });
      menuTriggerRef.current = btn;
    }
    setOpenMenuDocId(docId);
  }

  async function handleViewPdf(doc: CustomerDoc) {
    setOpenMenuDocId(null);
    try {
      const url = await onPreviewFinalPdf(doc.id);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // preview errors are surfaced upstream by the handler
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <aside className="relative flex h-[95%] w-[95%] max-w-none flex-col overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] shadow-[var(--shadow-dropdown)] md:h-[90%] md:w-[85%] lg:h-[85%] lg:w-[80%] 2xl:h-[80%] 2xl:w-[75%]">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-6 py-5">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
              Client
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="min-w-0 truncate text-xl font-semibold text-[color:var(--text-primary)]">
                {isLoading ? "Loading..." : customer?.fullName ?? "—"}
              </h2>
              {customer ? <CustomerTypeBadge type={customer.customerType} /> : null}
            </div>
            {customer ? (
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                {customer._count?.documents ?? 0} document
                {(customer._count?.documents ?? 0) === 1 ? "" : "s"} linked
              </p>
            ) : null}
            {customer && isMaster ? (
              <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                Owner:{" "}
                <span className="font-medium text-[color:var(--text-secondary)]">
                  {getOwnerLabel(customer.user)}
                </span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] transition hover:border-[color:var(--danger-border)] hover:bg-[color:var(--danger-bg)] hover:text-[color:var(--danger-text)] dark:hover:border-[color:var(--danger-border)] dark:hover:bg-[color:var(--danger-bg)] dark:hover:text-[color:var(--danger-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-[color:var(--border)] px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-md px-4 py-3 text-sm transition",
                activeTab === tab.key
                  ? "border-b-2 border-[color:var(--brand-accent)] font-semibold text-[color:var(--text-primary)]"
                  : "border-b-2 border-transparent font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--bg-page-subtle)] hover:text-[color:var(--text-primary)] dark:hover:bg-white/5",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <EmptyBlock text="Loading client..." />
          ) : !customer ? (
            <EmptyBlock text="Client not found." />
          ) : activeTab === "documents" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[color:var(--text-muted)]">
                  {customerDocuments.length}{" "}
                  {customerDocuments.length === 1 ? "document" : "documents"}{" "}
                  linked to this client
                </p>
                <button
                  type="button"
                  onClick={onCreateDocument}
                  disabled={!onCreateDocument}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[color:var(--button-primary)] px-4 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FilePlus className="h-4 w-4" />
                  New Document
                </button>
              </div>
              {customerDocuments.length === 0 ? (
                <EmptyBlock text="No documents linked to this client yet." />
              ) : (
                <>
                  {/* Mobile + Tablet: card layout (<1024px) */}
                  <div className="space-y-3 lg:hidden">
                  {customerDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4 pr-14"
                    >
                      <div className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                        {doc.documentNumber}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[color:var(--text-secondary)]">
                        {doc.documentType?.name ?? "—"}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-[color:var(--text-muted)]">
                          {formatDate(doc.createdAt)}
                        </span>
                        <StatusBadge status={doc.status} />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => toggleMenu(doc.id, e.currentTarget)}
                        aria-label="Document actions"
                        aria-haspopup="menu"
                        aria-expanded={openMenuDocId === doc.id}
                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] transition hover:bg-[color:var(--button-neutral-hover)]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop: table layout (≥1024px) */}
                <div className="hidden overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] lg:block">
                  <table className="w-full text-sm">
                    <thead className="bg-[color:var(--bg-page-subtle)] text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      <tr>
                        <th className="px-4 py-3">Document #</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--border)]">
                      {customerDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className="transition hover:bg-[color:var(--bg-page-subtle)]"
                        >
                          <td className="px-4 py-3 font-medium text-[color:var(--text-primary)]">
                            {doc.documentNumber}
                          </td>
                          <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                            {doc.documentType?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                            {formatDate(doc.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={doc.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={(e) =>
                                  toggleMenu(doc.id, e.currentTarget)
                                }
                                aria-label="Document actions"
                                aria-haspopup="menu"
                                aria-expanded={openMenuDocId === doc.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] transition hover:bg-[color:var(--button-neutral-hover)]"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          ) : activeTab === "info" ? (
            <div className="grid gap-4">
              <CustomerField
                label="Full name"
                value={customer.fullName}
                onChange={() => {}}
                disabled
              />
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Phone"
                  value={phoneDisplay}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="Email"
                  value={emailDisplay}
                  onChange={() => {}}
                  disabled
                />
              </div>
              <CustomerField
                label="Address"
                value={customer.addressLine1 ?? ""}
                onChange={() => {}}
                disabled
              />
              <div className="grid gap-4 md:grid-cols-3">
                <CustomerField
                  label="City"
                  value={customer.city ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="State"
                  value={customer.state ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="ZIP code"
                  value={customer.zipCode ?? ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
              <CustomerField
                label="Internal notes"
                type="textarea"
                value={customer.notes ?? ""}
                onChange={() => {}}
                disabled
              />
            </div>
          ) : activeTab === "company" ? (
            <div className="grid gap-4">
              {/* Row 1 — Business Name | Business Legal Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Business name"
                  value={b?.businessName ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="Business legal name"
                  value={b?.businessLegalName ?? ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
              {/* Row 2 — License | Industry */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="License number"
                  value={b?.licenseNumber ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="Industry"
                  value={b?.industry ?? ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
              {/* Row 3 — Website | Business email */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Website"
                  value={b?.website ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="Business email"
                  value={b?.businessEmail ?? ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
              {/* Row 4 — Phone | Mobile/Fax */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Business phone"
                  value={b?.businessPhone ? formatUsPhone(b.businessPhone) : ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="Mobile / Fax"
                  value={b?.businessPhone2 ? formatUsPhone(b.businessPhone2) : ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
              {/* Row 5 — Address Line 1 (full) */}
              <CustomerField
                label="Address line 1"
                value={b?.businessAddressLine1 ?? ""}
                onChange={() => {}}
                disabled
              />
              {/* Row 6 — Address Line 2 | City | State | ZIP (4 cols responsive) */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <CustomerField
                  label="Address line 2"
                  value={b?.businessAddressLine2 ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="City"
                  value={b?.businessCity ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="State"
                  value={b?.businessState ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="ZIP code"
                  value={b?.businessZipCode ?? ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {/* Row 1 — Representative Name | Title */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Representative name"
                  value={b?.primaryContactName ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="Title"
                  value={b?.primaryContactTitle ?? ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
              {/* Row 2 — Phone | Email */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Phone"
                  value={
                    b?.primaryContactPhone
                      ? formatUsPhone(b.primaryContactPhone)
                      : ""
                  }
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="Email"
                  value={b?.primaryContactEmail ?? ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
              {/* Row 3 — Address Line 1 (full) */}
              <CustomerField
                label="Address line 1"
                value={b?.primaryContactAddressLine1 ?? ""}
                onChange={() => {}}
                disabled
              />
              {/* Row 4 — City | State | ZIP (3 cols) */}
              <div className="grid gap-4 md:grid-cols-3">
                <CustomerField
                  label="City"
                  value={b?.primaryContactCity ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="State"
                  value={b?.primaryContactState ?? ""}
                  onChange={() => {}}
                  disabled
                />
                <CustomerField
                  label="ZIP code"
                  value={b?.primaryContactZipCode ?? ""}
                  onChange={() => {}}
                  disabled
                />
              </div>
              {/* Row 5 — Notes (textarea, full) */}
              <CustomerField
                label="Internal notes"
                type="textarea"
                value={customer.notes ?? ""}
                onChange={() => {}}
                disabled
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={onCreateDocument}
            disabled={!customer || isLoading || !onCreateDocument}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FilePlus className="h-4 w-4" />
            Create Document
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onEdit}
              disabled={!customer || isLoading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[color:var(--button-primary)] px-5 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </aside>
      {openMenuDocId && menuCoords
        ? (() => {
            const doc = customerDocuments.find((d) => d.id === openMenuDocId);
            if (!doc) return null;
            return createPortal(
              <div
                ref={menuPortalRef}
                role="menu"
                style={{
                  position: "fixed",
                  bottom: menuCoords.bottom,
                  right: menuCoords.right,
                  zIndex: 100,
                }}
                className="w-56 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] shadow-[var(--shadow-dropdown)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={doc.status === "DRAFT"}
                  onClick={() => void handleViewPdf(doc)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[color:var(--text-primary)] transition hover:bg-[color:var(--bg-page-subtle)] disabled:cursor-not-allowed disabled:text-[color:var(--text-muted)] disabled:hover:bg-transparent"
                >
                  <Eye className="h-4 w-4" />
                  Ver PDF
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={doc.status === "DRAFT"}
                  onClick={() => {
                    setOpenMenuDocId(null);
                    void onDownloadFinalPdf(doc.id);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[color:var(--text-primary)] transition hover:bg-[color:var(--bg-page-subtle)] disabled:cursor-not-allowed disabled:text-[color:var(--text-muted)] disabled:hover:bg-transparent"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenMenuDocId(null);
                    onOpenDocumentView(doc.id);
                  }}
                  className="flex w-full items-center gap-3 border-t border-[color:var(--border)] px-4 py-3 text-left text-sm text-[color:var(--text-primary)] transition hover:bg-[color:var(--bg-page-subtle)]"
                >
                  <FileText className="h-4 w-4" />
                  Ir a documento
                </button>
              </div>,
              window.document.body,
            );
          })()
        : null}
    </div>
  );
}

function CustomerFormDrawer({
  mode,
  customer,
  initialType,
  isMaster,
  tenantUsers,
  currentUserId,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  customer: Customer | null;
  initialType?: "PERSONAL" | "BUSINESS";
  isMaster: boolean;
  tenantUsers: TenantUser[] | null;
  currentUserId: string | null;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}) {
  const [initialValues] = useState<CustomerFormValues>(() => {
    const base = toCustomerFormValues(customer);
    // For create mode with explicit initialType (from type selector), override
    // the default PERSONAL. Edit mode preserves the customer's saved type.
    if (!customer && initialType) {
      return { ...base, customerType: initialType };
    }
    return base;
  });
  const [values, setValues] = useState<CustomerFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<
    { title: string; message: string; onConfirm: () => void } | null
  >(null);
  const [activeTab, setActiveTab] = useState<"company" | "representative">(
    "company",
  );

  const isBusiness = values.customerType === "BUSINESS";

  const isDirty = useMemo(
    () =>
      JSON.stringify(initialValues) !== JSON.stringify(values),
    [initialValues, values],
  );

  function update<K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function updateBusiness<K extends keyof CustomerBusinessFormValues>(
    key: K,
    value: CustomerBusinessFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, business: { ...prev.business, [key]: value } }));
    const errKey = `business.${key}`;
    if (fieldErrors[errKey]) {
      setFieldErrors((prev) => ({ ...prev, [errKey]: undefined }));
    }
  }

  function requestClose() {
    if (isSubmitting) return;
    if (isDirty) {
      setConfirmDialog({
        title: "Unsaved changes",
        message: "You have unsaved changes. Are you sure you want to leave?",
        onConfirm: () => {
          setConfirmDialog(null);
          onClose();
        },
      });
    } else {
      onClose();
    }
  }

  function validate(): Record<string, string | undefined> {
    const errs: Record<string, string | undefined> = {};

    if (isBusiness) {
      // BUSINESS: businessName only enforced at SUBMIT time (the field itself
      // is not marked required so Next/back-navigation never blocks on empty).
      const bn = values.business.businessName.trim();
      if (!bn) {
        errs["business.businessName"] = "Business name is required";
      } else if (bn.length > 200) {
        errs["business.businessName"] = "Max 200 characters";
      }
      const bEmail = values.business.businessEmail.trim();
      if (bEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bEmail)) {
        errs["business.businessEmail"] = "Invalid email format";
      }
      const pEmail = values.business.primaryContactEmail.trim();
      if (pEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pEmail)) {
        errs["business.primaryContactEmail"] = "Invalid email format";
      }
    } else {
      // PERSONAL: fullName + email required
      const name = values.fullName.trim();
      if (!name) {
        errs.fullName = "Full name is required";
      } else if (name.length > 200) {
        errs.fullName = "Max 200 characters";
      }
      const email = values.email.trim();
      if (!email) {
        errs.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs.email = "Invalid email format";
      }
    }

    setFieldErrors(errs);
    return errs;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errs = validate();
    const isValid = Object.values(errs).every((v) => !v);
    if (!isValid) {
      // Jump to the tab holding the first error so BUSINESS users see it.
      // Use the freshly-returned errs (fieldErrors state is stale right after
      // setFieldErrors during this render).
      if (isBusiness) {
        if (errs["business.businessName"] || errs["business.businessEmail"]) {
          setActiveTab("company");
        } else if (errs["business.primaryContactEmail"]) {
          setActiveTab("representative");
        }
      }
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      // For BUSINESS, Customer.fullName is derived from business.businessName
      // so the required field on the Customer row is satisfied. Also unset
      // personal-only fields that BUSINESS customers don't use.
      const submitValues: CustomerFormValues = isBusiness
        ? {
            ...values,
            fullName: values.business.businessName.trim(),
            email: "",
            phone: "",
            addressLine1: "",
            city: "",
            state: "",
            zipCode: "",
          }
        : values;
      await onSubmit(submitValues);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to save client");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={requestClose}
        className="absolute inset-0 cursor-default"
      />
      <form
        onSubmit={(e) => {
          // On the first step of the create-BUSINESS wizard (Company tab),
          // submit means "advance to Representative", NOT save. Block the
          // real save path here so anything that triggers submit (click,
          // Enter key, React DOM-element reuse) just navigates.
          if (
            mode === "create" &&
            isBusiness &&
            activeTab === "company"
          ) {
            e.preventDefault();
            setActiveTab("representative");
            return;
          }
          void handleSubmit(e);
        }}
        noValidate
        className="relative flex h-[95%] w-[95%] max-w-none flex-col overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] shadow-[var(--shadow-dropdown)] md:h-[90%] md:w-[85%] lg:h-[85%] lg:w-[80%] 2xl:h-[80%] 2xl:w-[75%]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-6 py-5">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
              {mode === "create" ? "New client" : "Edit client"}
            </div>
            <h2 className="mt-1 truncate text-xl font-semibold text-[color:var(--text-primary)]">
              {mode === "create" ? "Add a client" : customer?.fullName ?? "Client"}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] transition hover:border-[color:var(--danger-border)] hover:bg-[color:var(--danger-bg)] hover:text-[color:var(--danger-text)] dark:hover:border-[color:var(--danger-border)] dark:hover:bg-[color:var(--danger-bg)] dark:hover:text-[color:var(--danger-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isBusiness ? (
          <div className="flex gap-1 border-b border-[color:var(--border)] px-6">
            <button
              type="button"
              onClick={() => setActiveTab("company")}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-md px-4 py-3 text-sm transition",
                activeTab === "company"
                  ? "border-b-2 border-[color:var(--brand-accent)] font-semibold text-[color:var(--text-primary)]"
                  : "border-b-2 border-transparent font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--bg-page-subtle)] hover:text-[color:var(--text-primary)] dark:hover:bg-white/5",
              )}
            >
              Company
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("representative")}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-md px-4 py-3 text-sm transition",
                activeTab === "representative"
                  ? "border-b-2 border-[color:var(--brand-accent)] font-semibold text-[color:var(--text-primary)]"
                  : "border-b-2 border-transparent font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--bg-page-subtle)] hover:text-[color:var(--text-primary)] dark:hover:bg-white/5",
              )}
            >
              Representative
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Assign-to (master only, create mode). Empty = backend resolver
              defaults to currentUser. Selection is validated server-side
              against the same companyProfileId. Styled to match the
              Documents module filter pattern (button+menu). */}
          {isMaster && mode === "create" ? (
            <AssignToPicker
              value={values.userId}
              onChange={(v) => update("userId", v)}
              tenantUsers={tenantUsers}
              currentUserId={currentUserId}
            />
          ) : null}
          {!isBusiness ? (
            <div className="grid gap-4">
              {/* Row 1 — Full name (full width) */}
              <CustomerField
                label="Full name *"
                value={values.fullName}
                onChange={(v) =>
                  update(
                    "fullName",
                    toTitleCase(v.replace(/\d/g, "")).slice(0, 200),
                  )
                }
                error={fieldErrors.fullName}
                placeholder="John Doe"
                required
              />

              {/* Row 2 — Phone | Email */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Phone"
                  value={values.phone}
                  onChange={(v) => update("phone", formatUsPhone(v))}
                  placeholder="(555) 123-4567"
                />
                <CustomerField
                  label="Email *"
                  value={values.email}
                  onChange={(v) => update("email", v.slice(0, 254))}
                  error={fieldErrors.email}
                  placeholder="name@example.com"
                  required
                />
              </div>

              {/* Row 3 — Address (full width) */}
              <CustomerField
                label="Address"
                value={values.addressLine1}
                onChange={(v) => update("addressLine1", v.slice(0, 200))}
                placeholder="123 Main St"
              />

              {/* Row 4 — City | State | ZIP */}
              <div className="grid gap-4 md:grid-cols-3">
                <CustomerField
                  label="City"
                  value={values.city}
                  onChange={(v) =>
                    update(
                      "city",
                      toTitleCase(v.replace(/[0-9]/g, "")).slice(0, 100),
                    )
                  }
                  placeholder="Pittsburg"
                />
                <CustomerField
                  label="State"
                  value={values.state}
                  onChange={(v) =>
                    update(
                      "state",
                      v.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3),
                    )
                  }
                  placeholder="CA"
                />
                <CustomerField
                  label="ZIP code"
                  value={values.zipCode}
                  onChange={(v) => update("zipCode", v.replace(/\D/g, "").slice(0, 9))}
                  placeholder="94565 or 123456789"
                />
              </div>

              {/* Row 5 — Internal notes (textarea, full width) */}
              <CustomerField
                label="Internal notes"
                type="textarea"
                value={values.notes}
                onChange={(v) => update("notes", v.slice(0, 2000))}
                placeholder="Anything worth remembering about this client..."
              />
            </div>
          ) : activeTab === "company" ? (
            <div className="grid gap-4">
              {/* Row 1 — Business Name | Business Legal Name */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Business name"
                  value={values.business.businessName}
                  onChange={(v) =>
                    updateBusiness(
                      "businessName",
                      toTitleCase(v).slice(0, 200),
                    )
                  }
                  error={fieldErrors["business.businessName"]}
                  placeholder="Acme Construction"
                />
                <CustomerField
                  label="Business legal name"
                  value={values.business.businessLegalName}
                  onChange={(v) =>
                    updateBusiness(
                      "businessLegalName",
                      toTitleCase(v).slice(0, 200),
                    )
                  }
                  placeholder="Acme Construction LLC"
                />
              </div>
              {/* Row 2 — License | Industry */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="License number"
                  value={values.business.licenseNumber}
                  onChange={(v) =>
                    updateBusiness("licenseNumber", v.slice(0, 100))
                  }
                  placeholder="123456"
                />
                <CustomerField
                  label="Industry"
                  value={values.business.industry}
                  onChange={(v) =>
                    updateBusiness("industry", toTitleCase(v).slice(0, 100))
                  }
                  placeholder="Construction"
                />
              </div>
              {/* Row 3 — Website | Business email */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Website"
                  value={values.business.website}
                  onChange={(v) => updateBusiness("website", v.slice(0, 254))}
                  placeholder="https://example.com"
                />
                <CustomerField
                  label="Business email"
                  value={values.business.businessEmail}
                  onChange={(v) =>
                    updateBusiness("businessEmail", v.slice(0, 254))
                  }
                  error={fieldErrors["business.businessEmail"]}
                  placeholder="contact@example.com"
                />
              </div>
              {/* Row 4 — Phone | Mobile/Fax */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Business phone"
                  value={values.business.businessPhone}
                  onChange={(v) => updateBusiness("businessPhone", formatUsPhone(v))}
                  placeholder="(555) 123-4567"
                />
                <CustomerField
                  label="Mobile / Fax"
                  value={values.business.businessPhone2}
                  onChange={(v) => updateBusiness("businessPhone2", formatUsPhone(v))}
                  placeholder="(555) 123-4567"
                />
              </div>
              {/* Row 5 — Address Line 1 (full) */}
              <CustomerField
                label="Address line 1"
                value={values.business.businessAddressLine1}
                onChange={(v) =>
                  updateBusiness("businessAddressLine1", v.slice(0, 200))
                }
                placeholder="123 Main St"
              />
              {/* Row 6 — Address Line 2 | City | State | ZIP (4 cols responsive) */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <CustomerField
                  label="Address line 2"
                  value={values.business.businessAddressLine2}
                  onChange={(v) =>
                    updateBusiness("businessAddressLine2", v.slice(0, 200))
                  }
                  placeholder="Suite 400"
                />
                <CustomerField
                  label="City"
                  value={values.business.businessCity}
                  onChange={(v) =>
                    updateBusiness(
                      "businessCity",
                      toTitleCase(v.replace(/[0-9]/g, "")).slice(0, 100),
                    )
                  }
                  placeholder="Pittsburg"
                />
                <CustomerField
                  label="State"
                  value={values.business.businessState}
                  onChange={(v) =>
                    updateBusiness(
                      "businessState",
                      v.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3),
                    )
                  }
                  placeholder="CA"
                />
                <CustomerField
                  label="ZIP code"
                  value={values.business.businessZipCode}
                  onChange={(v) =>
                    updateBusiness(
                      "businessZipCode",
                      v.replace(/\D/g, "").slice(0, 9),
                    )
                  }
                  placeholder="94565"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {/* Row 1 — Representative Name | Title */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Representative name"
                  value={values.business.primaryContactName}
                  onChange={(v) =>
                    updateBusiness(
                      "primaryContactName",
                      toTitleCase(v.replace(/\d/g, "")).slice(0, 200),
                    )
                  }
                  placeholder="John Doe"
                />
                <CustomerField
                  label="Title"
                  value={values.business.primaryContactTitle}
                  onChange={(v) =>
                    updateBusiness(
                      "primaryContactTitle",
                      toTitleCase(v).slice(0, 200),
                    )
                  }
                  placeholder="President"
                />
              </div>
              {/* Row 2 — Phone | Email */}
              <div className="grid gap-4 md:grid-cols-2">
                <CustomerField
                  label="Phone"
                  value={values.business.primaryContactPhone}
                  onChange={(v) =>
                    updateBusiness("primaryContactPhone", formatUsPhone(v))
                  }
                  placeholder="(555) 123-4567"
                />
                <CustomerField
                  label="Email"
                  value={values.business.primaryContactEmail}
                  onChange={(v) =>
                    updateBusiness("primaryContactEmail", v.slice(0, 254))
                  }
                  error={fieldErrors["business.primaryContactEmail"]}
                  placeholder="john@example.com"
                />
              </div>
              {/* Row 3 — Address Line 1 (full) */}
              <CustomerField
                label="Address line 1"
                value={values.business.primaryContactAddressLine1}
                onChange={(v) =>
                  updateBusiness(
                    "primaryContactAddressLine1",
                    v.slice(0, 200),
                  )
                }
                placeholder="123 Main St"
              />
              {/* Row 4 — City | State | ZIP (3 cols) */}
              <div className="grid gap-4 md:grid-cols-3">
                <CustomerField
                  label="City"
                  value={values.business.primaryContactCity}
                  onChange={(v) =>
                    updateBusiness(
                      "primaryContactCity",
                      toTitleCase(v.replace(/[0-9]/g, "")).slice(0, 100),
                    )
                  }
                  placeholder="Pittsburg"
                />
                <CustomerField
                  label="State"
                  value={values.business.primaryContactState}
                  onChange={(v) =>
                    updateBusiness(
                      "primaryContactState",
                      v.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3),
                    )
                  }
                  placeholder="CA"
                />
                <CustomerField
                  label="ZIP code"
                  value={values.business.primaryContactZipCode}
                  onChange={(v) =>
                    updateBusiness(
                      "primaryContactZipCode",
                      v.replace(/\D/g, "").slice(0, 9),
                    )
                  }
                  placeholder="94565"
                />
              </div>
              {/* Row 5 — Notes (textarea, full) */}
              <CustomerField
                label="Internal notes"
                type="textarea"
                value={values.notes}
                onChange={(v) => update("notes", v.slice(0, 2000))}
                placeholder="Anything worth remembering about this client..."
              />
            </div>
          )}
          {submitError ? (
            <div className="mt-4 rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger-text)] dark:border-[color:var(--danger-border)] dark:bg-[color:var(--danger-bg)] dark:text-[color:var(--danger-text)]">
              {submitError}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] px-6 py-4">
          <div>
            {mode === "create" && isBusiness && activeTab === "representative" ? (
              <button
                type="button"
                onClick={() => setActiveTab("company")}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center gap-1 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)] disabled:opacity-70"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)] disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center rounded-2xl bg-[color:var(--button-primary)] px-5 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)] disabled:opacity-70"
            >
              {isSubmitting
                ? "Saving..."
                : mode === "create" &&
                    isBusiness &&
                    activeTab === "company"
                  ? "Next"
                  : mode === "create"
                    ? "Create client"
                    : "Save changes"}
            </button>
          </div>
        </div>
      </form>
      {confirmDialog ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center md:items-center bg-black/60 p-4 pt-20 md:pt-0 backdrop-blur">
          <div className="w-full max-w-sm rounded-[1.75rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[color:var(--bg-page)]">
            <div className="text-lg font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              {confirmDialog.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              {confirmDialog.message}
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="rounded-xl bg-[color:var(--button-danger)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-danger-hover)]"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const EMPTY_BUSINESS: CustomerBusinessFormValues = {
  businessName: "",
  businessLegalName: "",
  licenseNumber: "",
  industry: "",
  website: "",
  businessEmail: "",
  businessPhone: "",
  businessPhone2: "",
  businessAddressLine1: "",
  businessAddressLine2: "",
  businessCity: "",
  businessState: "",
  businessZipCode: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryContactTitle: "",
  primaryContactAddressLine1: "",
  primaryContactCity: "",
  primaryContactState: "",
  primaryContactZipCode: "",
};

function toCustomerFormValues(customer: Customer | null): CustomerFormValues {
  const business: CustomerBusinessFormValues = customer?.business
    ? {
        businessName: customer.business.businessName,
        businessLegalName: customer.business.businessLegalName ?? "",
        licenseNumber: customer.business.licenseNumber ?? "",
        industry: customer.business.industry ?? "",
        website: customer.business.website ?? "",
        businessEmail: customer.business.businessEmail ?? "",
        businessPhone: formatUsPhone(customer.business.businessPhone ?? ""),
        businessPhone2: formatUsPhone(customer.business.businessPhone2 ?? ""),
        businessAddressLine1: customer.business.businessAddressLine1 ?? "",
        businessAddressLine2: customer.business.businessAddressLine2 ?? "",
        businessCity: customer.business.businessCity ?? "",
        businessState: customer.business.businessState ?? "",
        businessZipCode: customer.business.businessZipCode ?? "",
        primaryContactName: customer.business.primaryContactName ?? "",
        primaryContactEmail: customer.business.primaryContactEmail ?? "",
        primaryContactPhone: formatUsPhone(
          customer.business.primaryContactPhone ?? "",
        ),
        primaryContactTitle: customer.business.primaryContactTitle ?? "",
        primaryContactAddressLine1:
          customer.business.primaryContactAddressLine1 ?? "",
        primaryContactCity: customer.business.primaryContactCity ?? "",
        primaryContactState: customer.business.primaryContactState ?? "",
        primaryContactZipCode: customer.business.primaryContactZipCode ?? "",
      }
    : EMPTY_BUSINESS;

  return {
    customerType: customer?.customerType ?? "PERSONAL",
    fullName: customer?.fullName ?? "",
    email: customer?.email ?? "",
    phone: formatUsPhone(customer?.phone ?? ""),
    addressLine1: customer?.addressLine1 ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    zipCode: customer?.zipCode ?? "",
    notes: customer?.notes ?? "",
    userId: customer?.userId ?? "",
    business,
  };
}

