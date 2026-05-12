"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronRight,
  ChevronsUpDown,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleLayout } from "@/components/layouts";
import { formatDate } from "@/lib/format";
import { EmptyBlock, StatPill, StatusBadge } from "@/components/dashboard/shared/ui";
import {
  getDisplayName,
  getDocumentActions,
  getFinalCustomerEmail,
  getFinalCustomerName,
} from "@/components/dashboard/shared/document-utils";
import type {
  Doc,
  DocDetail,
  DocumentTypeCatalogItem,
  StatusFilter,
} from "@/components/dashboard/shared/document-types";
import { FileText } from "lucide-react";

// ─── Narrowed prop shapes — full definitions live in dashboard-sidebar-demo.tsx ──

// Only the fields the panel actually reads — keep this narrow on purpose.
type UsageLite = {
  documentsUsed: number;
  monthlyDocLimit: number;
  isUnlimited: boolean;
} | null;

// companyProfile is forwarded but never read inside the panel body.
// Typed as `unknown` so the monolith can pass its full CompanyProfile shape
// without coupling this file to the monolith's Props type.
type CompanyProfileLite = unknown;
type MasterSortKey = "user" | "company" | "client" | "document" | "status" | "created";
type UserSortKey = "client" | "document" | "date" | "status";
type SortKey = MasterSortKey | UserSortKey;
type SortDirection = "asc" | "desc";

function SortHeader({
  label,
  columnKey,
  align = "left",
  sortKey,
  sortDirection,
  onToggleSort,
}: {
  label: string;
  columnKey: SortKey;
  align?: "left" | "right";
  sortKey: SortKey;
  sortDirection: SortDirection;
  onToggleSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === columnKey;

  return (
    <button
      type="button"
      onClick={() => onToggleSort(columnKey)}
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition hover:text-slate-700 dark:hover:text-slate-200",
        align === "right" && "ml-auto",
        isActive ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "text-[10px] tracking-normal",
          isActive ? "opacity-100" : "opacity-45",
        )}
      >
        {isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

export function DocumentsPanel(props: {
  documents: Doc[] | null;
  allDocuments: Doc[];
  documentTypes: DocumentTypeCatalogItem[];
  companyProfile: CompanyProfileLite;
  usage: UsageLite;
  documentDetail: DocDetail | null;
  selectedDocumentId: string | null;
  currentUserRole: string | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  documentActionId: string | null;
  searchQuery: string;
  statusFilter: StatusFilter;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSelectDocument: (documentId: string) => void;
  onOpenDocumentView: (documentId: string) => void;
  onOpenDocumentEdit: (documentId: string) => void;
  onDocumentAction: (
    documentId: string,
    action: "send" | "resend" | "cancel" | "reactivate",
  ) => Promise<void>;
  onCreateDraft: (payload: {
    documentTypeId: string;
    formDefinitionId: string;
    signatureTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
    customerId?: string;
  }) => Promise<DocDetail | void>;
  onStartNewDraft: () => void;
  canStartNewDraft: boolean;
}) {

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const pageSizeMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const sortedDocuments = useMemo(() => {
    const items = [...(props.documents ?? [])];

    const compareText = (left: string, right: string) =>
      left.localeCompare(right, undefined, { sensitivity: "base", numeric: true });

    const compareDate = (left: string | null | undefined, right: string | null | undefined) =>
      new Date(left ?? 0).getTime() - new Date(right ?? 0).getTime();

    items.sort((left, right) => {
      let result = 0;

      switch (sortKey) {
        case "user":
          result = compareText(getDisplayName(left.user?.email), getDisplayName(right.user?.email));
          break;
        case "company":
          result = compareText(left.companyProfile?.companyName ?? "", right.companyProfile?.companyName ?? "");
          break;
        case "client":
          result = compareText(getFinalCustomerName(left), getFinalCustomerName(right));
          break;
        case "document":
          result = compareText(left.documentNumber, right.documentNumber);
          break;
        case "status":
          result = compareText(left.status, right.status);
          break;
        case "date":
          result = compareDate(left.contractDate, right.contractDate);
          break;
        case "created":
          result = compareDate(left.createdAt, right.createdAt);
          break;
        default:
          result = 0;
      }

      return sortDirection === "asc" ? result : result * -1;
    });

    return items;
  }, [props.documents, sortDirection, sortKey]);
  const totalDocuments = sortedDocuments.length;
  const totalPages = Math.max(1, Math.ceil(totalDocuments / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = totalDocuments === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDocuments);
  const paginatedDocuments = useMemo(
    () => sortedDocuments.slice(pageStart, pageEnd),
    [pageEnd, pageStart, sortedDocuments],
  );

  function toggleSort(nextKey: SortKey) {
    setCurrentPage(1);
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "created" || nextKey === "date" ? "desc" : "asc");
  }

  useEffect(() => {
    if (!pageSizeMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!pageSizeMenuRef.current?.contains(event.target as Node)) {
        setPageSizeMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [pageSizeMenuOpen]);

  useEffect(() => {
    if (!filterMenuOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent | PointerEvent) {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [filterMenuOpen]);

  return (
    <ModuleLayout
      title="Documents"
      description="Manage and track all your documents"
      icon={<FileText className="h-5 w-5" />}
    >
      <section className="grid gap-4">
      <div className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Documents workspace</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Review documents, apply filters and manage lifecycle actions.
            </p>
          </div>
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileStatsOpen((current) => !current)}
            className="inline-flex h-11 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/5 md:hidden"
          >
            <span>Workspace metrics</span>
            <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform dark:text-slate-500", mobileStatsOpen && "rotate-90")} />
          </button>
          </div>
          <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", mobileStatsOpen ? "grid" : "hidden md:grid")}>
            <StatPill label="Total" value={String(props.allDocuments.length)} />
            <StatPill label="Draft" value={String(props.allDocuments.filter((item) => item.status === "DRAFT").length)} />
            <StatPill label="In progress" value={String(props.allDocuments.filter((item) => ["SENT", "VIEWED", "SIGNED"].includes(item.status)).length)} />
            <StatPill label="Billing counted" value={props.usage?.isUnlimited ? `${props.usage.documentsUsed} counted` : `${props.usage?.documentsUsed ?? 0} of ${props.usage?.monthlyDocLimit ?? 0}`} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={props.searchQuery} onChange={(event) => {
              setCurrentPage(1);
              props.onSearchQueryChange(event.target.value);
            }} placeholder="Search by number, status or type" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white dark:caret-blue-300 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:text-white" />
          </div>
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-3 md:contents">
            <div ref={filterMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setFilterMenuOpen((current) => !current)}
                className="inline-flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/5 md:w-auto"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filter</span>
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {props.statusFilter === "ALL" ? "All" : props.statusFilter.toLowerCase()}
                </span>
              </button>
              {filterMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+0.35rem)] z-20 min-w-44 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
                  {(["ALL", "DRAFT", "SENT", "VIEWED", "SIGNED", "COMPLETED", "CANCELLED"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setCurrentPage(1);
                        props.onStatusFilterChange(option);
                        setFilterMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                        props.statusFilter === option
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
                      )}
                    >
                      <span>{option === "ALL" ? "All" : option.toLowerCase()}</span>
                      {props.statusFilter === option ? <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">On</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={props.onStartNewDraft}
              disabled={!props.canStartNewDraft}
              title={
                !props.canStartNewDraft
                  ? "No document templates available. Contact your admin."
                  : undefined
              }
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:bg-slate-300 dark:disabled:bg-white/10 dark:disabled:text-slate-500 md:w-auto"
            >
              New document
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-visible rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Results</div>
            <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{props.isLoading ? "Loading..." : `${totalDocuments} contracts`}</div>
          </div>
          <div className="flex items-center gap-2">
            <div ref={pageSizeMenuRef} className="relative flex items-center gap-2">
            <label className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:block">
              Rows
            </label>
            <button
              type="button"
              onClick={() => setPageSizeMenuOpen((current) => !current)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 hover:bg-white focus:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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

        {props.isLoading ? (
          <div className="p-5">
            <EmptyBlock text="Loading documents..." />
          </div>
        ) : props.documents && props.documents.length > 0 ? (
          <>
            {props.currentUserRole === "MASTER" ? (
              <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_120px_128px_64px] items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03] md:grid">
                <SortHeader label="User" columnKey="user" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <SortHeader label="Company" columnKey="company" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <SortHeader label="Client" columnKey="client" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <SortHeader label="Document" columnKey="document" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <SortHeader label="Status" columnKey="status" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <SortHeader label="Created" columnKey="created" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <div className="text-right">Actions</div>
              </div>
            ) : (
              <div className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1.1fr)_112px_120px_64px] items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03] md:grid">
                <SortHeader label="Client" columnKey="client" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <SortHeader label="Document" columnKey="document" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <SortHeader label="Date" columnKey="date" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <SortHeader label="Status" columnKey="status" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
                <div className="text-right">Actions</div>
              </div>
            )}

            <div className="divide-y divide-slate-200 dark:divide-white/10 md:hidden">
              {paginatedDocuments.map((document) => (
                <div
                  key={`${document.id}-mobile`}
                  className={cn(
                    "px-4 py-3 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]",
                    props.selectedDocumentId === document.id && "bg-blue-50/60 dark:bg-blue-500/10",
                  )}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {props.currentUserRole === "MASTER"
                          ? getDisplayName(document.user?.email)
                          : getFinalCustomerName(document)}
                      </div>
                      <button
                        type="button"
                        onClick={() => props.onSelectDocument(document.id)}
                        className="mt-1 block text-left"
                      >
                        <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {document.documentNumber}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {props.currentUserRole === "MASTER"
                            ? getFinalCustomerName(document)
                            : document.documentType?.name ?? "Untyped document"}
                        </div>
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <DocumentListActions
                        document={document}
                        actionInFlight={props.documentActionId === document.id}
                        onView={() => props.onOpenDocumentView(document.id)}
                        onEdit={() => props.onOpenDocumentEdit(document.id)}
                        onAction={props.onDocumentAction}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatDate(document.contractDate)}
                    </div>
                    <div className="flex justify-start">
                      <StatusBadge status={document.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

              <div className="hidden divide-y divide-slate-200 dark:divide-white/10 md:block">
                {paginatedDocuments.map((document) => (
                  <div key={document.id} className={cn("px-4 py-4 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]", props.selectedDocumentId === document.id && "bg-blue-50/60 dark:bg-blue-500/10")}>
                    {props.currentUserRole === "MASTER" ? (
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_120px_128px_64px] md:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{getDisplayName(document.user?.email)}</div>
                          {document.user?.email ? (
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{document.user.email}</div>
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{document.companyProfile?.companyName ?? "No company"}</div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{getFinalCustomerName(document)}</div>
                        </div>

                        <div className="min-w-0">
                          <button type="button" onClick={() => props.onSelectDocument(document.id)} className="text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-950 dark:text-white">{document.documentNumber}</span>
                              {document.isOverage ? (
                                <InlineBadge
                                  tone="rose"
                                  title="This document exceeded the documents included in your current monthly plan and may generate overage billing."
                                >
                                  Overage
                                </InlineBadge>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{document.documentType?.name ?? "Untyped document"}</div>
                          </button>
                        </div>

                        <div className="flex items-center">
                          <StatusBadge status={document.status} />
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-300">{formatDate(document.createdAt)}</div>

                        <div className="flex justify-start lg:justify-end">
                          <DocumentListActions
                            document={document}
                            actionInFlight={props.documentActionId === document.id}
                            onView={() => props.onOpenDocumentView(document.id)}
                            onEdit={() => props.onOpenDocumentEdit(document.id)}
                            onAction={props.onDocumentAction}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1.1fr)_112px_120px_64px] md:items-center">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{getFinalCustomerName(document)}</div>
                          {getFinalCustomerEmail(document) ? (
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 lg:hidden">
                              {getFinalCustomerEmail(document)}
                            </div>
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <button type="button" onClick={() => props.onSelectDocument(document.id)} className="text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-950 dark:text-white">{document.documentNumber}</span>
                              {document.isOverage ? (
                                <InlineBadge
                                  tone="rose"
                                  title="This document exceeded the documents included in your current monthly plan and may generate overage billing."
                                >
                                  Overage
                                </InlineBadge>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{document.documentType?.name ?? "Untyped document"}</div>
                          </button>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-300">{formatDate(document.contractDate)}</div>

                        <div className="flex items-center">
                          <StatusBadge status={document.status} />
                        </div>

                        <div className="flex justify-start lg:justify-end">
                          <DocumentListActions
                            document={document}
                            actionInFlight={props.documentActionId === document.id}
                            onView={() => props.onOpenDocumentView(document.id)}
                            onEdit={() => props.onOpenDocumentEdit(document.id)}
                            onAction={props.onDocumentAction}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-slate-500 dark:text-slate-400">
                Showing <span className="font-semibold text-slate-900 dark:text-white">{pageStart + 1}</span>
                {" "}-{" "}
                <span className="font-semibold text-slate-900 dark:text-white">{pageEnd}</span>
                {" "}of{" "}
                <span className="font-semibold text-slate-900 dark:text-white">{totalDocuments}</span>
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
          <div className="p-5">
            <EmptyBlock text="No documents matched the current filters." />
          </div>
        )}
      </div>
      </section>
    </ModuleLayout>
  );
}



function InlineBadge({
  children,
  tone,
  title,
}: {
  children: ReactNode;
  tone: "blue" | "rose";
  title?: string;
}) {
  const styles = { blue: "bg-[color:var(--badge-primary-bg)] text-[color:var(--badge-primary-text)]", rose: "bg-[color:var(--badge-danger-bg)] text-[color:var(--badge-danger-text)]" };
  return (
    <span
      title={title}
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}

function DocumentListActions({
  document: rowDocument,
  actionInFlight,
  onView,
  onEdit,
  onAction,
}: {
  document: Doc;
  actionInFlight: boolean;
  onView: () => void;
  onEdit: () => void;
  onAction: (
    documentId: string,
    action: "send" | "resend" | "cancel" | "reactivate",
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const workflowActions = getDocumentActions(rowDocument);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
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
            const estimatedMenuHeight = 180;
            setOpenUpward(window.innerHeight - rect.bottom < estimatedMenuHeight);
          }
          setOpen((current) => !current);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)] transition hover:bg-[color:var(--button-neutral-hover)] hover:text-[color:var(--text-primary)]"
        aria-label="Open document actions"
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
            onClick={() => {
              onView();
              setOpen(false);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--menu-text)] transition hover:bg-[color:var(--menu-hover)]"
          >
            View
          </button>

          {rowDocument.status === "DRAFT" ? (
            <button
              type="button"
              onClick={() => {
                onEdit();
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--brand-accent-strong)] transition hover:bg-[color:var(--badge-primary-bg)]"
            >
              Edit
            </button>
          ) : null}

          {workflowActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                if (action.disabled) {
                  return;
                }
                void onAction(rowDocument.id, action.key);
                setOpen(false);
              }}
              disabled={action.disabled || actionInFlight}
              className={cn(
                "mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                action.tone,
                (action.disabled || actionInFlight) &&
                  "cursor-not-allowed opacity-60",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

