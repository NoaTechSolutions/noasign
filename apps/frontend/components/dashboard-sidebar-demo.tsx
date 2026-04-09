"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ClipboardList,
  AlertTriangle,
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
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Undo2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import { cn } from "@/lib/utils";
import { MasterUsersPanel } from "./master-users-panel";
import { DocumentFormRenderer, type DocumentSchema } from "./document-form-renderer";

type Doc = {
  id: string;
  documentNumber: string;
  status: string;
  contractDate: string;
  createdAt: string;
  providerDocumentId?: string | null;
  providerStatus?: string | null;
  providerLastSyncedAt?: string | null;
  lastManualReminderAt?: string | null;
  lastSentRecipientEmail?: string | null;
  sendAvailableAt?: string | null;
  sendAvailableInSeconds?: number;
  canSend?: boolean;
  resendAvailableAt?: string | null;
  resendAvailableInSeconds?: number;
  serverNow?: string | null;
  canResend?: boolean;
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
  signatureTemplate?: {
    name: string;
    templateKey: string;
    providerTemplateId?: string | null;
  } | null;
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
    schemaJson?: unknown;
  }>;
  signatureTemplates: Array<{
    id: string;
    name: string;
    templateKey: string;
    providerTemplateId?: string | null;
  }>;
};

type Props = {
  user: {
    id?: string | null;
    companyProfileId?: string | null;
    email: string;
    role: string;
    status: string;
    mustChangePassword?: boolean;
    accountType?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    avatarUrl?: string | null;
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
    insuranceName: string | null;
    insurancePhone: string | null;
    insurancePolicyNumber: string | null;
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
  accountRequests: Array<{
    id: string;
    fullName: string;
    email: string;
    requestedDocumentTypes: string[];
    status: "PENDING" | "APPROVED" | "REJECTED";
    processedAt: string | null;
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
    action: "send" | "resend" | "cancel" | "reactivate",
  ) => Promise<void>;
  onUpdateDraft: (
    documentId: string,
    payload: { contractDate: string; dataJson: Record<string, unknown> },
  ) => Promise<void>;
  onSyncDocumentStatus: (documentId: string) => Promise<void>;
  onPreviewFinalPdf: (documentId: string) => Promise<string>;
  onDownloadFinalPdf: (documentId: string) => Promise<void>;
  onCreateDraft: (payload: {
    documentTypeId: string;
    formDefinitionId: string;
    signatureTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
  }) => Promise<DocDetail | void>;
  onUpdateMe: (payload: { firstName?: string; lastName?: string; title?: string; phone?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; zipCode?: string; avatarUrl?: string }) => Promise<unknown>;
  onUpdateCompanyProfile: (payload: {
    companyName?: string;
    legalName?: string;
    email?: string;
    phone?: string;
    phone2?: string;
    insuranceName?: string;
    insurancePhone?: string;
    insurancePolicyNumber?: string;
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
  onUpdateAccountRequestStatus: (
    requestId: string,
    status: "PENDING" | "APPROVED" | "REJECTED",
  ) => Promise<void>;
  onUpdateUser: (
    userId: string,
    payload: { email?: string; role?: string; status?: string },
  ) => Promise<void>;
  onDeactivateUser: (userId: string) => Promise<void>;
  onReactivateUser: (userId: string) => Promise<void>;
  onResetUserPassword: (
    userId: string,
    payload: { password: string; temporary: boolean },
  ) => Promise<void>;
  onSignOut: () => void;
  onChangeOwnPassword: (password: string) => Promise<void>;
};

type ViewerTabKey = "client" | "project" | "pricing" | "timeline" | "pdf";
type EditableViewerTabKey = "client" | "project" | "pricing";
type SectionKey =
  | "dashboard"
  | "documents"
  | "users"
  | "accountRequests"
  | "profile"
  | "billing";
type StatusFilter =
  | "ALL"
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "SIGNED"
  | "COMPLETED"
  | "CANCELLED";

const SECTION_QUERY_KEY = "section";
const DASHBOARD_SELECTED_DOCUMENT_KEY = "ntssign:dashboard:selected-document-id";
const DASHBOARD_DOCUMENT_VIEWER_KEY = "ntssign:dashboard:document-viewer";
const DOCUMENTS_CREATE_DRAWER_KEY = "ntssign:documents:create-draft-open";
const DOCUMENTS_CREATE_DRAFT_STATE_KEY = "ntssign:documents:create-draft-state";
const BILLING_PLANS_MODAL_KEY = "ntssign:billing:plans-modal-open";

type PersistedDocumentViewerState = {
  open: boolean;
  initialTab: ViewerTabKey;
  initialEditingTab: EditableViewerTabKey | null;
};

type PersistedCreateDraftState = {
  isSetupOpen: boolean;
  selectedDocumentTypeId: string;
  selectedFormDefinitionId: string;
  selectedTemplateId: string;
  contractDate: string;
};

type WorkflowAction = {
  key: "send" | "resend" | "cancel" | "reactivate";
  label: string;
  icon: ReactNode;
  tone: string;
  disabled?: boolean;
};

function parseSectionKey(value: string | null): SectionKey {
  if (
    value === "documents" ||
    value === "users" ||
    value === "accountRequests" ||
    value === "profile" ||
    value === "billing"
  ) {
    return value;
  }

  return "dashboard";
}

function readSessionBoolean(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  return window.sessionStorage.getItem(key) === "true";
}

function writeSessionBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, value ? "true" : "false");
}

function readSessionJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  const rawValue = window.sessionStorage.getItem(key);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function writeSessionJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function removeSessionValue(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}

export function DashboardSidebarDemo({
  user,
  companyProfile,
  usage,
  monthlySummary,
  billingHistory,
  users,
  accountRequests,
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
  onPreviewFinalPdf,
  onDownloadFinalPdf,
  onCreateDraft,
  onUpdateMe,
  onUpdateCompanyProfile,
  onCreateUser,
  onUpdateAccountRequestStatus,
  onUpdateUser,
  onDeactivateUser,
  onReactivateUser,
  onResetUserPassword,
  onSignOut,
  onChangeOwnPassword,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [usersMenuOpen, setUsersMenuOpen] = useState(true);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [documentViewerInitialTab, setDocumentViewerInitialTab] =
    useState<ViewerTabKey>("client");
  const [documentViewerInitialEditingTab, setDocumentViewerInitialEditingTab] =
    useState<EditableViewerTabKey | null>(null);
  const [documentSuccessMessage, setDocumentSuccessMessage] = useState("");
  const requestedSection = parseSectionKey(searchParams.get(SECTION_QUERY_KEY));
  const [activeSection, setActiveSection] = useState<SectionKey>(requestedSection);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const isIndividualUser = user?.role !== "MASTER" && user?.accountType === "INDIVIDUAL";
  const displayName = isIndividualUser
    ? [user?.firstName, user?.lastName].filter(Boolean).join(" ") || getDisplayName(user?.email)
    : companyProfile?.companyName?.trim() || getDisplayName(user?.email);
  const accountSubtitle = isIndividualUser
    ? user?.email || "No email"
    : companyProfile?.email?.trim() || user?.email || "No email";
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

  useEffect(() => {
    const isMobile = window.innerWidth < 1280;
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (activeSection === "users" || activeSection === "accountRequests") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsersMenuOpen(true);
    }
  }, [activeSection]);

  useEffect(() => {
    const persistedViewerState =
      readSessionJson<PersistedDocumentViewerState>(DASHBOARD_DOCUMENT_VIEWER_KEY);

    if (!persistedViewerState?.open) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDocumentViewerInitialTab(persistedViewerState.initialTab ?? "client");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDocumentViewerInitialEditingTab(
      persistedViewerState.initialEditingTab ?? null,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDocumentViewerOpen(true);
  }, []);

  useEffect(() => {
    writeSessionJson(DASHBOARD_DOCUMENT_VIEWER_KEY, {
      open: documentViewerOpen,
      initialTab: documentViewerInitialTab,
      initialEditingTab: documentViewerInitialEditingTab,
    } satisfies PersistedDocumentViewerState);
  }, [documentViewerInitialEditingTab, documentViewerInitialTab, documentViewerOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveSection((current) =>
      current === requestedSection ? current : requestedSection,
    );
  }, [requestedSection]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current) {
        return;
      }

      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const links = [
    { key: "dashboard" as const, label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
    ...(user?.role === "MASTER"
      ? [{ key: "users" as const, label: "User control", icon: <Users className="h-5 w-5 shrink-0" /> }]
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

  async function handleDocumentAction(
    documentId: string,
    action: "send" | "resend" | "cancel" | "reactivate",
  ) {
    try {
      await onDocumentAction(documentId, action);
    } catch {
      return;
    }

    if (action !== "send" && action !== "resend") {
      return;
    }

    const activeDocument =
      documents?.find((item) => item.id === documentId) ??
      (documentDetail?.id === documentId ? documentDetail : null);

    if (action === "send") {
      closeDocumentViewer();
      setDocumentSuccessMessage(
        activeDocument?.documentNumber
          ? `${activeDocument.documentNumber} was sent successfully.`
          : "Document sent successfully.",
      );
      return;
    }

    closeDocumentViewer();
    setDocumentSuccessMessage(
      activeDocument?.documentNumber
        ? `Reminder sent for ${activeDocument.documentNumber}.`
        : "Reminder sent successfully.",
    );
  }

  const profileNavGuardRef = useRef<((onGo: () => void) => void) | null>(null);

  function doNavigate(nextSection: SectionKey) {
    setActiveSection(nextSection);
    const nextUrl =
      nextSection === "dashboard"
        ? pathname
        : `${pathname}?${SECTION_QUERY_KEY}=${nextSection}`;
    window.history.replaceState(null, "", nextUrl);
  }

  function updateActiveSection(nextSection: SectionKey) {
    const guard = profileNavGuardRef.current;
    if (guard) {
      guard(() => doNavigate(nextSection));
    } else {
      doNavigate(nextSection);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[color:var(--bg-page)]/70 backdrop-blur md:flex-row xl:overflow-visible">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-3 xl:gap-8">
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-hidden">
            <div className="relative flex items-start justify-center gap-3">
              <div className="min-w-0 flex-1">{open ? <Logo /> : <LogoIcon />}</div>
              {open ? (
                <button
                  type="button"
                  aria-label="Close sidebar"
                  onClick={() => setOpen(false)}
                  className="absolute right-0 top-0 z-30 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#022977] bg-white text-[#022977] shadow-[0_10px_24px_rgba(2,41,119,0.12)] dark:border-[color:var(--border)] dark:bg-[color:var(--bg-elevated)] dark:text-[color:var(--text-secondary)] dark:shadow-[var(--shadow-soft)]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            <div className="mt-4 xl:mt-8">
              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <div key={link.key}>
                    {user?.role === "MASTER" && link.key === "users" ? (
                      <div className="grid gap-1">
                        <button
                          type="button"
                          onClick={() => setUsersMenuOpen((current) => !current)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-[color:var(--menu-text-muted)] transition hover:bg-[#d8e6ff] hover:text-[#022977] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[color:var(--menu-text)]",
                            (activeSection === "users" || activeSection === "accountRequests") &&
                              "bg-[#bdd4ff] text-[#022977] shadow-[var(--shadow-soft)] dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--menu-text)]",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4efff] text-[#5574a6] transition group-hover:bg-[#bdd4ff] group-hover:text-[#022977] dark:bg-[color:var(--bg-surface)] dark:text-[color:var(--menu-text-muted)] dark:group-hover:bg-[rgba(255,255,255,0.08)] dark:group-hover:text-white",
                              (activeSection === "users" || activeSection === "accountRequests") &&
                                "bg-[#9fbeff] text-[#022977] dark:bg-[rgba(255,255,255,0.12)] dark:text-white",
                            )}
                          >
                            {link.icon}
                          </span>
                          <span className="truncate">User control</span>
                          <ChevronRight
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0 transition-transform",
                              usersMenuOpen && "rotate-90",
                            )}
                          />
                        </button>
                        {usersMenuOpen ? (
                          <div className="ml-12 grid gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                updateActiveSection("users");
                                if (window.innerWidth < 1280) {
                                  setOpen(false);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--menu-text-muted)] transition hover:bg-[#d8e6ff] hover:text-[#022977] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[color:var(--menu-text)]",
                                activeSection === "users" &&
                                  "bg-[#bdd4ff] text-[#022977] shadow-[var(--shadow-soft)] dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--menu-text)]",
                              )}
                            >
                              <UserCog className="h-4 w-4" />
                              <span>Members</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateActiveSection("accountRequests");
                                if (window.innerWidth < 1280) {
                                  setOpen(false);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--menu-text-muted)] transition hover:bg-[#d8e6ff] hover:text-[#022977] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[color:var(--menu-text)]",
                                activeSection === "accountRequests" &&
                                  "bg-[#bdd4ff] text-[#022977] shadow-[var(--shadow-soft)] dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--menu-text)]",
                              )}
                            >
                              <ClipboardList className="h-4 w-4" />
                              <span>Access requests</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <SidebarLink
                        link={{ label: link.label, icon: link.icon }}
                        active={activeSection === link.key}
                        onClick={() => {
                          updateActiveSection(link.key);
                          if (window.innerWidth < 1280) {
                            setOpen(false);
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 xl:mt-8">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Workspace
              </div>
              <div className="mt-2 grid gap-2 xl:mt-3 xl:gap-3">
                <InfoCard
                  label={user?.role !== "MASTER" && user?.accountType === "INDIVIDUAL" ? "Account" : "Company"}
                  title={
                    isLoading
                      ? "Loading..."
                      : isIndividualUser
                        ? [user?.firstName, user?.lastName].filter(Boolean).join(" ") || getDisplayName(user?.email ?? "") || "My Account"
                        : companyProfile?.companyName ?? "NTSsign"
                  }
                  subtitle={
                    isLoading
                      ? "..."
                      : isIndividualUser
                        ? user?.email ?? "Individual"
                        : [companyProfile?.contactFirstName, companyProfile?.contactLastName]
                            .filter(Boolean)
                            .join(" ")
                            .trim() || companyProfile?.contactEmail || "Primary contact not defined"
                  }
                />
                <InfoCard
                  label="Plan"
                  title={isLoading ? "Loading..." : usage?.planName ?? "-"}
                  subtitle={isLoading ? "..." : usage?.isUnlimited ? "Unlimited documents" : `${usage?.documentsUsed ?? 0} used this month`}
                  accent
                  actionLabel="Upgrade plan"
                  onAction={() => updateActiveSection("billing")}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm font-medium text-[color:var(--danger-text)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--danger-bg)]"
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
              <DashboardBreadcrumb activeSection={activeSection} className="hidden sm:flex" />
            </div>

            <div ref={accountMenuRef} className="relative shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-3 rounded-2xl px-1 py-1 transition hover:bg-[color:var(--bg-surface)]"
                >
                  {isIndividualUser ? (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white text-sm font-semibold text-blue-700 shadow-[var(--shadow-soft)] dark:border-white/10 dark:bg-slate-950 dark:text-blue-200">
                      {user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        ([user?.firstName, user?.lastName].filter(Boolean).map((n) => n![0]).join("") || user?.email?.slice(0, 2) || "?").toUpperCase()
                      )}
                    </div>
                  ) : (
                    <CompanyAvatar companyName={companyProfile?.companyName} logoUrl={companyProfile?.logoUrl} className="h-10 w-10 rounded-full text-sm shadow-[var(--shadow-soft)]" />
                  )}
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
                        updateActiveSection("profile");
                        setAccountMenuOpen(false);
                      }}
                    />
                    <AccountMenuButton
                      label="Billing history"
                      icon={<WalletCards className="h-4 w-4" />}
                      onClick={() => {
                        updateActiveSection("billing");
                        setAccountMenuOpen(false);
                      }}
                    />
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
              companyProfile={companyProfile}
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
              onDocumentAction={handleDocumentAction}
              onCreateDraft={onCreateDraft}
            />
          ) : null}

          {activeSection === "profile" ? (
            <ProfilePanel
              user={user}
              companyProfile={companyProfile}
              usage={usage}
              currentUserRole={user?.role ?? null}
              onUpdateMe={onUpdateMe}
              onUpdateCompanyProfile={onUpdateCompanyProfile}
              navGuardRef={profileNavGuardRef}
            />
          ) : null}

          {activeSection === "users" && user?.role === "MASTER" ? (
            <MasterUsersPanel
              mode="users"
              users={users}
              accountRequests={accountRequests}
              currentUserId={user.id}
              isLoading={isLoading}
              onCreateUser={onCreateUser}
              onUpdateAccountRequestStatus={onUpdateAccountRequestStatus}
              onUpdateUser={onUpdateUser}
              onDeactivateUser={onDeactivateUser}
              onReactivateUser={onReactivateUser}
              onResetUserPassword={onResetUserPassword}
            />
          ) : null}

          {activeSection === "accountRequests" && user?.role === "MASTER" ? (
            <MasterUsersPanel
              mode="accountRequests"
              users={users}
              accountRequests={accountRequests}
              currentUserId={user.id}
              isLoading={isLoading}
              onCreateUser={onCreateUser}
              onUpdateAccountRequestStatus={onUpdateAccountRequestStatus}
              onUpdateUser={onUpdateUser}
              onDeactivateUser={onDeactivateUser}
              onReactivateUser={onReactivateUser}
              onResetUserPassword={onResetUserPassword}
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
        onAction={handleDocumentAction}
        onUpdateDraft={onUpdateDraft}
        onSyncDocumentStatus={onSyncDocumentStatus}
        onPreviewFinalPdf={onPreviewFinalPdf}
        onDownloadFinalPdf={onDownloadFinalPdf}
      />
      {documentSuccessMessage ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4">
          <button
            type="button"
            aria-label="Close document success popup"
            className="absolute inset-0"
            onClick={() => setDocumentSuccessMessage("")}
          />
          <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--success-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
            <div className="text-lg font-semibold text-[color:var(--text-primary)]">
              {documentSuccessMessage.startsWith("Reminder sent")
                ? "Reminder sent"
                : "Document sent"}
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              {documentSuccessMessage}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setDocumentSuccessMessage("")}
                className="rounded-xl bg-[color:var(--button-success)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-success-hover)]"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {user?.mustChangePassword ? (
        <ForcePasswordChangeModal onSubmit={onChangeOwnPassword} />
      ) : null}
      {confirmDialog ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950">
            <div className="text-lg font-semibold text-slate-950 dark:text-white">{confirmDialog.title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{confirmDialog.message}</p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
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
  const { resolvedTheme } = useTheme();
  const progressStates = [
    { label: "Draft", value: stats.draft, tone: "bg-slate-400" },
    { label: "Sent", value: stats.sent, tone: "bg-[#2563eb]" },
    { label: "Viewed", value: stats.viewed, tone: "bg-cyan-500" },
    { label: "Signed", value: stats.signed, tone: "bg-emerald-500" },
    { label: "Completed", value: stats.completed, tone: "bg-green-700" },
    { label: "Cancelled", value: stats.cancelled, tone: "bg-rose-500" },
  ] as const;

  const isDarkTheme = resolvedTheme !== "light";
  const heroCardClassName = isDarkTheme
    ? "rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,#0b1220_0%,#111827_40%,#1d4ed8_100%)] p-5 text-white shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8"
    : "rounded-[1.9rem] border border-[#b7cbf3] bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_38%,#edf4ff_100%)] p-5 text-[#022977] shadow-[0_24px_70px_rgba(36,76,144,0.10)] md:p-8";
  const activityCardClassName = isDarkTheme
    ? "rounded-[1.9rem] border border-white/10 bg-slate-900/90 p-4 shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6"
    : "rounded-[1.9rem] border border-[#b7cbf3] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_18px_44px_rgba(36,76,144,0.06)] md:p-6";
  const monthlyOverviewClassName = isDarkTheme
    ? "rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-5"
    : "rounded-[1.6rem] border border-[#c8d8f6] bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] p-5";
  const statusBreakdownClassName = isDarkTheme
    ? "rounded-[1.6rem] border border-white/10 bg-white/5 p-5"
    : "rounded-[1.6rem] border border-[#c8d8f6] bg-[#f7faff] p-5";

  return (
    <>
      <section className={heroCardClassName}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={cn("text-xs font-semibold uppercase tracking-[0.28em]", isDarkTheme ? "text-white/65" : "text-[#476ca8]")}>NTSsign</div>
            <h1 className={cn("mt-3 text-3xl font-semibold tracking-[-0.05em] md:text-5xl", isDarkTheme ? "text-white" : "text-[#022977]")}>{isLoading ? "Welcome" : "Welcome back"}</h1>
            <p className={cn("mt-3 text-base md:text-lg", isDarkTheme ? "text-white/88" : "text-[#4c6798]")}>{isLoading ? "Loading user..." : displayName}</p>
            <div className={cn("mt-3 text-xs font-medium uppercase tracking-[0.24em]", isDarkTheme ? "text-white/55" : "text-[#6c86b3]")}>Built by NoaTechSolutions</div>
          </div>
          <div className={cn("inline-flex items-center gap-3 rounded-full px-4 py-3 backdrop-blur", isDarkTheme ? "border border-white/14 bg-white/10 text-white shadow-none" : "border border-[#b7cbf3] bg-white text-[#022977] shadow-[0_10px_30px_rgba(36,76,144,0.08)]")}>
            <span className={cn("text-xs font-semibold uppercase tracking-[0.24em]", isDarkTheme ? "text-white/60" : "text-[#6c86b3]")}>Current plan</span>
            <span className={cn("rounded-full px-4 py-2 text-sm font-semibold text-white", isDarkTheme ? "bg-[#2563eb] shadow-[0_10px_24px_rgba(37,99,235,0.32)]" : "bg-[#2563eb] shadow-[0_10px_24px_rgba(37,99,235,0.24)]")}>{isLoading ? "Loading..." : planName ?? "-"}</span>
          </div>
        </div>
      </section>

      <section className={activityCardClassName}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={cn("text-xs font-semibold uppercase tracking-[0.24em]", isDarkTheme ? "text-slate-400" : "text-[#6c86b3]")}>Current month</div>
            <h2 className={cn("mt-2 text-2xl font-semibold tracking-[-0.04em]", isDarkTheme ? "text-white" : "text-[#022977]")}>Contract activity</h2>
            <p className={cn("mt-2 max-w-2xl text-sm leading-6", isDarkTheme ? "text-slate-400" : "text-[#4c6798]")}>This dashboard only shows contracts from {billingPeriod ?? "the current month"}.</p>
          </div>
          <div className={cn("rounded-full px-4 py-2 text-sm font-medium", isDarkTheme ? "border border-white/10 bg-white/5 text-slate-300" : "border border-[#b7cbf3] bg-[#edf4ff] text-[#4c6798]")}>{isLoading ? "Loading..." : `${stats.total} contracts this month`}</div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-4">
            <div className={monthlyOverviewClassName}>
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

          <div className={statusBreakdownClassName}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Status distribution</div>
                <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Current month breakdown</div>
              </div>
              <div className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]", isDarkTheme ? "bg-slate-950 text-slate-400" : "bg-white text-[#6c86b3]")}>Live</div>
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

function DocumentsPanel(props: {
  documents: Doc[] | null;
  allDocuments: Doc[];
  documentTypes: DocumentTypeCatalogItem[];
  companyProfile: Props["companyProfile"];
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
  }) => Promise<DocDetail | void>;
}) {

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createDrawerVersion, setCreateDrawerVersion] = useState(0);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCreateDrawerOpen(readSessionBoolean(DOCUMENTS_CREATE_DRAWER_KEY));
  }, []);

  useEffect(() => {
    writeSessionBoolean(DOCUMENTS_CREATE_DRAWER_KEY, createDrawerOpen);
  }, [createDrawerOpen]);

  function openCreateDrawer() {
    setCreateDrawerOpen(true);
  }

  function closeCreateDrawer() {
    setCreateDrawerOpen(false);
    removeSessionValue(DOCUMENTS_CREATE_DRAFT_STATE_KEY);
    setCreateDrawerVersion((current) => current + 1);
  }

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
              onClick={openCreateDrawer}
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
      <CreateDraftDrawer
        key={createDrawerVersion}
        open={createDrawerOpen}
        documentTypes={props.documentTypes}
        companyProfile={props.companyProfile}
        onClose={closeCreateDrawer}
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

function ForcePasswordChangeModal({
  onSubmit,
}: {
  onSubmit: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setError("New password required");
      return;
    }

    if (password.length < 8) {
      setError("Password must have at least 8 characters");
      return;
    }

    if (!confirmPassword.trim()) {
      setError("Confirm password required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Both password fields must match");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onSubmit(password);
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update password",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
          Security
        </div>
        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)]">
          Change your temporary password
        </h3>
        <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
          Your account is using a temporary password. Before continuing, set a new personal password.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              New password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              Confirm password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onPaste={(event) => event.preventDefault()}
              onCopy={(event) => event.preventDefault()}
              onCut={(event) => event.preventDefault()}
              className="h-12 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]"
            />
          </label>
          {error ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={isSaving}
            className={cn(
              "inline-flex h-12 items-center justify-center rounded-2xl bg-[color:var(--button-primary)] px-4 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)]",
              isSaving && "cursor-not-allowed opacity-60",
            )}
          >
            {isSaving ? "Saving..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlansModalOpen(readSessionBoolean(BILLING_PLANS_MODAL_KEY));
  }, []);

  useEffect(() => {
    writeSessionBoolean(BILLING_PLANS_MODAL_KEY, plansModalOpen);
  }, [plansModalOpen]);

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
  currentUserRole,
  onUpdateMe,
  onUpdateCompanyProfile,
  navGuardRef,
}: {
  user: Props["user"];
  companyProfile: Props["companyProfile"];
  usage: Props["usage"];
  currentUserRole: string | null;
  onUpdateMe: Props["onUpdateMe"];
  onUpdateCompanyProfile: Props["onUpdateCompanyProfile"];
  navGuardRef: MutableRefObject<((onGo: () => void) => void) | null>;
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
  const [isEditingInsurance, setIsEditingInsurance] = useState(false);
  const [isEditingPrimaryContact, setIsEditingPrimaryContact] = useState(false);
  const [isCompanyDetailsOpen, setIsCompanyDetailsOpen] = useState(true);
  const [isInsuranceOpen, setIsInsuranceOpen] = useState(false);
  const [isPrimaryContactOpen, setIsPrimaryContactOpen] = useState(
    currentUserRole !== "MASTER" && user?.accountType === "INDIVIDUAL",
  );
  const [isSavingCompanyDetails, setIsSavingCompanyDetails] = useState(false);
  const [isSavingInsurance, setIsSavingInsurance] = useState(false);
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
  const [insuranceForm, setInsuranceForm] = useState({
    insuranceName: "",
    insurancePhone: "",
    insurancePolicyNumber: "",
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
  const [userProfileForm, setUserProfileForm] = useState({
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    title: user?.title ?? "",
    phone: user?.phone ?? "",
    addressLine1: user?.addressLine1 ?? "",
    addressLine2: user?.addressLine2 ?? "",
    city: user?.city ?? "",
    state: user?.state ?? "",
    zipCode: user?.zipCode ?? "",
  });
  const [isEditingUserProfile, setIsEditingUserProfile] = useState(false);
  const [isSavingUserProfile, setIsSavingUserProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const userAvatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setUserProfileForm({
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      title: user?.title ?? "",
      phone: formatUsPhone(user?.phone ?? ""),
      addressLine1: user?.addressLine1 ?? "",
      addressLine2: user?.addressLine2 ?? "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      zipCode: user?.zipCode ?? "",
    });
  }, [user?.firstName, user?.lastName, user?.title, user?.phone, user?.addressLine1, user?.addressLine2, user?.city, user?.state, user?.zipCode]);

  useEffect(() => {
    if (currentUserRole !== "MASTER" && user?.accountType === "INDIVIDUAL") {
      setIsPrimaryContactOpen(true);
    }
  }, [currentUserRole, user?.accountType]);

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
    setInsuranceForm({
      insuranceName: companyProfile?.insuranceName ?? "",
      insurancePhone: formatUsPhone(companyProfile?.insurancePhone ?? ""),
      insurancePolicyNumber: companyProfile?.insurancePolicyNumber ?? "",
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

  useEffect(() => {
    navGuardRef.current = (onGo: () => void) => {
      const isEditing = isEditingUserProfile || isEditingCompanyDetails || isEditingInsurance || isEditingPrimaryContact;
      if (!isEditing) {
        onGo();
        return;
      }

      let dirty = false;
      if (isEditingUserProfile) {
        dirty = Object.keys(buildChangedProfilePayload(getUserProfileOriginal(), userProfileForm)).length > 0;
      } else if (isEditingCompanyDetails) {
        dirty = Object.keys(buildChangedProfilePayload(
          { companyName: companyProfile?.companyName ?? "", legalName: companyProfile?.legalName ?? "", industry: companyProfile?.industry ?? "", licenseNumber: companyProfile?.licenseNumber ?? "", phone: formatUsPhone(companyProfile?.phone ?? ""), phone2: formatUsPhone(companyProfile?.phone2 ?? ""), email: companyProfile?.email ?? "", website: companyProfile?.website ?? "", addressLine1: companyProfile?.addressLine1 ?? "", state: companyProfile?.state ?? "", city: companyProfile?.city ?? "", zipCode: companyProfile?.zipCode ?? "" },
          companyDetailsForm,
        )).length > 0;
      } else if (isEditingInsurance) {
        dirty = Object.keys(buildChangedProfilePayload(
          { insuranceName: companyProfile?.insuranceName ?? "", insurancePhone: formatUsPhone(companyProfile?.insurancePhone ?? ""), insurancePolicyNumber: companyProfile?.insurancePolicyNumber ?? "" },
          { insuranceName: insuranceForm.insuranceName, insurancePhone: formatUsPhone(insuranceForm.insurancePhone), insurancePolicyNumber: insuranceForm.insurancePolicyNumber },
        )).length > 0;
      } else if (isEditingPrimaryContact) {
        dirty = Object.keys(buildChangedProfilePayload(
          { contactFullName: [companyProfile?.contactFirstName, companyProfile?.contactLastName].filter(Boolean).join(" ").trim(), contactTitle: companyProfile?.contactTitle ?? "", contactEmail: companyProfile?.contactEmail ?? "", contactPhone: formatUsPhone(companyProfile?.contactPhone ?? ""), contactAddressLine1: companyProfile?.contactAddressLine1 ?? "", contactState: companyProfile?.contactState ?? "", contactCity: companyProfile?.contactCity ?? "", contactZipCode: companyProfile?.contactZipCode ?? "" },
          primaryContactForm,
        )).length > 0;
      }

      if (!dirty) {
        setIsEditingUserProfile(false);
        setIsEditingCompanyDetails(false);
        setIsEditingInsurance(false);
        setIsEditingPrimaryContact(false);
        onGo();
        return;
      }

      setConfirmDialog({
        title: "Unsaved changes",
        message: "You have unsaved changes. Are you sure you want to leave without saving?",
        onConfirm: () => {
          setIsEditingUserProfile(false);
          setIsEditingCompanyDetails(false);
          setIsEditingInsurance(false);
          setIsEditingPrimaryContact(false);
          setConfirmDialog(null);
          onGo();
        },
      });
    };
    return () => {
      navGuardRef.current = null;
    };
  }, [isEditingUserProfile, isEditingCompanyDetails, isEditingInsurance, isEditingPrimaryContact, userProfileForm, companyDetailsForm, insuranceForm, primaryContactForm, companyProfile, user, navGuardRef]);

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

  async function saveInsurance() {
    const payload = buildChangedProfilePayload(
      {
        insuranceName: companyProfile?.insuranceName ?? "",
        insurancePhone: formatUsPhone(companyProfile?.insurancePhone ?? ""),
        insurancePolicyNumber: companyProfile?.insurancePolicyNumber ?? "",
      },
      {
        insuranceName: insuranceForm.insuranceName,
        insurancePhone: formatUsPhone(insuranceForm.insurancePhone),
        insurancePolicyNumber: insuranceForm.insurancePolicyNumber,
      },
    );

    if (Object.keys(payload).length === 0) {
      setIsEditingInsurance(false);
      return;
    }

    setIsSavingInsurance(true);
    try {
      await onUpdateCompanyProfile(payload);
      setIsEditingInsurance(false);
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsSavingInsurance(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      event.target.value = "";
      return;
    }

    const maxFileSizeBytes = 3 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      event.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await resizeImageFileSquare(file, 512);
      await onUpdateMe({ avatarUrl });
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  }

  function getUserProfileOriginal() {
    return {
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      title: user?.title ?? "",
      phone: user?.phone ?? "",
      addressLine1: user?.addressLine1 ?? "",
      addressLine2: user?.addressLine2 ?? "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      zipCode: user?.zipCode ?? "",
    };
  }

  async function saveUserProfile() {
    const changed = buildChangedProfilePayload(getUserProfileOriginal(), userProfileForm);
    if (Object.keys(changed).length === 0) {
      setIsEditingUserProfile(false);
      return;
    }

    const { firstName, lastName } = splitFullName(userProfileForm.fullName);

    setIsSavingUserProfile(true);
    try {
      await onUpdateMe({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        title: userProfileForm.title.trim() || undefined,
        phone: userProfileForm.phone.trim() || undefined,
        addressLine1: userProfileForm.addressLine1.trim() || undefined,
        addressLine2: userProfileForm.addressLine2.trim() || undefined,
        city: userProfileForm.city.trim() || undefined,
        state: userProfileForm.state.trim() || undefined,
        zipCode: userProfileForm.zipCode.trim() || undefined,
      });
      setIsEditingUserProfile(false);
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsSavingUserProfile(false);
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

  function toggleCompanyDetailsOpen() {
    setIsCompanyDetailsOpen((current) => {
      const next = !current;
      if (!next) {
        setIsEditingCompanyDetails(false);
      }
      return next;
    });
  }

  function toggleInsuranceOpen() {
    setIsInsuranceOpen((current) => {
      const next = !current;
      if (!next) {
        setIsEditingInsurance(false);
      }
      return next;
    });
  }

  function togglePrimaryContactOpen() {
    setIsPrimaryContactOpen((current) => {
      const next = !current;
      if (!next) {
        setIsEditingPrimaryContact(false);
      }
      return next;
    });
  }

  if (currentUserRole !== "MASTER" && user?.accountType === "INDIVIDUAL") {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    const initials = (() => {
      if (user.firstName && user.lastName) {
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
      }
      if (user.firstName) {
        return user.firstName.slice(0, 2).toUpperCase();
      }
      return user.email.slice(0, 2).toUpperCase();
    })();

    return (
      <section className="grid gap-4">
        {/* Error / success popups — identical to MASTER */}
        {profileErrorMessage ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4">
            <button type="button" aria-label="Close error popup" className="absolute inset-0" onClick={() => setProfileErrorMessage("")} />
            <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--danger-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
              <div className="text-lg font-semibold text-[color:var(--text-primary)]">Validation error</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{profileErrorMessage}</p>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setProfileErrorMessage("")} className="rounded-xl bg-[color:var(--button-danger)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-danger-hover)]">Close</button>
              </div>
            </div>
          </div>
        ) : null}
        {profileSuccessMessage ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4">
            <button type="button" aria-label="Close success popup" className="absolute inset-0" onClick={() => setProfileSuccessMessage("")} />
            <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--success-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
              <div className="text-lg font-semibold text-[color:var(--text-primary)]">Saved</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{profileSuccessMessage}</p>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setProfileSuccessMessage("")} className="rounded-xl bg-[color:var(--button-success)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-success-hover)]">Close</button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Hero — same gradient/layout as MASTER, avatar circle with edit button */}
        <div className="rounded-[1.9rem] border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_42%,#dbeafe_100%)] p-6 shadow-[0_24px_70px_rgba(36,76,144,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b1220_0%,#111827_42%,#1d4ed8_100%)] dark:shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start md:gap-5">
              <div className="relative h-24 w-24 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white text-2xl font-semibold text-blue-700 shadow-[0_18px_40px_rgba(37,99,235,0.18)] dark:border-white/10 dark:bg-slate-950 dark:text-blue-200 sm:h-20 sm:w-20 sm:text-xl md:h-24 md:w-24 md:text-2xl">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => userAvatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-2 -right-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.30)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-950"
                  aria-label="Upload profile picture"
                  title="Upload profile picture"
                >
                  {isUploadingAvatar ? (
                    <span className="text-[10px] font-semibold">...</span>
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={userAvatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => void handleAvatarUpload(event)}
                />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white md:text-5xl">
                  {displayName}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-white/88">{user.email}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <ProfileChip label={user.role} />
                  {user.accountType ? <ProfileChip label={user.accountType.charAt(0) + user.accountType.slice(1).toLowerCase()} /> : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal info — same card, edit button and all fields identical to MASTER Primary Contact */}
        <div className="grid gap-4">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={togglePrimaryContactOpen}
                className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                aria-expanded={isPrimaryContactOpen}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", isPrimaryContactOpen && "rotate-90")} />
                <span>Personal info</span>
              </button>
              {isPrimaryContactOpen ? (
                <ProfileEditActions
                  isEditing={isEditingUserProfile}
                  isSaving={isSavingUserProfile}
                  onEdit={() => setIsEditingUserProfile(true)}
                  onCancel={() => {
                    const isDirty = Object.keys(buildChangedProfilePayload(getUserProfileOriginal(), userProfileForm)).length > 0;
                    if (!isDirty) { setIsEditingUserProfile(false); setUserProfileForm(getUserProfileOriginal()); return; }
                    setConfirmDialog({ title: "Unsaved changes", message: "You have unsaved changes. Are you sure you want to cancel?", onConfirm: () => { setConfirmDialog(null); setIsEditingUserProfile(false); setUserProfileForm(getUserProfileOriginal()); } });
                  }}
                  onSave={() => void saveUserProfile()}
                />
              ) : null}
            </div>
            {isPrimaryContactOpen ? (isEditingUserProfile ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={userProfileForm.fullName} onChange={(value) => setUserProfileForm((c) => ({ ...c, fullName: toTitleCase(value.replace(/\d/g, "")) }))} />
                  <EditableField icon={<Briefcase className="h-4 w-4" />} label="Title" value={userProfileForm.title} onChange={(value) => setUserProfileForm((c) => ({ ...c, title: toTitleCase(value) }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <EditableField icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} onChange={() => {}} disabled={true} />
                  <EditableField icon={<Phone className="h-4 w-4" />} label="Phone" value={userProfileForm.phone} onChange={(value) => setUserProfileForm((c) => ({ ...c, phone: formatUsPhone(value) }))} />
                </div>
                <EditableField icon={<MapPlus className="h-4 w-4" />} label="Address line 1" value={userProfileForm.addressLine1} onChange={(value) => setUserProfileForm((c) => ({ ...c, addressLine1: value }))} />
                <div className="grid gap-3 md:grid-cols-3">
                  <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={userProfileForm.city} onChange={(value) => setUserProfileForm((c) => ({ ...c, city: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                  <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={userProfileForm.state} onChange={(value) => setUserProfileForm((c) => ({ ...c, state: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                  <EditableField icon={<Pin className="h-4 w-4" />} label="ZIP code" value={userProfileForm.zipCode} onChange={(value) => setUserProfileForm((c) => ({ ...c, zipCode: value }))} />
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={[user.firstName, user.lastName].filter(Boolean).join(" ")} />
                  <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Title" value={user.title} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
                  <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={formatUsPhone(user.phone ?? "")} />
                </div>
                <DetailRow icon={<MapPlus className="h-4 w-4" />} label="Address line 1" value={user.addressLine1} />
                {user.addressLine2 ? <DetailRow icon={<MapPinned className="h-4 w-4" />} label="Address line 2" value={user.addressLine2} /> : null}
                <div className="grid gap-3 md:grid-cols-3">
                  <DetailRow icon={<Landmark className="h-4 w-4" />} label="State" value={user.state} />
                  <DetailRow icon={<Compass className="h-4 w-4" />} label="City" value={user.city} />
                  <DetailRow icon={<Pin className="h-4 w-4" />} label="ZIP code" value={user.zipCode} />
                </div>
              </div>
            )) : null}
          </div>
        </div>
      </section>
    );
  }

  // Only MASTER gets the full company profile render below

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
            <button
              type="button"
              onClick={toggleCompanyDetailsOpen}
              className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-expanded={isCompanyDetailsOpen}
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform", isCompanyDetailsOpen && "rotate-90")} />
              <span>Company details</span>
            </button>
            {isCompanyDetailsOpen ? (
              <ProfileEditActions
                isEditing={isEditingCompanyDetails}
                isSaving={isSavingCompanyDetails}
                onEdit={() => setIsEditingCompanyDetails(true)}
                onCancel={() => {
                  const original = {
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
                  };
                  const isDirty = Object.keys(buildChangedProfilePayload(original, companyDetailsForm)).length > 0;
                  if (!isDirty) { setIsEditingCompanyDetails(false); setCompanyDetailsForm(original); return; }
                  setConfirmDialog({ title: "Unsaved changes", message: "You have unsaved changes. Are you sure you want to cancel?", onConfirm: () => { setConfirmDialog(null); setIsEditingCompanyDetails(false); setCompanyDetailsForm(original); } });
                }}
                onSave={() => void saveCompanyDetails()}
              />
            ) : null}
          </div>
          {isCompanyDetailsOpen ? (isEditingCompanyDetails ? (
            <div className="mt-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<Building2 className="h-4 w-4" />} label="Company name" value={companyDetailsForm.companyName} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, companyName: toTitleCase(value) }))} />
                <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Legal name" value={companyDetailsForm.legalName} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, legalName: toTitleCase(value) }))} />
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
              <div className="grid gap-3 md:grid-cols-3">
                <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={companyDetailsForm.city} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, city: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={companyDetailsForm.state} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, state: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                <EditableField icon={<Pin className="h-4 w-4" />} label="ZIP" value={companyDetailsForm.zipCode} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, zipCode: value.replace(/\D/g, "") }))} />
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
          )) : null}
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleInsuranceOpen}
              className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-expanded={isInsuranceOpen}
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform", isInsuranceOpen && "rotate-90")} />
              <span>Insurance</span>
            </button>
            {isInsuranceOpen ? (
              <ProfileEditActions
                isEditing={isEditingInsurance}
                isSaving={isSavingInsurance}
                onEdit={() => setIsEditingInsurance(true)}
                onCancel={() => {
                  const original = {
                    insuranceName: companyProfile?.insuranceName ?? "",
                    insurancePhone: formatUsPhone(companyProfile?.insurancePhone ?? ""),
                    insurancePolicyNumber: companyProfile?.insurancePolicyNumber ?? "",
                  };
                  const current = {
                    insuranceName: insuranceForm.insuranceName,
                    insurancePhone: formatUsPhone(insuranceForm.insurancePhone),
                    insurancePolicyNumber: insuranceForm.insurancePolicyNumber,
                  };
                  const isDirty = Object.keys(buildChangedProfilePayload(original, current)).length > 0;
                  if (!isDirty) { setIsEditingInsurance(false); setInsuranceForm(original); return; }
                  setConfirmDialog({ title: "Unsaved changes", message: "You have unsaved changes. Are you sure you want to cancel?", onConfirm: () => { setConfirmDialog(null); setIsEditingInsurance(false); setInsuranceForm(original); } });
                }}
                onSave={() => void saveInsurance()}
              />
            ) : null}
          </div>
          {isInsuranceOpen ? (isEditingInsurance ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <EditableField icon={<ShieldCheck className="h-4 w-4" />} label="Insurance name" value={insuranceForm.insuranceName} onChange={(value) => setInsuranceForm((current) => ({ ...current, insuranceName: toTitleCase(value) }))} />
              <EditableField icon={<Phone className="h-4 w-4" />} label="Insurance phone" value={insuranceForm.insurancePhone} onChange={(value) => setInsuranceForm((current) => ({ ...current, insurancePhone: formatUsPhone(value) }))} />
              <EditableField icon={<FileText className="h-4 w-4" />} label="Policy number" value={insuranceForm.insurancePolicyNumber} onChange={(value) => setInsuranceForm((current) => ({ ...current, insurancePolicyNumber: value }))} />
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <DetailRow icon={<ShieldCheck className="h-4 w-4" />} label="Insurance name" value={companyProfile?.insuranceName ?? ""} />
              <DetailRow icon={<Phone className="h-4 w-4" />} label="Insurance phone" value={formatUsPhone(companyProfile?.insurancePhone ?? "")} />
              <DetailRow icon={<FileText className="h-4 w-4" />} label="Policy number" value={companyProfile?.insurancePolicyNumber ?? ""} />
            </div>
          )) : null}
        </div>

        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={togglePrimaryContactOpen}
              className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              aria-expanded={isPrimaryContactOpen}
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform", isPrimaryContactOpen && "rotate-90")} />
              <span>Primary contact</span>
            </button>
            {isPrimaryContactOpen ? (
              <ProfileEditActions
                isEditing={isEditingPrimaryContact}
                isSaving={isSavingPrimaryContact}
                onEdit={() => setIsEditingPrimaryContact(true)}
                onCancel={() => {
                  const original = {
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
                  };
                  const isDirty = Object.keys(buildChangedProfilePayload(original, primaryContactForm)).length > 0;
                  if (!isDirty) { setIsEditingPrimaryContact(false); setPrimaryContactForm(original); return; }
                  setConfirmDialog({ title: "Unsaved changes", message: "You have unsaved changes. Are you sure you want to cancel?", onConfirm: () => { setConfirmDialog(null); setIsEditingPrimaryContact(false); setPrimaryContactForm(original); } });
                }}
                onSave={() => void savePrimaryContact()}
              />
            ) : null}
          </div>
          {isPrimaryContactOpen ? (isEditingPrimaryContact ? (
            <div className="mt-4 grid gap-3">
              <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={primaryContactForm.contactFullName} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactFullName: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
              <EditableField icon={<Briefcase className="h-4 w-4" />} label="Title" value={primaryContactForm.contactTitle} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactTitle: toTitleCase(value) }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <EditableField icon={<Mail className="h-4 w-4" />} label="Email" value={primaryContactForm.contactEmail} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactEmail: value }))} />
                <EditableField icon={<Phone className="h-4 w-4" />} label="Phone" value={primaryContactForm.contactPhone} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactPhone: formatUsPhone(value) }))} />
              </div>
              <EditableField icon={<MapPinned className="h-4 w-4" />} label="Address line 1" value={primaryContactForm.contactAddressLine1} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactAddressLine1: value }))} />
              <div className="grid gap-3 md:grid-cols-3">
                <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={primaryContactForm.contactCity} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactCity: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={primaryContactForm.contactState} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactState: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                <EditableField icon={<Pin className="h-4 w-4" />} label="ZIP code" value={primaryContactForm.contactZipCode} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactZipCode: value.replace(/\D/g, "") }))} />
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
          )) : null}
        </div>
      </div>
    </section>
  );
}

function CreateDraftDrawer({
  open,
  documentTypes,
  companyProfile,
  onClose,
  onCreateDraft,
  onOpenDocumentView,
}: {
  open: boolean;
  documentTypes: DocumentTypeCatalogItem[];
  companyProfile: Props["companyProfile"];
  onClose: () => void;
  onCreateDraft: (payload: {
    documentTypeId: string;
    formDefinitionId: string;
    signatureTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
  }) => Promise<DocDetail | void>;
  onOpenDocumentView: (documentId: string) => void;
}) {
  const drawerScrollRef = useRef<HTMLElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState("");
  const [selectedFormDefinitionId, setSelectedFormDefinitionId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [contractDate, setContractDate] = useState("");

  useEffect(() => {
    if (!open) return;

    const persistedState =
      readSessionJson<PersistedCreateDraftState>(DOCUMENTS_CREATE_DRAFT_STATE_KEY);

    if (!persistedState) return;

    setIsSetupOpen(persistedState.isSetupOpen ?? false);
    setSelectedDocumentTypeId(persistedState.selectedDocumentTypeId ?? "");
    setSelectedFormDefinitionId(persistedState.selectedFormDefinitionId ?? "");
    setSelectedTemplateId(persistedState.selectedTemplateId ?? "");
    setContractDate(persistedState.contractDate ?? "");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      drawerScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

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
    setSelectedDocumentTypeId((current) => current || firstType?.id || "");
  }, [documentTypes, open]);

  useEffect(() => {
    if (!selectedDocumentType) {
      setSelectedFormDefinitionId("");
      setSelectedTemplateId("");
      return;
    }
    setSelectedFormDefinitionId(
      (current) => current || selectedDocumentType.formDefinitions[0]?.id || "",
    );
    setSelectedTemplateId(
      (current) => current || selectedDocumentType.signatureTemplates[0]?.id || "",
    );
  }, [selectedDocumentType]);

  useEffect(() => {
    if (!open) return;

    writeSessionJson(DOCUMENTS_CREATE_DRAFT_STATE_KEY, {
      isSetupOpen,
      selectedDocumentTypeId,
      selectedFormDefinitionId,
      selectedTemplateId,
      contractDate,
    } satisfies PersistedCreateDraftState);
  }, [
    contractDate,
    isSetupOpen,
    open,
    selectedDocumentTypeId,
    selectedFormDefinitionId,
    selectedTemplateId,
  ]);

  if (!open) {
    return null;
  }

  function requestClose() {
    if (isSubmitting) return;
    setConfirmCloseOpen(true);
  }

  async function handleRendererSubmit(dataJson: Record<string, string>) {
    if (!selectedDocumentTypeId || !selectedFormDefinitionId || !selectedTemplateId || !contractDate) {
      return;
    }

    // Helper: "City, ST ZIP" — same format used in BoldSign concatenated fields
    const formatCityStateZip = (city?: string | null, state?: string | null, zip?: string | null) => {
      const parts = [city?.trim(), state?.trim()].filter(Boolean).join(", ");
      return [parts, zip?.trim()].filter(Boolean).join(" ");
    };

    // Inject company-profile static fields (not entered by user in the form)
    const contactName = [companyProfile?.contactFirstName, companyProfile?.contactLastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const finalDataJson: Record<string, string> = {
      ...dataJson,
      // Concatenated city/state/zip from form data (BoldSign uses single merged field)
      customer_city_state_zip: formatCityStateZip(dataJson.city, dataJson.state, dataJson.zip),
      project_city_state_zip: formatCityStateZip(dataJson.project_city, dataJson.project_state, dataJson.project_zip),
      // Company
      license_number: companyProfile?.licenseNumber?.trim() ?? "",
      // Insurance
      insurance_name: companyProfile?.insuranceName?.trim() ?? "",
      insurance_phone: companyProfile?.insurancePhone ?? "",
      insurance_policy_number: companyProfile?.insurancePolicyNumber?.trim() ?? "",
      // Director (primary contact of the company)
      director_name: contactName,
      director_email: companyProfile?.contactEmail ?? "",
      director_phone: companyProfile?.contactPhone ?? "",
      director_address: companyProfile?.contactAddressLine1?.trim() ?? "",
      director_contract_address: companyProfile?.contactAddressLine1?.trim() ?? "",
      director_city_state_zip: formatCityStateZip(
        companyProfile?.contactCity,
        companyProfile?.contactState,
        companyProfile?.contactZipCode,
      ),
      // Fund holder (the company itself)
      fund_holder_name: companyProfile?.companyName?.trim() ?? "",
      fund_holder_phone: companyProfile?.phone ?? "",
      fund_holder_city_state_zip: formatCityStateZip(
        companyProfile?.city,
        companyProfile?.state,
        companyProfile?.zipCode,
      ),
    };

    setIsSubmitting(true);
    try {
      const document = await onCreateDraft({
        documentTypeId: selectedDocumentTypeId,
        formDefinitionId: selectedFormDefinitionId,
        signatureTemplateId: selectedTemplateId,
        contractDate,
        dataJson: finalDataJson,
      });

      onClose();

      if (document?.id) {
        onOpenDocumentView(document.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex min-h-screen items-start justify-center bg-slate-950/45 p-2 pt-1 backdrop-blur-sm md:items-center md:p-4">
      <button type="button" aria-label="Close draft creator" onClick={requestClose} className="absolute inset-0" />
      <aside
        ref={drawerScrollRef}
        className="relative z-10 flex max-h-[98vh] w-full max-w-[90vw] flex-col overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950 md:h-[96vh] md:max-h-[96vh] md:max-w-[96vw]"
      >
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
          <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsSetupOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-secondary)] transition hover:text-[color:var(--text-primary)]"
                aria-expanded={isSetupOpen}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", isSetupOpen && "rotate-90")} />
                <span>Document setup</span>
              </button>
            </div>
            {isSetupOpen ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                  options={(selectedDocumentType?.signatureTemplates ?? []).map((item) => ({ value: item.id, label: item.name }))}
                />
              </div>
            ) : null}
          </div>
        </div>

        {(() => {
          const selectedFormDef = selectedDocumentType?.formDefinitions.find(
            (f) => f.id === selectedFormDefinitionId,
          );
          const schema = selectedFormDef?.schemaJson as DocumentSchema | undefined;
          if (!schema?.sections?.length) {
            return (
              <div className="px-5 py-8 text-center text-sm text-[color:var(--text-muted)]">
                No form schema configured for this document type.
              </div>
            );
          }
          return (
            <DocumentFormRenderer
              schema={schema}
              onSubmit={handleRendererSubmit}
              onCancel={requestClose}
              isSubmitting={isSubmitting}
              canSubmit={
                !!selectedDocumentTypeId &&
                !!selectedFormDefinitionId &&
                !!selectedTemplateId &&
                !!contractDate
              }
            />
          );
        })()}

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
    </div>,
    window.document.body,
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
  onPreviewFinalPdf,
  onDownloadFinalPdf,
}: {
  open: boolean;
  document: DocDetail | null;
  isLoading: boolean;
  actionInFlight: string | null;
  initialActiveTab: ViewerTabKey;
  initialEditingTab: EditableViewerTabKey | null;
  onClose: () => void;
  onAction: (
    documentId: string,
    action: "send" | "resend" | "cancel" | "reactivate",
  ) => Promise<void>;
  onUpdateDraft: (
    documentId: string,
    payload: { contractDate: string; dataJson: Record<string, unknown> },
  ) => Promise<void>;
  onSyncDocumentStatus: (documentId: string) => Promise<void>;
  onPreviewFinalPdf: (documentId: string) => Promise<string>;
  onDownloadFinalPdf: (documentId: string) => Promise<void>;
}) {
  const viewerScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<ViewerTabKey>("client");
  const [editingTab, setEditingTab] = useState<EditableViewerTabKey | null>(null);
  const [draftFields, setDraftFields] = useState<Record<string, string>>({});
  const [isSavingTab, setIsSavingTab] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [sendCountdownSeconds, setSendCountdownSeconds] = useState(0);
  const [resendCountdownSeconds, setResendCountdownSeconds] = useState(0);
  const canRenderViewerResend =
    document?.status === "SENT" || document?.status === "VIEWED";
  const canRenderViewerDraftCooldown = document?.status === "DRAFT";
  const viewerCanResend =
    Boolean(document?.canResend) ||
    (canRenderViewerResend && resendCountdownSeconds === 0);
  const viewerCanSend =
    document?.status !== "DRAFT" ||
    Boolean(document?.canSend) ||
    sendCountdownSeconds === 0;
  const actionButtons = getDocumentActions(document, {
    showCountdownWhenBlocked: true,
    sendCountdownSeconds,
    resendCountdownSeconds,
    canSendOverride: viewerCanSend,
    canResendOverride: viewerCanResend,
  });
  const clientProfile = useMemo(() => getClientProfile(document), [document]);
  const projectProfile = useMemo(() => getProjectProfile(document), [document]);
  const clientEntries = useMemo(() => getClientEntries(document), [document]);
  const projectEntries = useMemo(() => getProjectEntries(document), [document]);
  const pricingEntries = useMemo(() => getPricingEntries(document), [document]);
  const hasPdfStage = document?.status === "SIGNED" || document?.status === "COMPLETED";
  const isDraft = document?.status === "DRAFT";
  const canDownloadPdf = hasPdfStage && Boolean(document?.providerDocumentId);

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
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      viewerScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, document?.id]);

  useEffect(() => {
    if (!document) return;
    setDraftFields(buildDraftFieldMap(document, clientEntries, projectEntries, pricingEntries, clientProfile, projectProfile));
    setIsSavingTab(false);
  }, [document, clientEntries, projectEntries, pricingEntries, clientProfile, projectProfile]);

  useEffect(() => {
    if (
      !open ||
      !document ||
      !canRenderViewerDraftCooldown ||
      document.canSend ||
      !document.sendAvailableInSeconds ||
      document.sendAvailableInSeconds <= 0
    ) {
      setSendCountdownSeconds(0);
      return;
    }

    setSendCountdownSeconds(document.sendAvailableInSeconds);
    const intervalId = window.setInterval(() => {
      setSendCountdownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    canRenderViewerDraftCooldown,
    document,
    document?.canSend,
    document?.id,
    document?.sendAvailableInSeconds,
    open,
  ]);

  useEffect(() => {
    if (
      !open ||
      !document ||
      !canRenderViewerResend ||
      !document.resendAvailableInSeconds ||
      document.resendAvailableInSeconds <= 0
    ) {
      setResendCountdownSeconds(0);
      return;
    }

    const resendBlocked =
      canRenderViewerResend && !document.canResend;

    if (!resendBlocked) {
      setResendCountdownSeconds(0);
      return;
    }

    setResendCountdownSeconds(document.resendAvailableInSeconds);
    const intervalId = window.setInterval(() => {
      setResendCountdownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    canRenderViewerResend,
    document,
    document?.canResend,
    document?.id,
    document?.resendAvailableInSeconds,
    open,
  ]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  async function openPdfPreview() {
    if (!document) return;

    const nextUrl = await onPreviewFinalPdf(document.id);
    if (!nextUrl) return;

    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
    }

    setPdfPreviewUrl(nextUrl);
    setIsPdfPreviewOpen(true);
  }

  function closePdfPreview() {
    setIsPdfPreviewOpen(false);
  }

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

  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(
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
                onClick={() => {
                  if (action.disabled) return;
                  void onAction(document.id, action.key);
                }}
                disabled={action.disabled || actionInFlight === document.id}
                className={cn(
                  "hidden items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition md:inline-flex",
                  action.tone,
                  (action.disabled || actionInFlight === document.id) &&
                    "cursor-not-allowed opacity-60",
                )}
              >
                {action.icon}
                <span>
                  {actionInFlight === document.id ? "Processing..." : action.label}
                </span>
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

        <div ref={viewerScrollRef} className="flex-1 overflow-y-auto px-5 py-5">
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
                  Download the signed PDF once the signature provider confirms the document as completed.
                </p>
                <button
                  type="button"
                  onClick={() => void openPdfPreview()}
                  disabled={!document || actionInFlight === document.id}
                  className={cn(
                    "mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/10",
                    (!document || actionInFlight === document.id) && "cursor-not-allowed opacity-60",
                  )}
                >
                  <FileText className="h-4 w-4" />
                  {actionInFlight === document?.id ? "Opening..." : "View PDF"}
                </button>
                {document ? (
                  <button
                    type="button"
                    onClick={() => void onDownloadFinalPdf(document.id)}
                    disabled={actionInFlight === document.id}
                    className={cn(
                      "mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/10",
                      actionInFlight === document.id && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <Download className="h-4 w-4" />
                    {actionInFlight === document.id ? "Preparing..." : "Download PDF"}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

      </aside>

      {isPdfPreviewOpen && pdfPreviewUrl ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 shadow-[0_28px_80px_rgba(10,18,32,0.55)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-white">Signed PDF preview</div>
                <div className="text-xs text-slate-400">
                  {document?.documentNumber ?? "Document"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {document ? (
                  <button
                    type="button"
                    onClick={() => void onDownloadFinalPdf(document.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closePdfPreview}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-900">
              <iframe
                title="Signed PDF preview"
                src={pdfPreviewUrl}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    window.document.body,
  );
}

function InfoCard({
  label,
  title,
  subtitle,
  accent = false,
  actionLabel,
  onAction,
}: {
  label: string;
  title: string;
  subtitle: string;
  accent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={cn(
      "rounded-[1.5rem] border p-2.5 shadow-[var(--shadow-soft)] xl:p-4",
      accent ? "border-[color:var(--border)] bg-[linear-gradient(135deg,var(--badge-primary-bg)_0%,var(--bg-surface-strong)_100%)]" : "border-[color:var(--border)] bg-[color:var(--bg-elevated)]/85",
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className={cn("text-[11px] font-semibold uppercase tracking-[0.28em]", accent ? "text-[color:var(--brand-accent-strong)]" : "text-[color:var(--text-muted)]")}>{label}</div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="mt-1 text-xs font-semibold text-[color:var(--text-primary)] xl:mt-3 xl:text-sm">{title}</div>
      <div className="mt-0.5 text-[10px] text-[color:var(--text-secondary)] xl:mt-1 xl:text-xs">{subtitle}</div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4"><div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">{label}</div><div className="mt-3 text-sm font-medium leading-5 text-[color:var(--text-primary)]">{value}</div></div>;
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
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
  min,
  error,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "textarea";
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  error?: string;
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
            error && "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]",
            disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
          )}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          min={type === "date" ? min : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
            error && "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]",
            disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
          )}
        />
      )}
      {error ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[color:var(--danger-text)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
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
  error,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
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
          error && "border-[color:var(--danger-border)] focus-within:border-[color:var(--button-danger)]",
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
      {error ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[color:var(--danger-text)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
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

function Logo() {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme !== "light";
  const brandLogoSrc =
    isDarkTheme
      ? "/ntssign-light.svg"
      : "/ntssign-dark.svg";
  const logoShellClass =
    isDarkTheme
      ? "border-white/10 bg-white"
      : "border-slate-200 bg-[#022977]";

  return (
    <Link href="/dashboard" className="relative z-20 mx-auto flex w-full flex-col items-center justify-center gap-2 py-1 text-center text-sm font-normal text-[color:var(--text-primary)]">
      <div className={`relative h-28 w-28 shrink-0 overflow-hidden rounded-full border shadow-[var(--shadow-medium)] ${logoShellClass}`}>
        <NextImage
          src={brandLogoSrc}
          alt="NTSsign"
          fill
          className="object-contain p-1.5"
          sizes="96px"
          priority
        />
      </div>
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid justify-items-center whitespace-pre text-center">
        <span
          className={cn(
            "text-[8px] uppercase tracking-[0.2em]",
            isDarkTheme ? "text-[color:var(--text-muted)]" : "text-[#022977]",
          )}
        >
          by <span className="font-semibold">NoaTechSolutions</span>
        </span>
      </motion.span>
    </Link>
  );
}

function LogoIcon() {
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme !== "light";
  const brandLogoSrc =
    isDarkTheme
      ? "/ntssign-light.svg"
      : "/ntssign-dark.svg";
  const logoShellClass =
    isDarkTheme
      ? "border-white/10 bg-white"
      : "border-slate-200 bg-[#022977]";

  return (
    <Link href="/dashboard" className="relative z-20 mx-auto flex items-center justify-center py-1 text-sm font-normal text-[color:var(--text-primary)]">
      <div className={`relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full border shadow-[var(--shadow-medium)] ${logoShellClass}`}>
        <NextImage
          src={brandLogoSrc}
          alt="NTSsign"
          fill
          className="object-contain p-1"
          sizes="64px"
          priority
        />
      </div>
    </Link>
  );
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
  if (section === "accountRequests") return "Users";
  if (section === "profile") return "Profile";
  if (section === "documents") return "Documents";
  if (section === "billing") return "Billing";
  return "Workspace";
}

function sectionTitle(section: SectionKey, companyName?: string | null) {
  if (section === "users") return "Workspace users";
  if (section === "accountRequests") return "Account requests";
  if (section === "profile") return "User profile";
  if (section === "documents") return "Contract lifecycle";
  if (section === "billing") return "Usage and limits";
  return companyName ?? "NTSsign";
}

function breadcrumbItems(section: SectionKey) {
  if (section === "users") {
    return ["User control", "Members"];
  }

  if (section === "accountRequests") {
    return ["User control", "Access requests"];
  }

  if (section === "documents") {
    return ["Workspace", "Documents"];
  }

  if (section === "profile") {
    return ["Workspace", "Profile"];
  }

  if (section === "billing") {
    return ["Workspace", "Billing"];
  }

  return ["Workspace", "Dashboard"];
}

function DashboardBreadcrumb({
  activeSection,
  className,
}: {
  activeSection: SectionKey;
  className?: string;
}) {
  const items = breadcrumbItems(activeSection);

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("min-w-0 items-center gap-2 text-sm", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item}-${index}`} className="flex min-w-0 items-center gap-2">
            {index > 0 ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
            ) : null}
            <span
              className={cn(
                "truncate",
                isLast
                  ? "font-semibold text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-muted)]",
              )}
            >
              {item}
            </span>
          </div>
        );
      })}
    </nav>
  );
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

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

async function resizeImageFileSquare(file: File, size: number) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);

  // Center-crop to square, then scale to target size
  const cropSize = Math.min(image.width, image.height);
  const srcX = Math.floor((image.width - cropSize) / 2);
  const srcY = Math.floor((image.height - cropSize) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    return source;
  }

  context.drawImage(image, srcX, srcY, cropSize, cropSize, 0, 0, size, size);
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

function getDocumentActions(
  document?: Pick<
    Doc,
    "status" | "canSend" | "sendAvailableInSeconds" | "canResend" | "resendAvailableInSeconds"
  > | null,
  options?: {
    showCountdownWhenBlocked?: boolean;
    sendCountdownSeconds?: number;
    resendCountdownSeconds?: number;
    canSendOverride?: boolean;
    canResendOverride?: boolean;
  },
): WorkflowAction[] {
  const status = document?.status;
  const sendCooldownSeconds =
    options?.sendCountdownSeconds ??
    document?.sendAvailableInSeconds ??
    0;
  const resendCooldownSeconds =
    options?.resendCountdownSeconds ??
    document?.resendAvailableInSeconds ??
    0;

  if (status === "DRAFT") {
    const actions: WorkflowAction[] = [];
    const canSend = options?.canSendOverride ?? document?.canSend ?? true;

    if (canSend) {
      actions.push({
        key: "send",
        label: "Send document",
        icon: <Send className="h-4 w-4" />,
        tone: "bg-[color:var(--button-primary)] text-white hover:bg-[color:var(--button-primary-hover)]",
      });
    } else if (options?.showCountdownWhenBlocked) {
      actions.push({
        key: "send",
        label: `Send again in ${formatCountdownLabel(sendCooldownSeconds)}`,
        icon: <Send className="h-4 w-4" />,
        tone: "bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)]",
        disabled: true,
      });
    }

    actions.push({
      key: "cancel",
      label: "Cancel draft",
      icon: <Ban className="h-4 w-4" />,
      tone: "bg-[color:var(--danger-bg)] text-[color:var(--danger-text)] hover:bg-[color:var(--badge-danger-bg)]",
    });

    return actions;
  }

  if (status === "SENT" || status === "VIEWED") {
    const canResend =
      options?.canResendOverride ?? document?.canResend ?? true;
    const actions: WorkflowAction[] = [];

    if (canResend) {
      actions.push({
        key: "resend",
        label: "Resend document",
        icon: <Mail className="h-4 w-4" />,
        tone: "bg-[color:var(--button-neutral)] text-[color:var(--text-primary)] hover:bg-[color:var(--button-neutral-hover)]",
      });
    } else if (options?.showCountdownWhenBlocked) {
      actions.push({
        key: "resend",
        label: `Resend in ${formatCountdownLabel(resendCooldownSeconds)}`,
        icon: <Mail className="h-4 w-4" />,
        tone: "bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)]",
        disabled: true,
      });
    }

    actions.push({
      key: "cancel",
      label: "Cancel document",
      icon: <Ban className="h-4 w-4" />,
      tone: "bg-[color:var(--danger-bg)] text-[color:var(--danger-text)] hover:bg-[color:var(--badge-danger-bg)]",
    });

    return actions;
  }

  if (status === "CANCELLED") {
    return [
      {
        key: "reactivate",
        label: "Reactivate draft",
        icon: <Undo2 className="h-4 w-4" />,
        tone: "bg-[color:var(--success-bg)] text-[color:var(--success-text)] hover:bg-[color:var(--badge-success-bg)]",
      },
    ];
  }

  return [];
}

function formatCountdownLabel(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function buildTimeline(document: DocDetail) {
  return [{ label: "Created", value: formatDate(document.createdAt) }, { label: "Sent", value: formatDate(document.sentAt) }, { label: "Viewed", value: formatDate(document.viewedAt) }, { label: "Signed", value: formatDate(document.signedAt) }, { label: "Completed", value: formatDate(document.completedAt) }, { label: "Cancelled", value: formatDate(document.cancelledAt) }];
}


