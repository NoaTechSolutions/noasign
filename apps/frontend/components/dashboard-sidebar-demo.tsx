"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ClipboardList,
  AlertTriangle,
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  BadgeCheck,
  Ban,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Compass,
  Contact,
  CreditCard,
  Download,
  Eye,
  Factory,
  FileJson,
  FilePlus,
  FileText,
  Globe,
  LayoutDashboard,
  Landmark,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  MoreVertical,
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
import { BillingPanel } from "./dashboard/panels/billing-panel";
import { DashboardOverviewPanel } from "./dashboard/panels/dashboard-overview-panel";

type Doc = {
  id: string;
  documentNumber: string;
  status: string;
  contractDate: string;
  createdAt: string;
  customerId?: string | null;
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

type CustomerBusiness = {
  id: string;
  customerId: string;
  businessName: string;
  businessLegalName: string | null;
  licenseNumber: string | null;
  industry: string | null;
  website: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  businessPhone2: string | null;
  businessAddressLine1: string | null;
  businessAddressLine2: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZipCode: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  primaryContactTitle: string | null;
  primaryContactAddressLine1: string | null;
  primaryContactCity: string | null;
  primaryContactState: string | null;
  primaryContactZipCode: string | null;
  createdAt: string;
  updatedAt: string;
};

type Customer = {
  id: string;
  customerType: "PERSONAL" | "BUSINESS";
  fullName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  companyProfileId: string;
  userId: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  business?: CustomerBusiness | null;
  _count?: { documents: number };
  // Owner snapshot. Backend includes it on every read so master views can
  // render "Owner: …" without a separate request. Non-master callers see
  // their own data here (it's just themselves).
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type CustomerBusinessFormValues = {
  businessName: string;
  businessLegalName: string;
  licenseNumber: string;
  industry: string;
  website: string;
  businessEmail: string;
  businessPhone: string;
  businessPhone2: string;
  businessAddressLine1: string;
  businessAddressLine2: string;
  businessCity: string;
  businessState: string;
  businessZipCode: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactTitle: string;
  primaryContactAddressLine1: string;
  primaryContactCity: string;
  primaryContactState: string;
  primaryContactZipCode: string;
};

type CustomerFormValues = {
  customerType: "PERSONAL" | "BUSINESS";
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  // Master uses this to assign / reassign ownership; non-master leaves it
  // empty (server forces it to self).
  userId: string;
  business: CustomerBusinessFormValues;
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
    value === "customers" ||
    value === "users" ||
    value === "accountRequests" ||
    value === "profile" ||
    value === "billing"
  ) {
    return value;
  }

  return "dashboard";
}

export function readSessionBoolean(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  return window.sessionStorage.getItem(key) === "true";
}

export function writeSessionBoolean(key: string, value: boolean) {
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
    { key: "customers" as const, label: "Customers", icon: <Contact className="h-5 w-5 shrink-0" /> },
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
                            <Link
                              href="/dashboard/admin/form-definitions"
                              onClick={() => {
                                if (window.innerWidth < 1280) {
                                  setOpen(false);
                                }
                              }}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--menu-text-muted)] transition hover:bg-[#d8e6ff] hover:text-[#022977] dark:hover:bg-[rgba(255,255,255,0.08)] dark:hover:text-[color:var(--menu-text)]"
                            >
                              <FileJson className="h-4 w-4" />
                              <span>Form Definitions</span>
                            </Link>
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
              ? "This user has no saved customers yet."
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
    customerId?: string;
  }) => Promise<DocDetail | void>;
  onStartNewDraft: () => void;
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
    </section>
  );
}

type CustomerSortKey = "name" | "createdAt";

// For a BUSINESS customer, the Customer row's email/phone are cleared on
// submit; the contact info lives in the nested business row. Resolve to the
// most relevant business email/phone, falling back to primaryContact when
// the business fields are empty. PERSONAL customers use their own columns.
function getDisplayEmail(c: Customer): string | null {
  if (c.customerType === "BUSINESS" && c.business) {
    return c.business.businessEmail || c.business.primaryContactEmail || null;
  }
  return c.email;
}

function getDisplayPhone(c: Customer): string | null {
  if (c.customerType === "BUSINESS" && c.business) {
    return c.business.businessPhone || c.business.primaryContactPhone || null;
  }
  return c.phone;
}

// "Owner: …" display label for the master view. Prefers full name, falls
// back to email when the user record doesn't have first/last set.
function getOwnerLabel(user: Customer["user"]): string {
  if (!user) return "—";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
}

function CustomersPanel(props: {
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
  documents: Doc[] | null;
  onOpenDocumentView: (documentId: string) => void;
  onPreviewFinalPdf: (documentId: string) => Promise<string>;
  onDownloadFinalPdf: (documentId: string) => Promise<void>;
  onStartCustomerDraft: (customerId: string) => void;
  // Master sees an Owner column + filter dropdown. Tenant users hidden it.
  currentUserRole: string | null;
  currentUserId: string | null;
  tenantUsers: Props["users"];
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
    <section className="grid gap-4">
      {/* Card 1: Header + Search + New */}
      <div className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Customers workspace</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Manage the people you send documents to. Reuse their contact data on future drafts.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={props.searchQuery}
              onChange={(e) => { setCurrentPage(1); props.onSearchQueryChange(e.target.value); }}
              placeholder="Search by name, email or phone"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white dark:caret-blue-300 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setTypeSelectorOpen(true)}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto"
          >
            New customer
          </button>
        </div>
      </div>

      {/* Card 2 (table) — full width. Selection opens CustomerViewDrawer modal. */}
      <div className="overflow-visible rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Results</div>
            <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
              {props.isLoading ? "Loading..." : `${total} ${total === 1 ? "customer" : "customers"}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div ref={pageSizeMenuRef} className="relative flex items-center gap-2">
              <label className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:block">Rows</label>
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
                  {[10, 20, 30].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => { setPageSize(size); setCurrentPage(1); setPageSizeMenuOpen(false); }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                        pageSize === size ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-white/8",
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
          <div className="p-5"><EmptyBlock text="Loading customers..." /></div>
        ) : total === 0 ? (
          <div className="p-5"><EmptyBlock text={props.searchQuery ? `No customers matching "${props.searchQuery}".` : "No customers yet. Click 'New customer' to start."} /></div>
        ) : (
          <>
            {/* Desktop header. Master view drops Phone (signal-light column
                that's visible inside the view drawer anyway) and gains an
                Owner column. */}
            <div
              className={cn(
                "hidden items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03] md:grid",
                isMaster
                  ? "grid-cols-[minmax(0,1.5fr)_80px_100px_120px_minmax(0,1fr)_64px]"
                  : "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_80px_100px_120px_64px]",
              )}
            >
              <CustomerSortHeader label="Name" columnKey="name" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
              {!isMaster ? (
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Phone</div>
              ) : null}
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Docs</div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Type</div>
              <CustomerSortHeader label="Created" columnKey="createdAt" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} />
              {isMaster ? (
                <div ref={ownerFilterMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setOwnerFilterMenuOpen((c) => !c)}
                    className="inline-flex items-center gap-2 rounded-xl border border-transparent px-1 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-slate-200"
                  >
                    <span>Owner</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {ownerFilterLabel}
                    </span>
                    <ChevronsUpDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                  </button>
                  {ownerFilterMenuOpen ? (
                    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 max-h-72 min-w-56 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
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
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
                        )}
                      >
                        <span>All customers</span>
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
                              ? "bg-blue-600 text-white"
                              : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
                          )}
                        >
                          <span>My customers</span>
                          {ownerFilter === props.currentUserId ? (
                            <span className="text-[10px] uppercase tracking-[0.18em] opacity-80">On</span>
                          ) : null}
                        </button>
                      ) : null}
                      {sameTenantUsers.length > 0 ? (
                        <div className="my-1 border-t border-slate-200 dark:border-white/10" />
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
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
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
            <div className="divide-y divide-slate-200 dark:divide-white/10 md:hidden">
              {paginated.map((c) => (
                <div key={`${c.id}-mobile`} className={cn("px-4 py-3 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]", props.selectedCustomerId === c.id && "bg-blue-50/60 dark:bg-blue-500/10")}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <button type="button" onClick={() => props.onSelectCustomer(c.id)} className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{c.fullName}</div>
                        <CustomerTypeBadge type={c.customerType} />
                      </div>
                      {getDisplayEmail(c) ? <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{getDisplayEmail(c)}</div> : null}
                      {getDisplayPhone(c) ? <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{formatUsPhone(getDisplayPhone(c) ?? "")}</div> : null}
                      <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{formatDate(c.createdAt)} • {c._count?.documents ?? 0} docs</div>
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
            <div className="hidden divide-y divide-slate-200 dark:divide-white/10 md:block">
              {paginated.map((c) => (
                <div
                  key={c.id}
                  className={cn("px-4 py-4 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]", props.selectedCustomerId === c.id && "bg-blue-50/60 dark:bg-blue-500/10")}
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
                      <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{c.fullName}</div>
                      {getDisplayEmail(c) ? (
                        <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{getDisplayEmail(c)}</div>
                      ) : null}
                    </button>
                    {!isMaster ? (
                      <div className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {getDisplayPhone(c) ? formatUsPhone(getDisplayPhone(c) ?? "") : <span className="text-slate-400 dark:text-slate-500">—</span>}
                      </div>
                    ) : null}
                    <div className="text-sm text-slate-600 dark:text-slate-300">{c._count?.documents ?? 0}</div>
                    <div>
                      <CustomerTypeBadge type={c.customerType} />
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">{formatDate(c.createdAt)}</div>
                    {isMaster ? (
                      <div className="min-w-0 truncate text-sm text-slate-600 dark:text-slate-300">
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
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-slate-500 dark:text-slate-400">
                Showing <span className="font-semibold text-slate-900 dark:text-white">{total === 0 ? 0 : pageStart + 1}</span>
                {" "}-{" "}<span className="font-semibold text-slate-900 dark:text-white">{pageEnd}</span>
                {" "}of{" "}<span className="font-semibold text-slate-900 dark:text-white">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1 || props.isLoading}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    safePage === 1
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                  )}
                >
                  Previous
                </button>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">{safePage} / {totalPages}</div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages || props.isLoading}
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
            setSuccessMessage("Customer saved successfully");
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
            setSuccessMessage("Customer saved successfully");
          }}
        />
      ) : null}

      {successMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-[0_18px_40px_rgba(16,185,129,0.18)] dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
        isActive ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
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
        aria-label="Customer actions"
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
        <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Delete customer?</h2>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          This will permanently remove <strong>{customer.fullName}</strong>. Any existing documents
          linked to this customer keep their snapshot — only the relation is cleared.
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
            className="inline-flex h-11 items-center rounded-2xl bg-rose-600 px-5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-70"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerTypeBadge({ type }: { type: "PERSONAL" | "BUSINESS" }) {
  if (type === "BUSINESS") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
        Business
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
      Personal
    </span>
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
  tenantUsers: Props["users"];
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
        className="mt-1.5 inline-flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/5"
      >
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
              value === ""
                ? "bg-blue-600 text-white"
                : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
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
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-white/80 dark:text-slate-200 dark:hover:bg-white/8",
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
      <div className="w-full max-w-md rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          New customer
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          What kind of customer would you like to add?
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onPick("PERSONAL")}
            className="flex flex-col items-start gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400 dark:hover:bg-blue-500/10"
          >
            <UserRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              Personal
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              An individual person
            </div>
          </button>
          <button
            type="button"
            onClick={() => onPick("BUSINESS")}
            className="flex flex-col items-start gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-400 dark:hover:bg-amber-500/10"
          >
            <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              Business
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              A company with contact info
            </div>
          </button>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
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
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              New document
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
              {view === "options" ? "How do you want to start?" : "Pick a user"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {view === "options"
                ? "Create blank, create for yourself, or pick another user to draft on behalf of."
                : "Select the user this document will belong to. The next steps use that user's templates and customers."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
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
                className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-400 dark:hover:bg-amber-500/10"
              >
                <FilePlus className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    Create blank
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
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
                className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400 dark:hover:bg-blue-500/10"
              >
                <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    Create for me
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Use my own templates and customers. The document is owned
                    by me.
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-400 dark:hover:bg-emerald-500/10"
              >
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    Select user
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Draft on behalf of a teammate. Their templates and
                    customers will be used.
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 px-6 py-4 dark:border-white/10">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, email or role"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:caret-blue-300 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900"
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
                        className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400 dark:hover:bg-blue-500/10"
                      >
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-slate-200 transition group-hover:bg-blue-600 group-hover:text-white group-hover:ring-blue-600 dark:bg-white/10 dark:text-blue-400 dark:ring-white/10 dark:group-hover:bg-blue-500 dark:group-hover:text-white">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {label}
                            </div>
                            {isMe ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                                Me
                              </span>
                            ) : null}
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 dark:bg-white/10 dark:text-slate-300">
                              {u.role.toLowerCase()}
                            </span>
                          </div>
                          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
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

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-white/10">
          {view === "list" ? (
            <button
              type="button"
              onClick={() => setView("options")}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
            className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
      <div className="relative w-full max-w-lg rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          New document
        </div>
        <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
          Use a customer or start blank?
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Linking a customer pre-fills the form fields. You can also start
          blank and fill the data manually.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onPick("customer")}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400 dark:hover:bg-blue-500/10"
          >
            <Contact className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              Use a customer
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Pre-fill from one of your saved customers.
            </div>
          </button>
          <button
            type="button"
            onClick={() => onPick("blank")}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-400 dark:hover:bg-amber-500/10"
          >
            <FilePlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              Create blank
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Skip pre-fill and type the data yourself.
            </div>
          </button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
            className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              New document
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
              Choose a customer
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Search by name, email or phone, or filter by customer type.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or phone"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:caret-blue-300 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900"
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
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10",
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
                  ? emptyHint ?? "No customers saved yet."
                  : `No customers matching "${query}".`
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
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400 dark:hover:bg-blue-500/10"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="min-w-0 truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {c.fullName}
                      </div>
                      <CustomerTypeBadge type={c.customerType} />
                    </div>
                    {email ? (
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {email}
                      </div>
                    ) : null}
                    {phone ? (
                      <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                        {formatUsPhone(phone)}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-white/10">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
            className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
      <div className="relative w-full max-w-lg rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Pre-fill source
        </div>
        <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
          Use which data?
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {customer.fullName} has both a business profile and a primary
          contact. Pick which one fills the document.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onPick("business")}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-400 dark:hover:bg-amber-500/10"
          >
            <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              Business
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {b?.businessName ?? customer.fullName}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {businessSubtitle}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onPick("contact")}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400 dark:hover:bg-blue-500/10"
          >
            <UserRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              Primary contact
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {b?.primaryContactName || "No contact saved"}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {contactSubtitle}
            </div>
          </button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
            className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              New document
            </div>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
              {isStep2 ? "Choose a signature template" : "Choose a form"}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {isStep2
                ? `Form: ${selectedFormDef!.name} · ${selectedFormDef!.documentTypeName}`
                : "Pick the form you want to start from. You can search by name or document type."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isStep2 ? (
          <>
            <div className="border-b border-slate-200 px-6 py-4 dark:border-white/10">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by form or document type"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:caret-blue-300 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900"
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
                <ul className="divide-y divide-slate-200 dark:divide-white/10">
                  {filteredFormDefs.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => handleFormDefClick(option)}
                        className="group flex w-full items-center gap-3 px-6 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      >
                        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-white/5 dark:text-blue-400 dark:group-hover:bg-blue-500 dark:group-hover:text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {option.name}
                          </div>
                          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {option.documentTypeName} · {option.fieldCount}{" "}
                            {option.fieldCount === 1 ? "field" : "fields"}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-500 dark:text-slate-500" />
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
                  className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400 dark:hover:bg-blue-500/10"
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-slate-200 transition group-hover:bg-blue-600 group-hover:text-white group-hover:ring-blue-600 dark:bg-white/10 dark:text-blue-400 dark:ring-white/10 dark:group-hover:bg-blue-500 dark:group-hover:text-white">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">
                    {t.signatureTemplateName}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-white/10">
          {backAction ? (
            <button
              type="button"
              onClick={backAction}
              className="inline-flex h-10 items-center gap-1 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
            className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
    "w-full rounded-2xl border bg-[color:var(--bg-surface)] px-4 text-sm text-[color:var(--text-primary)] caret-blue-500 outline-none transition placeholder:text-[color:var(--text-muted)] focus:bg-[color:var(--bg-elevated)]",
    error
      ? "border-rose-400 focus:border-rose-500"
      : "border-[color:var(--border)] focus:border-blue-400",
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
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
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
  documents: Doc[] | null;
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
      { key: "info", label: "Customer Info" },
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

  async function handleViewPdf(doc: Doc) {
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
              Customer
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
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
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
                  ? "border-b-2 border-blue-600 font-semibold text-[color:var(--text-primary)]"
                  : "border-b-2 border-transparent font-medium text-[color:var(--text-muted)] hover:bg-slate-50 hover:text-[color:var(--text-primary)] dark:hover:bg-white/5",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <EmptyBlock text="Loading customer..." />
          ) : !customer ? (
            <EmptyBlock text="Customer not found." />
          ) : activeTab === "documents" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[color:var(--text-muted)]">
                  {customerDocuments.length}{" "}
                  {customerDocuments.length === 1 ? "document" : "documents"}{" "}
                  linked to this customer
                </p>
                <button
                  type="button"
                  onClick={onCreateDocument}
                  disabled={!onCreateDocument}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FilePlus className="h-4 w-4" />
                  New Document
                </button>
              </div>
              {customerDocuments.length === 0 ? (
                <EmptyBlock text="No documents linked to this customer yet." />
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
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
  tenantUsers: Props["users"];
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
      setSubmitError(err instanceof Error ? err.message : "Unable to save customer");
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
              {mode === "create" ? "New customer" : "Edit customer"}
            </div>
            <h2 className="mt-1 truncate text-xl font-semibold text-[color:var(--text-primary)]">
              {mode === "create" ? "Add a customer" : customer?.fullName ?? "Customer"}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
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
                  ? "border-b-2 border-blue-600 font-semibold text-[color:var(--text-primary)]"
                  : "border-b-2 border-transparent font-medium text-[color:var(--text-muted)] hover:bg-slate-50 hover:text-[color:var(--text-primary)] dark:hover:bg-white/5",
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
                  ? "border-b-2 border-blue-600 font-semibold text-[color:var(--text-primary)]"
                  : "border-b-2 border-transparent font-medium text-[color:var(--text-muted)] hover:bg-slate-50 hover:text-[color:var(--text-primary)] dark:hover:bg-white/5",
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
                placeholder="Anything worth remembering about this customer..."
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
                placeholder="Anything worth remembering about this customer..."
              />
            </div>
          )}
          {submitError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
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
              className="inline-flex h-11 items-center rounded-2xl bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
            >
              {isSubmitting
                ? "Saving..."
                : mode === "create" &&
                    isBusiness &&
                    activeTab === "company"
                  ? "Next"
                  : mode === "create"
                    ? "Create customer"
                    : "Save changes"}
            </button>
          </div>
        </div>
      </form>
      {confirmDialog ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center md:items-center bg-black/60 p-4 pt-20 md:pt-0 backdrop-blur">
          <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950">
            <div className="text-lg font-semibold text-slate-950 dark:text-white">
              {confirmDialog.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {confirmDialog.message}
            </p>
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
          <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
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
          <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
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
        <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
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
        <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
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
                <DetailRow icon={<Compass className="h-4 w-4" />} label="City" value={companyProfile?.city ?? ""} />
                <DetailRow icon={<Landmark className="h-4 w-4" />} label="State" value={companyProfile?.state ?? ""} />
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
                <DetailRow icon={<Compass className="h-4 w-4" />} label="City" value={companyProfile?.contactCity ?? ""} />
                <DetailRow icon={<Landmark className="h-4 w-4" />} label="State" value={companyProfile?.contactState ?? ""} />
                <DetailRow icon={<Pin className="h-4 w-4" />} label="ZIP code" value={companyProfile?.contactZipCode ?? ""} />
              </div>
            </div>
          )) : null}
        </div>
      </div>
      {confirmDialog ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center md:items-center bg-black/60 p-4 pt-20 md:pt-0 backdrop-blur">
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
    </section>
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
            <DocumentFormRenderer
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
      <aside className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 md:gap-4 md:px-5 md:py-5 dark:border-white/10">
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Document view</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-[-0.04em] text-slate-950 md:text-2xl dark:text-white">
                  {isLoading ? "Loading..." : document?.documentNumber ?? "Document detail"}
                </h2>
                {document ? <StatusBadge status={document.status} /> : null}
              </div>
              <div className="mt-1 text-xs text-slate-500 md:mt-2 md:text-sm dark:text-slate-400">
                {isLoading ? "Preparing detail..." : document?.documentType?.name ?? "Contract"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-white md:h-10 md:w-10 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
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

        <div className="border-b border-slate-200 px-5 py-3 dark:border-white/10">
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
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10",
                    isLocked && "cursor-not-allowed opacity-50 hover:bg-slate-50 dark:hover:bg-white/[0.04]",
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
            // single-section sub-schema and hand it to DocumentFormRenderer
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
                <DocumentFormRenderer
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
        <div className="absolute inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 p-4 backdrop-blur">
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

export function StatPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4"><div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">{label}</div><div className="mt-3 text-sm font-medium leading-5 text-[color:var(--text-primary)]">{value}</div></div>;
}

export function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
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
            "inline-flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 hover:bg-white focus:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
            disabled && "cursor-not-allowed opacity-60 hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-white/5",
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        </button>
        {open && !disabled ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
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
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-white/[0.08]",
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

export function EmptyBlock({ text }: { text: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--bg-surface)] px-5 py-8 text-center text-sm text-[color:var(--text-secondary)]">{text}</div>;
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
      <div className="relative z-10 w-full max-w-md rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
        <h2 id="schema-edit-notice-title" className="text-lg font-semibold text-slate-950 dark:text-white">
          Edit not available yet
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          We&apos;re redesigning the edit experience for this document type to give you a better workflow. For now, to modify draft <span className="font-medium text-slate-900 dark:text-white">{documentNumber}</span>, please cancel it and create a new one with the updated information.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
          >
            {isCancelling ? "Cancelling..." : "Cancel draft"}
          </button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
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

export function MiniMetric({ label, value }: { label: string; value: string }) {
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

function getDisplayName(email?: string | null) {
  if (!email) return "User";
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart.replace(/[._-]+/g, " ").replace(/\d+/g, " ").trim();
  if (!cleaned) return email;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFinalCustomerName(document: Doc) {
  const data = document.data?.dataJson ?? {};
  const personalName = [data.first_name, data.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
  const candidates = [
    data.customer_name,
    data.client_name,
    data.customer_full_name,
    data.business_name,
    personalName,
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
    data.email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
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

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatCurrency(value: number) {
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

  if (section === "customers") {
    return ["Workspace", "Customers"];
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


