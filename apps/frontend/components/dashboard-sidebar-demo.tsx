"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ClipboardList,
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Contact,
  CreditCard,
  Download,
  FileJson,
  FilePlus,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  ScanText,
  Search,
  UserCog,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import { cn } from "@/lib/utils";
import { MasterUsersPanel } from "./master-users-panel";
import { DocumentWizard, type DocumentSchema } from "./dashboard/panels/v2/documents/wizard";
import { BillingPanel } from "./dashboard/panels/billing-panel";
import { DashboardOverviewPanel } from "./dashboard/panels/dashboard-overview-panel";
import { ProfilePanel } from "./dashboard/panels/profile-panel";
import { CustomersPanel } from "./dashboard/panels/customers-panel";
import { DocumentsPanel } from "./dashboard/panels/documents-panel";
import { LockedUsersPanel } from "./dashboard/panels/locked-users-panel";
// FASE 3.5 — helpers centralizados (era circular import via monolito).
import {
  formatDate,
  formatUsPhone,
} from "@/lib/format";
import { readSessionBoolean, writeSessionBoolean } from "@/lib/session-storage";
import {
  CompanyAvatar,
  CustomerTypeBadge,
  DetailRow,
  EditableField,
  EmptyBlock,
  StatPill,
  StatusBadge,
} from "@/components/dashboard/shared/ui";
import {
  getDisplayEmail,
  getDisplayPhone,
  type Customer,
  type CustomerFormValues,
} from "@/components/dashboard/shared/customer-types";
import type {
  Doc,
  DocDetail,
  DocumentTypeCatalogItem,
  StatusFilter,
} from "@/components/dashboard/shared/document-types";
import {
  getDisplayName,
  getDocumentActions,
} from "@/components/dashboard/shared/document-utils";

// For BUSINESS customers, CreateDraftDrawer can pre-fill from either the
// business row (businessName, businessEmail, businessPhone, business
// address) or the primary-contact section (primaryContactName, etc.). User
// picks which set via BusinessDataSelectorDialog. PERSONAL customers don't
// see the picker — they only have one source.
type CustomerDataSource = "business" | "contact";

// Flattened cross-product of (documentType × formDefinition × signatureTemplate)
// that a user can pick in the template selector. Each triple maps to a single
// createDraftDocument payload.
type DocumentDraftTriple = {
  documentTypeId: string;
  documentTypeName: string;
  formDefinitionId: string;
  formDefinitionName: string;
  signatureTemplateId: string;
  signatureTemplateName: string;
};

function flattenDocumentTypeTriples(
  documentTypes: DocumentTypeCatalogItem[],
): DocumentDraftTriple[] {
  const out: DocumentDraftTriple[] = [];
  for (const dt of documentTypes) {
    for (const fd of dt.formDefinitions) {
      for (const st of dt.signatureTemplates) {
        out.push({
          documentTypeId: dt.id,
          documentTypeName: dt.name,
          formDefinitionId: fd.id,
          formDefinitionName: fd.name,
          signatureTemplateId: st.id,
          signatureTemplateName: st.name,
        });
      }
    }
  }
  return out;
}

// NOA-268 — TemplateSelectorDialog 2-step UX. Step 1 lets the user pick a
// FormDefinition (with search + field count); step 2 narrows down to a
// SignatureTemplate compatible with that FormDef's documentType. If a FormDef
// has only one compatible SignatureTemplate the modal auto-picks (invisible
// step). FormDefs with zero compatible templates are filtered out — the user
// would have nothing to pick on step 2.
type FormDefOption = {
  id: string;
  name: string;
  documentTypeId: string;
  documentTypeName: string;
  fieldCount: number;
  triples: DocumentDraftTriple[];
};

// schemaJson can take two shapes today: a flat field array (legacy) or a
// sectioned object `{sections: [{fields: [...]}]}`. Sum across whichever
// matches; unknown shapes report 0 rather than throwing.
function countSchemaFields(schemaJson: unknown): number {
  if (!schemaJson) return 0;
  if (Array.isArray(schemaJson)) return schemaJson.length;
  if (typeof schemaJson === "object" && schemaJson !== null) {
    const sections = (schemaJson as { sections?: unknown }).sections;
    if (Array.isArray(sections)) {
      return sections.reduce<number>((acc, section) => {
        if (section && typeof section === "object") {
          const fields = (section as { fields?: unknown }).fields;
          if (Array.isArray(fields)) return acc + fields.length;
        }
        return acc;
      }, 0);
    }
  }
  return 0;
}

function buildFormDefOptions(
  documentTypes: DocumentTypeCatalogItem[],
): FormDefOption[] {
  const out: FormDefOption[] = [];
  for (const dt of documentTypes) {
    for (const fd of dt.formDefinitions) {
      const triples: DocumentDraftTriple[] = dt.signatureTemplates.map((st) => ({
        documentTypeId: dt.id,
        documentTypeName: dt.name,
        formDefinitionId: fd.id,
        formDefinitionName: fd.name,
        signatureTemplateId: st.id,
        signatureTemplateName: st.name,
      }));
      if (triples.length === 0) continue;
      out.push({
        id: fd.id,
        name: fd.name,
        documentTypeId: dt.id,
        documentTypeName: dt.name,
        fieldCount: countSchemaFields(fd.schemaJson),
        triples,
      });
    }
  }
  return out;
}

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
    firstName?: string | null;
    lastName?: string | null;
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
  customers: Customer[] | null;
  customerDetail: Customer | null;
  selectedCustomerId: string | null;
  isCustomerDetailLoading: boolean;
  customerActionId: string | null;
  onSelectCustomer: (customerId: string) => void;
  onCloseCustomerDetail: () => void;
  onDeleteCustomer: (customerId: string) => Promise<void>;
  onCreateCustomer: (values: CustomerFormValues) => Promise<void>;
  onUpdateCustomer: (customerId: string, values: CustomerFormValues) => Promise<void>;
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
    customerId?: string;
    userId?: string;
  }) => Promise<DocDetail | void>;
  // NOA-238 — master picks a target user; we re-fetch the templates via
  // GET /documents/types?asUserId=<id> to surface only what that user can
  // pick. Returns the per-user catalog (same shape as documentTypes).
  onFetchTemplatesAsUser: (
    targetUserId: string,
  ) => Promise<DocumentTypeCatalogItem[]>;
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
  | "customers"
  | "users"
  | "accountRequests"
  | "lockedUsers"
  | "profile"
  | "billing";

const SECTION_QUERY_KEY = "section";
const DASHBOARD_DOCUMENT_VIEWER_KEY = "ntssign:dashboard:document-viewer";
const DOCUMENTS_CREATE_DRAWER_KEY = "ntssign:documents:create-draft-open";
const DOCUMENTS_CREATE_DRAFT_STATE_KEY = "ntssign:documents:create-draft-state";

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

function parseSectionKey(value: string | null): SectionKey {
  if (
    value === "documents" ||
    value === "customers" ||
    value === "users" ||
    value === "accountRequests" ||
    value === "lockedUsers" ||
    value === "profile" ||
    value === "billing"
  ) {
    return value;
  }

  return "dashboard";
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
  customers,
  customerDetail,
  selectedCustomerId,
  isCustomerDetailLoading,
  customerActionId,
  onSelectCustomer,
  onCloseCustomerDetail,
  onDeleteCustomer,
  onCreateCustomer,
  onUpdateCustomer,
  isLoading,
  onSelectDocument,
  onDocumentAction,
  onUpdateDraft,
  onSyncDocumentStatus,
  onPreviewFinalPdf,
  onDownloadFinalPdf,
  onCreateDraft,
  onFetchTemplatesAsUser,
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
  // NOA-280 — when user clicks Edit on a schema-driven draft, show this
  // notice instead of opening the legacy viewer-with-edit-tabs (which
  // doesn't fit schema-driven dataJson). Until NOA-285 ships a proper
  // schema-driven Edit, the user's recovery path is Cancel + recreate.
  const [schemaDrivenEditNotice, setSchemaDrivenEditNotice] = useState<{
    documentId: string;
    documentNumber: string;
  } | null>(null);
  const requestedSection = parseSectionKey(searchParams.get(SECTION_QUERY_KEY));
  const [activeSection, setActiveSection] = useState<SectionKey>(requestedSection);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  // When the customer view drawer's "+ New Document" button fires, we stash
  // the customer id here, close the customer drawer, and switch to the
  // documents section. DocumentsPanel picks this up and auto-opens its
  // CreateDraftDrawer with the customer pre-linked; it then clears the value.
  const [pendingDraftCustomerId, setPendingDraftCustomerId] = useState<
    string | null
  >(null);
  // Template Selector Modal: opens when the user starts a new draft AND there
  // are multiple (documentType, formDefinition, signatureTemplate) triples
  // available. Pick one → stash here → auto-open CreateDraftDrawer with
  // these ids preset instead of auto-picking first.
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [pendingDraftTriple, setPendingDraftTriple] =
    useState<DocumentDraftTriple | null>(null);
  // Business Data Selector Modal: shows after the Template Selector for
  // BUSINESS customers, so the user can pick which data set (business row
  // or primary contact) gets pre-filled into the form. PERSONAL customers
  // skip this — they only have one data source.
  const [businessDataSelectorOpen, setBusinessDataSelectorOpen] =
    useState(false);
  const [pendingDataSource, setPendingDataSource] =
    useState<CustomerDataSource | null>(null);
  // NOA-239 — after the template is locked in (Documents-section flow with
  // no customer pre-set), surface a "Use a customer / Create blank" picker.
  // Skipped when the flow already carries a customer (kebab + customer-view
  // entry points lock the customer up front).
  const [customerDataOptionOpen, setCustomerDataOptionOpen] = useState(false);
  const [customerSelectorOpen, setCustomerSelectorOpen] = useState(false);
  // NOA-238 — when MASTER starts a Documents-section flow, they first pick
  // the target user. pendingDraftTargetUserId carries the choice through
  // the rest of the dialogs; targetUserDocumentTypes caches the templates
  // re-fetched with ?asUserId=<id> so the Template Selector shows what
  // the target user would see (not master's superset).
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);
  const [pendingDraftTargetUserId, setPendingDraftTargetUserId] = useState<
    string | null
  >(null);
  const [targetUserDocumentTypes, setTargetUserDocumentTypes] = useState<
    DocumentTypeCatalogItem[] | null
  >(null);
  // Whether the current pendingDraftCustomerId came from the in-flow
  // CustomerSelectDialog (true) vs the kebab / customer-view shortcut
  // (false). Drives where the BusinessDataSelector "Back" button returns
  // to: pick-customer-again vs pick-template-again.
  const [customerPickedViaDialog, setCustomerPickedViaDialog] =
    useState(false);
  // CreateDraftDrawer lives here (not inside DocumentsPanel) so opening a
  // draft from the Customers section doesn't force an activeSection switch
  // away from Customers — user stays in whatever section they started from.
  // Lazy initializer restores the drawer's open state across tab reloads
  // without a setState-in-effect.
  const [createDrawerOpen, setCreateDrawerOpen] = useState(() =>
    readSessionBoolean(DOCUMENTS_CREATE_DRAWER_KEY),
  );
  const [createDrawerVersion, setCreateDrawerVersion] = useState(0);

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
    if (activeSection === "users" || activeSection === "accountRequests" || activeSection === "lockedUsers") {
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
    setDocumentViewerInitialEditingTab(
      persistedViewerState.initialEditingTab ?? null,
    );
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
    { key: "customers" as const, label: "Clients", icon: <Contact className="h-5 w-5 shrink-0" /> },
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

  useEffect(() => {
    writeSessionBoolean(DOCUMENTS_CREATE_DRAWER_KEY, createDrawerOpen);
  }, [createDrawerOpen]);

  // Open the draft drawer cleanly: wipe stale sessionStorage form state,
  // bump the key (forces remount → fresh useState initializers pick up
  // presets), then flip open. Inlined in handlers (instead of an auto-open
  // useEffect) to avoid cascading renders from setState-in-effect.
  function openCreateDrawerFresh() {
    removeSessionValue(DOCUMENTS_CREATE_DRAFT_STATE_KEY);
    setCreateDrawerVersion((current) => current + 1);
    setCreateDrawerOpen(true);
  }

  // After a triple is locked in, decide which dialog (if any) comes next.
  // Three cases:
  //   1. Customer already locked + BUSINESS → BusinessDataSelector
  //   2. Customer already locked + PERSONAL → straight to drawer
  //   3. No customer yet (Documents-section flow) → CustomerDataOptionDialog
  //      (NOA-239 — user picks "Use customer" or "Create blank")
  function advanceAfterTriple(customerId: string | null) {
    if (customerId) {
      const customer = customers?.find((c) => c.id === customerId) ?? null;
      if (customer && customer.customerType === "BUSINESS") {
        setBusinessDataSelectorOpen(true);
        return;
      }
      openCreateDrawerFresh();
      return;
    }
    setCustomerDataOptionOpen(true);
  }

  function handleCustomerDataOption(option: "customer" | "blank") {
    setCustomerDataOptionOpen(false);
    if (option === "blank") {
      // No customer link → drawer opens with empty form.
      openCreateDrawerFresh();
      return;
    }
    setCustomerSelectorOpen(true);
  }

  function handleCustomerSelected(customer: Customer) {
    setCustomerSelectorOpen(false);
    setPendingDraftCustomerId(customer.id);
    // Mark this customer as picked-in-flow so the BusinessDataSelector's
    // Back button can return to the customer picker (vs back to template,
    // which is what the kebab/customer-view path would want).
    setCustomerPickedViaDialog(true);
    if (customer.customerType === "BUSINESS") {
      setBusinessDataSelectorOpen(true);
      return;
    }
    openCreateDrawerFresh();
  }

  function cancelCustomerDataOption() {
    setCustomerDataOptionOpen(false);
    // Drop the pending triple + master target stash — bailing out of the
    // flow shouldn't leak the selection into a later unrelated New
    // Document click.
    setPendingDraftTriple(null);
    setPendingDraftTargetUserId(null);
    setTargetUserDocumentTypes(null);
  }

  function cancelCustomerSelector() {
    setCustomerSelectorOpen(false);
    setPendingDraftTriple(null);
    setPendingDraftTargetUserId(null);
    setTargetUserDocumentTypes(null);
  }

  // Resolve the catalog the active draft flow should use. Master picking
  // a target user gets the per-user catalog (re-fetched via asUserId);
  // everything else uses the master/own catalog already in props.
  const effectiveDocumentTypes = targetUserDocumentTypes ?? documentTypes;

  // Single entry point for "start a new draft" (from customer view, from
  // Documents "+ New document", anywhere else). Flattens the user's
  // accessible template catalog into triples; if there's only one, skip the
  // template modal. Then for BUSINESS customers stop in the data selector
  // so the user picks business vs primary contact.
  //
  // NOA-238: when MASTER starts a Documents-section flow (no customerId),
  // open UserSelectorDialog first so they pick the target user. The
  // template / customer dialogs that come next will then use the target
  // user's perspective.
  function startNewDraft(customerId?: string) {
    if (customerId) {
      onCloseCustomerDetail();
      setPendingDraftCustomerId(customerId);
      proceedFromTriplePool(documentTypes, customerId);
      return;
    }
    // No customer pre-set → Documents-section flow. Master gets the user
    // picker first; everyone else continues with their own catalog.
    if (user?.role === "MASTER") {
      setUserSelectorOpen(true);
      return;
    }
    proceedFromTriplePool(documentTypes, null);
  }

  // Once we know which catalog to use (master's, target user's, or own),
  // either skip the template modal (single triple) or open it.
  function proceedFromTriplePool(
    pool: DocumentTypeCatalogItem[],
    customerId: string | null,
  ) {
    const triples = flattenDocumentTypeTriples(pool);
    if (triples.length === 0) {
      // Edge case: no templates available for this perspective. The
      // "+ New Document" buttons are already disabled in that case, so
      // hitting this path means the state got out of sync — silent no-op
      // rather than a bogus modal.
      return;
    }
    if (triples.length === 1) {
      setPendingDraftTriple(triples[0]);
      advanceAfterTriple(customerId);
      return;
    }
    setTemplateSelectorOpen(true);
  }

  async function handleTargetUserSelected(targetUser: {
    id: string;
    role: string;
    email: string;
  }) {
    setPendingDraftTargetUserId(targetUser.id);
    setUserSelectorOpen(false);
    // Fetch the target user's catalog before opening the Template Selector
    // so master sees what THAT user can pick (not master's superset).
    let pool: DocumentTypeCatalogItem[];
    try {
      pool = await onFetchTemplatesAsUser(targetUser.id);
    } catch {
      // Fall back to master's full catalog if the as-user fetch fails —
      // less precise but doesn't dead-end the flow.
      pool = documentTypes;
    }
    setTargetUserDocumentTypes(pool);
    proceedFromTriplePool(pool, null);
  }

  function cancelUserSelector() {
    setUserSelectorOpen(false);
  }

  // Back-navigation handlers. Each closes the current modal and re-opens
  // the immediately-previous one in the flow. They preserve any state
  // already captured (template pick, target user, etc.) so the user can
  // change just one step without redoing everything.
  function backFromTemplateSelector() {
    setTemplateSelectorOpen(false);
    // Master flow: target user was picked first → re-open UserSelector.
    // Non-master / customer-context: there's no prior step → fall through
    // to cancel semantics (cleared state to avoid leaking).
    if (user?.role === "MASTER") {
      // Drop the cached target catalog so picking a different user
      // refetches; we still keep the customer if any (kebab path).
      setTargetUserDocumentTypes(null);
      setPendingDraftTargetUserId(null);
      setUserSelectorOpen(true);
      return;
    }
    cancelTemplateSelector();
  }

  function backFromCustomerDataOption() {
    setCustomerDataOptionOpen(false);
    // Re-open the template picker so the user can change templates.
    // Single-triple cases will see the lone option but the modal still
    // serves as a confirm step.
    setTemplateSelectorOpen(true);
  }

  function backFromCustomerSelector() {
    setCustomerSelectorOpen(false);
    setCustomerDataOptionOpen(true);
  }

  function backFromBusinessDataSelector() {
    setBusinessDataSelectorOpen(false);
    if (customerPickedViaDialog) {
      // Documents-section flow — go back to the customer picker so the
      // user can pick a different customer if they got the wrong one.
      setPendingDraftCustomerId(null);
      setCustomerPickedViaDialog(false);
      setCustomerSelectorOpen(true);
      return;
    }
    // Customer was pre-set (kebab / customer view) — back goes to the
    // template picker. Customer stays locked since it was the entry
    // point.
    setTemplateSelectorOpen(true);
  }

  function handleTemplateSelected(triple: DocumentDraftTriple) {
    setPendingDraftTriple(triple);
    setTemplateSelectorOpen(false);
    advanceAfterTriple(pendingDraftCustomerId);
  }

  function cancelTemplateSelector() {
    setTemplateSelectorOpen(false);
    // If the flow was kicked off from a customer, drop the stashed customer
    // too — otherwise a later unrelated "+ New document" click would pick it
    // up and incorrectly pre-link. Same goes for the master target user +
    // its cached catalog.
    setPendingDraftCustomerId(null);
    setPendingDraftTargetUserId(null);
    setTargetUserDocumentTypes(null);
  }

  function handleDataSourceSelected(source: CustomerDataSource) {
    setPendingDataSource(source);
    setBusinessDataSelectorOpen(false);
    openCreateDrawerFresh();
  }

  function cancelBusinessDataSelector() {
    setBusinessDataSelectorOpen(false);
    // Cancelling here means the user backed out after picking a template
    // for a customer — drop the whole pending draft state so the next
    // unrelated New Document click starts fresh.
    setPendingDraftCustomerId(null);
    setPendingDraftTriple(null);
  }

  function closeCreateDrawer() {
    setCreateDrawerOpen(false);
    removeSessionValue(DOCUMENTS_CREATE_DRAFT_STATE_KEY);
    // NOA-272 Chunk 3 Bug 1 fix — drop the per-draft sessionId so the next
    // "New Document" generates a fresh persistKey (no line_items leak across
    // drafts). Also sweep any orphan noasign:form-arrays:* keys defensively,
    // in case the renderer's clearPersistedArrays didn't run (race during
    // unmount, exception path, X→confirm bypassing renderer).
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("noasign:draft-session-id");
        for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
          const key = window.sessionStorage.key(i);
          if (key && key.startsWith("noasign:form-arrays:")) {
            window.sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Storage unavailable — silently degrade.
      }
    }
    setCreateDrawerVersion((current) => current + 1);
    if (pendingDraftCustomerId) setPendingDraftCustomerId(null);
    if (pendingDraftTriple) setPendingDraftTriple(null);
    if (pendingDataSource) setPendingDataSource(null);
    if (pendingDraftTargetUserId) setPendingDraftTargetUserId(null);
    if (targetUserDocumentTypes) setTargetUserDocumentTypes(null);
    if (customerPickedViaDialog) setCustomerPickedViaDialog(false);
    // Belt-and-suspenders — these dialogs should already be closed by the
    // time the drawer renders, but if anything went sideways, clear them so
    // the next entry point starts from a clean slate.
    if (customerDataOptionOpen) setCustomerDataOptionOpen(false);
    if (customerSelectorOpen) setCustomerSelectorOpen(false);
    if (userSelectorOpen) setUserSelectorOpen(false);
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
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[color:var(--bg-page)]/70 md:flex-row xl:overflow-visible">
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
                            (activeSection === "users" || activeSection === "accountRequests" || activeSection === "lockedUsers") &&
                              "bg-[#bdd4ff] text-[#022977] shadow-[var(--shadow-soft)] dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--menu-text)]",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4efff] text-[#5574a6] transition group-hover:bg-[#bdd4ff] group-hover:text-[#022977] dark:bg-[color:var(--bg-surface)] dark:text-[color:var(--menu-text-muted)] dark:group-hover:bg-[rgba(255,255,255,0.08)] dark:group-hover:text-white",
                              (activeSection === "users" || activeSection === "accountRequests" || activeSection === "lockedUsers") &&
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
                            <button
                              type="button"
                              onClick={() => {
                                updateActiveSection("lockedUsers");
                                if (window.innerWidth < 1280) {
                                  setOpen(false);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--menu-text-muted)] transition hover:bg-[#d8e6ff] hover:text-[#022977] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[color:var(--menu-text)]",
                                activeSection === "lockedUsers" &&
                                  "bg-[#bdd4ff] text-[#022977] shadow-[var(--shadow-soft)] dark:bg-[rgba(255,255,255,0.12)] dark:text-[color:var(--menu-text)]",
                              )}
                            >
                              <Lock className="h-4 w-4" />
                              <span>Locked Users</span>
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white text-sm font-semibold text-[color:var(--brand-secondary)] shadow-[var(--shadow-soft)] dark:border-white/10 dark:bg-[color:var(--bg-page)] dark:text-[color:var(--brand-accent)]">
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
            <DashboardOverviewPanel
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
                // NOA-280 — schema-driven drafts intercept Edit and show a
                // notice modal. The legacy viewer-with-edit-tabs only knows
                // hardcoded client/project/pricing keys, which produce a
                // partially-empty Frankenstein form on Laura's invoice
                // dataJson. Real schema-driven Edit lands in NOA-285.
                const targetDoc = documents?.find((d) => d.id === documentId);
                if (targetDoc?.formDefinition) {
                  setSchemaDrivenEditNotice({
                    documentId,
                    documentNumber: targetDoc.documentNumber,
                  });
                  return;
                }
                openDocumentViewer({
                  documentId,
                  tab: "client",
                  editingTab: "client",
                });
              }}
              onDocumentAction={handleDocumentAction}
              onCreateDraft={onCreateDraft}
              onStartNewDraft={() => startNewDraft()}
              canStartNewDraft={
                user?.role === "MASTER" ||
                flattenDocumentTypeTriples(documentTypes).length > 0
              }
            />
          ) : null}

          {activeSection === "customers" ? (
            <CustomersPanel
              customers={customers}
              customerDetail={customerDetail}
              selectedCustomerId={selectedCustomerId}
              isDetailLoading={isCustomerDetailLoading}
              customerActionId={customerActionId}
              isLoading={isLoading}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSelectCustomer={onSelectCustomer}
              onCloseCustomerDetail={onCloseCustomerDetail}
              onDeleteCustomer={onDeleteCustomer}
              onCreateCustomer={onCreateCustomer}
              onUpdateCustomer={onUpdateCustomer}
              documents={documents}
              onOpenDocumentView={(documentId) => {
                openDocumentViewer({
                  documentId,
                  tab: "client",
                  editingTab: null,
                });
              }}
              onPreviewFinalPdf={onPreviewFinalPdf}
              onDownloadFinalPdf={onDownloadFinalPdf}
              onStartCustomerDraft={(customerId) => startNewDraft(customerId)}
              currentUserRole={user?.role ?? null}
              currentUserId={user?.id ?? null}
              tenantUsers={users}
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

          {activeSection === "lockedUsers" && user?.role === "MASTER" ? (
            <LockedUsersPanel />
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
        documentTypes={effectiveDocumentTypes}
        onClose={closeDocumentViewer}
        onAction={handleDocumentAction}
        onUpdateDraft={onUpdateDraft}
        onSyncDocumentStatus={onSyncDocumentStatus}
        onPreviewFinalPdf={onPreviewFinalPdf}
        onDownloadFinalPdf={onDownloadFinalPdf}
      />
      {schemaDrivenEditNotice ? (
        <SchemaDrivenEditNotice
          documentNumber={schemaDrivenEditNotice.documentNumber}
          onClose={() => setSchemaDrivenEditNotice(null)}
          onCancelDraft={async () => {
            const id = schemaDrivenEditNotice.documentId;
            setSchemaDrivenEditNotice(null);
            await handleDocumentAction(id, "cancel");
          }}
        />
      ) : null}
      {templateSelectorOpen ? (
        <TemplateSelectorDialog
          formDefOptions={buildFormDefOptions(effectiveDocumentTypes)}
          onCancel={cancelTemplateSelector}
          onPick={handleTemplateSelected}
          onBack={
            user?.role === "MASTER" ? backFromTemplateSelector : undefined
          }
        />
      ) : null}
      {businessDataSelectorOpen && pendingDraftCustomerId ? (() => {
        const customer = customers?.find(
          (c) => c.id === pendingDraftCustomerId,
        );
        if (!customer) return null;
        return (
          <BusinessDataSelectorDialog
            customer={customer}
            onCancel={cancelBusinessDataSelector}
            onPick={handleDataSourceSelected}
            onBack={backFromBusinessDataSelector}
          />
        );
      })() : null}
      {userSelectorOpen ? (
        <UserSelectorDialog
          users={users ?? []}
          currentUserId={user?.id ?? null}
          onCancel={cancelUserSelector}
          onPick={(u) => void handleTargetUserSelected(u)}
          onCreateBlank={() => {
            // No target userId — master uses their own catalog (which is
            // already in props.documentTypes); document.userId defaults to
            // master.id at the backend.
            setUserSelectorOpen(false);
            proceedFromTriplePool(documentTypes, null);
          }}
        />
      ) : null}
      {customerDataOptionOpen ? (
        <CustomerDataOptionDialog
          onCancel={cancelCustomerDataOption}
          onPick={handleCustomerDataOption}
          onBack={backFromCustomerDataOption}
        />
      ) : null}
      {customerSelectorOpen ? (
        <CustomerSelectDialog
          // Master acting on behalf of a target user: scope the picker to
          // that user's customers (matches what the target user would see
          // and ensures the resulting document is linkable to a customer
          // they own).
          customers={(() => {
            const all = customers ?? [];
            if (pendingDraftTargetUserId) {
              return all.filter((c) => c.userId === pendingDraftTargetUserId);
            }
            return all;
          })()}
          emptyHint={
            pendingDraftTargetUserId
              ? "This user has no saved clients yet."
              : undefined
          }
          onCancel={cancelCustomerSelector}
          onPick={handleCustomerSelected}
          onBack={backFromCustomerSelector}
        />
      ) : null}
      <CreateDraftDrawer
        key={createDrawerVersion}
        open={createDrawerOpen}
        documentTypes={documentTypes}
        companyProfile={companyProfile}
        presetCustomer={
          pendingDraftCustomerId
            ? customers?.find((c) => c.id === pendingDraftCustomerId) ?? null
            : null
        }
        presetDataSource={pendingDataSource}
        presetDocumentTypeId={pendingDraftTriple?.documentTypeId ?? null}
        presetFormDefinitionId={pendingDraftTriple?.formDefinitionId ?? null}
        presetSignatureTemplateId={
          pendingDraftTriple?.signatureTemplateId ?? null
        }
        presetTargetUserId={pendingDraftTargetUserId}
        onClose={closeCreateDrawer}
        onCreateDraft={onCreateDraft}
        onOpenDocumentView={(documentId) => {
          openDocumentViewer({
            documentId,
            tab: "client",
            editingTab: null,
          });
        }}
      />
      {documentSuccessMessage ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
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
    </div>
  );
}

// NOA-238 — first step of the master Documents-section flow. Master picks
// the target user the draft will belong to (Document.userId on submit).
// The rest of the flow then operates from that user's perspective:
// templates re-fetched with ?asUserId=, customer picker filtered to the
// target user's customers.
function UserSelectorDialog({
  users,
  currentUserId,
  onCancel,
  onPick,
  onCreateBlank,
}: {
  users: NonNullable<Props["users"]>;
  currentUserId: string | null;
  onCancel: () => void;
  onPick: (user: { id: string; role: string; email: string }) => void;
  // "Create blank" — bypass user selection. Master proceeds with their own
  // template catalog and the resulting Document.userId defaults to master.id.
  onCreateBlank: () => void;
}) {
  const [view, setView] = useState<"options" | "list">("options");
  const [query, setQuery] = useState("");

  const eligibleUsers = useMemo(() => {
    return users.filter((u) => u.status === "ACTIVE");
  }, [users]);
  const me = useMemo(
    () => eligibleUsers.find((u) => u.id === currentUserId) ?? null,
    [eligibleUsers, currentUserId],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eligibleUsers;
    return eligibleUsers.filter((u) => {
      const fullName = [u.firstName, u.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [eligibleUsers, query]);

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
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.8rem] border border-[color:var(--border)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-6 py-5 dark:border-white/10">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              New document
            </div>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              {view === "options" ? "How do you want to start?" : "Pick a user"}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              {view === "options"
                ? "Create blank, create for yourself, or pick another user to draft on behalf of."
                : "Select the user this document will belong to. The next steps use that user's templates and clients."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-white text-[color:var(--text-secondary)] transition hover:border-[color:var(--danger-border)] hover:bg-[color:var(--danger-bg)] hover:text-[color:var(--danger-text)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-secondary)] dark:hover:border-[color:var(--danger-border)] dark:hover:bg-[color:var(--danger-bg)] dark:hover:text-[color:var(--danger-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "options" ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-3">
              <button
                type="button"
                onClick={onCreateBlank}
                className="group flex w-full items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-highlight)] hover:bg-[color:var(--warning-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-highlight)] dark:hover:bg-[color:var(--warning-bg)]"
              >
                <FilePlus className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--warning-text)] dark:text-[color:var(--warning-text)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                    Create blank
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                    Skip ownership assignment. Document is owned by you and can
                    be reassigned later.
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (me) {
                    onPick({ id: me.id, role: me.role, email: me.email });
                  } else {
                    // Master not in the tenantUsers list (edge case) — fall
                    // back to the blank path; document.userId still defaults
                    // to master.id at the backend.
                    onCreateBlank();
                  }
                }}
                className="group flex w-full items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-accent)] hover:bg-[color:var(--badge-primary-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-accent)] dark:hover:bg-[color:var(--brand-accent-soft)]"
              >
                <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--brand-accent-strong)] dark:text-[color:var(--brand-accent)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                    Create for me
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                    Use my own templates and clients. The document is owned
                    by me.
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className="group flex w-full items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--success-border)] hover:bg-[color:var(--success-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--success-border)] dark:hover:bg-[color:var(--success-bg)]"
              >
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--success)] dark:text-[color:var(--success-text)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                    Select user
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                    Draft on behalf of a teammate. Their templates and
                    clients will be used.
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-[color:var(--border)] px-6 py-4 dark:border-white/10">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email or role"
                  className="h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] pl-11 pr-4 text-sm text-[color:var(--text-primary)] caret-[color:var(--brand-accent)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-accent)] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:caret-[color:var(--brand-accent)] dark:placeholder:text-[color:var(--text-muted)] dark:focus:border-[color:var(--brand-accent)] dark:focus:bg-[color:var(--bg-elevated)]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filtered.length === 0 ? (
                <EmptyBlock
                  text={
                    eligibleUsers.length === 0
                      ? "No active users in this tenant."
                      : `No users matching "${query}".`
                  }
                />
              ) : (
                <div className="grid gap-2">
                  {filtered.map((u) => {
                    const fullName = [u.firstName, u.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim();
                    const label = fullName || u.email;
                    const isMe = u.id === currentUserId;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() =>
                          onPick({ id: u.id, role: u.role, email: u.email })
                        }
                        className="group flex w-full items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-3 text-left transition hover:border-[color:var(--brand-accent)] hover:bg-[color:var(--badge-primary-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-accent)] dark:hover:bg-[color:var(--brand-accent-soft)]"
                      >
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[color:var(--brand-accent-strong)] ring-1 ring-[color:var(--border)] transition group-hover:bg-[color:var(--button-primary)] group-hover:text-white group-hover:ring-[color:var(--brand-accent-strong)] dark:bg-white/10 dark:text-[color:var(--brand-accent)] dark:ring-white/10 dark:group-hover:bg-[color:var(--brand-accent)] dark:group-hover:text-white">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                              {label}
                            </div>
                            {isMe ? (
                              <span className="rounded-full bg-[color:var(--badge-primary-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-secondary)] dark:bg-[color:var(--brand-accent-soft)] dark:text-[color:var(--brand-accent)]">
                                Me
                              </span>
                            ) : null}
                            <span className="rounded-full bg-[color:var(--bg-surface-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-secondary)] dark:bg-white/10 dark:text-[color:var(--text-secondary)]">
                              {u.role.toLowerCase()}
                            </span>
                          </div>
                          <div className="truncate text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                            {u.email}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-[color:var(--border)] px-6 py-4 dark:border-white/10">
          {view === "list" ? (
            <button
              type="button"
              onClick={() => setView("options")}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-[color:var(--border)] bg-white px-5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <span />
          )}
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

// Step that comes after the template is locked in for a Documents-section
// draft (no customer pre-set). User picks whether to attach an existing
// customer or start blank. Skipped entirely when the flow already carries a
// customer (kebab "Create Document" / customer view "+ New Document").
function CustomerDataOptionDialog({
  onCancel,
  onPick,
  onBack,
}: {
  onCancel: () => void;
  onPick: (option: "customer" | "blank") => void;
  onBack?: () => void;
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
      <div className="relative w-full max-w-lg rounded-[1.8rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
          New document
        </div>
        <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
          Use a client or start blank?
        </h2>
        <p className="mt-1 text-sm text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
          Linking a client pre-fills the form fields. You can also start
          blank and fill the data manually.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onPick("customer")}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-accent)] hover:bg-[color:var(--badge-primary-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-accent)] dark:hover:bg-[color:var(--brand-accent-soft)]"
          >
            <Contact className="h-5 w-5 text-[color:var(--brand-accent-strong)] dark:text-[color:var(--brand-accent)]" />
            <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              Use a client
            </div>
            <div className="text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              Pre-fill from one of your saved clients.
            </div>
          </button>
          <button
            type="button"
            onClick={() => onPick("blank")}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-highlight)] hover:bg-[color:var(--warning-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-highlight)] dark:hover:bg-[color:var(--warning-bg)]"
          >
            <FilePlus className="h-5 w-5 text-[color:var(--warning-text)] dark:text-[color:var(--warning-text)]" />
            <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              Create blank
            </div>
            <div className="text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              Skip pre-fill and type the data yourself.
            </div>
          </button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-[color:var(--border)] bg-white px-5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <span />
          )}
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

// Customer picker shown after the user opted into "Use a customer". Search
// box matches name / email / phone (and the BUSINESS-side equivalents); the
// chip filter narrows by customer type. Cards render type badge + name +
// most-relevant email/phone snippet.
function CustomerSelectDialog({
  customers,
  onCancel,
  onPick,
  onBack,
  emptyHint,
}: {
  customers: Customer[];
  onCancel: () => void;
  onPick: (customer: Customer) => void;
  onBack?: () => void;
  // Override copy when the source list is empty (e.g. master picked a user
  // who has no customers yet → "User X has no saved customers" beats the
  // generic "No customers saved").
  emptyHint?: string;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PERSONAL" | "BUSINESS">(
    "ALL",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (typeFilter !== "ALL" && c.customerType !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        c.fullName,
        c.email,
        c.phone,
        c.business?.businessName,
        c.business?.businessEmail,
        c.business?.businessPhone,
        c.business?.primaryContactName,
        c.business?.primaryContactEmail,
        c.business?.primaryContactPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [customers, query, typeFilter]);

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
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.8rem] border border-[color:var(--border)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-6 py-5 dark:border-white/10">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              New document
            </div>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              Choose a client
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              Search by name, email or phone, or filter by client type.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-white text-[color:var(--text-secondary)] transition hover:border-[color:var(--danger-border)] hover:bg-[color:var(--danger-bg)] hover:text-[color:var(--danger-text)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-secondary)] dark:hover:border-[color:var(--danger-border)] dark:hover:bg-[color:var(--danger-bg)] dark:hover:text-[color:var(--danger-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 border-b border-[color:var(--border)] px-6 py-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or phone"
              className="h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] pl-11 pr-4 text-sm text-[color:var(--text-primary)] caret-[color:var(--brand-accent)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-accent)] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:caret-[color:var(--brand-accent)] dark:placeholder:text-[color:var(--text-muted)] dark:focus:border-[color:var(--brand-accent)] dark:focus:bg-[color:var(--bg-elevated)]"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["ALL", "PERSONAL", "BUSINESS"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTypeFilter(opt)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition",
                  typeFilter === opt
                    ? "bg-[color:var(--button-primary)] text-white"
                    : "bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-strong)] dark:bg-white/5 dark:text-[color:var(--text-secondary)] dark:hover:bg-white/10",
                )}
              >
                {opt === "ALL" ? "All" : opt === "PERSONAL" ? "Personal" : "Business"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <EmptyBlock
              text={
                customers.length === 0
                  ? emptyHint ?? "No clients saved yet."
                  : `No clients matching "${query}".`
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((c) => {
                const email = getDisplayEmail(c);
                const phone = getDisplayPhone(c);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPick(c)}
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-accent)] hover:bg-[color:var(--badge-primary-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-accent)] dark:hover:bg-[color:var(--brand-accent-soft)]"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="min-w-0 truncate text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                        {c.fullName}
                      </div>
                      <CustomerTypeBadge type={c.customerType} />
                    </div>
                    {email ? (
                      <div className="truncate text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                        {email}
                      </div>
                    ) : null}
                    {phone ? (
                      <div className="truncate text-[11px] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                        {formatUsPhone(phone)}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[color:var(--border)] px-6 py-4 dark:border-white/10">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-[color:var(--border)] bg-white px-5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <span />
          )}
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

function BusinessDataSelectorDialog({
  customer,
  onCancel,
  onPick,
  onBack,
}: {
  customer: Customer;
  onCancel: () => void;
  onPick: (source: CustomerDataSource) => void;
  onBack?: () => void;
}) {
  const b = customer.business;
  const businessSubtitle = [
    b?.businessEmail || b?.businessPhone || null,
  ]
    .filter(Boolean)
    .join(" · ") || "—";
  const contactSubtitle =
    [
      b?.primaryContactName || null,
      b?.primaryContactEmail || b?.primaryContactPhone || null,
    ]
      .filter(Boolean)
      .join(" · ") || "—";

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
      <div className="relative w-full max-w-lg rounded-[1.8rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
          Pre-fill source
        </div>
        <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
          Use which data?
        </h2>
        <p className="mt-1 text-sm text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
          {customer.fullName} has both a business profile and a primary
          contact. Pick which one fills the document.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onPick("business")}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-highlight)] hover:bg-[color:var(--warning-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-highlight)] dark:hover:bg-[color:var(--warning-bg)]"
          >
            <Building2 className="h-5 w-5 text-[color:var(--warning-text)] dark:text-[color:var(--warning-text)]" />
            <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              Business
            </div>
            <div className="text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              {b?.businessName ?? customer.fullName}
            </div>
            <div className="text-[11px] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              {businessSubtitle}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onPick("contact")}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-accent)] hover:bg-[color:var(--badge-primary-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-accent)] dark:hover:bg-[color:var(--brand-accent-soft)]"
          >
            <UserRound className="h-5 w-5 text-[color:var(--brand-accent-strong)] dark:text-[color:var(--brand-accent)]" />
            <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              Primary contact
            </div>
            <div className="text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              {b?.primaryContactName || "No contact saved"}
            </div>
            <div className="text-[11px] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              {contactSubtitle}
            </div>
          </button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-[color:var(--border)] bg-white px-5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <span />
          )}
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

function TemplateSelectorDialog({
  formDefOptions,
  onCancel,
  onPick,
  onBack,
}: {
  formDefOptions: FormDefOption[];
  onCancel: () => void;
  onPick: (triple: DocumentDraftTriple) => void;
  onBack?: () => void;
}) {
  // Skip step 1 entirely if there's only one FormDef option — keeps UX
  // identical to the legacy single-step modal for users with one form
  // available (e.g. regular users with a single UserDocumentConfig).
  const [selectedFormDefId, setSelectedFormDefId] = useState<string | null>(
    formDefOptions.length === 1 ? formDefOptions[0].id : null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const selectedFormDef = useMemo(
    () => formDefOptions.find((f) => f.id === selectedFormDefId) ?? null,
    [formDefOptions, selectedFormDefId],
  );

  const filteredFormDefs = useMemo(() => {
    const sorted = [...formDefOptions].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.documentTypeName.toLowerCase().includes(q),
    );
  }, [formDefOptions, searchQuery]);

  // Lock body scroll while open. Click on the backdrop does NOT close —
  // closing requires the X button or an explicit action.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Auto-pick the triple when the chosen FormDef has only one compatible
  // SignatureTemplate (invisible step 2 per spec).
  const handleFormDefClick = (option: FormDefOption) => {
    if (option.triples.length === 1) {
      onPick(option.triples[0]);
      return;
    }
    setSelectedFormDefId(option.id);
  };

  // Back routes step 2 → step 1 when there's >1 FormDef to go back to,
  // otherwise to the outer flow's onBack (e.g. master returning to
  // UserSelectorDialog). null hides the Back button.
  const backAction = (() => {
    if (selectedFormDef && formDefOptions.length > 1) {
      return () => setSelectedFormDefId(null);
    }
    if (onBack) return onBack;
    return null;
  })();

  const isStep2 = selectedFormDef !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur p-4"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.8rem] border border-[color:var(--border)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-6 py-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              New document
            </div>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
              {isStep2 ? "Choose a signature template" : "Choose a form"}
            </h2>
            <p className="mt-1 truncate text-sm text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              {isStep2
                ? `Form: ${selectedFormDef!.name} · ${selectedFormDef!.documentTypeName}`
                : "Pick the form you want to start from. You can search by name or document type."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-white text-[color:var(--text-secondary)] transition hover:border-[color:var(--danger-border)] hover:bg-[color:var(--danger-bg)] hover:text-[color:var(--danger-text)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-secondary)] dark:hover:border-[color:var(--danger-border)] dark:hover:bg-[color:var(--danger-bg)] dark:hover:text-[color:var(--danger-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isStep2 ? (
          <>
            <div className="border-b border-[color:var(--border)] px-6 py-4 dark:border-white/10">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by form or document type"
                  className="h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] pl-11 pr-4 text-sm text-[color:var(--text-primary)] caret-[color:var(--brand-accent)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-accent)] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:caret-[color:var(--brand-accent)] dark:placeholder:text-[color:var(--text-muted)] dark:focus:border-[color:var(--brand-accent)] dark:focus:bg-[color:var(--bg-elevated)]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredFormDefs.length === 0 ? (
                <div className="px-6 py-5">
                  <EmptyBlock
                    text={
                      formDefOptions.length === 0
                        ? "No forms available."
                        : `No forms matching "${searchQuery}".`
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-[color:var(--divider)] dark:divide-white/10">
                  {filteredFormDefs.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => handleFormDefClick(option)}
                        className="group flex w-full items-center gap-3 px-6 py-3 text-left transition hover:bg-[color:var(--bg-surface)] dark:hover:bg-[color:var(--bg-surface-strong)]/60"
                      >
                        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--bg-surface)] text-[color:var(--brand-accent-strong)] transition group-hover:bg-[color:var(--button-primary)] group-hover:text-white dark:bg-white/5 dark:text-[color:var(--brand-accent)] dark:group-hover:bg-[color:var(--brand-accent)] dark:group-hover:text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                            {option.name}
                          </div>
                          <div className="truncate text-xs text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                            {option.documentTypeName} · {option.fieldCount}{" "}
                            {option.fieldCount === 1 ? "field" : "fields"}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition group-hover:text-[color:var(--brand-accent)] dark:text-[color:var(--text-muted)]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-3 md:grid-cols-2">
              {selectedFormDef!.triples.map((t) => (
                <button
                  key={`${t.formDefinitionId}:${t.signatureTemplateId}`}
                  type="button"
                  onClick={() => onPick(t)}
                  className="group flex flex-col items-start gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-4 text-left transition hover:border-[color:var(--brand-accent)] hover:bg-[color:var(--badge-primary-bg)] dark:border-white/10 dark:bg-white/5 dark:hover:border-[color:var(--brand-accent)] dark:hover:bg-[color:var(--brand-accent-soft)]"
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[color:var(--brand-accent-strong)] ring-1 ring-[color:var(--border)] transition group-hover:bg-[color:var(--button-primary)] group-hover:text-white group-hover:ring-[color:var(--brand-accent-strong)] dark:bg-white/10 dark:text-[color:var(--brand-accent)] dark:ring-white/10 dark:group-hover:bg-[color:var(--brand-accent)] dark:group-hover:text-white">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
                    {t.signatureTemplateName}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[color:var(--border)] px-6 py-4 dark:border-white/10">
          {backAction ? (
            <button
              type="button"
              onClick={backAction}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-[color:var(--border)] bg-white px-5 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <span />
          )}
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
    <div className="fixed inset-0 z-[80] flex items-start justify-center md:items-center bg-black/60 p-4 pt-20 md:pt-0 backdrop-blur">
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

function CreateDraftDrawer({
  open,
  documentTypes,
  companyProfile,
  presetCustomer,
  presetDataSource,
  presetDocumentTypeId,
  presetFormDefinitionId,
  presetSignatureTemplateId,
  presetTargetUserId,
  onClose,
  onCreateDraft,
  onOpenDocumentView,
}: {
  open: boolean;
  documentTypes: DocumentTypeCatalogItem[];
  companyProfile: Props["companyProfile"];
  presetCustomer: Customer | null;
  presetDataSource: CustomerDataSource | null;
  presetDocumentTypeId: string | null;
  presetFormDefinitionId: string | null;
  presetSignatureTemplateId: string | null;
  // NOA-238 — when set, the resulting Document.userId is this id (master
  // assigning to a target user). Empty string handled client-side; null
  // means no override (caller becomes owner).
  presetTargetUserId: string | null;
  onClose: () => void;
  onCreateDraft: (payload: {
    documentTypeId: string;
    formDefinitionId: string;
    signatureTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
    customerId?: string;
    userId?: string;
  }) => Promise<DocDetail | void>;
  onOpenDocumentView: (documentId: string) => void;
}) {
  const drawerScrollRef = useRef<HTMLElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  // Initialize from presets (set by TemplateSelectorDialog). Empty string when
  // no preset → user must pick explicitly via the Setup dropdowns (no more
  // silent auto-pick-first).
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState(
    presetDocumentTypeId ?? "",
  );
  const [selectedFormDefinitionId, setSelectedFormDefinitionId] = useState(
    presetFormDefinitionId ?? "",
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    presetSignatureTemplateId ?? "",
  );
  const [contractDate, setContractDate] = useState("");

  // NOA-272 Chunk 3 Bug 1 fix — per-draft session id stored in sessionStorage.
  // Each fresh "New Document" generates a unique id; closeCreateDrawer
  // (parent) clears it on save success / confirmed cancel / X-confirm,
  // forcing the next mount to generate a new id. The id is part of the
  // arrays persistKey so two drafts with the same documentType+formDef
  // never share their line_items state. Refresh during the same edit
  // session preserves the id (sessionStorage survives F5), so arrays
  // restoration still works.
  const [sessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const KEY = "noasign:draft-session-id";
    try {
      let sid = window.sessionStorage.getItem(KEY);
      if (!sid) {
        sid =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        window.sessionStorage.setItem(KEY, sid);
      }
      return sid;
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  });

  useEffect(() => {
    if (!open) return;

    const persistedState =
      readSessionJson<PersistedCreateDraftState>(DOCUMENTS_CREATE_DRAFT_STATE_KEY);

    if (!persistedState) return;

    setIsSetupOpen(persistedState.isSetupOpen ?? false);
    // Don't overwrite presets with stale sessionStorage state. Presets always
    // win — they represent a deliberate choice from the Template Selector.
    if (!presetDocumentTypeId) {
      setSelectedDocumentTypeId(persistedState.selectedDocumentTypeId ?? "");
    }
    if (!presetFormDefinitionId) {
      setSelectedFormDefinitionId(persistedState.selectedFormDefinitionId ?? "");
    }
    if (!presetSignatureTemplateId) {
      setSelectedTemplateId(persistedState.selectedTemplateId ?? "");
    }
    setContractDate(persistedState.contractDate ?? "");
  }, [
    open,
    presetDocumentTypeId,
    presetFormDefinitionId,
    presetSignatureTemplateId,
  ]);

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

  // Auto-select-first effects removed in favor of the Template Selector
  // Modal. Legacy path (opened without preset) leaves the fields empty and
  // requires the user to pick from the Setup dropdowns.

  useEffect(() => {
    if (!selectedDocumentType) {
      setSelectedFormDefinitionId("");
      setSelectedTemplateId("");
      return;
    }
    // When documentType changes, keep the formDef / sigTemplate only if they
    // still belong to the new type (true for Template Selector presets).
    // Otherwise: auto-pick when the new type has only one option — the
    // Form / Template dropdown is hidden in that case (NOA-270 visibility
    // fix), so leaving it empty would strand canSubmit at false with no
    // way to recover. With multiple options, leave empty so the user picks
    // explicitly via the (visible) dropdown.
    setSelectedFormDefinitionId((current) => {
      if (selectedDocumentType.formDefinitions.some((f) => f.id === current)) {
        return current;
      }
      if (selectedDocumentType.formDefinitions.length === 1) {
        return selectedDocumentType.formDefinitions[0].id;
      }
      return "";
    });
    setSelectedTemplateId((current) => {
      if (selectedDocumentType.signatureTemplates.some((s) => s.id === current)) {
        return current;
      }
      if (selectedDocumentType.signatureTemplates.length === 1) {
        return selectedDocumentType.signatureTemplates[0].id;
      }
      return "";
    });
  }, [selectedDocumentType]);

  // When a customer is preset (entry from Customers section), pre-populate
  // form fields. Schemas across templates use multiple naming conventions
  // for the same data ("name" vs "customer_name", "address" vs
  // "customer_address_line_1", etc.) — emit every plausible key. The
  // renderer ignores keys that don't exist in the schema, so over-supplying
  // is harmless and avoids per-template wiring.
  //
  // For BUSINESS customers the source is chosen up front in the Business
  // Data Selector: 'business' uses the business row, 'contact' uses the
  // primary contact section. PERSONAL customers always use customer.* fields.
  const customerInitialValues = useMemo<
    Record<string, string> | undefined
  >(() => {
    if (!presetCustomer) return undefined;
    const c = presetCustomer;
    const b = c.business;
    const isBusiness = c.customerType === "BUSINESS";
    const useContact = isBusiness && presetDataSource === "contact";

    // Resolve each field from the chosen source. PERSONAL falls through to
    // the customer's own fields. BUSINESS + 'business' uses the business
    // row. BUSINESS + 'contact' uses the primary contact section.
    const name = useContact
      ? b?.primaryContactName ?? ""
      : c.fullName;
    const email = useContact
      ? b?.primaryContactEmail ?? ""
      : isBusiness
        ? b?.businessEmail ?? ""
        : c.email ?? "";
    const phone = formatUsPhone(
      useContact
        ? b?.primaryContactPhone ?? ""
        : isBusiness
          ? b?.businessPhone ?? ""
          : c.phone ?? "",
    );
    const addressLine1 = useContact
      ? b?.primaryContactAddressLine1 ?? ""
      : isBusiness
        ? b?.businessAddressLine1 ?? ""
        : c.addressLine1 ?? "";
    const addressLine2 = useContact
      ? ""
      : isBusiness
        ? b?.businessAddressLine2 ?? ""
        : c.addressLine2 ?? "";
    const city = useContact
      ? b?.primaryContactCity ?? ""
      : isBusiness
        ? b?.businessCity ?? ""
        : c.city ?? "";
    const state = useContact
      ? b?.primaryContactState ?? ""
      : isBusiness
        ? b?.businessState ?? ""
        : c.state ?? "";
    const zip = useContact
      ? b?.primaryContactZipCode ?? ""
      : isBusiness
        ? b?.businessZipCode ?? ""
        : c.zipCode ?? "";
    const title = useContact ? b?.primaryContactTitle ?? "" : "";
    const businessName = b?.businessName ?? "";
    const licenseNumber = b?.licenseNumber ?? "";

    // Split full name into first/last so schemas with separate name fields
    // (e.g. Laura's invoice) can prefill correctly. First token is first
    // name, the rest joins as last name — handles "Maria José Rodriguez" as
    // first="Maria", last="José Rodriguez". For BUSINESS the personal name
    // fields are typically hidden (hideWhen: 'isBusiness') so the awkward
    // split of e.g. "Constructora San Martin SAC" into first/last doesn't
    // surface.
    const [firstName = "", ...nameRest] = (name || "").trim().split(/\s+/);
    const lastName = nameRest.join(" ");
    const contactPerson = b?.primaryContactName ?? "";

    return {
      // Unprefixed keys (most common in NTSsign customer-facing schemas)
      name,
      full_name: name,
      first_name: firstName,
      last_name: lastName,
      title,
      email,
      phone,
      address: addressLine1,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      city,
      state,
      zip,
      zip_code: zip,
      notes: c.notes ?? "",
      contact_person: contactPerson,
      // Prefixed keys (alternate convention)
      customer_name: name,
      customer_full_name: name,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_title: title,
      customer_email: email,
      customer_phone: phone,
      customer_address: addressLine1,
      customer_address_line_1: addressLine1,
      customer_address_line_2: addressLine2,
      customer_city: city,
      customer_state: state,
      customer_zip: zip,
      customer_zip_code: zip,
      customer_notes: c.notes ?? "",
      customer_contact_person: contactPerson,
      // Business-row fields stay available regardless of source — the
      // license number and business legal name belong to the company even
      // when the contact's personal data fills the "customer" block.
      business_name: businessName,
      customer_business_name: businessName,
      license_number: licenseNumber,
      customer_license_number: licenseNumber,
    };
  }, [presetCustomer, presetDataSource]);

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
        ...(presetCustomer ? { customerId: presetCustomer.id } : {}),
        // NOA-238 — master assigning the draft to a target user.
        ...(presetTargetUserId ? { userId: presetTargetUserId } : {}),
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
    <div className="fixed inset-0 z-50 flex min-h-screen items-start justify-center bg-black/60 p-2 pt-1 backdrop-blur md:items-center md:p-4">
      <button type="button" aria-label="Close draft creator" onClick={requestClose} className="absolute inset-0" />
      <aside
        ref={drawerScrollRef}
        className="relative z-10 flex max-h-[98vh] w-full max-w-[90vw] flex-col overflow-y-auto rounded-[2rem] border border-[color:var(--border)] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[color:var(--bg-page)] md:h-[96vh] md:max-h-[96vh] md:max-w-[96vw]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] px-5 py-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Create draft</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">New document</h2>
            <div className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Create a draft, then continue editing it in the document viewer.</div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] text-[color:var(--danger-text)] transition hover:bg-[color:var(--badge-danger-bg)] dark:border-[color:var(--danger-border)] dark:bg-[color:var(--danger-bg)] dark:text-[color:var(--danger-text)] dark:hover:bg-[color:var(--badge-danger-bg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[color:var(--border)] px-5 py-4 dark:border-white/10">
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
                {/* NOA-270 — editable for all users. Options filtered to types
                    with at least 1 FormDefinition (defensive; backend already
                    scopes the catalog to the user's UserDocumentConfigs for
                    non-MASTER roles via getDocumentTypes(userId)).
                    NOA-277 — uses PopoverSelectField for non-native dropdown
                    styling consistent with the rows-per-page pattern. */}
                <PopoverSelectField
                  label="Document type"
                  value={selectedDocumentTypeId}
                  onChange={setSelectedDocumentTypeId}
                  icon={<FileText className="h-4 w-4" />}
                  options={documentTypes
                    .filter((item) => (item.formDefinitions ?? []).length > 0)
                    .map((item) => ({ value: item.id, label: item.name }))}
                />
                <EditableField
                  icon={<ScanText className="h-4 w-4" />}
                  label="Document date"
                  type="date"
                  value={contractDate}
                  onChange={setContractDate}
                />
                {/* NOA-270 — only render Form selector when there's a real
                    choice. With a single FormDefinition the auto-pick from
                    TemplateSelectorDialog already locked it in; showing a
                    disabled dropdown with one option is just visual noise. */}
                {(selectedDocumentType?.formDefinitions ?? []).length > 1 ? (
                  <SelectField
                    label="Form"
                    value={selectedFormDefinitionId}
                    onChange={setSelectedFormDefinitionId}
                    icon={<FileJson className="h-4 w-4" />}
                    disabled
                    options={(selectedDocumentType?.formDefinitions ?? []).map((item) => ({ value: item.id, label: item.name }))}
                  />
                ) : null}
                {/* Same rule for SignatureTemplate. */}
                {(selectedDocumentType?.signatureTemplates ?? []).length > 1 ? (
                  <SelectField
                    label="Template"
                    value={selectedTemplateId}
                    onChange={setSelectedTemplateId}
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    disabled
                    options={(selectedDocumentType?.signatureTemplates ?? []).map((item) => ({ value: item.id, label: item.name }))}
                  />
                ) : null}
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
          // NOA-270 — when a BUSINESS customer is preset, flip any
          // `isBusiness` toggle in the schema so the business-specific
          // fields (showWhen) appear and personal fields (hideWhen) hide.
          // Convention-based: any toggle whose key === "isBusiness" is
          // driven by customer.customerType. Other toggles fall back to
          // schema defaults.
          let initialToggles: Record<string, boolean> | undefined;
          if (presetCustomer) {
            const isBusiness = presetCustomer.customerType === "BUSINESS";
            const overrides: Record<string, boolean> = {};
            for (const section of schema.sections) {
              for (const toggle of section.toggles ?? []) {
                if (toggle.key === "isBusiness") {
                  overrides[`${section.key}:${toggle.key}`] = isBusiness;
                }
              }
            }
            if (Object.keys(overrides).length > 0) {
              initialToggles = overrides;
            }
          }
          // NOA-272 Chunk 3 — sessionStorage key for dynamic_array persistence.
          // Scoped by documentType + formDefinition + per-draft sessionId so
          // distinct drafts can never collide (Bug 1 fix). When sessionId is
          // missing (SSR / sessionStorage unavailable), persistence is
          // disabled. Refresh keeps the same sessionId (sessionStorage
          // survives F5) so restoration after refresh works (Bug 2 scope).
          const persistKey =
            sessionId && selectedDocumentType?.code && selectedFormDefinitionId
              ? `noasign:form-arrays:${selectedDocumentType.code}:${selectedFormDefinitionId}:${sessionId}`
              : undefined;
          // NOA-272 Chunk 3 Bug 3 fix — pass `onClose` (not `requestClose`)
          // as the renderer's onCancel. The renderer already shows its own
          // confirm dialog for dirty state (incluye arrays); routing back to
          // requestClose would surface a SECOND confirm from the drawer.
          // The drawer's own confirm via requestClose still applies to its
          // X button + backdrop click (paths that bypass the renderer).
          return (
            <DocumentWizard
              schema={schema}
              onSubmit={handleRendererSubmit}
              onCancel={onClose}
              isSubmitting={isSubmitting}
              initialValues={customerInitialValues}
              initialToggles={initialToggles}
              persistKey={persistKey}
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
        <div className="absolute inset-0 z-[60] flex min-h-full items-center justify-center bg-black/60 backdrop-blur p-4">
          <div className="w-full max-w-sm -translate-y-[50%] rounded-[1.75rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[color:var(--bg-page)] md:translate-y-0">
            <div className="text-lg font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">Cancel draft?</div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
              If you close this popup now, the information entered here will be discarded.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCloseOpen(false)}
                className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCloseOpen(false);
                  onClose();
                }}
                className="rounded-xl bg-[color:var(--button-danger)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-danger-hover)]"
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
  documentTypes,
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
  /** NOA-280 — needed to look up the schema for the document's
   *  formDefinition so the viewer can render schema-driven instead of the
   *  legacy hardcoded client/project/pricing extractors. */
  documentTypes: DocumentTypeCatalogItem[];
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

  // NOA-280 — schema-driven viewer. Look up the document's FormDefinition
  // schema from the documentTypes catalog (already loaded by the parent).
  // Match by documentType.code + formDefinition.name; the backend's
  // /documents/:id response only includes formDefinition.{name, key}, not
  // schemaJson, so the lookup keeps us off the backend critical path.
  const schemaForDoc = useMemo<DocumentSchema | undefined>(() => {
    if (!document?.documentType?.code || !document?.formDefinition?.name) return undefined;
    const docType = documentTypes.find((dt) => dt.code === document.documentType?.code);
    if (!docType) return undefined;
    const formDef = docType.formDefinitions.find(
      (fd) => fd.name === document.formDefinition?.name,
    );
    return formDef?.schemaJson as DocumentSchema | undefined;
  }, [document, documentTypes]);

  const schemaSectionKeys = useMemo(
    () => schemaForDoc?.sections.map((s) => s.key) ?? [],
    [schemaForDoc],
  );

  // NOA-280 — deduce toggle state from saved dataJson presence. The renderer
  // never persists toggle state in dataJson today; for the readOnly viewer
  // we infer isBusiness from whether business_name has a value (only set
  // when the customer was a business at submit time).
  // TODO: NOA-283 — replace with _toggles key from dataJson once toggle
  // persistence is implemented.
  // Workaround: deducir de presencia de business_name
  const deducedToggles = useMemo<Record<string, boolean> | undefined>(() => {
    if (!schemaForDoc || !document?.data?.dataJson) return undefined;
    const dataJson = document.data.dataJson as Record<string, unknown>;
    const overrides: Record<string, boolean> = {};
    for (const section of schemaForDoc.sections) {
      for (const toggle of section.toggles ?? []) {
        if (toggle.key === "isBusiness") {
          const businessName = dataJson.business_name;
          overrides[`${section.key}:${toggle.key}`] =
            typeof businessName === "string" && businessName.trim().length > 0;
        }
      }
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
  }, [schemaForDoc, document]);

  // NOA-280 — deserialize the saved dataJson's flat-key bracket-notation
  // (line_items[0].description, line_items[0].qty, ...) back into the
  // nested arrays state shape the renderer expects. Mirror image of the
  // submit-time flatten in handleSubmit.
  const deserializedArrays = useMemo<
    Record<string, Array<Record<string, string>>> | undefined
  >(() => {
    if (!schemaForDoc || !document?.data?.dataJson) return undefined;
    const dataJson = document.data.dataJson as Record<string, unknown>;
    const result: Record<string, Array<Record<string, string>>> = {};
    for (const section of schemaForDoc.sections) {
      for (const field of section.fields) {
        if (field.type !== "dynamic_array") continue;
        const arrayKey = field.key;
        const itemFields = field.itemFields ?? [];
        const indexPattern = new RegExp(
          `^${arrayKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\[(\\d+)\\]\\.`,
        );
        let maxIdx = -1;
        for (const key of Object.keys(dataJson)) {
          const match = key.match(indexPattern);
          if (match) maxIdx = Math.max(maxIdx, parseInt(match[1]!, 10));
        }
        const items: Array<Record<string, string>> = [];
        for (let i = 0; i <= maxIdx; i++) {
          const item: Record<string, string> = {};
          for (const itemField of itemFields) {
            const val = dataJson[`${arrayKey}[${i}].${itemField.key}`];
            item[itemField.key] =
              typeof val === "string" ? val : val == null ? "" : String(val);
          }
          items.push(item);
        }
        if (items.length > 0) result[arrayKey] = items;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }, [schemaForDoc, document]);

  // NOA-280 — coerce dataJson scalar values to strings for the renderer's
  // initialValues prop (renderer fields all hold strings; numbers/booleans
  // get stringified, dynamic_array flat keys are skipped because they're
  // rebuilt into nested form via deserializedArrays above).
  const stringifiedInitialValues = useMemo<Record<string, string> | undefined>(() => {
    if (!document?.data?.dataJson) return undefined;
    const dataJson = document.data.dataJson as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(dataJson)) {
      // Skip flat-key array entries — they're handled by deserializedArrays.
      if (k.includes("[") && k.includes("].")) continue;
      if (typeof v === "string") out[k] = v;
      else if (v != null) out[k] = String(v);
    }
    return out;
  }, [document]);
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

  function handleTabChange(nextTab: typeof activeTab) {
    // NOA-280 — block tab switching while a legacy edit is active. The user
    // must Save or Cancel from the TabEditorToolbar explicitly. Previously
    // we auto-called saveEditingTab() here, which silently PATCH'd partial
    // edits to the backend whenever the user navigated away — surprising
    // behavior, especially for schema-driven docs where the edit form is
    // partially populated (Frankenstein form, see NOA-285).
    // TODO: NOA-285 — when schema-driven Edit reuses CreateDraftDrawer,
    // this guard becomes obsolete. Remove with saveEditingTab cleanup.
    if (editingTab && nextTab !== editingTab) {
      return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur p-4">
      <button type="button" aria-label="Close document viewer" onClick={onClose} className="absolute inset-0" />
      <aside className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.8rem] border border-[color:var(--border)] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[color:var(--bg-page)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-4 md:gap-4 md:px-5 md:py-5 dark:border-white/10">
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">Document view</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-[-0.04em] text-[color:var(--text-primary)] md:text-2xl dark:text-[color:var(--text-primary)]">
                  {isLoading ? "Loading..." : document?.documentNumber ?? "Document detail"}
                </h2>
                {document ? <StatusBadge status={document.status} /> : null}
              </div>
              <div className="mt-1 text-xs text-[color:var(--text-muted)] md:mt-2 md:text-sm dark:text-[color:var(--text-muted)]">
                {isLoading ? "Preparing detail..." : document?.documentType?.name ?? "Contract"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] transition hover:bg-white md:h-10 md:w-10 dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-secondary)] dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {document && !editingTab && !isLoading && (actionButtons.length > 0 || canDownloadPdf) ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              {canDownloadPdf ? (
                <button
                  type="button"
                  onClick={() => void onDownloadFinalPdf(document.id)}
                  disabled={actionInFlight === document.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-3 py-2 text-xs font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)] md:gap-2 md:px-4 md:py-2.5 md:text-sm",
                    actionInFlight === document.id && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span>{actionInFlight === document.id ? "Preparing..." : "Download PDF"}</span>
                </button>
              ) : null}
              {actionButtons.map((action) => (
                <button
                  key={`viewer-header-${action.key}`}
                  type="button"
                  onClick={() => {
                    if (action.disabled) return;
                    void onAction(document.id, action.key);
                  }}
                  disabled={action.disabled || actionInFlight === document.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium transition md:gap-2 md:px-4 md:py-2.5 md:text-sm",
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
              ))}
            </div>
          ) : null}
        </div>

        <div className="border-b border-[color:var(--border)] px-5 py-3 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {/* NOA-280 — tabs derived from the document's FormDefinition
                schema (Beneficiary, Services, etc. for Laura's invoice)
                instead of the legacy hardcoded client/project/pricing
                tabs. Timeline + Final PDF stay as viewer-specific tabs.
                If schema lookup failed (e.g. doc from a deleted form),
                fall back to legacy tabs so old documents still render. */}
            {(schemaForDoc
              ? [
                  ...schemaForDoc.sections.map((s) => ({ key: s.key, label: s.label })),
                  { key: "timeline", label: "Timeline" },
                  ...(hasPdfStage ? [{ key: "pdf", label: "Final PDF" }] : []),
                ]
              : [
                  { key: "client", label: "Client" },
                  { key: "project", label: "Project" },
                  { key: "pricing", label: "Pricing" },
                  { key: "timeline", label: "Timeline" },
                  ...(hasPdfStage ? [{ key: "pdf", label: "Final PDF" }] : []),
                ]
            ).map((tab) => {
              // NOA-280 — lock non-active tabs while a legacy edit is in
              // progress. Pairs with handleTabChange's guard to force the
              // user to Save or Cancel via the TabEditorToolbar.
              const isLocked = Boolean(editingTab) && tab.key !== editingTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key as typeof activeTab)}
                  disabled={isLocked}
                  aria-disabled={isLocked}
                  title={isLocked ? "Save or cancel current edit first" : undefined}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                    activeTab === tab.key
                      ? "border-[color:var(--brand-accent-strong)] bg-[color:var(--button-primary)] text-white"
                      : "border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-secondary)] dark:hover:bg-white/10",
                    isLocked && "cursor-not-allowed opacity-50 hover:bg-[color:var(--bg-page-subtle)] dark:hover:bg-white/[0.04]",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div ref={viewerScrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <EmptyBlock text="Loading document detail..." />
          ) : !document ? (
            <EmptyBlock text="Select a document to inspect its detail." />
          ) : schemaForDoc && schemaSectionKeys.includes(activeTab as string) ? (
            // NOA-280 — schema-driven render of the active section. Build a
            // single-section sub-schema and hand it to DocumentWizard
            // in readOnly mode. Hydrated from the saved dataJson:
            // - flat scalar fields → initialValues
            // - dynamic_array flat keys → deserialized into nested arrays
            // - isBusiness toggle → deduced from business_name presence
            //   (workaround for NOA-283).
            (() => {
              const sectionDef = schemaForDoc.sections.find((s) => s.key === activeTab);
              if (!sectionDef) {
                return <EmptyBlock text="Section not found in schema." />;
              }
              const subSchema: DocumentSchema = { sections: [sectionDef] };
              return (
                <DocumentWizard
                  // Force remount per (doc, section) — the renderer's useState
                  // lazy init reads initialArrays once on mount; without a key,
                  // React reuses the instance across tab switches and the array
                  // state from the first-visited section sticks (NOA-280 bug).
                  key={`viewer-section-${document?.id ?? "none"}-${activeTab}`}
                  schema={subSchema}
                  initialValues={stringifiedInitialValues}
                  initialToggles={deducedToggles}
                  initialArrays={deserializedArrays}
                  readOnly
                  onSubmit={() => Promise.resolve()}
                  onCancel={onClose}
                />
              );
            })()
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
                      label="Client name"
                      value={clientProfile.nameKey ? draftFields[clientProfile.nameKey] ?? clientProfile.name : clientProfile.name}
                      onChange={(nextValue) => {
                        if (!clientProfile.nameKey) return;
                        setDraftFields((current) => ({ ...current, [clientProfile.nameKey!]: nextValue }));
                      }}
                    />
                  ) : (
                    <DetailRow icon={<UserRound className="h-4 w-4" />} label="Client name" value={clientProfile.name || "Not provided"} />
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
                <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">{item.label}</span>
                  <span className="font-medium text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-[1.6rem] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--bg-page-subtle)] px-5 py-12 text-center dark:border-white/10 dark:bg-white/[0.04]">
                <div className="text-lg font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">Final signed PDF</div>
                <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                  Download the signed PDF once the signature provider confirms the document as completed.
                </p>
                <button
                  type="button"
                  onClick={() => void openPdfPreview()}
                  disabled={!document || actionInFlight === document.id}
                  className={cn(
                    "mt-5 inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-surface)] dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-primary)] dark:hover:bg-white/10",
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
                      "mt-3 inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-surface)] dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-primary)] dark:hover:bg-white/10",
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
        <div className="absolute inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 p-4 backdrop-blur">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[color:var(--bg-page)] shadow-[0_28px_80px_rgba(10,18,32,0.55)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-white">Signed PDF preview</div>
                <div className="text-xs text-[color:var(--text-muted)]">
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[color:var(--text-primary)] transition hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-[color:var(--bg-elevated)]">
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

// NOA-277 — drop-in replacement for SelectField that uses a custom popover
// (button + absolute-positioned panel) instead of native <select>. Same API,
// same outer card chrome — only the dropdown UI changes. Mirrors the
// "rows per page" pattern from DocumentsPanel pagination so the design
// system stays consistent and the OS-native dropdown style is gone.
//
// Currently used only for "Document type" in the CreateDraftDrawer setup
// card. SelectField is still used elsewhere (Form / Template selectors,
// hidden when only one option exists). Other call sites can migrate
// incrementally without breaking anything.
function PopoverSelectField({
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "Select";

  return (
    <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
        <span className="text-[color:var(--text-muted)]">
          {icon ?? <FileJson className="h-4 w-4" />}
        </span>
        {label}
      </div>
      <div ref={menuRef} className="relative mt-3">
        <button
          type="button"
          onClick={() => !disabled && setOpen((current) => !current)}
          disabled={disabled}
          className={cn(
            "inline-flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-4 text-sm font-medium text-[color:var(--text-secondary)] outline-none transition hover:border-[color:var(--border-strong)] hover:bg-white focus:border-[color:var(--brand-accent)] dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10",
            disabled && "cursor-not-allowed opacity-60 hover:border-[color:var(--border)] hover:bg-[color:var(--bg-page-subtle)] dark:hover:bg-white/5",
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]" />
        </button>
        {open && !disabled ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-60 overflow-y-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)] dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">
                No options
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                    option.value === value
                      ? "bg-[color:var(--button-primary)] text-white"
                      : "text-[color:var(--text-secondary)] hover:bg-white dark:text-[color:var(--text-primary)] dark:hover:bg-white/[0.08]",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
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

// NOA-280 — shown when user clicks Edit on a schema-driven draft. The
// legacy edit flow doesn't fit schema-driven dataJson, so until NOA-285
// ships a real schema-driven Edit, the recovery path is Cancel + recreate.
function SchemaDrivenEditNotice({
  documentNumber,
  onClose,
  onCancelDraft,
}: {
  documentNumber: string;
  onClose: () => void;
  onCancelDraft: () => Promise<void> | void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);

  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schema-edit-notice-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur p-4"
    >
      <button type="button" aria-label="Close notice" onClick={onClose} className="absolute inset-0" />
      <div className="relative z-10 w-full max-w-md rounded-[1.8rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]">
        <h2 id="schema-edit-notice-title" className="text-lg font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">
          Edit not available yet
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)] dark:text-[color:var(--text-secondary)]">
          We&apos;re redesigning the edit experience for this document type to give you a better workflow. For now, to modify draft <span className="font-medium text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{documentNumber}</span>, please cancel it and create a new one with the updated information.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
          >
            Close
          </button>
          <button
            type="button"
            onClick={async () => {
              if (isCancelling) return;
              setIsCancelling(true);
              try {
                await onCancelDraft();
              } finally {
                setIsCancelling(false);
              }
            }}
            disabled={isCancelling}
            className="rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-2 text-sm font-semibold text-[color:var(--danger-text)] transition hover:bg-[color:var(--badge-danger-bg)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[color:var(--danger-border)] dark:bg-[color:var(--danger-bg)] dark:text-[color:var(--danger-text)] dark:hover:bg-[color:var(--badge-danger-bg)]"
          >
            {isCancelling ? "Cancelling..." : "Cancel draft"}
          </button>
        </div>
      </div>
    </div>,
    window.document.body,
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
      : "border-[color:var(--border)] bg-[#022977]";

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
      : "border-[color:var(--border)] bg-[#022977]";

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

export function buildContractStats(documents: Doc[] | null) {
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

// TODO: NOA-284 — getClientProfile / getProjectProfile / getPricingEntries
// (and the related getClientEntries / getProjectEntries) are legacy
// extractors that read hardcoded keys from dataJson. They stay as fallback
// for pre-schema-driven docs. Remove after telemetry confirms zero usage
// (i.e. all live docs are bound to a FormDefinition the viewer can resolve
// via documentTypes catalog).
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

  if (section === "customers") {
    return ["Workspace", "Clients"];
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

function buildTimeline(document: DocDetail) {
  // NOA-281 — only include states that actually happened (have a real
  // timestamp). Previously we returned all 6 entries unconditionally and
  // `formatDate(null)` rendered "Not available", which added visual noise
  // and looked like a failure. Now: a DRAFT only shows "Created"; a SENT
  // doc shows "Created" + "Sent"; a CANCELLED doc shows whatever happened
  // before cancellation plus "Cancelled". Order stays chronological by
  // the natural flow of the array entries below.
  const entries: Array<{ label: string; value: string }> = [];
  if (document.createdAt) entries.push({ label: "Created", value: formatDate(document.createdAt) });
  if (document.sentAt) entries.push({ label: "Sent", value: formatDate(document.sentAt) });
  if (document.viewedAt) entries.push({ label: "Viewed", value: formatDate(document.viewedAt) });
  if (document.signedAt) entries.push({ label: "Signed", value: formatDate(document.signedAt) });
  if (document.completedAt) entries.push({ label: "Completed", value: formatDate(document.completedAt) });
  if (document.cancelledAt) entries.push({ label: "Cancelled", value: formatDate(document.cancelledAt) });
  return entries;
}


