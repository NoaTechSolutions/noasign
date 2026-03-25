"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Ban,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Compass,
  CreditCard,
  Download,
  Factory,
  FileJson,
  FileText,
  Globe,
  LayoutDashboard,
  Landmark,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  MapPinned,
  MapPlus,
  Pencil,
  Phone,
  Pin,
  ScanText,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  Undo2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { MasterUsersPanel } from "./master-users-panel";

type Doc = {
  id: string;
  documentNumber: string;
  status: string;
  contractDate: string;
  createdAt: string;
  pandadocDocumentId?: string | null;
  pandadocStatus?: string | null;
  pandadocLastSyncedAt?: string | null;
  billingPeriod?: string | null;
  sentAt?: string | null;
  cancelledAt?: string | null;
  viewedAt?: string | null;
  signedAt?: string | null;
  completedAt?: string | null;
  countedInBilling: boolean;
  isOverage: boolean;
  user?: { email: string; role?: string } | null;
  companyProfile?: { companyName?: string | null } | null;
  documentType?: { name: string; code: string } | null;
  formDefinition?: { name: string; key: string } | null;
  data?: { dataJson: Record<string, unknown> } | null;
};

type DocDetail = Doc & {
  pandadocTemplate?: { name: string; templateKey: string } | null;
  data?: { dataJson: Record<string, unknown> } | null;
  versions?: Array<{ id: string; versionNumber: number; createdAt: string }>;
};

type DocumentTypeCatalogItem = {
  id: string;
  name: string;
  code: string;
  formDefinitions: Array<{
    id: string;
    name: string;
    key: string;
  }>;
  pandaTemplates: Array<{
    id: string;
    name: string;
    templateKey: string;
  }>;
};

type Props = {
  user: {
    id?: string | null;
    companyProfileId?: string | null;
    email: string;
    role: string;
    status: string;
  } | null;
  companyProfile: {
    id: string;
    companyName: string;
    legalName: string | null;
    industry: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    phone2: string | null;
    contactEmail: string | null;
    contactFirstName: string | null;
    contactLastName: string | null;
    contactTitle: string | null;
    contactPhone: string | null;
    contactAddressLine1: string | null;
    contactAddressLine2: string | null;
    contactCity: string | null;
    contactState: string | null;
    contactZipCode: string | null;
    contactCountry: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    country: string | null;
    logoUrl: string | null;
    licenseNumber: string | null;
    planName: string;
  } | null;
  usage: {
    planName: string;
    billingPeriod: string;
    monthlyDocLimit: number;
    documentsUsed: number;
    remainingDocuments: number | null;
    isUnlimited: boolean;
    overagePrice: string | number;
    overageDocuments: number;
  } | null;
  monthlySummary: {
    month: string;
    planName: string;
    monthlyDocLimit: number;
    isUnlimited: boolean;
    documentsSent: number;
    overageDocuments: number;
    estimatedOverageCost: number;
    overagePrice: string | number;
  } | null;
  billingHistory: Array<{
    month: string;
    planName: string;
    monthlyDocLimit: number;
    isUnlimited: boolean;
    overagePrice: string | number;
    documentsSent: number;
    overageDocuments: number;
    estimatedOverageCost: number;
  }>;
  users: Array<{
    id: string;
    companyProfileId: string | null;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }> | null;
  documents: Doc[] | null;
  documentTypes: DocumentTypeCatalogItem[];
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
  onUpdateDraft: (
    documentId: string,
    payload: { contractDate: string; dataJson: Record<string, unknown> },
  ) => Promise<void>;
  onSyncDocumentStatus: (documentId: string) => Promise<void>;
  onDownloadFinalPdf: (documentId: string) => Promise<void>;
  onCreateDraft: (payload: {
    documentTypeId: string;
    formDefinitionId: string;
    pandadocTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
  }) => Promise<DocDetail | void>;
  onUpdateCompanyProfile: (payload: {
    companyName?: string;
    legalName?: string;
    email?: string;
    phone?: string;
    website?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    logoUrl?: string;
    contactFirstName?: string;
    contactLastName?: string;
    contactTitle?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactAddressLine1?: string;
    contactAddressLine2?: string;
    contactCity?: string;
    contactState?: string;
    contactZipCode?: string;
    contactCountry?: string;
  }) => Promise<unknown>;
  onCreateUser: (payload: {
    email: string;
    password: string;
    role: string;
  }) => Promise<void>;
  onUpdateUser: (
    userId: string,
    payload: { email?: string; role?: string; status?: string },
  ) => Promise<void>;
  onDeactivateUser: (userId: string) => Promise<void>;
  onReactivateUser: (userId: string) => Promise<void>;
  onSignOut: () => void;
};

type ViewerTabKey = "client" | "project" | "pricing" | "timeline" | "pdf";
type EditableViewerTabKey = "client" | "project" | "pricing";
type SectionKey = "dashboard" | "documents" | "users" | "profile" | "billing";
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
  billingHistory,
  users,
  documents,
  documentTypes,
  documentDetail,
  selectedDocumentId,
  isDocumentDetailLoading,
  documentActionId,
  isLoading,
  onSelectDocument,
  onDocumentAction,
  onUpdateDraft,
  onSyncDocumentStatus,
  onDownloadFinalPdf,
  onCreateDraft,
  onUpdateCompanyProfile,
  onCreateUser,
  onUpdateUser,
  onDeactivateUser,
  onReactivateUser,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentViewerInitialTab, setDocumentViewerInitialTab] =
    useState<ViewerTabKey>("client");
  const [documentViewerInitialEditingTab, setDocumentViewerInitialEditingTab] =
    useState<EditableViewerTabKey | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const displayName =
    companyProfile?.companyName?.trim() || getDisplayName(user?.email);
  const accountSubtitle =
    companyProfile?.email?.trim() || user?.email || "No email";
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

  useEffect(() => {
    function syncSidebarState() {
      setOpen(window.innerWidth >= 1280);
    }

    syncSidebarState();
    window.addEventListener("resize", syncSidebarState);

    return () => {
      window.removeEventListener("resize", syncSidebarState);
    };
  }, []);

  const links = [
    { key: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
    ...(user?.role === "MASTER"
      ? [{ key: "users" as const, label: "Users", icon: <Users className="h-5 w-5 shrink-0" /> }]
      : []),
    { key: "documents" as const, label: "Documents", icon: <FileText className="h-5 w-5 shrink-0" /> },
    { key: "profile" as const, label: "Profile", icon: <UserRound className="h-5 w-5 shrink-0" /> },
    { key: "billing" as const, label: "Billing", icon: <CreditCard className="h-5 w-5 shrink-0" /> },
  ];

  function closeDocumentViewer() {
    setDocumentViewerOpen(false);
    setDocumentViewerInitialTab("client");
    setDocumentViewerInitialEditingTab(null);
  }

  function openDocumentViewer(options: {
    documentId: string;
    tab?: ViewerTabKey;
    editingTab?: EditableViewerTabKey | null;
  }) {
    setDocumentViewerInitialTab(options.tab ?? "client");
    setDocumentViewerInitialEditingTab(options.editingTab ?? null);
    setDocumentViewerOpen(true);
    onSelectDocument(options.documentId);
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[color:var(--bg-page)]/70 backdrop-blur md:flex-row">
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <div className="mt-8">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
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
                      setAccountMenuOpen(false);
                      if (window.innerWidth < 1280) {
                        setOpen(false);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Workspace
              </div>
              <div className="mt-3 grid gap-3">
                <InfoCard label="Company" title={isLoading ? "Loading..." : companyProfile?.companyName ?? "NoaSign"} subtitle={isLoading ? "..." : usage?.billingPeriod ?? "Current month"} />
                <InfoCard label="Plan" title={isLoading ? "Loading..." : usage?.planName ?? "-"} subtitle={isLoading ? "..." : usage?.isUnlimited ? "Unlimited documents" : `${usage?.documentsUsed ?? 0} used this month`} accent />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm font-medium text-[color:var(--danger-text)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--danger-bg)]"
            >
              Sign out
            </button>
            <div className="px-3 text-left text-[11px] font-medium tracking-[0.18em] text-[color:var(--text-muted)]">
              Powered by <span className="font-semibold text-[color:var(--text-secondary)]">NoaTechSolutions</span>
            </div>
            <div className="px-3 text-center text-[11px] font-medium tracking-[0.18em] text-[color:var(--text-muted)]">
              Version <span className="font-semibold text-[color:var(--text-secondary)]">1.0.0</span>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex min-w-0 flex-1">
        <div className="flex h-full w-full flex-1 flex-col gap-4 bg-transparent p-4 pt-4 md:border-l md:border-[color:var(--topbar-border)] md:p-6 md:pt-6">
          <div className="-mx-4 flex min-h-12 items-center justify-between gap-3 border-b border-[color:var(--topbar-border)] px-4 py-2 md:-mx-6 md:px-6 md:py-3">
            <div className="flex min-w-0 flex-1 items-center justify-start gap-3">
              {!open ? (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-neutral-hover)] hover:text-[color:var(--text-primary)]"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
              ) : null}
              <div className="hidden min-w-0 flex-col items-start text-left sm:flex">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">{sectionEyebrow(activeSection)}</div>
                <div className="truncate text-sm font-medium text-[color:var(--text-primary)]">{sectionTitle(activeSection, companyProfile?.companyName)}</div>
              </div>
            </div>

            <div className="relative shrink-0">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-3 rounded-2xl px-1 py-1 transition hover:bg-[color:var(--bg-surface)]"
                >
                  <CompanyAvatar companyName={companyProfile?.companyName} logoUrl={companyProfile?.logoUrl} className="h-10 w-10 rounded-2xl text-sm shadow-[var(--shadow-soft)]" />
                  <div className="hidden text-left sm:block">
                    <div className="text-sm font-semibold text-[color:var(--text-primary)]">{isLoading ? "Loading..." : displayName}</div>
                    <div className="text-xs text-[color:var(--text-muted)]">{isLoading ? "..." : accountSubtitle}</div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 rotate-90 text-[color:var(--text-muted)] transition-transform", accountMenuOpen && "rotate-180")} />
                </button>
              </div>

              {accountMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-72 rounded-[1.4rem] border border-[color:var(--menu-border)] bg-[color:var(--menu-bg)] p-3 shadow-[var(--shadow-dropdown)]">
                  <div className="rounded-[1.1rem] bg-[color:var(--bg-surface)] p-3">
                    <div className="text-sm font-semibold text-[color:var(--text-primary)]">{isLoading ? "Loading..." : displayName}</div>
                    <div className="mt-1 text-xs text-[color:var(--text-secondary)]">{isLoading ? "..." : accountSubtitle}</div>
                    <div className="mt-1 text-xs text-[color:var(--text-secondary)]">{isLoading ? "..." : `${user?.role ?? "Member"} | ${user?.status ?? "ACTIVE"}`}</div>
                  </div>
                  <div className="mt-3 grid gap-1">
                    <AccountMenuButton
                      label="Profile"
                      icon={<UserRound className="h-4 w-4" />}
                      onClick={() => {
                        setActiveSection("profile");
                        setAccountMenuOpen(false);
                      }}
                    />
                    <AccountMenuButton
                      label="Billing history"
                      icon={<WalletCards className="h-4 w-4" />}
                      onClick={() => {
                        setActiveSection("billing");
                        setAccountMenuOpen(false);
                      }}
                    />
                    <AccountMenuButton label="Help & support" icon={<CircleHelp className="h-4 w-4" />} />
                  </div>
                  <div className="mt-3 border-t border-[color:var(--divider)] pt-3">
                    <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-[color:var(--danger-text)] transition hover:bg-[color:var(--danger-bg)]">
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
              documentTypes={documentTypes}
              usage={usage}
              documentDetail={documentDetail}
              selectedDocumentId={selectedDocumentId}
              currentUserRole={user?.role ?? null}
              isLoading={isLoading}
              isDetailLoading={isDocumentDetailLoading}
              documentActionId={documentActionId}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
              onSearchQueryChange={setSearchQuery}
              onStatusFilterChange={setStatusFilter}
              onSelectDocument={onSelectDocument}
              onOpenDocumentView={(documentId) => {
                openDocumentViewer({
                  documentId,
                  tab: "client",
                  editingTab: null,
                });
              }}
              onOpenDocumentEdit={(documentId) => {
                openDocumentViewer({
                  documentId,
                  tab: "client",
                  editingTab: "client",
                });
              }}
              onDocumentAction={onDocumentAction}
              onCreateDraft={onCreateDraft}
            />
          ) : null}

          {activeSection === "profile" ? (
            <ProfilePanel
              user={user}
              companyProfile={companyProfile}
              usage={usage}
              onUpdateCompanyProfile={onUpdateCompanyProfile}
            />
          ) : null}

          {activeSection === "users" && user?.role === "MASTER" ? (
            <MasterUsersPanel
              users={users}
              currentUserId={user.id}
              isLoading={isLoading}
              onCreateUser={onCreateUser}
              onUpdateUser={onUpdateUser}
              onDeactivateUser={onDeactivateUser}
              onReactivateUser={onReactivateUser}
            />
          ) : null}

          {activeSection === "billing" ? (
            <BillingPanel
              usage={usage}
              monthlySummary={monthlySummary}
              billingHistory={billingHistory}
            />
          ) : null}
        </div>
      </div>

      <DocumentViewer
        key={`${documentDetail?.id ?? "empty"}-${documentViewerOpen ? "open" : "closed"}-${documentViewerInitialTab}-${documentViewerInitialEditingTab ?? "view"}`}
        open={documentViewerOpen}
        document={documentDetail}
        isLoading={isDocumentDetailLoading}
        actionInFlight={documentActionId}
        initialActiveTab={documentViewerInitialTab}
        initialEditingTab={documentViewerInitialEditingTab}
        onClose={closeDocumentViewer}
        onAction={onDocumentAction}
        onUpdateDraft={onUpdateDraft}
        onSyncDocumentStatus={onSyncDocumentStatus}
        onDownloadFinalPdf={onDownloadFinalPdf}
      />
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
  documentTypes: DocumentTypeCatalogItem[];
  usage: Props["usage"];
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
  onDocumentAction: (documentId: string, action: "send" | "cancel" | "reactivate") => void;
  onCreateDraft: (payload: {
    documentTypeId: string;
    formDefinitionId: string;
    pandadocTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
  }) => Promise<DocDetail | void>;
}) {
  type MasterSortKey = "user" | "company" | "client" | "document" | "status" | "created";
  type UserSortKey = "client" | "document" | "date" | "status";
  type SortKey = MasterSortKey | UserSortKey;
  type SortDirection = "asc" | "desc";

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
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

  function SortHeader({
    label,
    columnKey,
    align = "left",
  }: {
    label: string;
    columnKey: SortKey;
    align?: "left" | "right";
  }) {
    const isActive = sortKey === columnKey;

    return (
      <button
        type="button"
        onClick={() => toggleSort(columnKey)}
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
              onClick={() => setCreateDrawerOpen(true)}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto"
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
                <SortHeader label="User" columnKey="user" />
                <SortHeader label="Company" columnKey="company" />
                <SortHeader label="Client" columnKey="client" />
                <SortHeader label="Document" columnKey="document" />
                <SortHeader label="Status" columnKey="status" />
                <SortHeader label="Created" columnKey="created" />
                <div className="text-right">Actions</div>
              </div>
            ) : (
              <div className="hidden grid-cols-[minmax(0,1.25fr)_minmax(0,1.1fr)_112px_120px_64px] items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03] md:grid">
                <SortHeader label="Client" columnKey="client" />
                <SortHeader label="Document" columnKey="document" />
                <SortHeader label="Date" columnKey="date" />
                <SortHeader label="Status" columnKey="status" />
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
                              {document.isOverage ? <InlineBadge tone="rose">Overage</InlineBadge> : null}
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
      <CreateDraftDrawer
        open={createDrawerOpen}
        documentTypes={props.documentTypes}
        onClose={() => setCreateDrawerOpen(false)}
        onCreateDraft={props.onCreateDraft}
        onOpenDocumentView={(documentId) => props.onOpenDocumentView(documentId)}
      />
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

function BillingPanel({
  usage,
  monthlySummary,
  billingHistory,
}: {
  usage: Props["usage"];
  monthlySummary: Props["monthlySummary"];
  billingHistory: Props["billingHistory"];
}) {
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const currentPlan = usage?.planName ?? monthlySummary?.planName ?? "LAUNCH";
  const documentsUsed = usage?.documentsUsed ?? 0;
  const monthlyLimit = usage?.monthlyDocLimit ?? monthlySummary?.monthlyDocLimit ?? 0;
  const remaining = usage?.remainingDocuments;
  const overageDocuments = usage?.overageDocuments ?? monthlySummary?.overageDocuments ?? 0;
  const overagePrice = Number(usage?.overagePrice ?? monthlySummary?.overagePrice ?? 0);
  const nextInvoiceOverage = overageDocuments * overagePrice;
  const usagePercent = usage?.isUnlimited || monthlyLimit <= 0 ? 0 : Math.min((documentsUsed / monthlyLimit) * 100, 100);
  const maxHistoryValue = Math.max(...billingHistory.map((item) => item.documentsSent), 1);
  const currentMonthSummary = billingHistory[billingHistory.length - 1] ?? null;
  const previousMonthSummary = billingHistory[billingHistory.length - 2] ?? null;
  const compareMaxValue = Math.max(
    currentMonthSummary?.documentsSent ?? 0,
    previousMonthSummary?.documentsSent ?? 0,
    1,
  );
  const planCards = [
    {
      name: "LAUNCH",
      limit: "5 docs / month",
      accent: "border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white",
    },
    {
      name: "SCALE",
      limit: "25 docs / month",
      accent: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
    },
    {
      name: "PRO_UNLIMITED",
      limit: "Unlimited volume",
      accent: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
    },
  ];

  return (
    <section className="grid gap-4">
      <div className="rounded-[1.9rem] border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_40%,#dbeafe_100%)] p-5 shadow-[0_24px_70px_rgba(36,76,144,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b1220_0%,#111827_42%,#1d4ed8_100%)] dark:shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600/70 dark:text-white/65">Billing</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white md:text-5xl">Understand your plan in seconds</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 dark:text-white/88 md:text-base">
              See how many documents you used this month, how close you are to your limit, and what would be charged on your next payment if you go over.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">Used this month</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{documentsUsed}</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">Still available</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{remaining === null ? "Unlimited" : remaining}</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.10)] dark:border-white/10 dark:bg-white/10 dark:shadow-none">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/60">Next extra charge</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{formatCurrency(nextInvoiceOverage)}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 xl:items-end">
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_10px_30px_rgba(37,99,235,0.10)] backdrop-blur dark:border-white/14 dark:bg-white/10 dark:text-white dark:shadow-none">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-white/60">Current plan</span>
              <span className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.32)]">{currentPlan}</span>
            </div>
            <button
              type="button"
              onClick={() => setPlansModalOpen(true)}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              Need more documents?
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Current month</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                  {usage?.billingPeriod ? `Usage for ${usage.billingPeriod}` : "Usage overview"}
                </h3>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {usage?.isUnlimited ? "Unlimited plan" : `${documentsUsed} of ${monthlyLimit} docs used`}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatPill label="Documents used" value={String(documentsUsed)} />
              <StatPill label="Remaining" value={remaining === null ? "Unlimited" : String(remaining)} />
              <StatPill label="Overage docs" value={String(overageDocuments)} />
              <StatPill label="Next invoice overage" value={formatCurrency(nextInvoiceOverage)} />
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Plan usage progress</div>
                <div className="text-sm font-semibold text-slate-950 dark:text-white">
                  {usage?.isUnlimited ? "Unlimited" : `${Math.round(usagePercent)}%`}
                </div>
              </div>
              <div className="mt-4 h-4 rounded-full bg-white dark:bg-slate-950/70">
                <div
                  className={cn(
                    "h-4 rounded-full transition-all",
                    overageDocuments > 0 ? "bg-rose-500" : usagePercent > 75 ? "bg-amber-500" : "bg-[#2563eb]",
                  )}
                  style={{ width: `${usage?.isUnlimited ? 100 : Math.max(usagePercent, documentsUsed > 0 ? 10 : 0)}%` }}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Monthly limit" value={usage?.isUnlimited ? "Unlimited" : String(monthlyLimit)} />
                <MiniMetric label="Per overage doc" value={formatCurrency(overagePrice)} />
                <MiniMetric label="Charge next cycle" value={formatCurrency(nextInvoiceOverage)} />
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">3-month trend</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Documents used recently</h3>
              </div>
              <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:bg-white/[0.04] dark:text-slate-300">Live data</div>
            </div>
            <div className="mt-6 grid gap-4">
              {billingHistory.map((item) => (
                <BillingHistoryRow
                  key={item.month}
                  month={item.month}
                  documentsSent={item.documentsSent}
                  overageDocuments={item.overageDocuments}
                  maxValue={maxHistoryValue}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Month vs month</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Current month compared to last month</h3>
              </div>
              <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:bg-white/[0.04] dark:text-slate-300">Comparison</div>
            </div>
            <div className="mt-6 grid gap-5">
              {previousMonthSummary ? (
                <>
                  <MonthCompareBar
                    label={formatBillingMonthLabel(previousMonthSummary.month)}
                    documentsSent={previousMonthSummary.documentsSent}
                    overageDocuments={previousMonthSummary.overageDocuments}
                    maxValue={compareMaxValue}
                    tone="slate"
                  />
                  <MonthCompareBar
                    label={formatBillingMonthLabel(currentMonthSummary?.month)}
                    documentsSent={currentMonthSummary?.documentsSent ?? documentsUsed}
                    overageDocuments={currentMonthSummary?.overageDocuments ?? overageDocuments}
                    maxValue={compareMaxValue}
                    tone="blue"
                  />
                </>
              ) : (
                <EmptyBlock text="A comparison chart will appear once at least two billing months are available." />
              )}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Overage visibility</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">What happens next</h3>
            <div className="mt-5 grid gap-3">
              <DetailRow icon={<CreditCard className="h-4 w-4" />} label="Current plan" value={currentPlan} />
              <DetailRow icon={<FileText className="h-4 w-4" />} label="Docs above plan" value={String(overageDocuments)} />
              <DetailRow icon={<WalletCards className="h-4 w-4" />} label="Price per extra doc" value={formatCurrency(overagePrice)} />
              <DetailRow icon={<WalletCards className="h-4 w-4" />} label="Estimated next charge" value={formatCurrency(nextInvoiceOverage)} />
            </div>
            <div className={cn(
              "mt-5 rounded-[1.35rem] border p-4 text-sm",
              overageDocuments > 0
                ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
            )}>
              {overageDocuments > 0
                ? `You are currently ${overageDocuments} document(s) above your monthly plan. This estimated overage will be included on the next invoice.`
                : "You are still within plan limits for the current billing month."}
            </div>
          </div>
        </div>
      </div>

      {plansModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Close plans modal" onClick={() => setPlansModalOpen(false)} className="absolute inset-0" />
          <div className="relative z-10 w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900 md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Need more documents?</div>
                <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Upgrade your plan before you hit the limit</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Your current plan is <span className="font-semibold text-slate-900 dark:text-white">{currentPlan}</span>. Compare the next plans and choose the one that fits your monthly document volume.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlansModalOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {planCards.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "rounded-[1.6rem] border p-5",
                    plan.accent,
                    plan.name === currentPlan && "ring-2 ring-[#2563eb]/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                        {plan.name === currentPlan ? "Current plan" : "Available plan"}
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{plan.name}</div>
                    </div>
                    <span className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                      plan.name === currentPlan ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950" : "bg-[#2563eb] text-white",
                    )}>
                      {plan.name === currentPlan ? "Current" : "Upgrade"}
                    </span>
                  </div>
                  <div className="mt-4 text-sm opacity-85">{plan.limit}</div>
                  <div className="mt-6 rounded-[1.2rem] bg-white/70 p-4 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:bg-slate-950/40 dark:shadow-none">
                    {plan.name === "LAUNCH" ? "Best for early-stage teams with low monthly volume." : null}
                    {plan.name === "SCALE" ? "Best if you are growing and need more room before overage charges kick in." : null}
                    {plan.name === "PRO_UNLIMITED" ? "Best for teams that send documents constantly and want predictable billing." : null}
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      plan.name === currentPlan
                        ? "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                        : "bg-[#2563eb] text-white hover:bg-blue-700",
                    )}
                  >
                    {plan.name === currentPlan ? "You are on this plan" : `Choose ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProfilePanel({
  user,
  companyProfile,
  usage,
  onUpdateCompanyProfile,
}: {
  user: Props["user"];
  companyProfile: Props["companyProfile"];
  usage: Props["usage"];
  onUpdateCompanyProfile: Props["onUpdateCompanyProfile"];
}) {
  const companyName = companyProfile?.companyName ?? "Company not defined";
  const contactName = [companyProfile?.contactFirstName, companyProfile?.contactLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const primaryContact = contactName || companyProfile?.contactEmail || "Contact not defined";
  const location = [companyProfile?.city, companyProfile?.state, companyProfile?.country]
    .filter(Boolean)
    .join(", ");
  const primaryContactAddress = joinDefined(
    [companyProfile?.contactAddressLine1, companyProfile?.contactAddressLine2],
    ", ",
  );
  const logoFallback = getCompanyInitials(companyProfile?.companyName);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingCompanyDetails, setIsEditingCompanyDetails] = useState(false);
  const [isEditingPrimaryContact, setIsEditingPrimaryContact] = useState(false);
  const [isSavingCompanyDetails, setIsSavingCompanyDetails] = useState(false);
  const [isSavingPrimaryContact, setIsSavingPrimaryContact] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [profileErrorMessage, setProfileErrorMessage] = useState("");
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");
  const [companyDetailsForm, setCompanyDetailsForm] = useState({
    companyName: "",
    legalName: "",
    industry: "",
    licenseNumber: "",
    phone: "",
    phone2: "",
    email: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    state: "",
    city: "",
    zipCode: "",
  });
  const [primaryContactForm, setPrimaryContactForm] = useState({
    contactFullName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    contactAddressLine1: "",
    contactAddressLine2: "",
    contactState: "",
    contactCity: "",
    contactZipCode: "",
  });

  useEffect(() => {
    setCompanyDetailsForm({
      companyName: companyProfile?.companyName ?? "",
      legalName: companyProfile?.legalName ?? "",
      industry: companyProfile?.industry ?? "",
      licenseNumber: companyProfile?.licenseNumber ?? "",
      phone: formatUsPhone(companyProfile?.phone ?? ""),
      phone2: formatUsPhone(companyProfile?.phone2 ?? ""),
      email: companyProfile?.email ?? "",
      website: companyProfile?.website ?? "",
      addressLine1: companyProfile?.addressLine1 ?? "",
      addressLine2: companyProfile?.addressLine2 ?? "",
      state: companyProfile?.state ?? "",
      city: companyProfile?.city ?? "",
      zipCode: companyProfile?.zipCode ?? "",
    });
    setPrimaryContactForm({
      contactFullName: [companyProfile?.contactFirstName, companyProfile?.contactLastName]
        .filter(Boolean)
        .join(" ")
        .trim(),
      contactTitle: companyProfile?.contactTitle ?? "",
      contactEmail: companyProfile?.contactEmail ?? "",
      contactPhone: formatUsPhone(companyProfile?.contactPhone ?? ""),
      contactAddressLine1: companyProfile?.contactAddressLine1 ?? "",
      contactAddressLine2: companyProfile?.contactAddressLine2 ?? "",
      contactState: companyProfile?.contactState ?? "",
      contactCity: companyProfile?.contactCity ?? "",
      contactZipCode: companyProfile?.contactZipCode ?? "",
    });
  }, [companyProfile]);

  async function saveCompanyDetails() {
    if (companyDetailsForm.email.trim() && !isValidEmail(companyDetailsForm.email)) {
      setProfileErrorMessage("Enter a valid company email address");
      return;
    }

    const payload = buildChangedProfilePayload(
      {
        companyName: companyProfile?.companyName ?? "",
        legalName: companyProfile?.legalName ?? "",
        industry: companyProfile?.industry ?? "",
        licenseNumber: companyProfile?.licenseNumber ?? "",
        phone: formatUsPhone(companyProfile?.phone ?? ""),
        phone2: formatUsPhone(companyProfile?.phone2 ?? ""),
        email: companyProfile?.email ?? "",
        website: companyProfile?.website ?? "",
        addressLine1: companyProfile?.addressLine1 ?? "",
        addressLine2: companyProfile?.addressLine2 ?? "",
        state: companyProfile?.state ?? "",
        city: companyProfile?.city ?? "",
        zipCode: companyProfile?.zipCode ?? "",
      },
      {
        ...companyDetailsForm,
        phone: formatUsPhone(companyDetailsForm.phone),
        phone2: formatUsPhone(companyDetailsForm.phone2),
      },
    );

    if (Object.keys(payload).length === 0) {
      setIsEditingCompanyDetails(false);
      return;
    }

    setIsSavingCompanyDetails(true);
    try {
      await onUpdateCompanyProfile(payload);
      setIsEditingCompanyDetails(false);
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsSavingCompanyDetails(false);
    }
  }

  async function savePrimaryContact() {
    const { firstName, lastName } = splitFullName(primaryContactForm.contactFullName);

    if (primaryContactForm.contactEmail.trim() && !isValidEmail(primaryContactForm.contactEmail)) {
      setProfileErrorMessage("Enter a valid primary contact email address");
      return;
    }

    const payload = buildChangedProfilePayload(
      {
        contactFirstName: companyProfile?.contactFirstName ?? "",
        contactLastName: companyProfile?.contactLastName ?? "",
        contactTitle: companyProfile?.contactTitle ?? "",
        contactEmail: companyProfile?.contactEmail ?? "",
        contactPhone: formatUsPhone(companyProfile?.contactPhone ?? ""),
        contactAddressLine1: companyProfile?.contactAddressLine1 ?? "",
        contactAddressLine2: companyProfile?.contactAddressLine2 ?? "",
        contactState: companyProfile?.contactState ?? "",
        contactCity: companyProfile?.contactCity ?? "",
        contactZipCode: companyProfile?.contactZipCode ?? "",
      },
      {
        contactFirstName: firstName,
        contactLastName: lastName,
        contactTitle: primaryContactForm.contactTitle,
        contactEmail: primaryContactForm.contactEmail,
        contactPhone: formatUsPhone(primaryContactForm.contactPhone),
        contactAddressLine1: primaryContactForm.contactAddressLine1,
        contactAddressLine2: primaryContactForm.contactAddressLine2,
        contactState: primaryContactForm.contactState,
        contactCity: primaryContactForm.contactCity,
        contactZipCode: primaryContactForm.contactZipCode,
      },
    );

    if (Object.keys(payload).length === 0) {
      setIsEditingPrimaryContact(false);
      return;
    }

    setIsSavingPrimaryContact(true);
    try {
      await onUpdateCompanyProfile(payload);
      setIsEditingPrimaryContact(false);
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsSavingPrimaryContact(false);
    }
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      event.target.value = "";
      return;
    }

    // Keep uploads lightweight enough to store in the existing logoUrl string field.
    const maxFileSizeBytes = 3 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      event.target.value = "";
      return;
    }

    setIsUploadingLogo(true);

    try {
      const logoUrl = await resizeImageFile(file, 512);
      await onUpdateCompanyProfile({ logoUrl });
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  }

  return (
    <section className="grid gap-4">
      {profileErrorMessage ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4">
          <button
            type="button"
            aria-label="Close error popup"
            className="absolute inset-0"
            onClick={() => setProfileErrorMessage("")}
          />
          <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--danger-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
            <div className="text-lg font-semibold text-[color:var(--text-primary)]">Validation error</div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              {profileErrorMessage}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setProfileErrorMessage("")}
                className="rounded-xl bg-[color:var(--button-danger)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-danger-hover)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {profileSuccessMessage ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4">
          <button
            type="button"
            aria-label="Close success popup"
            className="absolute inset-0"
            onClick={() => setProfileSuccessMessage("")}
          />
          <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--success-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
            <div className="text-lg font-semibold text-[color:var(--text-primary)]">Saved</div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              {profileSuccessMessage}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setProfileSuccessMessage("")}
                className="rounded-xl bg-[color:var(--button-success)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-success-hover)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="rounded-[1.9rem] border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_42%,#dbeafe_100%)] p-6 shadow-[0_24px_70px_rgba(36,76,144,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b1220_0%,#111827_42%,#1d4ed8_100%)] dark:shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start md:gap-5">
            <div className="relative h-24 w-24 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white text-2xl font-semibold text-blue-700 shadow-[0_18px_40px_rgba(37,99,235,0.18)] dark:border-white/10 dark:bg-slate-950 dark:text-blue-200 sm:h-20 sm:w-20 sm:text-xl md:h-24 md:w-24 md:text-2xl">
                {companyProfile?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={companyProfile.logoUrl}
                    alt={`${companyName} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{logoFallback}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="absolute -bottom-2 -right-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.30)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-950"
                aria-label="Upload company logo"
                title="Upload logo"
              >
                {isUploadingLogo ? (
                  <span className="text-[10px] font-semibold">...</span>
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                className="hidden"
                onChange={(event) => void handleLogoUpload(event)}
              />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white md:text-5xl">
                {companyName}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 dark:text-white/88 md:text-base">
                {companyProfile?.email ?? ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ProfileChip label={companyProfile?.industry ?? "Industry not defined"} />
                <ProfileChip label={location || "Location not defined"} />
                <ProfileChip label={primaryContact} />
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_10px_30px_rgba(37,99,235,0.10)] backdrop-blur dark:border-white/14 dark:bg-white/10 dark:text-white dark:shadow-none">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-white/60">Current plan</span>
            <span className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.32)]">
              {usage?.planName ?? companyProfile?.planName ?? "-"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Company details
            </div>
            <ProfileEditActions
              isEditing={isEditingCompanyDetails}
              isSaving={isSavingCompanyDetails}
              onEdit={() => setIsEditingCompanyDetails(true)}
              onCancel={() => {
                setIsEditingCompanyDetails(false);
                setCompanyDetailsForm({
                  companyName: companyProfile?.companyName ?? "",
                  legalName: companyProfile?.legalName ?? "",
                  industry: companyProfile?.industry ?? "",
                  licenseNumber: companyProfile?.licenseNumber ?? "",
                  phone: formatUsPhone(companyProfile?.phone ?? ""),
                  phone2: formatUsPhone(companyProfile?.phone2 ?? ""),
                  email: companyProfile?.email ?? "",
                  website: companyProfile?.website ?? "",
                  addressLine1: companyProfile?.addressLine1 ?? "",
                  addressLine2: companyProfile?.addressLine2 ?? "",
                  state: companyProfile?.state ?? "",
                  city: companyProfile?.city ?? "",
                  zipCode: companyProfile?.zipCode ?? "",
                });
              }}
              onSave={() => void saveCompanyDetails()}
            />
          </div>
          {isEditingCompanyDetails ? (
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<Building2 className="h-4 w-4" />} label="Company name" value={companyDetailsForm.companyName} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, companyName: value }))} />
                <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Legal name" value={companyDetailsForm.legalName} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, legalName: value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<Factory className="h-4 w-4" />} label="Industry" value={companyDetailsForm.industry} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, industry: value }))} />
                <EditableField icon={<FileText className="h-4 w-4" />} label="License number" value={companyDetailsForm.licenseNumber} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, licenseNumber: value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<Phone className="h-4 w-4" />} label="Phone" value={companyDetailsForm.phone} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, phone: formatUsPhone(value) }))} />
                <EditableField icon={<Phone className="h-4 w-4" />} label="Fax" value={companyDetailsForm.phone2} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, phone2: formatUsPhone(value) }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<Mail className="h-4 w-4" />} label="Company email" value={companyDetailsForm.email} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, email: value }))} />
                <EditableField icon={<Globe className="h-4 w-4" />} label="Website" value={companyDetailsForm.website} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, website: value }))} />
              </div>
              <EditableField icon={<MapPlus className="h-4 w-4" />} label="Address line 1" value={companyDetailsForm.addressLine1} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, addressLine1: value }))} />
              <EditableField icon={<MapPinned className="h-4 w-4" />} label="Address line 2" value={companyDetailsForm.addressLine2} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, addressLine2: value }))} />
              <div className="grid gap-3 md:grid-cols-3">
                <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={companyDetailsForm.state} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, state: value }))} />
                <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={companyDetailsForm.city} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, city: value }))} />
                <EditableField icon={<Pin className="h-4 w-4" />} label="ZIP" value={companyDetailsForm.zipCode} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, zipCode: value }))} />
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow icon={<Building2 className="h-4 w-4" />} label="Company name" value={companyName} />
                <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Legal name" value={companyProfile?.legalName ?? ""} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow icon={<Factory className="h-4 w-4" />} label="Industry" value={companyProfile?.industry ?? ""} />
                <DetailRow icon={<FileText className="h-4 w-4" />} label="License number" value={companyProfile?.licenseNumber ?? ""} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={formatUsPhone(companyProfile?.phone ?? "")} />
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Fax" value={formatUsPhone(companyProfile?.phone2 ?? "")} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow icon={<Mail className="h-4 w-4" />} label="Company email" value={companyProfile?.email ?? ""} />
                <DetailRow icon={<Globe className="h-4 w-4" />} label="Website" value={companyProfile?.website ?? ""} />
              </div>
              <DetailRow
                icon={<MapPlus className="h-4 w-4" />}
                label="Address line 1"
                value={companyProfile?.addressLine1 ?? ""}
              />
              {companyProfile?.addressLine2?.trim() ? (
                <DetailRow
                  icon={<MapPinned className="h-4 w-4" />}
                  label="Address line 2"
                  value={companyProfile.addressLine2}
                />
              ) : null}
              <div className="grid gap-3 md:grid-cols-3">
                <DetailRow icon={<Landmark className="h-4 w-4" />} label="State" value={companyProfile?.state ?? ""} />
                <DetailRow icon={<Compass className="h-4 w-4" />} label="City" value={companyProfile?.city ?? ""} />
                <DetailRow icon={<Pin className="h-4 w-4" />} label="ZIP" value={companyProfile?.zipCode ?? ""} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Primary contact
            </div>
            <ProfileEditActions
              isEditing={isEditingPrimaryContact}
              isSaving={isSavingPrimaryContact}
              onEdit={() => setIsEditingPrimaryContact(true)}
              onCancel={() => {
                setIsEditingPrimaryContact(false);
                setPrimaryContactForm({
                  contactFullName: [companyProfile?.contactFirstName, companyProfile?.contactLastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim(),
                  contactTitle: companyProfile?.contactTitle ?? "",
                  contactEmail: companyProfile?.contactEmail ?? "",
                  contactPhone: formatUsPhone(companyProfile?.contactPhone ?? ""),
                  contactAddressLine1: companyProfile?.contactAddressLine1 ?? "",
                  contactAddressLine2: companyProfile?.contactAddressLine2 ?? "",
                  contactState: companyProfile?.contactState ?? "",
                  contactCity: companyProfile?.contactCity ?? "",
                  contactZipCode: companyProfile?.contactZipCode ?? "",
                });
              }}
              onSave={() => void savePrimaryContact()}
            />
          </div>
          {isEditingPrimaryContact ? (
            <div className="mt-4 grid gap-3">
              <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={primaryContactForm.contactFullName} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactFullName: value }))} />
              <EditableField icon={<Briefcase className="h-4 w-4" />} label="Title" value={primaryContactForm.contactTitle} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactTitle: value }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<Mail className="h-4 w-4" />} label="Email" value={primaryContactForm.contactEmail} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactEmail: value }))} />
                <EditableField icon={<Phone className="h-4 w-4" />} label="Phone" value={primaryContactForm.contactPhone} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactPhone: formatUsPhone(value) }))} />
              </div>
              <EditableField icon={<MapPinned className="h-4 w-4" />} label="Address line 1" value={primaryContactForm.contactAddressLine1} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactAddressLine1: value }))} />
              <EditableField icon={<MapPinned className="h-4 w-4" />} label="Address line 2" value={primaryContactForm.contactAddressLine2} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactAddressLine2: value }))} />
              <div className="grid gap-3 md:grid-cols-3">
                <EditableField icon={<MapPinned className="h-4 w-4" />} label="State" value={primaryContactForm.contactState} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactState: value }))} />
                <EditableField icon={<MapPinned className="h-4 w-4" />} label="City" value={primaryContactForm.contactCity} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactCity: value }))} />
                <EditableField icon={<MapPinned className="h-4 w-4" />} label="ZIP code" value={primaryContactForm.contactZipCode} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactZipCode: value }))} />
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={contactName || ""} />
                <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Title" value={companyProfile?.contactTitle ?? ""} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={companyProfile?.contactEmail ?? ""} />
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={formatUsPhone(companyProfile?.contactPhone ?? "")} />
              </div>
              <DetailRow
                icon={<MapPlus className="h-4 w-4" />}
                label="Address line 1"
                value={companyProfile?.contactAddressLine1 ?? ""}
              />
              {companyProfile?.contactAddressLine2?.trim() ? (
                <DetailRow
                  icon={<MapPinned className="h-4 w-4" />}
                  label="Address line 2"
                  value={companyProfile.contactAddressLine2}
                />
              ) : null}
              <div className="grid gap-3 md:grid-cols-3">
                <DetailRow icon={<Landmark className="h-4 w-4" />} label="State" value={companyProfile?.contactState ?? ""} />
                <DetailRow icon={<Compass className="h-4 w-4" />} label="City" value={companyProfile?.contactCity ?? ""} />
                <DetailRow icon={<Pin className="h-4 w-4" />} label="ZIP code" value={companyProfile?.contactZipCode ?? ""} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CreateDraftDrawer({
  open,
  documentTypes,
  onClose,
  onCreateDraft,
  onOpenDocumentView,
}: {
  open: boolean;
  documentTypes: DocumentTypeCatalogItem[];
  onClose: () => void;
  onCreateDraft: (payload: {
    documentTypeId: string;
    formDefinitionId: string;
    pandadocTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
  }) => Promise<DocDetail | void>;
  onOpenDocumentView: (documentId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"client" | "project" | "pricing" | "others">("client");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [sameProjectAddressAsCustomer, setSameProjectAddressAsCustomer] = useState(true);
  const [financeEnabled, setFinanceEnabled] = useState(false);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState("");
  const [selectedFormDefinitionId, setSelectedFormDefinitionId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({
    customer_name: "",
    customer_age: "",
    customer_phone: "",
    customer_email: "",
    customer_fax: "",
    customer_address: "",
    city: "",
    state: "",
    zip: "",
    project_address: "",
    project_city: "",
    project_state: "",
    project_zip: "",
    start_date: "",
    estimated_completion_date: "",
    project_name: "",
    project_description: "",
    contract_scope: "",
    salesman_full_name: "",
    state_registration_number: "",
    warranty_years: "",
    contract_amount: "",
    down_payment_amount: "",
    finance_charge: "",
    finance_1_amount: "",
    finance_1_description: "",
    finance_1_date: "",
    finance_2_amount: "",
    finance_2_description: "",
    finance_2_date: "",
    finance_3_amount: "",
    finance_3_description: "",
    finance_3_date: "",
    finance_4_amount: "",
    finance_4_description: "",
    finance_4_date: "",
    payment_schedule: "",
    notes: "",
  });

  const selectedDocumentType = useMemo(
    () => documentTypes.find((item) => item.id === selectedDocumentTypeId) ?? null,
    [documentTypes, selectedDocumentTypeId],
  );

  useEffect(() => {
    setContractDate((current) => current || toDateInputValue(new Date().toISOString()));
  }, []);

  useEffect(() => {
    if (!open) return;
    const firstType = documentTypes[0] ?? null;
    setSelectedDocumentTypeId(firstType?.id ?? "");
  }, [documentTypes, open]);

  useEffect(() => {
    if (!selectedDocumentType) {
      setSelectedFormDefinitionId("");
      setSelectedTemplateId("");
      return;
    }
    setSelectedFormDefinitionId(selectedDocumentType.formDefinitions[0]?.id ?? "");
    setSelectedTemplateId(selectedDocumentType.pandaTemplates[0]?.id ?? "");
  }, [selectedDocumentType]);

  if (!open) {
    return null;
  }

  function requestClose() {
    if (isSubmitting) return;
    setConfirmCloseOpen(true);
  }

  async function handleSubmit() {
    if (!selectedDocumentTypeId || !selectedFormDefinitionId || !selectedTemplateId || !contractDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      const document = await onCreateDraft({
        documentTypeId: selectedDocumentTypeId,
        formDefinitionId: selectedFormDefinitionId,
        pandadocTemplateId: selectedTemplateId,
        contractDate,
        dataJson: buildCreateDraftPayload(fields, sameProjectAddressAsCustomer, financeEnabled),
      });

      onClose();

      if (document?.id) {
        onOpenDocumentView(document.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-start justify-center bg-slate-950/45 p-2 pt-1 backdrop-blur-sm md:items-center md:p-4">
      <button type="button" aria-label="Close draft creator" onClick={requestClose} className="absolute inset-0" />
      <aside className="relative z-10 flex max-h-[98vh] w-full max-w-[90vw] flex-col overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950 md:h-[96vh] md:max-h-[96vh] md:max-w-[96vw]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Create draft</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">New document</h2>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create a draft, then continue editing it in the document viewer.</div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Document type"
              value={selectedDocumentTypeId}
              onChange={setSelectedDocumentTypeId}
              icon={<FileText className="h-4 w-4" />}
              disabled
              options={documentTypes.map((item) => ({ value: item.id, label: item.name }))}
            />
            <EditableField
              icon={<ScanText className="h-4 w-4" />}
              label="Contract date"
              type="date"
              value={contractDate}
              onChange={setContractDate}
              disabled
            />
            <SelectField
              label="Form"
              value={selectedFormDefinitionId}
              onChange={setSelectedFormDefinitionId}
              icon={<FileJson className="h-4 w-4" />}
              disabled
              options={(selectedDocumentType?.formDefinitions ?? []).map((item) => ({ value: item.id, label: item.name }))}
            />
            <SelectField
              label="Template"
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              icon={<LayoutDashboard className="h-4 w-4" />}
              disabled
              options={(selectedDocumentType?.pandaTemplates ?? []).map((item) => ({ value: item.id, label: item.name }))}
            />
          </div>
        </div>

        <div className="border-b border-slate-200 px-5 py-3 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "client", label: "Client" },
              { key: "project", label: "Project" },
              { key: "pricing", label: "Pricing" },
              { key: "others", label: "Others" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as "client" | "project" | "pricing" | "others")}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                  activeTab === tab.key
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-5">
          {activeTab === "client" ? (
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <EditableField icon={<UserRound className="h-4 w-4" />} label="Customer name" value={fields.customer_name} placeholder="Full name" onChange={(value) => setFields((current) => ({ ...current, customer_name: value }))} />
                <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Age" value={fields.customer_age} placeholder="35" onChange={(value) => setFields((current) => ({ ...current, customer_age: value.replace(/\D/g, "").slice(0, 3) }))} />
              </div>
              <EditableField icon={<Mail className="h-4 w-4" />} label="Email" value={fields.customer_email} placeholder="Email address" onChange={(value) => setFields((current) => ({ ...current, customer_email: value }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<Phone className="h-4 w-4" />} label="Phone" value={fields.customer_phone} placeholder="(555) 123-4567" onChange={(value) => setFields((current) => ({ ...current, customer_phone: formatUsPhone(value) }))} />
                <EditableField icon={<ScanText className="h-4 w-4" />} label="Fax" value={fields.customer_fax} placeholder="(555) 123-4567" onChange={(value) => setFields((current) => ({ ...current, customer_fax: formatUsPhone(value) }))} />
              </div>
              <EditableField icon={<MapPlus className="h-4 w-4" />} label="Address" value={fields.customer_address} placeholder="Street address" onChange={(value) => setFields((current) => ({ ...current, customer_address: value }))} />
              <div className="grid gap-3 md:grid-cols-3">
                <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={fields.city} placeholder="City" onChange={(value) => setFields((current) => ({ ...current, city: value }))} />
                <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={fields.state} placeholder="State" onChange={(value) => setFields((current) => ({ ...current, state: value }))} />
                <EditableField icon={<Pin className="h-4 w-4" />} label="Zip code" value={fields.zip} placeholder="Zip code" onChange={(value) => setFields((current) => ({ ...current, zip: value }))} />
              </div>
            </div>
          ) : activeTab === "project" ? (
            <div className="grid gap-3">
              <label className="inline-flex items-center gap-3 rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={sameProjectAddressAsCustomer}
                  onChange={(event) => setSameProjectAddressAsCustomer(event.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--brand-accent)] focus:ring-[color:var(--focus-ring)]"
                />
                <span>Same as client address</span>
              </label>
              {!sameProjectAddressAsCustomer ? (
                <>
                  <EditableField icon={<MapPlus className="h-4 w-4" />} label="Project address" value={fields.project_address} placeholder="Project address" onChange={(value) => setFields((current) => ({ ...current, project_address: value }))} />
                  <div className="grid gap-3 md:grid-cols-3">
                    <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={fields.project_city} placeholder="City" onChange={(value) => setFields((current) => ({ ...current, project_city: value }))} />
                    <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={fields.project_state} placeholder="State" onChange={(value) => setFields((current) => ({ ...current, project_state: value }))} />
                    <EditableField icon={<Pin className="h-4 w-4" />} label="Zip code" value={fields.project_zip} placeholder="Zip code" onChange={(value) => setFields((current) => ({ ...current, project_zip: value }))} />
                  </div>
                </>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<ScanText className="h-4 w-4" />} type="date" label="Start date" value={fields.start_date} onChange={(value) => setFields((current) => ({ ...current, start_date: value }))} />
                <EditableField icon={<BadgeCheck className="h-4 w-4" />} type="date" label="Estimated completion date" value={fields.estimated_completion_date} onChange={(value) => setFields((current) => ({ ...current, estimated_completion_date: value }))} />
              </div>
              <EditableField icon={<FileText className="h-4 w-4" />} type="textarea" label="Project description" value={fields.project_description} placeholder="Project description" onChange={(value) => setFields((current) => ({ ...current, project_description: value }))} />
              <EditableField icon={<Briefcase className="h-4 w-4" />} label="Substantial commencement of work" value={fields.contract_scope} placeholder="Describe substantial commencement of work" onChange={(value) => setFields((current) => ({ ...current, contract_scope: value }))} />
            </div>
          ) : activeTab === "pricing" ? (
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <CurrencyField icon={<WalletCards className="h-4 w-4" />} label="Contract price" value={fields.contract_amount} placeholder="12000.00" onChange={(value) => setFields((current) => ({ ...current, contract_amount: formatCurrencyInput(value) }))} />
                <CurrencyField icon={<Download className="h-4 w-4" />} label="Down payment" value={fields.down_payment_amount} placeholder="2500.00" onChange={(value) => setFields((current) => ({ ...current, down_payment_amount: formatCurrencyInput(value) }))} />
              </div>
              <label className="inline-flex items-center gap-3 rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={financeEnabled}
                  onChange={(event) => setFinanceEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--brand-accent)] focus:ring-[color:var(--focus-ring)]"
                />
                <span>Finance</span>
              </label>
              {financeEnabled ? (
                <>
                  <CurrencyField icon={<CreditCard className="h-4 w-4" />} label="Finance charge" value={fields.finance_charge} placeholder="350.00" onChange={(value) => setFields((current) => ({ ...current, finance_charge: formatCurrencyInput(value) }))} />
                  {[1, 2, 3, 4].map((row) => (
                    <div key={`finance-row-${row}`} className="grid gap-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_180px]">
                      <CurrencyField
                        icon={<WalletCards className="h-4 w-4" />}
                        label={`Finance ${row}`}
                        value={fields[`finance_${row}_amount`]}
                        placeholder="1000.00"
                        onChange={(value) =>
                          setFields((current) => ({
                            ...current,
                            [`finance_${row}_amount`]: formatCurrencyInput(value),
                          }))
                        }
                      />
                      <EditableField
                        icon={<FileText className="h-4 w-4" />}
                        label="Description"
                        value={fields[`finance_${row}_description`]}
                        placeholder="Description"
                        onChange={(value) =>
                          setFields((current) => ({
                            ...current,
                            [`finance_${row}_description`]: value,
                          }))
                        }
                      />
                      <EditableField
                        icon={<ScanText className="h-4 w-4" />}
                        type="date"
                        label="Date"
                        value={fields[`finance_${row}_date`]}
                        onChange={(value) =>
                          setFields((current) => ({
                            ...current,
                            [`finance_${row}_date`]: value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </>
              ) : null}
              <EditableField icon={<WalletCards className="h-4 w-4" />} label="Payment schedule" value={fields.payment_schedule} placeholder="Payment schedule" onChange={(value) => setFields((current) => ({ ...current, payment_schedule: value }))} />
            </div>
          ) : activeTab === "others" ? (
            <div className="grid gap-3">
              <EditableField
                icon={<UserRound className="h-4 w-4" />}
                label="Salesman who solicited or negotiated contract"
                value={fields.salesman_full_name}
                placeholder="Full name"
                onChange={(value) => setFields((current) => ({ ...current, salesman_full_name: value }))}
              />
              <EditableField
                icon={<Landmark className="h-4 w-4" />}
                label="State registration number"
                value={fields.state_registration_number}
                placeholder="Registration number"
                onChange={(value) => setFields((current) => ({ ...current, state_registration_number: value }))}
              />
              <EditableField
                icon={<BadgeCheck className="h-4 w-4" />}
                label="Warranty year(s)"
                value={fields.warranty_years}
                placeholder="10"
                onChange={(value) => setFields((current) => ({ ...current, warranty_years: value.replace(/\D/g, "").slice(0, 3) }))}
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            {activeTab === "others" ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !selectedDocumentTypeId || !selectedFormDefinitionId || !selectedTemplateId || !contractDate}
                className={cn(
                  "rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700",
                  (isSubmitting || !selectedDocumentTypeId || !selectedFormDefinitionId || !selectedTemplateId || !contractDate) && "cursor-not-allowed opacity-60",
                )}
              >
                {isSubmitting ? "Creating..." : "Create draft"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setActiveTab((current) =>
                    current === "client"
                      ? "project"
                      : current === "project"
                        ? "pricing"
                        : "others",
                  )
                }
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </aside>
      {confirmCloseOpen ? (
        <div className="absolute inset-0 z-[60] flex min-h-full items-center justify-center bg-slate-950/30 p-4">
          <div className="w-full max-w-sm -translate-y-[50%] rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950 md:translate-y-0">
            <div className="text-lg font-semibold text-slate-950 dark:text-white">Cancel draft?</div>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              If you close this popup now, the information entered here will be discarded.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCloseOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCloseOpen(false);
                  onClose();
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
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

function DocumentViewer({
  open,
  document,
  isLoading,
  actionInFlight,
  initialActiveTab,
  initialEditingTab,
  onClose,
  onAction,
  onUpdateDraft,
  onSyncDocumentStatus,
  onDownloadFinalPdf,
}: {
  open: boolean;
  document: DocDetail | null;
  isLoading: boolean;
  actionInFlight: string | null;
  initialActiveTab: ViewerTabKey;
  initialEditingTab: EditableViewerTabKey | null;
  onClose: () => void;
  onAction: (documentId: string, action: "send" | "cancel" | "reactivate") => void;
  onUpdateDraft: (
    documentId: string,
    payload: { contractDate: string; dataJson: Record<string, unknown> },
  ) => Promise<void>;
  onSyncDocumentStatus: (documentId: string) => Promise<void>;
  onDownloadFinalPdf: (documentId: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<ViewerTabKey>("client");
  const [editingTab, setEditingTab] = useState<EditableViewerTabKey | null>(null);
  const [draftFields, setDraftFields] = useState<Record<string, string>>({});
  const [isSavingTab, setIsSavingTab] = useState(false);
  const actionButtons = getDocumentActions(document?.status);
  const clientProfile = useMemo(() => getClientProfile(document), [document]);
  const projectProfile = useMemo(() => getProjectProfile(document), [document]);
  const clientEntries = useMemo(() => getClientEntries(document), [document]);
  const projectEntries = useMemo(() => getProjectEntries(document), [document]);
  const pricingEntries = useMemo(() => getPricingEntries(document), [document]);
  const hasPdfStage = document?.status === "SIGNED" || document?.status === "COMPLETED";
  const isDraft = document?.status === "DRAFT";
  const canSyncStatus =
    Boolean(document?.pandadocDocumentId) &&
    ["SENT", "VIEWED", "SIGNED"].includes(document?.status ?? "");
  const canDownloadPdf = hasPdfStage && Boolean(document?.pandadocDocumentId);

  useEffect(() => {
    if (!open) {
      setActiveTab("client");
      setEditingTab(null);
      return;
    }

    setActiveTab(initialActiveTab);
    setEditingTab(isDraft ? initialEditingTab ?? null : null);
  }, [open, initialActiveTab, initialEditingTab, isDraft, document?.id]);

  useEffect(() => {
    if (!document) return;
    setDraftFields(buildDraftFieldMap(document, clientEntries, projectEntries, pricingEntries, clientProfile, projectProfile));
    setIsSavingTab(false);
  }, [document, clientEntries, projectEntries, pricingEntries, clientProfile, projectProfile]);

  async function saveEditingTab() {
    if (!document || !editingTab) return;

    const nextDataJson = { ...(document.data?.dataJson ?? {}) } as Record<string, unknown>;
    const nextContractDate = document.contractDate ? toDateInputValue(document.contractDate) : "";

    if (editingTab === "client") {
      for (const key of [
        clientProfile.nameKey,
        clientProfile.phoneKey,
        clientProfile.emailKey,
        clientProfile.addressKey,
        clientProfile.cityKey,
        clientProfile.stateKey,
        clientProfile.zipKey,
      ]) {
        if (key) {
          nextDataJson[key] = draftFields[key] ?? "";
        }
      }
    } else if (editingTab === "project") {
      for (const key of [
        projectProfile.addressKey,
        projectProfile.cityKey,
        projectProfile.stateKey,
        projectProfile.zipKey,
        projectProfile.startDateKey,
        projectProfile.estimatedCompletionDateKey,
      ]) {
        if (key) {
          nextDataJson[key] = draftFields[key] ?? "";
        }
      }
      for (const [label] of projectEntries) {
        const key = findOriginalKeyByLabel(document, label);
        if (key) {
          nextDataJson[key] = draftFields[key] ?? "";
        }
      }
    } else {
      for (const [label] of pricingEntries) {
        const key = findOriginalKeyByLabel(document, label);
        if (key) {
          nextDataJson[key] = draftFields[key] ?? "";
        }
      }
    }

    setIsSavingTab(true);
    try {
      await onUpdateDraft(document.id, {
        contractDate: nextContractDate,
        dataJson: nextDataJson,
      });
      setEditingTab(null);
    } finally {
      setIsSavingTab(false);
    }
  }

  function cancelEditingTab() {
    if (!document) return;
    setDraftFields(buildDraftFieldMap(document, clientEntries, projectEntries, pricingEntries, clientProfile, projectProfile));
    setEditingTab(null);
  }

  async function handleTabChange(nextTab: typeof activeTab) {
    if (editingTab && nextTab !== editingTab) {
      await saveEditingTab();
    }
    setActiveTab(nextTab);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm">
      <button type="button" aria-label="Close document viewer" onClick={onClose} className="absolute inset-0" />
      <aside className="relative z-10 flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Document view</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                {isLoading ? "Loading..." : document?.documentNumber ?? "Document detail"}
              </h2>
              {document ? <StatusBadge status={document.status} /> : null}
            </div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isLoading ? "Preparing detail..." : document?.documentType?.name ?? "Contract"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {document && !editingTab && canSyncStatus ? (
              <button
                type="button"
                onClick={() => void onSyncDocumentStatus(document.id)}
                disabled={actionInFlight === document.id}
                className={cn(
                  "hidden items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-4 py-2.5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)] md:inline-flex",
                  actionInFlight === document.id && "cursor-not-allowed opacity-60",
                )}
              >
                <Undo2 className="h-4 w-4" />
                <span>{actionInFlight === document.id ? "Syncing..." : "Sync status"}</span>
              </button>
            ) : null}
            {document && !editingTab && canDownloadPdf ? (
              <button
                type="button"
                onClick={() => void onDownloadFinalPdf(document.id)}
                disabled={actionInFlight === document.id}
                className={cn(
                  "hidden items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-4 py-2.5 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)] md:inline-flex",
                  actionInFlight === document.id && "cursor-not-allowed opacity-60",
                )}
              >
                <Download className="h-4 w-4" />
                <span>{actionInFlight === document.id ? "Preparing..." : "Download PDF"}</span>
              </button>
            ) : null}
            {document && !editingTab && actionButtons.length > 0 ? actionButtons.map((action) => (
              <button
                key={`viewer-header-${action.key}`}
                type="button"
                onClick={() => onAction(document.id, action.key)}
                disabled={actionInFlight === document.id}
                className={cn(
                  "hidden items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition md:inline-flex",
                  action.tone,
                  actionInFlight === document.id && "cursor-not-allowed opacity-60",
                )}
              >
                {action.icon}
                <span>{actionInFlight === document.id ? "Processing..." : action.label}</span>
              </button>
            )) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 px-5 py-3 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "client", label: "Client" },
              { key: "project", label: "Project" },
              { key: "pricing", label: "Pricing" },
              { key: "timeline", label: "Timeline" },
              ...(hasPdfStage ? [{ key: "pdf", label: "Final PDF" }] : []),
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => void handleTabChange(tab.key as typeof activeTab)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                  activeTab === tab.key
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <EmptyBlock text="Loading document detail..." />
          ) : !document ? (
            <EmptyBlock text="Select a document to inspect its detail." />
          ) : activeTab === "client" ? (
            clientProfile.name || clientProfile.email || clientProfile.phone || clientProfile.address || clientProfile.city || clientProfile.state || clientProfile.zip ? (
              <div className="grid gap-4">
                <TabEditorToolbar
                  canEdit={Boolean(isDraft)}
                  isEditing={editingTab === "client"}
                  isSaving={isSavingTab}
                  editLabel="Edit client"
                  onEdit={() => setEditingTab("client")}
                  onSave={() => void saveEditingTab()}
                  onCancel={cancelEditingTab}
                />
                <div className="grid gap-3">
                  {editingTab === "client" ? (
                    <EditableField
                      icon={<UserRound className="h-4 w-4" />}
                      label="Customer name"
                      value={clientProfile.nameKey ? draftFields[clientProfile.nameKey] ?? clientProfile.name : clientProfile.name}
                      onChange={(nextValue) => {
                        if (!clientProfile.nameKey) return;
                        setDraftFields((current) => ({ ...current, [clientProfile.nameKey!]: nextValue }));
                      }}
                    />
                  ) : (
                    <DetailRow icon={<UserRound className="h-4 w-4" />} label="Customer name" value={clientProfile.name || "Not provided"} />
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    {editingTab === "client" ? (
                      <EditableField
                        icon={<UserRound className="h-4 w-4" />}
                        label="Phone"
                        value={clientProfile.phoneKey ? draftFields[clientProfile.phoneKey] ?? clientProfile.phone : clientProfile.phone}
                        onChange={(nextValue) => {
                          if (!clientProfile.phoneKey) return;
                          setDraftFields((current) => ({ ...current, [clientProfile.phoneKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<UserRound className="h-4 w-4" />} label="Phone" value={clientProfile.phone || "Not provided"} />
                    )}

                    {editingTab === "client" ? (
                      <EditableField
                        icon={<UserRound className="h-4 w-4" />}
                        label="Email"
                        value={clientProfile.emailKey ? draftFields[clientProfile.emailKey] ?? clientProfile.email : clientProfile.email}
                        onChange={(nextValue) => {
                          if (!clientProfile.emailKey) return;
                          setDraftFields((current) => ({ ...current, [clientProfile.emailKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<UserRound className="h-4 w-4" />} label="Email" value={clientProfile.email || "Not provided"} />
                    )}
                  </div>

                  {editingTab === "client" ? (
                    <EditableField
                      icon={<Building2 className="h-4 w-4" />}
                      label="Address"
                      value={clientProfile.addressKey ? draftFields[clientProfile.addressKey] ?? clientProfile.address : clientProfile.address}
                      onChange={(nextValue) => {
                        if (!clientProfile.addressKey) return;
                        setDraftFields((current) => ({ ...current, [clientProfile.addressKey!]: nextValue }));
                      }}
                    />
                  ) : (
                    <DetailRow icon={<Building2 className="h-4 w-4" />} label="Address" value={clientProfile.address || "Not provided"} />
                  )}

                  <div className="grid gap-3 md:grid-cols-3">
                    {editingTab === "client" ? (
                      <EditableField
                        icon={<Building2 className="h-4 w-4" />}
                        label="City"
                        value={clientProfile.cityKey ? draftFields[clientProfile.cityKey] ?? clientProfile.city : clientProfile.city}
                        onChange={(nextValue) => {
                          if (!clientProfile.cityKey) return;
                          setDraftFields((current) => ({ ...current, [clientProfile.cityKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<Building2 className="h-4 w-4" />} label="City" value={clientProfile.city || "Not provided"} />
                    )}

                    {editingTab === "client" ? (
                      <EditableField
                        icon={<Building2 className="h-4 w-4" />}
                        label="State"
                        value={clientProfile.stateKey ? draftFields[clientProfile.stateKey] ?? clientProfile.state : clientProfile.state}
                        onChange={(nextValue) => {
                          if (!clientProfile.stateKey) return;
                          setDraftFields((current) => ({ ...current, [clientProfile.stateKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<Building2 className="h-4 w-4" />} label="State" value={clientProfile.state || "Not provided"} />
                    )}

                    {editingTab === "client" ? (
                      <EditableField
                        icon={<Building2 className="h-4 w-4" />}
                        label="Zip code"
                        value={clientProfile.zipKey ? draftFields[clientProfile.zipKey] ?? clientProfile.zip : clientProfile.zip}
                        onChange={(nextValue) => {
                          if (!clientProfile.zipKey) return;
                          setDraftFields((current) => ({ ...current, [clientProfile.zipKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<Building2 className="h-4 w-4" />} label="Zip code" value={clientProfile.zip || "Not provided"} />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyBlock text="No client-specific fields were found in this document payload." />
            )
          ) : activeTab === "project" ? (
            projectProfile.address || projectProfile.city || projectProfile.state || projectProfile.zip || projectProfile.startDate || projectProfile.estimatedCompletionDate || projectEntries.length > 0 ? (
              <div className="grid gap-4">
                <TabEditorToolbar
                  canEdit={Boolean(isDraft)}
                  isEditing={editingTab === "project"}
                  isSaving={isSavingTab}
                  editLabel="Edit project"
                  onEdit={() => setEditingTab("project")}
                  onSave={() => void saveEditingTab()}
                  onCancel={cancelEditingTab}
                />
                <div className="grid gap-3">
                  {editingTab === "project" ? (
                    <EditableField
                      icon={<Building2 className="h-4 w-4" />}
                      label="Project address"
                      value={projectProfile.addressKey ? draftFields[projectProfile.addressKey] ?? projectProfile.address : projectProfile.address}
                      onChange={(nextValue) => {
                        if (!projectProfile.addressKey) return;
                        setDraftFields((current) => ({ ...current, [projectProfile.addressKey!]: nextValue }));
                      }}
                    />
                  ) : (
                    <DetailRow icon={<Building2 className="h-4 w-4" />} label="Project address" value={projectProfile.address || "Not provided"} />
                  )}

                  <div className="grid gap-3 md:grid-cols-3">
                    {editingTab === "project" ? (
                      <EditableField
                        icon={<Building2 className="h-4 w-4" />}
                        label="City"
                        value={projectProfile.cityKey ? draftFields[projectProfile.cityKey] ?? projectProfile.city : projectProfile.city}
                        onChange={(nextValue) => {
                          if (!projectProfile.cityKey) return;
                          setDraftFields((current) => ({ ...current, [projectProfile.cityKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<Building2 className="h-4 w-4" />} label="City" value={projectProfile.city || "Not provided"} />
                    )}

                    {editingTab === "project" ? (
                      <EditableField
                        icon={<Building2 className="h-4 w-4" />}
                        label="State"
                        value={projectProfile.stateKey ? draftFields[projectProfile.stateKey] ?? projectProfile.state : projectProfile.state}
                        onChange={(nextValue) => {
                          if (!projectProfile.stateKey) return;
                          setDraftFields((current) => ({ ...current, [projectProfile.stateKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<Building2 className="h-4 w-4" />} label="State" value={projectProfile.state || "Not provided"} />
                    )}

                    {editingTab === "project" ? (
                      <EditableField
                        icon={<Building2 className="h-4 w-4" />}
                        label="Zip code"
                        value={projectProfile.zipKey ? draftFields[projectProfile.zipKey] ?? projectProfile.zip : projectProfile.zip}
                        onChange={(nextValue) => {
                          if (!projectProfile.zipKey) return;
                          setDraftFields((current) => ({ ...current, [projectProfile.zipKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<Building2 className="h-4 w-4" />} label="Zip code" value={projectProfile.zip || "Not provided"} />
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {editingTab === "project" ? (
                      <EditableField
                        icon={<FileJson className="h-4 w-4" />}
                        label="Start date"
                        type="date"
                        value={projectProfile.startDateKey ? draftFields[projectProfile.startDateKey] ?? toDateInputValue(projectProfile.startDate) : toDateInputValue(projectProfile.startDate)}
                        onChange={(nextValue) => {
                          if (!projectProfile.startDateKey) return;
                          setDraftFields((current) => ({ ...current, [projectProfile.startDateKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<FileJson className="h-4 w-4" />} label="Start date" value={formatDate(projectProfile.startDate)} />
                    )}

                    {editingTab === "project" ? (
                      <EditableField
                        icon={<FileJson className="h-4 w-4" />}
                        label="Estimated completion date"
                        type="date"
                        value={projectProfile.estimatedCompletionDateKey ? draftFields[projectProfile.estimatedCompletionDateKey] ?? toDateInputValue(projectProfile.estimatedCompletionDate) : toDateInputValue(projectProfile.estimatedCompletionDate)}
                        onChange={(nextValue) => {
                          if (!projectProfile.estimatedCompletionDateKey) return;
                          setDraftFields((current) => ({ ...current, [projectProfile.estimatedCompletionDateKey!]: nextValue }));
                        }}
                      />
                    ) : (
                      <DetailRow icon={<FileJson className="h-4 w-4" />} label="Estimated completion date" value={formatDate(projectProfile.estimatedCompletionDate)} />
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {projectEntries.filter(([label]) => !["Project Address", "City", "State", "Zip", "Zip Code", "Start Date", "Estimated Completion Date", "Completion Date"].includes(label)).map(([label, value]) => {
                    const key = findOriginalKeyByLabel(document, label) ?? label;
                    return editingTab === "project" ? (
                      <EditableField
                        key={label}
                        icon={<FileJson className="h-4 w-4" />}
                        label={label}
                        value={draftFields[key] ?? value}
                        onChange={(nextValue) => setDraftFields((current) => ({ ...current, [key]: nextValue }))}
                      />
                    ) : (
                        <DetailRow key={label} icon={<FileJson className="h-4 w-4" />} label={label} value={value} />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyBlock text="No project-specific fields were found in this document payload." />
            )
          ) : activeTab === "pricing" ? (
            pricingEntries.length > 0 ? (
              <div className="grid gap-4">
                <TabEditorToolbar
                  canEdit={Boolean(isDraft)}
                  isEditing={editingTab === "pricing"}
                  isSaving={isSavingTab}
                  editLabel="Edit pricing"
                  onEdit={() => setEditingTab("pricing")}
                  onSave={() => void saveEditingTab()}
                  onCancel={cancelEditingTab}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {pricingEntries.map(([label, value]) => {
                    const key = findOriginalKeyByLabel(document, label) ?? label;
                    return editingTab === "pricing" ? (
                      <EditableField
                        key={label}
                        icon={<WalletCards className="h-4 w-4" />}
                        label={label}
                        value={draftFields[key] ?? value}
                        onChange={(nextValue) => setDraftFields((current) => ({ ...current, [key]: nextValue }))}
                      />
                    ) : (
                      <DetailRow key={label} icon={<WalletCards className="h-4 w-4" />} label={label} value={value} />
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyBlock text="No pricing fields were found in this document payload." />
            )
          ) : activeTab === "timeline" ? (
            <div className="grid gap-3">
              {buildTimeline(document).map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                  <span className="font-medium text-slate-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-lg font-semibold text-slate-900 dark:text-white">Final signed PDF</div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Download the signed PDF once PandaDoc confirms the document as completed.
                </p>
                <button
                  type="button"
                  onClick={() => document && void onDownloadFinalPdf(document.id)}
                  disabled={!document || actionInFlight === document.id}
                  className={cn(
                    "mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/10",
                    (!document || actionInFlight === document.id) && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Download className="h-4 w-4" />
                  {actionInFlight === document?.id ? "Preparing..." : "Download PDF"}
                </button>
              </div>
            </div>
          )}
        </div>

        {document && !editingTab ? (
          <div className="border-t border-slate-200 px-5 py-4 dark:border-white/10">
            <div className="flex flex-wrap gap-3">
              {canSyncStatus ? (
                <button
                  type="button"
                  onClick={() => void onSyncDocumentStatus(document.id)}
                  disabled={actionInFlight === document.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]",
                    actionInFlight === document.id && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Undo2 className="h-4 w-4" />
                  <span>{actionInFlight === document.id ? "Syncing..." : "Sync status"}</span>
                </button>
              ) : null}
              {canDownloadPdf ? (
                <button
                  type="button"
                  onClick={() => void onDownloadFinalPdf(document.id)}
                  disabled={actionInFlight === document.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]",
                    actionInFlight === document.id && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Download className="h-4 w-4" />
                  <span>{actionInFlight === document.id ? "Preparing..." : "Download PDF"}</span>
                </button>
              ) : null}
              {actionButtons.length > 0 ? actionButtons.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => onAction(document.id, action.key)}
                  disabled={actionInFlight === document.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    action.tone,
                    actionInFlight === document.id && "cursor-not-allowed opacity-60",
                  )}
                >
                  {action.icon}
                  <span>{actionInFlight === document.id ? "Processing..." : action.label}</span>
                </button>
              )) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No direct actions available for this status.</div>
              )}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function InfoCard({ label, title, subtitle, accent = false }: { label: string; title: string; subtitle: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-[1.5rem] border p-4 shadow-[var(--shadow-soft)]", accent ? "border-[color:var(--border)] bg-[linear-gradient(135deg,var(--badge-primary-bg)_0%,var(--bg-surface-strong)_100%)]" : "border-[color:var(--border)] bg-[color:var(--bg-elevated)]/85")}>
      <div className={cn("text-[11px] font-semibold uppercase tracking-[0.28em]", accent ? "text-[color:var(--brand-accent-strong)]" : "text-[color:var(--text-muted)]")}>{label}</div>
      <div className="mt-3 text-sm font-semibold text-[color:var(--text-primary)]">{title}</div>
      <div className="mt-1 text-xs text-[color:var(--text-secondary)]">{subtitle}</div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4"><div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">{label}</div><div className="mt-3 text-sm font-medium leading-5 text-[color:var(--text-primary)]">{value}</div></div>;
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4"><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]"><span className="text-[color:var(--text-muted)]">{icon}</span>{label}</div><div className="mt-3 text-sm font-medium leading-5 text-[color:var(--text-primary)]">{value}</div></div>;
}

function ProfileChip({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)]/88 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)]">
      {label}
    </div>
  );
}

function CompanyAvatar({
  companyName,
  logoUrl,
  className,
}: {
  companyName?: string | null;
  logoUrl?: string | null;
  className?: string;
}) {
  const fallback = getCompanyInitials(companyName);

  return (
    <div className={cn("flex items-center justify-center overflow-hidden bg-[color:var(--brand-secondary)] font-semibold text-white", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${companyName ?? "Company"} logo`} className="h-full w-full object-cover" />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}

function ProfileEditActions({
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full border border-transparent bg-[color:var(--button-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-primary-hover)]"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="rounded-full border border-[color:var(--border)] bg-[color:var(--button-neutral-hover)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral)] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="rounded-full bg-[color:var(--button-success)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[color:var(--button-success-hover)] disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function EditableField({
  icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "textarea";
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
        {icon ? <span className="text-[color:var(--text-muted)]">{icon}</span> : null}
        {label}
      </div>
      {type === "textarea" ? (
        <textarea
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "mt-3 min-h-28 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
            disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
          )}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
            disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
          )}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  icon,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
        <span className="text-[color:var(--text-muted)]">
          {icon ?? <FileJson className="h-4 w-4" />}
        </span>
        {label}
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
          disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
        )}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CurrencyField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
        {icon ? <span className="text-[color:var(--text-muted)]">{icon}</span> : null}
        {label}
      </div>
      <div
        className={cn(
          "mt-3 flex h-11 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 transition focus-within:border-[color:var(--brand-accent)]",
          disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] opacity-80",
        )}
      >
        <span className="mr-3 text-sm font-semibold text-[color:var(--text-secondary)]">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-full w-full bg-transparent text-sm text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
        />
      </div>
    </div>
  );
}

function TabEditorToolbar({
  canEdit,
  isEditing,
  isSaving,
  editLabel,
  onEdit,
  onSave,
  onCancel,
}: {
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  editLabel: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!canEdit) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isEditing ? (
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "rounded-xl bg-[color:var(--button-success)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-success-hover)]",
              isSaving && "cursor-not-allowed opacity-60",
            )}
          >
            {isSaving ? "Saving..." : "Save tab"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl bg-[color:var(--button-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)]"
        >
          {editLabel}
        </button>
      )}
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--bg-surface)] px-5 py-8 text-center text-sm text-[color:var(--text-secondary)]">{text}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    DRAFT: "bg-[color:var(--badge-neutral-bg)] text-[color:var(--badge-neutral-text)]",
    SENT: "bg-[color:var(--badge-primary-bg)] text-[color:var(--badge-primary-text)]",
    VIEWED: "bg-[color:var(--info-bg)] text-[color:var(--info-text)]",
    SIGNED: "bg-[color:var(--success-bg)] text-[color:var(--success-text)]",
    COMPLETED: "bg-[color:var(--success-bg)] text-[color:var(--success-text)]",
    CANCELLED: "bg-[color:var(--badge-danger-bg)] text-[color:var(--badge-danger-text)]",
  };
  return <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", tones[status] ?? "bg-[color:var(--badge-neutral-bg)] text-[color:var(--badge-neutral-text)]")}>{status}</span>;
}

function InlineBadge({ children, tone }: { children: ReactNode; tone: "blue" | "rose" }) {
  const styles = { blue: "bg-[color:var(--badge-primary-bg)] text-[color:var(--badge-primary-text)]", rose: "bg-[color:var(--badge-danger-bg)] text-[color:var(--badge-danger-text)]" };
  return <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]", styles[tone])}>{children}</span>;
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
  onAction: (documentId: string, action: "send" | "cancel" | "reactivate") => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const workflowActions = getDocumentActions(rowDocument.status);
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
  return <Link href="/dashboard" className="relative z-20 flex items-center space-x-3 py-1 text-sm font-normal text-[color:var(--text-primary)]"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--brand-secondary)] text-base font-bold text-white shadow-[var(--shadow-medium)]">N</div><motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid whitespace-pre text-left"><span className="text-base font-semibold">NoaSign</span><span className="text-[8px] font-medium uppercase tracking-[0.2em] text-[color:var(--text-muted)]">by NoaTechSolutions</span></motion.span></Link>;
}

function LogoIcon() {
  return <Link href="/dashboard" className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-[color:var(--text-primary)]"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--brand-secondary)] text-base font-bold text-white shadow-[var(--shadow-medium)]">N</div></Link>;
}

function DonutChart({ stats, billingPeriod }: { stats: ReturnType<typeof buildContractStats>; billingPeriod?: string }) {
  const total = Math.max(stats.total, 1);
  const segments = [{ value: stats.draft, color: "#8a9bb8" }, { value: stats.sent, color: "#05a5ff" }, { value: stats.viewed, color: "#0400f0" }, { value: stats.signed, color: "#0f9f6e" }, { value: stats.completed, color: "#022977" }, { value: stats.cancelled, color: "#c2410c" }];
  let cumulative = 0;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
        <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(2,41,119,0.12)" strokeWidth="12" />
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
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">{formatBillingMonthShort(billingPeriod)}</div>
        <div className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">{stats.total}</div>
      </div>
    </div>
  );
}

function ChartRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 8 : 0) : 0;
  return <div className="grid gap-2"><div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium text-[color:var(--text-secondary)]">{label}</span><span className="font-semibold text-[color:var(--text-primary)]">{value}</span></div><div className="h-3 rounded-full bg-[color:var(--bg-elevated)]"><div className={cn("h-3 rounded-full transition-all", color)} style={{ width: `${width}%` }} /></div></div>;
}

function BillingHistoryRow({
  month,
  documentsSent,
  overageDocuments,
  maxValue,
}: {
  month: string;
  documentsSent: number;
  overageDocuments: number;
  maxValue: number;
}) {
  const width = Math.max((documentsSent / maxValue) * 100, documentsSent > 0 ? 10 : 0);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--text-primary)]">{formatBillingMonthLabel(month)}</div>
          <div className="text-xs text-[color:var(--text-secondary)]">
            {overageDocuments > 0 ? `${overageDocuments} overage doc(s)` : "Within plan limit"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-[color:var(--text-primary)]">{documentsSent}</div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">docs</div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-[color:var(--bg-surface)]">
        <div
          className={cn("h-3 rounded-full transition-all", overageDocuments > 0 ? "bg-[color:var(--button-danger)]" : "bg-[color:var(--brand-accent)]")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MonthCompareBar({
  label,
  documentsSent,
  overageDocuments,
  maxValue,
  tone,
}: {
  label?: string | null;
  documentsSent: number;
  overageDocuments: number;
  maxValue: number;
  tone: "slate" | "blue";
}) {
  const width = Math.max((documentsSent / maxValue) * 100, documentsSent > 0 ? 10 : 0);
  const color = tone === "blue" ? "bg-[color:var(--brand-accent)]" : "bg-[color:var(--text-muted)]";

  return (
    <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--text-primary)]">{label ?? "Current month"}</div>
          <div className="mt-1 text-xs text-[color:var(--text-secondary)]">
            {overageDocuments > 0 ? `${overageDocuments} overage doc(s)` : "No overage"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">{documentsSent}</div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">docs</div>
        </div>
      </div>
      <div className="mt-4 h-4 rounded-full bg-[color:var(--bg-elevated)]">
        <div className={cn("h-4 rounded-full transition-all", color)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function StatusCard({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "slate" | "blue" | "cyan" | "green" | "forest" | "rose" }) {
  const tones = { slate: "bg-[color:var(--badge-neutral-bg)] border-[color:var(--border)] text-[color:var(--text-primary)]", blue: "bg-[color:var(--badge-primary-bg)] border-[color:var(--info-border)] text-[color:var(--badge-primary-text)]", cyan: "bg-[color:var(--info-bg)] border-[color:var(--info-border)] text-[color:var(--info-text)]", green: "bg-[color:var(--success-bg)] border-[color:var(--success-border)] text-[color:var(--success-text)]", forest: "bg-[color:var(--success-bg)] border-[color:var(--success-border)] text-[color:var(--success-text)]", rose: "bg-[color:var(--danger-bg)] border-[color:var(--danger-border)] text-[color:var(--danger-text)]" };
  return <div className={cn("rounded-[1.5rem] border p-4", tones[tone])}><div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">{label}</div><div className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{value}</div><div className="mt-2 text-sm opacity-80">{detail}</div></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3"><span className="text-sm text-[color:var(--text-secondary)]">{label}</span><span className="text-sm font-semibold text-[color:var(--text-primary)]">{value}</span></div>;
}

function AccountMenuButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
}) {
  return <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-[color:var(--menu-text)] transition hover:bg-[color:var(--menu-hover)]"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)]">{icon}</span><span>{label}</span></button>;
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
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function getClientProfile(document: DocDetail | null) {
  const data = document?.data?.dataJson ?? {};

  const nameKey = pickFirstExistingKey(data, ["customer_full_name", "customer_name", "client_name"]);
  const phoneKey = pickFirstExistingKey(data, ["customer_phone", "client_phone"]);
  const emailKey = pickFirstExistingKey(data, ["customer_email", "client_email"]);
  const addressKey = pickFirstExistingKey(data, ["customer_address", "client_address"]);
  const cityKey = pickFirstExistingKey(data, ["customer_city", "client_city", "city"]);
  const stateKey = pickFirstExistingKey(data, ["customer_state", "client_state", "state"]);
  const zipKey = pickFirstExistingKey(data, ["customer_zip", "client_zip", "zip", "zip_code", "zipcode"]);

  return {
    nameKey,
    phoneKey,
    emailKey,
    addressKey,
    cityKey,
    stateKey,
    zipKey,
    name: nameKey ? formatFieldValue(data[nameKey]) : "",
    phone: phoneKey ? formatFieldValue(data[phoneKey]) : "",
    email: emailKey ? formatFieldValue(data[emailKey]) : "",
    address: addressKey ? formatFieldValue(data[addressKey]) : "",
    city: cityKey ? formatFieldValue(data[cityKey]) : "",
    state: stateKey ? formatFieldValue(data[stateKey]) : "",
    zip: zipKey ? formatFieldValue(data[zipKey]) : "",
  };
}

function getProjectProfile(document: DocDetail | null) {
  const data = document?.data?.dataJson ?? {};

  const addressKey = pickFirstExistingKey(data, ["project_address", "job_address", "service_address", "site_address", "address"]);
  const cityKey = pickFirstExistingKey(data, ["project_city", "job_city"]);
  const stateKey = pickFirstExistingKey(data, ["project_state", "job_state"]);
  const zipKey = pickFirstExistingKey(data, ["project_zip", "project_zip_code", "job_zip", "job_zip_code"]);
  const startDateKey = pickFirstExistingKey(data, ["start_date", "project_start_date"]);
  const estimatedCompletionDateKey = pickFirstExistingKey(data, ["estimated_completion_date", "completion_date", "project_completion_date"]);

  return {
    addressKey,
    cityKey,
    stateKey,
    zipKey,
    startDateKey,
    estimatedCompletionDateKey,
    address: addressKey ? formatFieldValue(data[addressKey]) : "",
    city: cityKey ? formatFieldValue(data[cityKey]) : "",
    state: stateKey ? formatFieldValue(data[stateKey]) : "",
    zip: zipKey ? formatFieldValue(data[zipKey]) : "",
    startDate: startDateKey ? formatFieldValue(data[startDateKey]) : "",
    estimatedCompletionDate: estimatedCompletionDateKey ? formatFieldValue(data[estimatedCompletionDateKey]) : "",
  };
}

function getClientEntries(document: DocDetail | null) {
  if (!document?.data?.dataJson) return [];
  return Object.entries(document.data.dataJson)
    .filter(([key, value]) => isClientKey(key) && value != null && String(value).trim() !== "")
    .map(([key, value]) => [formatFieldLabel(key), formatFieldValue(value)] as [string, string]);
}

function buildDraftFieldMap(
  document: DocDetail,
  clientEntries: Array<[string, string]>,
  projectEntries: Array<[string, string]>,
  pricingEntries: Array<[string, string]>,
  clientProfile: ReturnType<typeof getClientProfile>,
  projectProfile: ReturnType<typeof getProjectProfile>,
) {
  const fields: Record<string, string> = {
    contractDate: toDateInputValue(document.contractDate),
  };

  for (const key of [
    clientProfile.nameKey,
    clientProfile.phoneKey,
    clientProfile.emailKey,
    clientProfile.addressKey,
    clientProfile.cityKey,
    clientProfile.stateKey,
    clientProfile.zipKey,
  ]) {
    if (key) {
      fields[key] = formatFieldValue(document.data?.dataJson?.[key]);
    }
  }

  for (const key of [
    projectProfile.addressKey,
    projectProfile.cityKey,
    projectProfile.stateKey,
    projectProfile.zipKey,
    projectProfile.startDateKey,
    projectProfile.estimatedCompletionDateKey,
  ]) {
    if (key) {
      fields[key] = formatFieldValue(document.data?.dataJson?.[key]);
    }
  }

  for (const [label] of [...clientEntries, ...projectEntries, ...pricingEntries]) {
    const key = findOriginalKeyByLabel(document, label);
    if (key) {
      fields[key] = formatFieldValue(document.data?.dataJson?.[key]);
    }
  }

  return fields;
}

function findOriginalKeyByLabel(document: DocDetail | null, label: string) {
  if (!document?.data?.dataJson) return null;
  const match = Object.keys(document.data.dataJson).find(
    (key) => formatFieldLabel(key) === label,
  );
  return match ?? null;
}

function getProjectEntries(document: DocDetail | null) {
  if (!document?.data?.dataJson) return [];
  return Object.entries(document.data.dataJson)
    .filter(([key, value]) => !isClientKey(key) && !isPricingKey(key) && !isInternalKey(key) && value != null && String(value).trim() !== "")
    .map(([key, value]) => [formatFieldLabel(key), formatFieldValue(value)] as [string, string]);
}

function getPricingEntries(document: DocDetail | null) {
  if (!document?.data?.dataJson) return [];
  return Object.entries(document.data.dataJson)
    .filter(([key, value]) => isPricingKey(key) && value != null && String(value).trim() !== "")
    .map(([key, value]) => [formatFieldLabel(key), formatFieldValue(value)] as [string, string]);
}

function isClientKey(key: string) {
  const normalized = key.toLowerCase();
  return normalized.includes("customer") || normalized.includes("client");
}

function isPricingKey(key: string) {
  const normalized = key.toLowerCase();
  return normalized.includes("price")
    || normalized.includes("amount")
    || normalized.includes("deposit")
    || normalized.includes("payment")
    || normalized.includes("subtotal")
    || normalized.includes("total")
    || normalized.includes("tax")
    || normalized.includes("fee")
    || normalized.includes("discount")
    || normalized.includes("balance");
}

function isInternalKey(key: string) {
  const normalized = key.toLowerCase();
  return normalized.includes("owner")
    || normalized.includes("sales_rep")
    || normalized.includes("internal")
    || normalized.includes("user");
}

function pickFirstExistingKey(
  data: Record<string, unknown>,
  keys: string[],
) {
  return keys.find((key) => typeof data[key] === "string" && String(data[key]).trim() !== "") ?? null;
}

function formatFieldLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFieldValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function buildCreateDraftPayload(
  fields: Record<string, string>,
  sameProjectAddressAsCustomer = false,
  financeEnabled = false,
) {
  const nextFields = { ...fields };
  nextFields.insurance_name = "ACORD";
  nextFields.insurance_phone = formatUsPhone("7146546824");
  nextFields.insurance_policy_number = "10104196265";

  if (sameProjectAddressAsCustomer) {
    nextFields.project_address = fields.customer_address;
    nextFields.project_city = fields.city;
    nextFields.project_state = fields.state;
    nextFields.project_zip = fields.zip;
  }

  if (!financeEnabled) {
    nextFields.finance_charge = "";
    for (const row of [1, 2, 3, 4]) {
      nextFields[`finance_${row}_amount`] = "";
      nextFields[`finance_${row}_description`] = "";
      nextFields[`finance_${row}_date`] = "";
    }
  }

  return Object.fromEntries(
    Object.entries(nextFields).filter(([, value]) => value.trim() !== ""),
  );
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatBillingMonthShort(billingPeriod?: string) {
  if (!billingPeriod) return "Mon";
  const [year, month] = billingPeriod.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return "Mon";
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatBillingMonthLabel(billingPeriod?: string) {
  if (!billingPeriod) return "Unknown month";
  const [year, month] = billingPeriod.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return billingPeriod;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function sectionEyebrow(section: SectionKey) {
  if (section === "users") return "Users";
  if (section === "profile") return "Profile";
  if (section === "documents") return "Documents";
  if (section === "billing") return "Billing";
  return "Workspace";
}

function sectionTitle(section: SectionKey, companyName?: string | null) {
  if (section === "users") return "Workspace users";
  if (section === "profile") return "User profile";
  if (section === "documents") return "Contract lifecycle";
  if (section === "billing") return "Usage and limits";
  return companyName ?? "NoaSign";
}

function joinDefined(values: Array<string | null | undefined>, separator: string) {
  return values.filter((value): value is string => Boolean(value && value.trim())).join(separator);
}

function buildChangedProfilePayload(
  original: Record<string, string>,
  current: Record<string, string>,
) {
  return Object.fromEntries(
    Object.entries(current).filter(([key, value]) => {
      const normalizedCurrent = value.trim();
      const normalizedOriginal = (original[key] ?? "").trim();
      return normalizedCurrent !== normalizedOriginal;
    }),
  );
}

function splitFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1] ?? "",
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatUsPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatCurrencyInput(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  if (!normalized) return "";

  const [wholePart = "", ...decimalParts] = normalized.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "") || wholePart || "0";
  const joinedDecimal = decimalParts.join("").slice(0, 2);

  if (normalized.includes(".")) {
    return `${whole}.${joinedDecimal}`;
  }

  return whole;
}

function getCompanyInitials(companyName?: string | null) {
  if (!companyName) return "NS";
  const words = companyName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) return "NS";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

async function resizeImageFile(file: File, maxDimension: number) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return source;
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/webp", 0.88);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image preview"));
    image.src = source;
  });
}

function getDocumentActions(status?: string | null) {
  if (status === "DRAFT") return [{ key: "send" as const, label: "Send document", icon: <Send className="h-4 w-4" />, tone: "bg-[color:var(--button-primary)] text-white hover:bg-[color:var(--button-primary-hover)]" }, { key: "cancel" as const, label: "Cancel draft", icon: <Ban className="h-4 w-4" />, tone: "bg-[color:var(--danger-bg)] text-[color:var(--danger-text)] hover:bg-[color:var(--badge-danger-bg)]" }];
  if (status === "SENT") return [{ key: "cancel" as const, label: "Cancel document", icon: <Ban className="h-4 w-4" />, tone: "bg-[color:var(--danger-bg)] text-[color:var(--danger-text)] hover:bg-[color:var(--badge-danger-bg)]" }];
  if (status === "CANCELLED") return [{ key: "reactivate" as const, label: "Reactivate draft", icon: <Undo2 className="h-4 w-4" />, tone: "bg-[color:var(--success-bg)] text-[color:var(--success-text)] hover:bg-[color:var(--badge-success-bg)]" }];
  return [];
}

function buildTimeline(document: DocDetail) {
  return [{ label: "Created", value: formatDate(document.createdAt) }, { label: "Sent", value: formatDate(document.sentAt) }, { label: "Viewed", value: formatDate(document.viewedAt) }, { label: "Signed", value: formatDate(document.signedAt) }, { label: "Completed", value: formatDate(document.completedAt) }, { label: "Cancelled", value: formatDate(document.cancelledAt) }];
}


