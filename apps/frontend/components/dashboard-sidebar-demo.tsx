"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Ban,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  Undo2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

type Doc = {
  id: string;
  documentNumber: string;
  status: string;
  contractDate: string;
  createdAt: string;
  billingPeriod?: string | null;
  sentAt?: string | null;
  cancelledAt?: string | null;
  viewedAt?: string | null;
  signedAt?: string | null;
  completedAt?: string | null;
  countedInBilling: boolean;
  isOverage: boolean;
  documentType?: { name: string; code: string } | null;
  formDefinition?: { name: string; key: string } | null;
  data?: { dataJson: Record<string, unknown> } | null;
};

type DocDetail = Doc & {
  pandadocTemplate?: { name: string; templateKey: string } | null;
  data?: { dataJson: Record<string, unknown> } | null;
  versions?: Array<{ id: string; versionNumber: number; createdAt: string }>;
};

type Props = {
  user: { email: string; role: string; status: string } | null;
  companyProfile: {
    companyName: string;
    industry: string | null;
    contactEmail: string | null;
  } | null;
  usage: {
    planName: string;
    billingPeriod: string;
    monthlyDocLimit: number;
    documentsUsed: number;
    remainingDocuments: number | null;
    isUnlimited: boolean;
    overageDocuments: number;
  } | null;
  monthlySummary: {
    month: string;
    documentsSent: number;
    overageDocuments: number;
    estimatedOverageCost: number;
    overagePrice: string | number;
  } | null;
  documents: Doc[] | null;
  documentDetail: DocDetail | null;
  selectedDocumentId: string | null;
  isDocumentDetailLoading: boolean;
  documentActionId: string | null;
  isLoading: boolean;
  onSelectDocument: (documentId: string) => void;
  onDocumentAction: (
    documentId: string,
    action: "send" | "cancel" | "reactivate",
  ) => void;
  onSignOut: () => void;
};

type SectionKey = "dashboard" | "documents" | "company" | "billing";
type StatusFilter =
  | "ALL"
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "SIGNED"
  | "COMPLETED"
  | "CANCELLED";

export function DashboardSidebarDemo({
  user,
  companyProfile,
  usage,
  monthlySummary,
  documents,
  documentDetail,
  selectedDocumentId,
  isDocumentDetailLoading,
  documentActionId,
  isLoading,
  onSelectDocument,
  onDocumentAction,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const displayName = getDisplayName(user?.email);
  const monthDocuments = useMemo(
    () => filterCurrentMonthDocuments(documents, usage?.billingPeriod),
    [documents, usage?.billingPeriod],
  );
  const stats = useMemo(() => buildContractStats(monthDocuments), [monthDocuments]);
  const topStates = useMemo(() => {
    const rows = [
      { label: "Draft", value: stats.draft, tone: "slate" as const },
      { label: "Sent", value: stats.sent, tone: "blue" as const },
      { label: "Viewed", value: stats.viewed, tone: "cyan" as const },
      { label: "Signed", value: stats.signed, tone: "green" as const },
      { label: "Completed", value: stats.completed, tone: "forest" as const },
      { label: "Cancelled", value: stats.cancelled, tone: "rose" as const },
    ];
    return rows.sort((a, b) => b.value - a.value).slice(0, 4);
  }, [stats]);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (documents ?? []).filter((document) => {
      if (statusFilter !== "ALL" && document.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        document.documentNumber,
        document.status,
        document.documentType?.name,
        document.documentType?.code,
        document.formDefinition?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [documents, searchQuery, statusFilter]);

  const links = [
    { key: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
    { key: "documents" as const, label: "Documents", icon: <FileText className="h-5 w-5 shrink-0" /> },
    { key: "company" as const, label: "Company", icon: <Building2 className="h-5 w-5 shrink-0" /> },
    { key: "billing" as const, label: "Billing", icon: <CreditCard className="h-5 w-5 shrink-0" /> },
  ];

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-white/70 backdrop-blur dark:bg-slate-950/65 md:flex-row">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-8">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">{open ? <Logo /> : <LogoIcon />}</div>
              {open ? (
                <button
                  type="button"
                  aria-label="Close sidebar"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <div className="mt-8">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                Main menu
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {links.map((link) => (
                  <SidebarLink
                    key={link.key}
                    link={{ label: link.label, icon: link.icon }}
                    active={activeSection === link.key}
                    onClick={() => {
                      setActiveSection(link.key);
                      if (window.innerWidth < 1280) {
                        setOpen(false);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                Workspace
              </div>
              <div className="mt-3 grid gap-3">
                <InfoCard label="Company" title={isLoading ? "Loading..." : companyProfile?.companyName ?? "NoaSign"} subtitle={isLoading ? "..." : usage?.billingPeriod ?? "Current month"} />
                <InfoCard label="Plan" title={isLoading ? "Loading..." : usage?.planName ?? "-"} subtitle={isLoading ? "..." : usage?.isUnlimited ? "Unlimited documents" : `${usage?.documentsUsed ?? 0} used this month`} accent />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-3 shadow-[0_12px_30px_rgba(48,88,160,0.08)] dark:border-white/10 dark:bg-[#101826] dark:shadow-none">
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Account</div>
            <div className="rounded-2xl bg-slate-50 p-1 dark:bg-white/[0.03]">
              <SidebarLink link={{ label: isLoading ? "Loading..." : displayName, icon: <UserRound className="h-5 w-5 shrink-0" /> }} className="pointer-events-none" />
            </div>
            <div className="mt-3 px-1">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
                {isLoading ? "Loading..." : `${usage?.documentsUsed ?? 0} docs counted this month`}
              </div>
            </div>
            <div className="mt-3 px-3 text-left text-[11px] font-medium tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Powered by <span className="font-semibold text-slate-500 dark:text-slate-300">NoaTechSolutions</span>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex min-w-0 flex-1">
        <div className="flex h-full w-full flex-1 flex-col gap-4 bg-transparent p-4 pt-4 md:border-l md:border-slate-200/80 md:p-6 md:pt-6 dark:md:border-white/10">
          <div className="-mx-4 flex min-h-12 items-center justify-between gap-3 border-b border-slate-200/90 px-4 py-2 md:-mx-6 md:px-6 md:py-3 dark:border-white/10">
            <div className="flex min-w-0 flex-1 items-center justify-start gap-3">
              {!open ? (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
              ) : null}
              <div className="hidden min-w-0 flex-col items-start text-left sm:flex">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{sectionEyebrow(activeSection)}</div>
                <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{sectionTitle(activeSection, companyProfile?.companyName)}</div>
              </div>
            </div>

            <div className="relative shrink-0">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-3 rounded-2xl px-1 py-1 transition hover:bg-slate-100/80 dark:hover:bg-white/6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{isLoading ? "Loading..." : displayName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{isLoading ? "..." : user?.role ?? "Member"}</div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 rotate-90 text-slate-400 transition-transform dark:text-slate-500", accountMenuOpen && "rotate-180")} />
                </button>
              </div>

              {accountMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-72 rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-[0_22px_60px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_22px_60px_rgba(2,6,23,0.45)]">
                  <div className="rounded-[1.1rem] bg-slate-50 p-3 dark:bg-white/[0.04]">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">{isLoading ? "Loading..." : displayName}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isLoading ? "..." : user?.email ?? "No email"}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isLoading ? "..." : `${user?.role ?? "Member"} | ${user?.status ?? "ACTIVE"}`}</div>
                  </div>
                  <div className="mt-3 grid gap-1">
                    <AccountMenuButton label="Profile" icon={<UserRound className="h-4 w-4" />} />
                    <AccountMenuButton label="Company settings" icon={<Settings2 className="h-4 w-4" />} />
                    <AccountMenuButton label="Billing history" icon={<WalletCards className="h-4 w-4" />} />
                    <AccountMenuButton label="Help & support" icon={<CircleHelp className="h-4 w-4" />} />
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
                    <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {activeSection === "dashboard" ? (
            <DashboardOverview
              isLoading={isLoading}
              displayName={displayName}
              planName={usage?.planName}
              billingPeriod={usage?.billingPeriod}
              monthlySummary={monthlySummary}
              stats={stats}
              topStates={topStates}
            />
          ) : null}

          {activeSection === "documents" ? (
            <DocumentsPanel
              documents={filteredDocuments}
              allDocuments={documents ?? []}
              usage={usage}
              documentDetail={documentDetail}
              selectedDocumentId={selectedDocumentId}
              isLoading={isLoading}
              isDetailLoading={isDocumentDetailLoading}
              documentActionId={documentActionId}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              onSearchQueryChange={setSearchQuery}
              onStatusFilterChange={setStatusFilter}
              onSelectDocument={onSelectDocument}
              onDocumentAction={onDocumentAction}
            />
          ) : null}

          {activeSection === "company" ? (
            <PlaceholderPanel
              title={companyProfile?.companyName ?? "Company profile"}
              description="Next step: company profile view and editing."
              rows={[
                ["Industry", companyProfile?.industry ?? "Not defined"],
                ["Contact", companyProfile?.contactEmail ?? "Not defined"],
              ]}
            />
          ) : null}

          {activeSection === "billing" ? (
            <PlaceholderPanel
              title={usage?.planName ?? "Billing overview"}
              description="Next step: billing and monthly history view."
              rows={[
                ["Used", String(usage?.documentsUsed ?? 0)],
                [
                  "Remaining",
                  usage?.remainingDocuments === null
                    ? "Unlimited"
                    : String(usage?.remainingDocuments ?? 0),
                ],
              ]}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DashboardOverview({
  isLoading,
  displayName,
  planName,
  billingPeriod,
  monthlySummary,
  stats,
  topStates,
}: {
  isLoading: boolean;
  displayName: string;
  planName?: string | null;
  billingPeriod?: string | null;
  monthlySummary?: Props["monthlySummary"];
  stats: ReturnType<typeof buildContractStats>;
  topStates: Array<{ label: string; value: number; tone: "slate" | "blue" | "cyan" | "green" | "forest" | "rose" }>;
}) {
  const progressStates = [
    { label: "Draft", value: stats.draft, tone: "bg-slate-400" },
    { label: "Sent", value: stats.sent, tone: "bg-[#2563eb]" },
    { label: "Viewed", value: stats.viewed, tone: "bg-cyan-500" },
    { label: "Signed", value: stats.signed, tone: "bg-emerald-500" },
    { label: "Completed", value: stats.completed, tone: "bg-green-700" },
    { label: "Cancelled", value: stats.cancelled, tone: "bg-rose-500" },
  ] as const;

  return (
    <>
      <section className="rounded-[1.9rem] border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_45%,#dbeafe_100%)] p-5 text-slate-950 shadow-[0_24px_70px_rgba(36,76,144,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b1220_0%,#111827_40%,#1d4ed8_100%)] dark:text-white dark:shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600/70 dark:text-white/65">NoaSign</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white md:text-5xl">{isLoading ? "Welcome" : "Welcome back"}</h1>
            <p className="mt-3 text-base text-slate-700 dark:text-white/88 md:text-lg">{isLoading ? "Loading user..." : displayName}</p>
            <div className="mt-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-white/55">Built by NoaTechSolutions</div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_10px_30px_rgba(37,99,235,0.10)] backdrop-blur dark:border-white/14 dark:bg-white/10 dark:text-white dark:shadow-none">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-white/60">Current plan</span>
            <span className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.32)]">{isLoading ? "Loading..." : planName ?? "-"}</span>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Current month</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Contract activity</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">This dashboard only shows contracts from {billingPeriod ?? "the current month"}.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{isLoading ? "Loading..." : `${stats.total} contracts this month`}</div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-4">
            <div className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] p-5 dark:border-white/10 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly overview</div>
                  <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{isLoading ? "Loading..." : `${stats.total} contracts`}</div>
                </div>
                <DonutChart stats={stats} billingPeriod={billingPeriod ?? undefined} />
              </div>
              <div className="mt-5 grid gap-3">
                <MiniMetric label="Sent this month" value={isLoading ? "..." : String(monthlySummary?.documentsSent ?? stats.sent)} />
                <MiniMetric label="Billing counted" value={isLoading ? "..." : String(monthlySummary?.documentsSent ?? 0)} />
                <MiniMetric label="Overage docs" value={isLoading ? "..." : String(monthlySummary?.overageDocuments ?? 0)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {topStates.map((state) => <StatusCard key={state.label} label={state.label} value={state.value} detail={statusDetail(state.label)} tone={state.tone} />)}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Status distribution</div>
                <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Current month breakdown</div>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">Live</div>
            </div>
            <div className="mt-6 space-y-4">
              {progressStates.map((state) => <ChartRow key={state.label} label={state.label} value={state.value} total={stats.total} color={state.tone} />)}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function DocumentsPanel(props: {
  documents: Doc[] | null;
  allDocuments: Doc[];
  usage: Props["usage"];
  documentDetail: DocDetail | null;
  selectedDocumentId: string | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  documentActionId: string | null;
  searchQuery: string;
  statusFilter: StatusFilter;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSelectDocument: (documentId: string) => void;
  onDocumentAction: (documentId: string, action: "send" | "cancel" | "reactivate") => void;
}) {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const pageSizeMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const totalDocuments = props.documents?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalDocuments / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = totalDocuments === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalDocuments);
  const paginatedDocuments = useMemo(
    () => (props.documents ?? []).slice(pageStart, pageEnd),
    [pageEnd, pageStart, props.documents],
  );

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
    <section className="grid gap-4">
      <div className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Documents</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Contracts workspace</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Review all documents, filter by status, inspect detail and trigger allowed lifecycle actions.</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileStatsOpen((current) => !current)}
            className="inline-flex h-11 items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/5 md:hidden"
          >
            <span>Workspace metrics</span>
            <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform dark:text-slate-500", mobileStatsOpen && "rotate-90")} />
          </button>
          <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", mobileStatsOpen ? "grid" : "hidden md:grid")}>
            <StatPill label="Total" value={String(props.allDocuments.length)} />
            <StatPill label="Draft" value={String(props.allDocuments.filter((item) => item.status === "DRAFT").length)} />
            <StatPill label="In progress" value={String(props.allDocuments.filter((item) => ["SENT", "VIEWED", "SIGNED"].includes(item.status)).length)} />
            <StatPill label="Billing counted" value={props.usage?.isUnlimited ? `${props.usage.documentsUsed} counted` : `${props.usage?.documentsUsed ?? 0} of ${props.usage?.monthlyDocLimit ?? 0}`} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={props.searchQuery} onChange={(event) => {
              setCurrentPage(1);
              props.onSearchQueryChange(event.target.value);
            }} placeholder="Search by number, status or type" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white dark:caret-blue-300 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:text-white" />
          </div>
          <div ref={filterMenuRef} className="relative md:hidden">
            <button
              type="button"
              onClick={() => setFilterMenuOpen((current) => !current)}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter</span>
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
          <div className="hidden flex-wrap gap-2 md:flex">
            {(["ALL", "DRAFT", "SENT", "VIEWED", "SIGNED", "COMPLETED", "CANCELLED"] as const).map((option) => (
              <button key={option} type="button" onClick={() => {
                setCurrentPage(1);
                props.onStatusFilterChange(option);
              }} className={cn("rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition", props.statusFilter === option ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10")}>
                {option === "ALL" ? "All" : option.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Results</div>
            <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{props.isLoading ? "Loading..." : `${totalDocuments} contracts`}</div>
          </div>
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

        {props.isLoading ? (
          <div className="p-5">
            <EmptyBlock text="Loading documents..." />
          </div>
        ) : props.documents && props.documents.length > 0 ? (
          <>
            <div className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1.1fr)_112px_120px_64px] items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 md:grid">
              <div>Client</div>
              <div>Document</div>
              <div>Date</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

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
                        {getFinalCustomerName(document)}
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
                          {document.documentType?.name ?? "Untyped document"}
                        </div>
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <DocumentListActions
                        document={document}
                        actionInFlight={props.documentActionId === document.id}
                        onView={() => props.onSelectDocument(document.id)}
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
                          {document.isOverage ? <InlineBadge tone="rose">Overage</InlineBadge> : null}
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
                        onView={() => props.onSelectDocument(document.id)}
                        onAction={props.onDocumentAction}
                      />
                    </div>
                  </div>
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
  );
}
function PlaceholderPanel({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="rounded-[1.9rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)]">
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <StatPill key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

function InfoCard({ label, title, subtitle, accent = false }: { label: string; title: string; subtitle: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-[1.5rem] border p-4 shadow-[0_12px_30px_rgba(48,88,160,0.08)] dark:border-white/10 dark:shadow-none", accent ? "border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_100%)] dark:bg-[linear-gradient(135deg,#111827_0%,#172036_100%)]" : "border-slate-200 bg-white/85 dark:bg-white/5")}>
      <div className={cn("text-[11px] font-semibold uppercase tracking-[0.28em]", accent ? "text-blue-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-500")}>{label}</div>
      <div className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"><div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</div><div className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{value}</div></div>;
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400"><span className="text-slate-400 dark:text-slate-500">{icon}</span>{label}</div><div className="mt-3 text-sm font-medium text-slate-950 dark:text-white">{value}</div></div>;
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">{text}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    SENT: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    VIEWED: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    SIGNED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    COMPLETED: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  };
  return <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", tones[status] ?? "bg-slate-100 text-slate-700")}>{status}</span>;
}

function InlineBadge({ children, tone }: { children: ReactNode; tone: "blue" | "rose" }) {
  const styles = { blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300", rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" };
  return <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]", styles[tone])}>{children}</span>;
}

function DocumentListActions({
  document: rowDocument,
  actionInFlight,
  onView,
  onAction,
}: {
  document: Doc;
  actionInFlight: boolean;
  onView: () => void;
  onAction: (documentId: string, action: "send" | "cancel" | "reactivate") => void;
}) {
  const [open, setOpen] = useState(false);
  const workflowActions = getDocumentActions(rowDocument.status);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        aria-label="Open document actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onView();
              setOpen(false);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/6"
          >
            View
          </button>

          {rowDocument.status === "DRAFT" ? (
            <button
              type="button"
              onClick={() => {
                onView();
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              Edit
            </button>
          ) : null}

          {workflowActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                onAction(rowDocument.id, action.key);
                setOpen(false);
              }}
              disabled={actionInFlight}
              className={cn(
                "mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                action.tone,
                actionInFlight && "cursor-not-allowed opacity-60",
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

function Logo() {
  return <Link href="/dashboard" className="relative z-20 flex items-center space-x-3 py-1 text-sm font-normal text-slate-950 dark:text-white"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2563eb] text-base font-bold text-white shadow-[0_14px_28px_rgba(37,99,235,0.28)]">N</div><motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid whitespace-pre text-left"><span className="text-base font-semibold">NoaSign</span><span className="text-[8px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">by NoaTechSolutions</span></motion.span></Link>;
}

function LogoIcon() {
  return <Link href="/dashboard" className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2563eb] text-base font-bold text-white shadow-[0_14px_28px_rgba(37,99,235,0.28)]">N</div></Link>;
}

function DonutChart({ stats, billingPeriod }: { stats: ReturnType<typeof buildContractStats>; billingPeriod?: string }) {
  const total = Math.max(stats.total, 1);
  const segments = [{ value: stats.draft, color: "#94a3b8" }, { value: stats.sent, color: "#2563eb" }, { value: stats.viewed, color: "#06b6d4" }, { value: stats.signed, color: "#10b981" }, { value: stats.completed, color: "#166534" }, { value: stats.cancelled, color: "#f43f5e" }];
  let cumulative = 0;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
        <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
        {segments.map((segment, index) => {
          const fraction = segment.value / total;
          const dash = fraction * 264;
          const gap = 264 - dash;
          const offset = -cumulative * 264;
          cumulative += fraction;
          if (segment.value === 0) return null;
          return <circle key={`segment-${index}`} cx="60" cy="60" r="42" fill="none" stroke={segment.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset} />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{formatBillingMonthShort(billingPeriod)}</div>
        <div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">{stats.total}</div>
      </div>
    </div>
  );
}

function ChartRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 8 : 0) : 0;
  return <div className="grid gap-2"><div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium text-slate-600 dark:text-slate-300">{label}</span><span className="font-semibold text-slate-950 dark:text-white">{value}</span></div><div className="h-3 rounded-full bg-white dark:bg-slate-950/70"><div className={cn("h-3 rounded-full transition-all", color)} style={{ width: `${width}%` }} /></div></div>;
}

function StatusCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "slate" | "blue" | "cyan" | "green" | "forest" | "rose" }) {
  const tones = { slate: "bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-900/80 dark:border-white/10 dark:text-slate-100", blue: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-100", cyan: "bg-cyan-50 border-cyan-200 text-cyan-900 dark:bg-cyan-950/40 dark:border-cyan-900 dark:text-cyan-100", green: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-100", forest: "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/40 dark:border-green-900 dark:text-green-100", rose: "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-100" };
  return <div className={cn("rounded-[1.5rem] border p-4", tones[tone])}><div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">{label}</div><div className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{value}</div><div className="mt-2 text-sm opacity-80">{detail}</div></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950/70"><span className="text-sm text-slate-500 dark:text-slate-400">{label}</span><span className="text-sm font-semibold text-slate-950 dark:text-white">{value}</span></div>;
}

function AccountMenuButton({ label, icon }: { label: string; icon: ReactNode }) {
  return <button type="button" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/6"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">{icon}</span><span>{label}</span></button>;
}

function buildContractStats(documents: Doc[] | null) {
  const stats = { draft: 0, sent: 0, viewed: 0, signed: 0, completed: 0, cancelled: 0, total: 0 };
  for (const document of documents ?? []) {
    stats.total += 1;
    if (document.status === "DRAFT") stats.draft += 1;
    if (document.status === "SENT") stats.sent += 1;
    if (document.status === "VIEWED") stats.viewed += 1;
    if (document.status === "SIGNED") stats.signed += 1;
    if (document.status === "COMPLETED") stats.completed += 1;
    if (document.status === "CANCELLED") stats.cancelled += 1;
  }
  return stats;
}

function filterCurrentMonthDocuments(documents: Doc[] | null, billingPeriod?: string) {
  if (!documents || !billingPeriod) return [];
  return documents.filter((document) => {
    const date = new Date(document.createdAt);
    if (Number.isNaN(date.getTime())) return false;
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return period === billingPeriod;
  });
}

function statusDetail(label: string) {
  if (label === "Draft") return "Ready to edit";
  if (label === "Sent") return "Awaiting recipient action";
  if (label === "Viewed") return "Opened by recipient";
  if (label === "Signed") return "Signed, pending completion";
  if (label === "Completed") return "Finished contracts";
  return "Closed or cancelled";
}

function getDisplayName(email?: string | null) {
  if (!email) return "User";
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").replace(/\d+/g, " ").trim();
  if (!cleaned) return email;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFinalCustomerName(document: Doc) {
  const data = document.data?.dataJson ?? {};
  const candidates = [
    data.customer_name,
    data.owner_name,
    data.client_name,
    data.customer_full_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "Final customer not provided";
}

function getFinalCustomerEmail(document: Doc) {
  const data = document.data?.dataJson ?? {};
  const candidates = [
    data.customer_email,
    data.client_email,
    data.owner_email,
    data.email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function formatBillingMonthShort(billingPeriod?: string) {
  if (!billingPeriod) return "Mon";
  const [year, month] = billingPeriod.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return "Mon";
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function sectionEyebrow(section: SectionKey) {
  if (section === "documents") return "Documents";
  if (section === "company") return "Company";
  if (section === "billing") return "Billing";
  return "Workspace";
}

function sectionTitle(section: SectionKey, companyName?: string | null) {
  if (section === "documents") return "Contract lifecycle";
  if (section === "company") return companyName ?? "Company profile";
  if (section === "billing") return "Usage and limits";
  return companyName ?? "NoaSign";
}

function getDocumentActions(status?: string | null) {
  if (status === "DRAFT") return [{ key: "send" as const, label: "Send document", icon: <Send className="h-4 w-4" />, tone: "bg-blue-600 text-white hover:bg-blue-700" }, { key: "cancel" as const, label: "Cancel draft", icon: <Ban className="h-4 w-4" />, tone: "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20" }];
  if (status === "SENT") return [{ key: "cancel" as const, label: "Cancel document", icon: <Ban className="h-4 w-4" />, tone: "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20" }];
  if (status === "CANCELLED") return [{ key: "reactivate" as const, label: "Reactivate draft", icon: <Undo2 className="h-4 w-4" />, tone: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20" }];
  return [];
}

function buildTimeline(document: DocDetail) {
  return [{ label: "Created", value: formatDate(document.createdAt) }, { label: "Sent", value: formatDate(document.sentAt) }, { label: "Viewed", value: formatDate(document.viewedAt) }, { label: "Signed", value: formatDate(document.signedAt) }, { label: "Completed", value: formatDate(document.completedAt) }, { label: "Cancelled", value: formatDate(document.cancelledAt) }];
}


