"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ChevronsUpDown,
  Plus,
  Search,
  Trash2,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import type {
  Customer,
  CustomerListResponse,
  OrderBy,
  OrderDir,
} from "@/app/dashboard/customers/types";

// Mirror del DocumentsPanel con los mismos tokens visuales:
// - Dos cards: header+metrics+filters (rounded-[1.9rem]) / tabla (rounded-[1.8rem])
// - Hardcoded slate-*/blue-600 — no CSS vars, para match exacto con Documents
// - Search fluido + StatPills + sort headers + pagination con rows selector

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 30];

type SortKey = OrderBy;

export function CustomersPanel() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<OrderDir>("desc");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pageSizeMenuRef = useRef<HTMLDivElement | null>(null);

  // Debounce search 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close page-size dropdown on outside click
  useEffect(() => {
    if (!pageSizeMenuOpen) return;
    function handleDown(e: MouseEvent) {
      if (!pageSizeMenuRef.current?.contains(e.target as Node)) {
        setPageSizeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [pageSizeMenuOpen]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const offset = (currentPage - 1) * pageSize;
    const params = new URLSearchParams({
      limit: String(pageSize),
      offset: String(offset),
      orderBy: sortKey,
      orderDir: sortDirection,
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    try {
      const res = await apiRequest<CustomerListResponse>(`/customers?${params}`);
      setCustomers(res.customers);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortKey, sortDirection, debouncedSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  function toggleSort(next: SortKey) {
    setCurrentPage(1);
    if (sortKey === next) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDirection(next === "createdAt" ? "desc" : "asc");
  }

  async function handleDelete(customer: Customer) {
    setDeletingId(customer.id);
    try {
      await apiRequest(`/customers/${customer.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      if (customers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await fetchCustomers();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete customer");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);

  // Metrics — derived from the current page for simplicity. For tenant-wide totals
  // we'd need a separate endpoint; this is "visible on this page" per now.
  const stats = useMemo(() => {
    const withEmail = customers.filter((c) => c.email && c.email.trim().length > 0).length;
    const withoutEmail = customers.length - withEmail;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = customers.filter((c) => new Date(c.createdAt) >= startOfMonth).length;
    return {
      total: total,
      withEmail,
      withoutEmail,
      thisMonth,
    };
  }, [customers, total]);

  return (
    <section className="grid gap-4">
      {/* Card 1: Header + StatPills + Search/Filters */}
      <div className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
              Customers
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Manage the people you send documents to. Reuse their contact data on future drafts.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatPill label="Total" value={String(stats.total)} />
            <StatPill label="With email" value={String(stats.withEmail)} />
            <StatPill label="Without email" value={String(stats.withoutEmail)} />
            <StatPill label="This month" value={String(stats.thisMonth)} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white dark:caret-blue-300 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:text-white"
            />
          </div>
          <Link
            href="/dashboard/customers/new"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto"
          >
            <Plus className="h-4 w-4" />
            New customer
          </Link>
        </div>
      </div>

      {/* Card 2: Table */}
      <div className="overflow-visible rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Results
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
              {isLoading ? "Loading..." : `${total} ${total === 1 ? "customer" : "customers"}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div ref={pageSizeMenuRef} className="relative flex items-center gap-2">
              <label className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:block">
                Rows
              </label>
              <button
                type="button"
                onClick={() => setPageSizeMenuOpen((c) => !c)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 hover:bg-white focus:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <span>{pageSize}</span>
                <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </button>
              {pageSizeMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-28 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
                  {PAGE_SIZE_OPTIONS.map((size) => (
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

        {error ? (
          <div className="px-5 py-6 text-sm text-rose-600 dark:text-rose-400">{error}</div>
        ) : isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            {debouncedSearch
              ? `No customers matching "${debouncedSearch}".`
              : "No customers yet. Create your first one to reuse on future documents."}
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_120px_64px] items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03] md:grid">
              <SortHeader label="Name" columnKey="name" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Email
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Phone
              </div>
              <SortHeader label="Created" columnKey="createdAt" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
              <div className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Actions
              </div>
            </div>

            {/* Mobile rows */}
            <div className="divide-y divide-slate-200 dark:divide-white/10 md:hidden">
              {customers.map((customer) => (
                <div
                  key={`${customer.id}-mobile`}
                  className="px-4 py-3 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="truncate text-sm font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {customer.fullName}
                      </Link>
                      {customer.email ? (
                        <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {customer.email}
                        </div>
                      ) : null}
                      {customer.phone ? (
                        <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {customer.phone}
                        </div>
                      ) : null}
                      <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {formatDate(customer.createdAt)}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <RowActions
                        customer={customer}
                        onDelete={() => setConfirmDelete(customer)}
                        deleting={deletingId === customer.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop rows */}
            <div className="hidden divide-y divide-slate-200 dark:divide-white/10 md:block">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="px-4 py-4 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_120px_64px] md:items-center">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="text-sm font-semibold text-slate-950 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {customer.fullName}
                      </Link>
                    </div>
                    <div className="min-w-0 text-sm text-slate-600 dark:text-slate-300">
                      {customer.email ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </div>
                    <div className="min-w-0 text-sm text-slate-600 dark:text-slate-300">
                      {customer.phone ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {formatDate(customer.createdAt)}
                    </div>
                    <div className="flex justify-start lg:justify-end">
                      <RowActions
                        customer={customer}
                        onDelete={() => setConfirmDelete(customer)}
                        deleting={deletingId === customer.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-slate-500 dark:text-slate-400">
                Showing{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {total === 0 ? 0 : pageStart + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-slate-900 dark:text-white">{pageEnd}</span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900 dark:text-white">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1 || isLoading}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages || isLoading}
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
        )}
      </div>

      {confirmDelete ? (
        <DeleteConfirmDialog
          customer={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
          isDeleting={deletingId === confirmDelete.id}
        />
      ) : null}
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  // Matching the monster's StatPill but using hardcoded slate to stay consistent
  // with the slate-themed wrappers of this panel.
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-sm font-medium leading-5 text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  columnKey,
  sortKey,
  sortDirection,
  onToggleSort,
}: {
  label: string;
  columnKey: SortKey;
  sortKey: SortKey;
  sortDirection: OrderDir;
  onToggleSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === columnKey;
  const Icon = !isActive ? ArrowDownUp : sortDirection === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onToggleSort(columnKey)}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition",
        isActive
          ? "text-slate-900 dark:text-white"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
      )}
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function RowActions({
  customer,
  onDelete,
  deleting,
}: {
  customer: Customer;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/dashboard/customers/${customer.id}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
        aria-label="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DeleteConfirmDialog({
  customer,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  customer: Customer;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Delete customer?</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          This will permanently remove <strong>{customer.fullName}</strong>. Any existing documents
          linked to this customer keep their snapshot — only the relation is cleared.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-11 items-center rounded-2xl bg-rose-600 px-5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-70"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
