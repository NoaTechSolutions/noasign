"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import { SendToast } from "../../components/dashboard/panels/v2/documents/SendToast";
import { API_URL, apiRequest } from "../../lib/api";
import { detectBrowserTimeZone } from "../../lib/tenant-date";
import { getPlanEntry } from "../../lib/plan-catalog";
import type { ReceiptStats } from "../../components/dashboard/panels/v2/ReceiptMetricCards";
import { DashboardShell } from "../../components/dashboard/layout/DashboardShell";
import { OverviewPanel, ProfilePanel, BillingPanel, CustomersPanel, MembersPanel, LockedUsersPanel, TemplatesPanel } from "../../components/dashboard/panels/v2";
import { DocumentsPanel } from "../../components/dashboard/panels/v2/documents";
import { invoiceRecipientName } from "../../components/dashboard/panels/v2/documents/types";
import {
  isTransportError,
  draftMaybeSavedMessage,
} from "../../components/dashboard/panels/v2/documents/submit-error";
import { isFutureDate } from "../../components/dashboard/panels/v2/documents/document-date";
import { formatDisplayDate } from "../../lib/format";
import type {
  V2DocumentItem,
  DocumentVersion as V2DocumentVersion,
  DocumentDetail as V2DocumentDetail,
  BackendDocumentAction as V2BackendDocumentAction,
} from "../../components/dashboard/panels/v2/documents";
import type {
  CustomerOption as V2CustomerOption,
  DocumentTypeOption as V2DocumentTypeOption,
} from "../../components/dashboard/panels/v2/documents/DocumentSetupCard";
import type {
  CustomerFormData as V2CustomerFormData,
  CustomerOwnerUser as V2CustomerOwnerUser,
} from "../../components/dashboard/panels/v2/customers";
import type {
  ManagedUser as V2ManagedUser,
  AccountRequest as V2AccountRequest,
} from "../../components/dashboard/panels/v2/members";
import type { LockedUser as V2LockedUser } from "../../components/dashboard/panels/v2/locked-users";
import {
  clearSession,
  getStoredUser,
  updateStoredUser,
  type StoredUser,
} from "../../lib/auth-storage";

type DashboardUser = {
  id: string;
  companyProfileId: string | null;
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
  createdAt?: string | null;
  companyProfile?: {
    id: string;
    companyName: string;
    planName: string;
    industry: string | null;
  } | null;
};

type CompanyProfile = {
  id: string;
  companyName: string;
  legalName: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  insuranceName: string | null;
  insurancePhone: string | null;
  insurancePolicyNumber: string | null;
  insuranceExpiryDate: string | null;
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
  industry: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  logoUrl: string | null;
  licenseNumber: string | null;
  planName: string;
  monthlyDocLimit: number;
  isUnlimited: boolean;
};

type CurrentUsage = {
  billingPeriod: string;
  planName: string;
  monthlyDocLimit: number;
  isUnlimited: boolean;
  overagePrice: number;
  documentsUsed: number;
  remainingDocuments: number | null;
  overageDocuments: number;
  // Model C — receipt billing dimension (separate from contracts).
  contractsEnabled: boolean;
  monthlyReceiptLimit: number;
  receiptsUnlimited: boolean;
  receiptOveragePrice: number;
  receiptsUsed: number;
  remainingReceipts: number | null;
  receiptOverageDocuments: number;
};

type MonthlySummary = {
  month: string;
  planName: string;
  monthlyDocLimit: number;
  isUnlimited: boolean;
  overagePrice: number;
  documentsSent: number;
  overageDocuments: number;
  estimatedOverageCost: number;
};

export type DashboardDocument = {
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
  // Human-readable reason when status is SEND_FAILED (from Resend/BoldSign).
  // Returned per-row by the list endpoint (serializeDocument spreads it).
  sendError?: string | null;
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
  // Issue-date feature: editable issue date (ISO) + deferred (future-dated) state.
  issueDate?: string | null;
  isDeferred?: boolean;
  notifyOnIssueDate?: boolean;
  deferredNotifiedAt?: string | null;
  // Reissue (2c): set on a receipt once it has been superseded/voided.
  supersededAt?: string | null;
  documentType?: {
    name: string;
    code: string;
  } | null;
  formDefinition?: {
    name: string;
    key: string;
  } | null;
  data?: {
    dataJson: Record<string, unknown>;
  } | null;
};

type ManagedUser = {
  id: string;
  companyProfileId: string | null;
  email: string;
  role: string;
  status: string;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
  updatedAt: string;
  companyProfile?: {
    id: string;
    companyName: string;
    planName: string;
    logoUrl?: string | null;
  } | null;
};

type AccountRequest = {
  id: string;
  fullName: string;
  email: string;
  requestedDocumentTypes: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DocumentDetail = DashboardDocument & {
  signatureTemplate?: {
    name: string;
    templateKey: string;
    providerTemplateId?: string | null;
  } | null;
  data?: {
    dataJson: Record<string, unknown>;
  } | null;
  versions?: Array<{
    id: string;
    versionNumber: number;
    createdAt: string;
  }>;
};

type DocumentAction = "send" | "resend" | "cancel" | "reactivate";

type DocumentActionResponse = {
  message: string;
  document: DocumentDetail;
};

type UpdateDraftResponse = {
  message: string;
  document: DocumentDetail;
};

type DocumentTypeCatalogItem = {
  id: string;
  name: string;
  code: string;
  generationMode?: "BOLDSIGN" | "DIRECT_PDF";
  formDefinitions: Array<{
    id: string;
    name: string;
    key: string;
  }>;
  signatureTemplates: Array<{
    id: string;
    name: string;
    templateKey: string;
    providerTemplateId?: string | null;
  }>;
  // Receipts (DIRECT_PDF): the tenant ReceiptTemplate to use; for the superadmin
  // asUserId flow it's the selected user's template.
  receiptTemplateId?: string;
};

type SelectableUser = {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
};

// Catalog (API) -> the V2 modal's option shape. Shared by the initial load and
// the superadmin asUserId refetch so both carry receiptTemplateId + form keys.
function mapCatalogToV2(dt: DocumentTypeCatalogItem): V2DocumentTypeOption {
  return {
    id: dt.id,
    name: dt.name,
    code: dt.code,
    generationMode: dt.generationMode,
    formDefinitions: dt.formDefinitions.map((fd) => ({
      id: fd.id,
      name: fd.name,
      key: fd.key,
      schemaJson: (fd as { schemaJson?: unknown }).schemaJson,
    })),
    signatureTemplates: dt.signatureTemplates.map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      templateKey: tpl.templateKey,
    })),
    receiptTemplateId: dt.receiptTemplateId,
  };
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
  status?: "ACTIVE" | "INACTIVE" | "DELETED";
  fullName: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
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
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type CustomerListResponse = {
  customers: Customer[];
  total: number;
  limit: number;
  offset: number;
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
  // Empty string = "use the current logged-in user" (server default for
  // master, forced for non-master). Non-master selections are silently
  // overridden server-side; master selections must live in the same tenant.
  userId: string;
  business: CustomerBusinessFormValues;
};

type CreateDraftResponse = {
  message: string;
  document: DocumentDetail;
};

type UpdateCompanyProfilePayload = Partial<
  Pick<
    CompanyProfile,
    | "companyName"
    | "legalName"
    | "email"
    | "phone"
    | "phone2"
    | "insuranceName"
    | "insurancePhone"
    | "insurancePolicyNumber"
    | "insuranceExpiryDate"
    | "website"
    | "industry"
    | "licenseNumber"
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "state"
    | "zipCode"
    | "logoUrl"
    | "contactFirstName"
    | "contactLastName"
    | "contactTitle"
    | "contactEmail"
    | "contactPhone"
    | "contactAddressLine1"
    | "contactAddressLine2"
    | "contactCity"
    | "contactState"
    | "contactZipCode"
    | "contactCountry"
  >
>;

type CreateUserResponse = {
  message: string;
  user: ManagedUser;
};

type UpdateUserResponse = {
  message: string;
  user: ManagedUser;
};

type ResetUserPasswordResponse = {
  message: string;
  user: ManagedUser;
};

type UpdateAccountRequestResponse = {
  message: string;
  request: AccountRequest;
};

const LIVE_DOCUMENT_STATUSES = new Set(["SENT", "VIEWED", "SIGNED"]);
const DOCUMENT_REFRESH_INTERVAL_MS = 10_000;
const DASHBOARD_SELECTED_DOCUMENT_KEY = "ntssign:dashboard:selected-document-id";

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Default to the V2 "overview" panel when no ?panel= is present, so the V2
  // dashboard always renders (this value is never empty).
  const newLayoutPanel = searchParams.get("panel") ?? "overview";
  const { setTheme } = useTheme();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [dashboardUser, setDashboardUser] = useState<DashboardUser | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [usage, setUsage] = useState<CurrentUsage | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [billingHistory, setBillingHistory] = useState<MonthlySummary[]>([]);
  const [documents, setDocuments] = useState<DashboardDocument[] | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[] | null>(null);
  // Superadmin flow: all users across all tenants (SUPERADMIN only) for the
  // "create for user" template-source selector. undefined until loaded / non-master.
  const [selectableUsers, setSelectableUsers] = useState<
    SelectableUser[] | undefined
  >(undefined);
  const [accountRequests, setAccountRequests] = useState<AccountRequest[] | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeCatalogItem[]>([]);
  const [documentDetail, setDocumentDetail] = useState<DocumentDetail | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isDocumentDetailLoading, setIsDocumentDetailLoading] = useState(false);
  const [documentActionId, setDocumentActionId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customerDetail, setCustomerDetail] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerDetailLoading, setIsCustomerDetailLoading] = useState(false);
  const [customerActionId, setCustomerActionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const staticDataLoaded = useRef(false);
  // Fires the browser-timezone auto-detect once per session (see effect below).
  const tzSyncedRef = useRef(false);
  // Bumped on every loadWorkspace so the panels' mount-only receipt-stats effect
  // refetches after a create/send (loadWorkspace itself doesn't fetch that stat).
  const [workspaceVersion, setWorkspaceVersion] = useState(0);

  const loadWorkspace = useCallback(
    async (currentSelectedId?: string | null) => {
      const isFirstLoad = !staticDataLoaded.current;

      const dynamicRequests = Promise.all([
        apiRequest<DashboardUser>("/users/me"),
        apiRequest<CurrentUsage>("/billing/current-usage"),
        apiRequest<MonthlySummary>("/billing/summary"),
        apiRequest<DashboardDocument[]>("/documents/my-documents"),
        apiRequest<CustomerListResponse>("/customers?limit=500&offset=0"),
      ]);

      const staticRequests = isFirstLoad
        ? Promise.all([
            apiRequest<CompanyProfile>("/company-profile/me"),
            apiRequest<DocumentTypeCatalogItem[]>("/documents/types"),
            Promise.all(
              getRecentBillingMonths(3).map((month) =>
                apiRequest<MonthlySummary>(`/billing/summary?month=${month}`),
              ),
            ),
          ])
        : Promise.resolve(null);

      const [[me, currentUsage, summary, myDocuments, customersResponse], staticResult] =
        await Promise.all([dynamicRequests, staticRequests]);

      // Superadmin flow: load the cross-tenant user list for SUPERADMIN only
      // (the endpoint 403s otherwise). Best-effort — never blocks the workspace.
      if (me.role === "SUPERADMIN") {
        apiRequest<SelectableUser[]>("/documents/selectable-users")
          .then(setSelectableUsers)
          .catch(() => setSelectableUsers(undefined));
      }

      if (staticResult) {
        const [profile, availableDocumentTypes, summaryHistory] = staticResult;
        // Individual users have their own data — don't leak company profile into state
        const isIndividual = me.role !== "SUPERADMIN" && me.accountType === "INDIVIDUAL";
        setCompanyProfile(isIndividual ? null : profile);
        setDocumentTypes(availableDocumentTypes);
        setBillingHistory(summaryHistory);
        staticDataLoaded.current = true;
      }

      const [workspaceUsers, workspaceAccountRequests] =
        me.role === "SUPERADMIN"
          ? await Promise.all([
              apiRequest<ManagedUser[]>("/users"),
              apiRequest<AccountRequest[]>("/users/account-requests"),
            ])
          : [[], []];

      setDashboardUser(me);
      setUsage(currentUsage);
      setMonthlySummary(summary);
      setDocuments(myDocuments);
      setCustomers(customersResponse.customers);
      setManagedUsers(workspaceUsers);
      setAccountRequests(workspaceAccountRequests);

      const nextSelectedId =
        currentSelectedId &&
        myDocuments.some((document) => document.id === currentSelectedId)
          ? currentSelectedId
          : myDocuments[0]?.id ?? null;

      setSelectedDocumentId(nextSelectedId);

      // Bump so the panels' receipt-stats effect refetches /documents/receipt/stats
      // (that stat isn't part of loadWorkspace) — keeps the Documents/Overview
      // cards in sync after creating/sending a receipt OR invoice.
      setWorkspaceVersion((v) => v + 1);

      return {
        myDocuments,
        nextSelectedId,
      };
    },
    [],
  );

  const loadDocumentDetail = useCallback(async (documentId: string) => {
    setIsDocumentDetailLoading(true);

    try {
      const detail = await apiRequest<DocumentDetail>(`/documents/${documentId}`);

      setDocumentDetail(detail);
      setSelectedDocumentId(documentId);
    } finally {
      setIsDocumentDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    localStorage.setItem("theme", "dark");
    setTheme("dark");
  }, [setTheme]);

  // Auto-detect the tenant's timezone from the browser and save it once, after the
  // user is authenticated. The backend sets it only if the tenant has none yet
  // (first-write-wins), so this is safe to fire on every login. Best-effort — a
  // failure never blocks the dashboard, and no timezone → America/New_York fallback.
  useEffect(() => {
    if (!dashboardUser?.id || tzSyncedRef.current) return;
    tzSyncedRef.current = true;
    apiRequest("/company-profile/timezone", {
      method: "PATCH",
      body: { timezone: detectBrowserTimeZone() },
    }).catch(() => {});
  }, [dashboardUser?.id]);

  useEffect(() => {
    function syncUser() {
      setUser(getStoredUser());
    }

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("ntssign-auth-change", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("ntssign-auth-change", syncUser);
    };
  }, []);

  // Route guard: privileged panels (members / lockedUsers) are hidden from the
  // sidebar for non-SUPERADMIN, but a direct ?panel= URL would still render them.
  // Redirect non-SUPERADMIN away once the role is known (the backend already gates
  // the data — this just stops the privileged UI from rendering at all).
  useEffect(() => {
    const SUPERADMIN_ONLY_PANELS = ["members", "lockedUsers"];
    const role = dashboardUser?.role ?? user?.role;
    if (!role) return; // role not loaded yet — don't redirect a SUPERADMIN prematurely
    if (
      newLayoutPanel &&
      SUPERADMIN_ONLY_PANELS.includes(newLayoutPanel) &&
      role !== "SUPERADMIN"
    ) {
      router.replace("/dashboard?panel=overview");
    }
  }, [newLayoutPanel, dashboardUser?.role, user?.role, router]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const persistedSelectedId =
          typeof window === "undefined"
            ? null
            : window.sessionStorage.getItem(DASHBOARD_SELECTED_DOCUMENT_KEY);
        const { nextSelectedId } = await loadWorkspace(persistedSelectedId);

        if (!isMounted) {
          return;
        }

        if (nextSelectedId) {
          await loadDocumentDetail(nextSelectedId);
        } else {
          setDocumentDetail(null);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        clearSession();
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load workspace",
        );
        router.replace("/");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [loadDocumentDetail, loadWorkspace, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (selectedDocumentId) {
      window.sessionStorage.setItem(
        DASHBOARD_SELECTED_DOCUMENT_KEY,
        selectedDocumentId,
      );
      return;
    }

    window.sessionStorage.removeItem(DASHBOARD_SELECTED_DOCUMENT_KEY);
  }, [selectedDocumentId]);

  const refreshLiveDocumentData = useCallback(
    async (currentSelectedId?: string | null) => {
      const [currentUsage, summary, myDocuments] = await Promise.all([
        apiRequest<CurrentUsage>("/billing/current-usage"),
        apiRequest<MonthlySummary>("/billing/summary"),
        apiRequest<DashboardDocument[]>("/documents/my-documents"),
      ]);

      setUsage(currentUsage);
      setMonthlySummary(summary);
      setDocuments(myDocuments);

      const nextSelectedId =
        currentSelectedId &&
        myDocuments.some((document) => document.id === currentSelectedId)
          ? currentSelectedId
          : myDocuments[0]?.id ?? null;

      setSelectedDocumentId(nextSelectedId);

      if (!nextSelectedId) {
        setDocumentDetail(null);
        return;
      }

      try {
        const detail = await apiRequest<DocumentDetail>(`/documents/${nextSelectedId}`);
        setDocumentDetail(detail);
      } catch {
        // Keep the current detail visible if a background refresh fails.
      }
    },
    [],
  );

  // Stable reference so the Overview's receipt-stats effect doesn't refetch (and
  // flash skeletons) on every page re-render — only when it genuinely mounts.
  const fetchReceiptStats = useCallback(
    () => apiRequest<ReceiptStats>("/documents/receipt/stats"),
    [],
  );

  useEffect(() => {
    // Receipts-only tenants (contractsEnabled=false) have no live signature flow
    // to sync — a SENT receipt is terminal. Skip the contract-status poll so the
    // receipts overview doesn't refetch + re-render every 10s for nothing (that
    // background refetch was making the "Recent receipts" table flicker).
    if (usage?.contractsEnabled === false) {
      return;
    }

    const hasLiveDocuments = (documents ?? []).some((document) =>
      LIVE_DOCUMENT_STATUSES.has(document.status),
    );

    if (!hasLiveDocuments || documentActionId) {
      return;
    }

    let isCancelled = false;
    let isRefreshing = false;

    const refreshWorkspace = async () => {
      if (isCancelled || isRefreshing || document.visibilityState === "hidden") {
        return;
      }

      isRefreshing = true;

      try {
        await refreshLiveDocumentData(selectedDocumentId);
      } catch {
        // Ignore background refresh failures and let the next poll retry.
      } finally {
        isRefreshing = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshWorkspace();
    }, DOCUMENT_REFRESH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [documentActionId, documents, refreshLiveDocumentData, selectedDocumentId, usage?.contractsEnabled]);

  // Plan migrations are applied out-of-band (set-tenant-plan.js), so the open
  // dashboard would otherwise show a stale plan until a manual F5. When the tab
  // regains focus, re-pull billing usage + documents so a plan change (e.g.
  // RECEIPTS_ONLY → STARTER flipping contractsEnabled) reflects immediately — the
  // documents reappear without a reload. Light (no skeletons, no detail refetch).
  useEffect(() => {
    const syncPlanState = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const [currentUsage, myDocuments, availableTypes] = await Promise.all([
          apiRequest<CurrentUsage>("/billing/current-usage"),
          apiRequest<DashboardDocument[]>("/documents/my-documents"),
          // Also re-pull the type catalog: a RECEIPTS_ONLY → contracts migration
          // re-enables BOLDSIGN types, so "New document" offers them without F5.
          apiRequest<DocumentTypeCatalogItem[]>("/documents/types"),
        ]);
        setUsage(currentUsage);
        setDocuments(myDocuments);
        setDocumentTypes(availableTypes);
      } catch {
        // Ignore — the next focus/visibility change retries.
      }
    };
    document.addEventListener("visibilitychange", syncPlanState);
    window.addEventListener("focus", syncPlanState);
    return () => {
      document.removeEventListener("visibilitychange", syncPlanState);
      window.removeEventListener("focus", syncPlanState);
    };
  }, []);

  async function handleSignOut() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network/logout errors and clear local state anyway.
    }

    clearSession();
    setUser(null);
    setDashboardUser(null);
    setCompanyProfile(null);
    setDocuments(null);
    setManagedUsers(null);
    setAccountRequests(null);
    setDocumentDetail(null);
    setSelectedDocumentId(null);
    if (typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    router.replace("/login");
  }

  async function handleSelectDocument(documentId: string) {
    setError("");

    try {
      await loadDocumentDetail(documentId);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Unable to load document detail",
      );
    }
  }

  async function handleSelectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    setError("");
    setIsCustomerDetailLoading(true);
    try {
      const detail = await apiRequest<Customer>(`/customers/${customerId}`);
      setCustomerDetail(detail);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Unable to load client detail",
      );
    } finally {
      setIsCustomerDetailLoading(false);
    }
  }

  function handleCloseCustomerDetail() {
    setSelectedCustomerId(null);
    setCustomerDetail(null);
  }

  async function handleDeleteCustomer(customerId: string) {
    setCustomerActionId(customerId);
    setError("");
    try {
      await apiRequest(`/customers/${customerId}`, { method: "DELETE" });
      const refreshed = await apiRequest<CustomerListResponse>(
        "/customers?limit=500&offset=0",
      );
      setCustomers(refreshed.customers);
      setSelectedCustomerId((prev) => (prev === customerId ? null : prev));
      setCustomerDetail((prev) => (prev?.id === customerId ? null : prev));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete client",
      );
    } finally {
      setCustomerActionId(null);
    }
  }

  async function handleCreateCustomer(values: CustomerFormValues) {
    setError("");
    const payload: Record<string, unknown> = {
      fullName: values.fullName.trim(),
      customerType: values.customerType,
    };
    (
      [
        "email",
        "phone",
        "addressLine1",
        "city",
        "state",
        "zipCode",
        "notes",
      ] as const
    ).forEach((key) => {
      const v = values[key]?.trim();
      if (v) payload[key] = v;
    });
    if (values.customerType === "BUSINESS") {
      payload.business = buildBusinessCreatePayload(values.business);
    }
    // Master may have picked an explicit owner via the Assign-to dropdown;
    // empty string means "default to me" — drop the key so the backend
    // resolver decides.
    const ownerId = values.userId?.trim();
    if (ownerId) payload.userId = ownerId;
    await apiRequest<Customer>("/customers", { method: "POST", body: payload });
    const refreshed = await apiRequest<CustomerListResponse>(
      "/customers?limit=500&offset=0",
    );
    setCustomers(refreshed.customers);
  }

  async function handleUpdateCustomer(
    customerId: string,
    values: CustomerFormValues,
  ) {
    setError("");
    // Send null to clear optional fields; empty string would fail backend IsEmail.
    const payload: Record<string, unknown> = {
      fullName: values.fullName.trim(),
      customerType: values.customerType,
    };
    (
      [
        "email",
        "phone",
        "addressLine1",
        "city",
        "state",
        "zipCode",
        "notes",
      ] as const
    ).forEach((key) => {
      const v = values[key]?.trim();
      payload[key] = v ? v : null;
    });
    if (values.customerType === "BUSINESS") {
      payload.business = buildBusinessUpdatePayload(values.business);
    }
    // Reassignment (master only) — empty string = no change.
    const ownerId = values.userId?.trim();
    if (ownerId) payload.userId = ownerId;
    await apiRequest(`/customers/${customerId}`, {
      method: "PATCH",
      body: payload,
    });
    const refreshed = await apiRequest<CustomerListResponse>(
      "/customers?limit=500&offset=0",
    );
    setCustomers(refreshed.customers);
    if (selectedCustomerId === customerId) {
      const detail = await apiRequest<Customer>(`/customers/${customerId}`);
      setCustomerDetail(detail);
    }
  }

  async function handleDocumentAction(documentId: string, action: DocumentAction) {
    setDocumentActionId(documentId);

    // POST the action + refresh workspace/detail. Shared by all actions.
    const runAction = async () => {
      await apiRequest<DocumentActionResponse>(`/documents/${documentId}/${action}`, {
        method: "POST",
      });
      const { nextSelectedId } = await loadWorkspace(selectedDocumentId);
      const detailTarget =
        documentId === selectedDocumentId ? documentId : nextSelectedId;
      if (detailTarget) {
        await loadDocumentDetail(detailTarget);
      } else {
        setDocumentDetail(null);
      }
    };

    // send/resend surface the SendToast (parity with receipts) — success + error
    // live in the toast, NOT the inline error banner. The POST throws on failure
    // (no SEND_FAILED status for contracts), so the toast's catch handles errors.
    if (action === "send" || action === "resend") {
      runSendWithToast(
        async () => {
          try {
            await runAction();
            return { status: "SENT", sendError: null };
          } finally {
            setDocumentActionId(null);
          }
        },
        action === "send"
          ? { loading: "Sending document…", success: "Document sent for signature" }
          : { loading: "Resending document…", success: "Document resent for signature" },
      );
      return;
    }

    // cancel / reactivate keep the inline error banner.
    setError("");
    let actionSucceeded = false;
    try {
      await runAction();
      actionSucceeded = true;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update document",
      );
      if (!actionSucceeded) {
        throw actionError instanceof Error
          ? actionError
          : new Error("Unable to update document");
      }
    } finally {
      setDocumentActionId(null);
    }
  }

  async function handleSyncDocumentStatus(documentId: string) {
    setDocumentActionId(documentId);
    setError("");

    try {
      await apiRequest<DocumentActionResponse>(`/documents/${documentId}/sync-status`, {
        method: "POST",
      });

      await loadWorkspace(documentId);
      await loadDocumentDetail(documentId);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Unable to sync document status",
      );
      throw syncError;
    } finally {
      setDocumentActionId(null);
    }
  }

  async function handleDownloadFinalPdf(documentId: string) {
    setDocumentActionId(documentId);
    setError("");

    try {
      const response = await fetch(`${API_URL}/documents/${documentId}/final-pdf`, {
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Request failed with status ${response.status}`;

        if (response.status === 401) {
          clearSession();
          router.replace("/");
          return;
        }

        try {
          const data = text ? (JSON.parse(text) as { message?: string }) : null;
          if (data?.message) {
            message = data.message;
          }
        } catch {
          if (text.trim()) {
            message = text.trim();
          }
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName =
        documentDetail?.documentNumber && selectedDocumentId === documentId
          ? `${documentDetail.documentNumber}.pdf`
          : "signed-document.pdf";

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download signed PDF",
      );
      throw downloadError;
    } finally {
      setDocumentActionId(null);
    }
  }

  async function handlePreviewFinalPdf(documentId: string) {
    setDocumentActionId(documentId);
    setError("");

    try {
      const response = await fetch(`${API_URL}/documents/${documentId}/final-pdf`, {
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Request failed with status ${response.status}`;

        if (response.status === 401) {
          clearSession();
          router.replace("/");
          return "";
        }

        try {
          const data = text ? (JSON.parse(text) as { message?: string }) : null;
          if (data?.message) {
            message = data.message;
          }
        } catch {
          if (text.trim()) {
            message = text.trim();
          }
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      return window.URL.createObjectURL(blob);
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Unable to preview signed PDF",
      );
      throw previewError;
    } finally {
      setDocumentActionId(null);
    }
  }

  // Receipt PDF is regenerated on the fly by the backend and streamed inline —
  // the <iframe> renders it via this blob URL (cookie auth rides along).
  async function handleFetchReceiptPdf(documentId: string): Promise<string> {
    const response = await fetch(
      `${API_URL}/documents/receipt/${documentId}/pdf`,
      { credentials: "include" },
    );
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        router.replace("/");
        return "";
      }
      throw new Error(`Request failed with status ${response.status}`);
    }
    const blob = await response.blob();
    return window.URL.createObjectURL(blob);
  }

  // Invoice PDF is regenerated on the fly (GET /documents/invoice/:id/pdf), same
  // as the receipt flow — powers the SENT invoice's Preview tab in the detail.
  async function handleFetchInvoicePdf(documentId: string): Promise<string> {
    const response = await fetch(
      `${API_URL}/documents/invoice/${documentId}/pdf`,
      { credentials: "include" },
    );
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        router.replace("/");
        return "";
      }
      throw new Error(`Request failed with status ${response.status}`);
    }
    const blob = await response.blob();
    return window.URL.createObjectURL(blob);
  }

  // Optimistic send: show a top-right toast with an animated bar that resolves
  // to the REAL result (SENT → success; SEND_FAILED / cooldown 400 → error with
  // the reason). The caller has already closed the popup. Fire-and-forget.
  // Shared send/resend toast orchestrator for receipts AND contracts. `send`
  // resolves with { status, sendError } (status "SEND_FAILED" → error state) or
  // throws (network/unknown → error state). Copy is per-flow.
  function runSendWithToast(
    send: () => Promise<{ status: string; sendError: string | null }>,
    copy: { loading: string; success: string; networkError?: string },
  ): void {
    const id = `send-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    toast.custom(
      () => <SendToast state="loading" message={copy.loading} />,
      { id, duration: Infinity },
    );
    send()
      .then((res) => {
        const failed = res.status === "SEND_FAILED";
        toast.custom(
          () => (
            <SendToast
              state={failed ? "error" : "success"}
              message={
                failed
                  ? `Could not send: ${res.sendError ?? "unknown error"}`
                  : copy.success
              }
              onDismiss={() => toast.dismiss(id)}
            />
          ),
          { id, duration: failed ? 7000 : 4500 },
        );
      })
      .catch((e: unknown) => {
        // G1: a transport failure on a create-and-send may have left a draft on the
        // server. When the caller provided create-and-send copy, guide the user to
        // the list instead of a bare "Could not send" (which reads as "nothing
        // happened" and invites a duplicate). Resends/other flows keep the generic
        // message — they never create a draft.
        const message =
          copy.networkError && isTransportError(e)
            ? copy.networkError
            : `Could not send: ${e instanceof Error ? e.message : "unknown error"}`;
        toast.custom(
          () => (
            <SendToast
              state="error"
              message={message}
              onDismiss={() => toast.dismiss(id)}
            />
          ),
          { id, duration: 7000 },
        );
      });
  }

  // Resend/retry from the kebab. The backend handles the 24h cooldown (bypassed
  // on email change) and returns a clear message on 400 — surfaced in the toast.
  async function handleResendReceipt(documentId: string): Promise<void> {
    runSendWithToast(
      async () => {
        const res = await apiRequest<{
          message: string;
          document: { status: string };
          sendError: string | null;
        }>(`/documents/receipt/${documentId}/resend`, { method: "POST" });
        await loadWorkspace();
        return {
          status: res.document?.status ?? "SENT",
          sendError: res.sendError ?? null,
        };
      },
      { loading: "Sending receipt…", success: "Receipt sent successfully" },
    );
  }

  async function handleUpdateReceipt(
    documentId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await apiRequest(`/documents/receipt/${documentId}`, {
      method: "PATCH",
      body: payload,
    });
    await loadWorkspace();
  }

  // Reissue (2c): create a corrected copy of a SENT receipt + void the original.
  // The corrected data comes from the prefilled popup. Throws on failure so the
  // popup surfaces the error.
  async function handleReissueReceipt(
    documentId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const res = await apiRequest<{
      message: string;
      document: { status: string };
      sendError: string | null;
    }>(`/documents/receipt/${documentId}/reissue`, {
      method: "POST",
      body: payload,
    });
    await loadWorkspace();
    if (res.document?.status === "SEND_FAILED") {
      toast.error(
        res.sendError ?? "Receipt reissued, but the email could not be sent",
      );
    } else {
      toast.success("Receipt reissued");
    }
  }

  // Void (2c): mark a SENT receipt VOID with no replacement (sent by mistake).
  async function handleVoidReceipt(documentId: string): Promise<void> {
    await apiRequest(`/documents/receipt/${documentId}/void`, {
      method: "POST",
    });
    await loadWorkspace();
    toast.success("Receipt voided");
  }

  async function handleVoidInvoice(documentId: string): Promise<void> {
    await apiRequest(`/documents/invoice/${documentId}/void`, {
      method: "POST",
    });
    await loadWorkspace();
    toast.success("Invoice voided");
  }

  // B7: soft-delete a DRAFT document (invoice or receipt). The backend stamps
  // deletedAt; the owner stops seeing it (a SUPERADMIN still does).
  async function handleDeleteDocument(documentId: string): Promise<void> {
    await apiRequest(`/documents/${documentId}`, { method: "DELETE" });
    await loadWorkspace();
    toast.success("Draft deleted");
  }

  async function handleUpdateDraft(
    documentId: string,
    payload: { contractDate: string; dataJson: Record<string, unknown> },
  ) {
    setDocumentActionId(documentId);
    setError("");

    try {
      await apiRequest<UpdateDraftResponse>(`/documents/${documentId}/draft`, {
        method: "PATCH",
        body: payload,
      });

      await loadWorkspace(documentId);
      await loadDocumentDetail(documentId);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update draft document",
      );
      throw updateError;
    } finally {
      setDocumentActionId(null);
    }
  }

  // NOA-238 — master refetches the document-types catalog from the target
  // user's perspective so the Template Selector shows only what THAT user
  // can pick (master sees all templates by default; the asUserId flip
  // narrows that down per-tenant-user).
  async function handleFetchTemplatesAsUser(
    targetUserId: string,
  ): Promise<DocumentTypeCatalogItem[]> {
    return apiRequest<DocumentTypeCatalogItem[]>(
      `/documents/types?asUserId=${encodeURIComponent(targetUserId)}`,
    );
  }

  // Superadmin flow: fetch the catalog AS a selected user (any tenant) and map
  // it to the V2 modal shape (carries receiptTemplateId + form keys). The
  // created document still belongs to the master — no userId is sent on create.
  async function handleFetchTypesAsUser(
    targetUserId: string,
  ): Promise<V2DocumentTypeOption[]> {
    const raw = await handleFetchTemplatesAsUser(targetUserId);
    return raw.map(mapCatalogToV2);
  }

  async function handleCreateDraft(payload: {
    documentTypeId: string;
    formDefinitionId: string;
    signatureTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
    customerId?: string;
    userId?: string;
  }) {
    setError("");

    try {
      const response = await apiRequest<CreateDraftResponse>("/documents/draft", {
        method: "POST",
        body: payload,
      });

      await loadWorkspace(response.document.id);
      await loadDocumentDetail(response.document.id);
      // Parity with the receipt draft flow — confirm the save. Errors stay in
      // the creation modal's inline banner (no duplicate toast).
      toast.success("Draft saved");
      return response.document;
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create draft document",
      );
      throw createError;
    }
  }

  async function handleUpdateMe(payload: { firstName?: string; lastName?: string; title?: string; phone?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; zipCode?: string; avatarUrl?: string }) {
    setError("");

    try {
      const updatedUser = await apiRequest<DashboardUser>("/users/me", {
        method: "PATCH",
        body: payload,
      });

      setDashboardUser(updatedUser);
      return updatedUser;
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Unable to update profile",
      );
      throw updateError;
    }
  }

  async function handleUpdateCompanyProfile(payload: UpdateCompanyProfilePayload) {
    setError("");

    try {
      const updatedProfile = await apiRequest<CompanyProfile>("/company-profile/me", {
        method: "PATCH",
        body: payload,
      });

      setCompanyProfile(updatedProfile);
      return updatedProfile;
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update company profile",
      );
      throw updateError;
    }
  }

  async function handleCreateUser(payload: {
    email: string;
    password: string;
    role: string;
    accountType?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
  }) {
    setError("");

    try {
      await apiRequest<CreateUserResponse>("/users", {
        method: "POST",
        body: payload,
      });

      await loadWorkspace(selectedDocumentId);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Unable to create user",
      );
      throw createError;
    }
  }

  async function handleUpdateUser(
    userId: string,
    payload: { email?: string; role?: string; status?: string },
  ) {
    setError("");

    try {
      await apiRequest<UpdateUserResponse>(`/users/${userId}`, {
        method: "PATCH",
        body: payload,
      });

      await loadWorkspace(selectedDocumentId);
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Unable to update user",
      );
      throw updateError;
    }
  }

  async function handleDeactivateUser(userId: string) {
    setError("");

    try {
      await apiRequest<UpdateUserResponse>(`/users/${userId}/deactivate`, {
        method: "POST",
      });

      await loadWorkspace(selectedDocumentId);
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Unable to deactivate user",
      );
      throw actionError;
    }
  }

  async function handleReactivateUser(userId: string) {
    setError("");

    try {
      await apiRequest<UpdateUserResponse>(`/users/${userId}/reactivate`, {
        method: "POST",
      });

      await loadWorkspace(selectedDocumentId);
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Unable to reactivate user",
      );
      throw actionError;
    }
  }

  async function handleResetUserPassword(
    userId: string,
    payload: { password: string; temporary: boolean },
  ) {
    setError("");

    try {
      await apiRequest<ResetUserPasswordResponse>(`/users/${userId}/password`, {
        method: "POST",
        body: payload,
      });

      await loadWorkspace(selectedDocumentId);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset password",
      );
      throw resetError;
    }
  }

  async function handleChangeOwnPassword(password: string) {
    setError("");

    try {
      await apiRequest<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: { password },
      });

      setDashboardUser((current) =>
        current ? { ...current, mustChangePassword: false } : current,
      );
      setUser((current) =>
        current ? { ...current, mustChangePassword: false } : current,
      );

      const storedUser = getStoredUser();
      if (storedUser) {
        updateStoredUser({ ...storedUser, mustChangePassword: false });
      }
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Unable to change password",
      );
      throw changeError;
    }
  }

  async function handleUpdateAccountRequestStatus(
    requestId: string,
    status: "PENDING" | "APPROVED" | "REJECTED",
  ) {
    setError("");

    try {
      await apiRequest<UpdateAccountRequestResponse>(
        `/users/account-requests/${requestId}`,
        {
          method: "PATCH",
          body: { status },
        },
      );

      await loadWorkspace(selectedDocumentId);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update account request",
      );
      throw updateError;
    }
  }

  // CustomersPanel V2 handlers — wrap apiRequest() (auth-aware) and adapt
  // shapes. Refactored from the orchestrator's raw fetch() calls which
  // would have bypassed JwtAuthGuard and returned 401.
  //
  // Memoized at component top level (NOT inside the `if (newLayoutPanel)`
  // block — that would be a conditional hook). Stable identity is REQUIRED:
  // CustomersPanel.reloadCustomers is a useCallback keyed on these handlers,
  // and its effect re-fetches whenever their identity changes. Recreating the
  // object every render caused a periodic skeleton flash (the 10s live-document
  // poll re-renders this page → new handlers → spurious re-fetch). apiRequest
  // is a stable module import, so the empty dep array is correct.
  const customersV2Handlers = useMemo(
    () => ({
      onFetchCustomers: async () => {
        const response = await apiRequest<CustomerListResponse>(
          "/customers?limit=500&orderBy=createdAt&orderDir=desc",
        );
        return response.customers;
      },
      onCreateCustomer: async (data: V2CustomerFormData) => {
        return apiRequest<Customer>("/customers", {
          method: "POST",
          body: sanitizeCustomerCreate(data as unknown as Record<string, unknown>),
        });
      },
      onUpdateCustomer: async (id: string, data: V2CustomerFormData) => {
        return apiRequest<Customer>(`/customers/${id}`, {
          method: "PATCH",
          body: sanitizeCustomerUpdate(data as unknown as Record<string, unknown>),
        });
      },
      onDeleteCustomer: async (id: string) => {
        await apiRequest(`/customers/${id}`, { method: "DELETE" });
      },
      onAssignCustomer: async (id: string, newUserId: string) => {
        return apiRequest<Customer>(`/customers/${id}`, {
          method: "PATCH",
          body: { userId: newUserId },
        });
      },
      onChangeStatus: async (
        id: string,
        status: "ACTIVE" | "INACTIVE" | "DELETED",
      ) => {
        // Backend update() syncs deletedAt and gates restores to SUPERADMIN, so a
        // single PATCH covers every status transition (including delete/restore).
        return apiRequest<Customer>(`/customers/${id}`, {
          method: "PATCH",
          body: { status },
        });
      },
      onFetchUsersForAssign: async (): Promise<V2CustomerOwnerUser[]> => {
        const list = await apiRequest<ManagedUser[]>("/users");
        return list
          .filter((u) => u.status === "ACTIVE")
          .map((u) => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
          }));
      },
      onFetchDeletedCustomers: async () => {
        const response = await apiRequest<CustomerListResponse>(
          "/customers/deleted?limit=500&orderBy=createdAt&orderDir=desc",
        );
        return response.customers;
      },
      onRestoreCustomer: async (id: string) => {
        return apiRequest<Customer>(`/customers/${id}/restore`, { method: "POST" });
      },
    }),
    [],
  );

  // Stable identity (apiRequest is a module-level import) so DocumentDetailModal's
  // fetch effect doesn't re-run on every parent render — e.g. the 10s live-document
  // poll — which previously re-fetched + flashed the modal. Memoized at top level
  // (NOT inside the `if (newLayoutPanel)` block — that would be a conditional hook).
  const handleFetchDocumentDetail = useCallback(
    (docId: string): Promise<V2DocumentDetail> =>
      apiRequest<V2DocumentDetail>(`/documents/${docId}`),
    [],
  );

  // Refresh the page-level `customers` list — the SINGLE source the New-document
  // "Client" selector reads from. Called when the create-document modal opens so a
  // client created elsewhere (e.g. the Clients module, which uses its own handlers
  // and never touches this state) shows up without a full page reload.
  const refreshCustomers = useCallback(async () => {
    try {
      const r = await apiRequest<CustomerListResponse>(
        "/customers?limit=500&offset=0",
      );
      setCustomers(r.customers);
    } catch {
      /* keep the last good list on a transient failure */
    }
  }, []);

  // newLayoutPanel is always set (defaults to "overview"), so the V2 DashboardShell
  // always renders. The `if` is a guard; the block below always returns.
  if (newLayoutPanel) {
    // Defensive render gate (pairs with the redirect effect above): never render
    // the privileged panels for a non-SUPERADMIN, even for the frame before the
    // redirect fires. Role unknown (still loading) also counts as not-master.
    const isSuperadmin = (dashboardUser?.role ?? user?.role) === "SUPERADMIN";

    const fullName =
      [dashboardUser?.firstName, dashboardUser?.lastName]
        .filter(Boolean)
        .join(" ") || "User";
    // The tenant's plan, single source of truth. usage.planName carries it for
    // ALL account types; the raw companyProfile is nulled for INDIVIDUAL accounts
    // (setCompanyProfile by accountType above), so reading the plan from it drops
    // it for individuals — the shared cause of the missing Topbar plan and the
    // Billing "Launch" fallback. Reused by the Topbar (shellUser) and Billing below.
    const effectivePlanKey = usage?.planName ?? companyProfile?.planName ?? null;

    const shellUser = {
      name: fullName,
      email: dashboardUser?.email ?? user?.email ?? "",
      role: ((dashboardUser?.role ?? user?.role) as
        | "SUPERADMIN"

        | "USER") || "USER",
      companyName:
        companyProfile?.companyName ||
        companyProfile?.legalName ||
        "Company",
      avatarUrl: dashboardUser?.avatarUrl ?? null,
      // Topbar shows name/company + plan beside the avatar. accountType
      // drives which name to show (INDIVIDUAL → person, else → company).
      accountType: dashboardUser?.accountType ?? null,
      plan: effectivePlanKey,
    };

    // Adapters: backend NoaSign shapes → v2 panel interfaces.
    // billingAmount uses estimatedOverageCost — backend doesn't track plan
    // base price, so "Current Billing" reflects overage cost only.
    const adaptUserForPanel = (backendUser: DashboardUser | null) => {
      if (!backendUser) return null;
      return {
        id: backendUser.id,
        name:
          [backendUser.firstName, backendUser.lastName]
            .filter(Boolean)
            .join(" ") || backendUser.email,
        email: backendUser.email,
        role: backendUser.role,
        // Lets the WelcomeCard show the person name (INDIVIDUAL) vs the company
        // name (BUSINESS), matching the Topbar.
        accountType: backendUser.accountType ?? null,
      };
    };

    const adaptCompanyForPanel = (backendCompany: CompanyProfile | null) => {
      if (!backendCompany) return null;
      return {
        id: backendCompany.id,
        name: backendCompany.companyName,
        plan: backendCompany.planName,
      };
    };

    const adaptUsageForPanel = (backendUsage: CurrentUsage | null) => {
      if (!backendUsage) return null;
      return {
        // Plan key — the WelcomeCard reads it from here so it shows for
        // INDIVIDUAL accounts too (their companyProfile is nulled).
        planName: backendUsage.planName,
        documentsUsed: backendUsage.documentsUsed,
        // null = unlimited → usage card shows ∞ instead of 0/0. Also null for
        // receipts-only tenants (no contracts dimension to cap).
        documentsLimit:
          backendUsage.isUnlimited || !backendUsage.contractsEnabled
            ? null
            : backendUsage.monthlyDocLimit,
        overageCount: backendUsage.overageDocuments,
        // Model C — receipt dimension (per-tenant, separate from contracts).
        receiptsUsed: backendUsage.receiptsUsed,
        monthlyReceiptLimit: backendUsage.monthlyReceiptLimit,
        receiptsUnlimited: backendUsage.receiptsUnlimited,
        receiptOveragePrice: backendUsage.receiptOveragePrice,
      };
    };

    const adaptMonthlySummaryForPanel = (
      backendSummary: MonthlySummary | null,
    ) => {
      if (!backendSummary) return null;
      return {
        billingAmount: backendSummary.estimatedOverageCost || 0,
        overage: backendSummary.estimatedOverageCost || 0,
        periodStart: "",
        periodEnd: "",
      };
    };

    const adaptDocumentsForPanel = (
      backendDocs: DashboardDocument[] | null,
    ) => {
      if (!backendDocs) return null;
      // The recipient/client name isn't a dedicated column and the docs aren't
      // linked to a Customer record (customerId is null), so pull it from the
      // form data: contracts use `customer_name`, receipts use `client`. Priority
      // list + email fallback covers both without per-type branching.
      const NAME_KEYS = [
        "customer_name",
        "client",
        "client_name",
        "customer_full_name",
        "full_name",
        "fullName",
        "name",
        "contact_full_name",
      ];
      const extractName = (doc: DashboardDocument): string => {
        const dj = (doc.data?.dataJson ?? {}) as Record<string, unknown>;
        for (const k of NAME_KEYS) {
          const v = dj[k];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
        // Invoices keep the recipient in the billed_to fields (company_name or
        // first/last), not the NAME_KEYS above.
        const invoiceName = invoiceRecipientName(dj);
        if (invoiceName) return invoiceName;
        return doc.lastSentRecipientEmail || "—";
      };
      return backendDocs.map((doc) => ({
        id: doc.id,
        documentNumber: doc.documentNumber,
        status: doc.status,
        recipientEmail: doc.lastSentRecipientEmail || "N/A",
        recipientName: extractName(doc),
        // System-level type: Receipt (PAYMENT_RECEIPT) vs Contract (everything else).
        type: doc.documentType?.code === "PAYMENT_RECEIPT" ? "Receipt" : "Contract",
        createdAt: doc.createdAt,
        sentAt: doc.sentAt ?? null,
        viewedAt: doc.viewedAt ?? null,
        completedAt: doc.completedAt ?? null,
        // A reissued/voided receipt keeps status SENT but is shown as VOID.
        supersededAt: doc.supersededAt ?? null,
        customerId: (doc as DashboardDocument & { customerId?: string | null }).customerId ?? null,
      }));
    };

    // ProfilePanel adapters (bidirectional). Renames: backend zipCode → panel
    // zip, backend insuranceName → panel insuranceCompany. Nulls coerced to
    // "" so HTML inputs render empty (not "null"). Date trimmed to YYYY-MM-DD
    // for <input type="date">.
    const adaptCompanyForProfilePanel = (backend: CompanyProfile | null) => {
      if (!backend) return null;
      const dateString = backend.insuranceExpiryDate
        ? String(backend.insuranceExpiryDate).slice(0, 10)
        : "";
      return {
        id: backend.id,
        companyName: backend.companyName,
        plan: backend.planName,
        legalName: backend.legalName ?? "",
        industry: backend.industry ?? "",
        email: backend.email ?? "",
        phone: backend.phone ?? "",
        website: backend.website ?? "",
        addressLine1: backend.addressLine1 ?? "",
        addressLine2: backend.addressLine2 ?? "",
        city: backend.city ?? "",
        state: backend.state ?? "",
        zip: backend.zipCode ?? "",
        country: backend.country ?? "",
        logoUrl: backend.logoUrl ?? "",
        insuranceCompany: backend.insuranceName ?? "",
        insurancePolicyNumber: backend.insurancePolicyNumber ?? "",
        insuranceExpiryDate: dateString,
        insurancePhone: backend.insurancePhone ?? "",
        contactTitle: backend.contactTitle ?? "",
        contactPhone: backend.contactPhone ?? "",
        contactAddressLine1: backend.contactAddressLine1 ?? "",
        contactAddressLine2: backend.contactAddressLine2 ?? "",
        contactCity: backend.contactCity ?? "",
        contactState: backend.contactState ?? "",
        contactZip: backend.contactZipCode ?? "",
      };
    };

    const adaptUserForProfilePanel = (backend: DashboardUser | null) => {
      if (!backend) return null;
      return {
        id: backend.id,
        firstName: backend.firstName ?? "",
        lastName: backend.lastName ?? "",
        email: backend.email,
        role: backend.role,
        accountType: backend.accountType ?? null,
        title: backend.title ?? "",
        phone: backend.phone ?? "",
        avatarUrl: backend.avatarUrl ?? null,
        addressLine1: backend.addressLine1 ?? "",
        city: backend.city ?? "",
        state: backend.state ?? "",
        zipCode: backend.zipCode ?? "",
      };
    };

    // Reverse adapter on save: panel field names → backend field names. The
    // existing handleUpdateCompanyProfile + handleUpdateMe already pega to
    // /company-profile/me and /users/me via apiRequest(), so we reuse them.
    const handleProfileSave = async (
      companyChanges: Record<string, unknown>,
      userChanges: Record<string, unknown>,
    ) => {
      if (Object.keys(companyChanges).length > 0) {
        const payload: Record<string, unknown> = { ...companyChanges };
        if ("zip" in payload) {
          payload.zipCode = payload.zip;
          delete payload.zip;
        }
        if ("insuranceCompany" in payload) {
          payload.insuranceName = payload.insuranceCompany;
          delete payload.insuranceCompany;
        }
        if ("contactZip" in payload) {
          payload.contactZipCode = payload.contactZip;
          delete payload.contactZip;
        }
        if ("id" in payload) {
          delete payload.id;
        }
        Object.keys(payload).forEach((key) => {
          if (payload[key] === "") {
            payload[key] = null;
          }
        });
        await handleUpdateCompanyProfile(payload as UpdateCompanyProfilePayload);
      }

      if (Object.keys(userChanges).length > 0) {
        const payload: Record<string, unknown> = { ...userChanges };
        delete payload.id;
        delete payload.email;
        delete payload.role;
        delete payload.accountType;
        Object.keys(payload).forEach((key) => {
          if (payload[key] === "") {
            payload[key] = null;
          }
        });
        if (Object.keys(payload).length > 0) {
          await handleUpdateMe(payload as Parameters<typeof handleUpdateMe>[0]);
        }
      }
    };

    // BillingPanel V3 data shape. Plan price + features + non-doc limits come
    // from the shared plan catalog (lib/plan-catalog — single source of truth;
    // backend has no plan-price / max-users / max-templates columns). Doc limit
    // is the live backend value (null when the tenant is on an unlimited plan,
    // e.g. PRO_UNLIMITED). Users count = managedUsers length; templates count =
    // documentTypes length as a proxy until backend tracks "templates in use".
    const billingPlanCfg = getPlanEntry(effectivePlanKey);
    const billingPlanKey = (effectivePlanKey ?? "LAUNCH").toUpperCase();
    const billingV3 = {
      currentPlan: {
        name: billingPlanCfg.name,
        plan: billingPlanKey,
        price: billingPlanCfg.price,
        documentsLimit:
          usage?.isUnlimited || usage?.contractsEnabled === false
            ? null
            : usage?.monthlyDocLimit ??
              companyProfile?.monthlyDocLimit ??
              billingPlanCfg.docsLimit,
        usersLimit: billingPlanCfg.usersLimit,
        templatesLimit: billingPlanCfg.templatesLimit,
        overageRate: billingPlanCfg.overageRate,
        // Map the catalog's feature set to the BillingPanel shape (retention is
        // a top-level catalog field; the panel nests it under features).
        features: {
          userManagement: billingPlanCfg.features.userManagement,
          multiSigner: billingPlanCfg.features.multiSigner,
          branding: billingPlanCfg.features.branding,
          bulkSend: billingPlanCfg.features.bulkSend,
          analytics: billingPlanCfg.features.analytics,
          prioritySupport: billingPlanCfg.features.prioritySupport,
          retention: billingPlanCfg.retention,
        },
      },
      cycle: {
        month: formatBillingMonth(monthlySummary?.month),
        nextBilling: formatNextBillingDate(monthlySummary?.month),
        periodStart: deriveBillingPeriodStart(monthlySummary?.month),
        periodEnd: deriveBillingPeriodEnd(monthlySummary?.month),
      },
      usage: {
        documents: usage?.documentsUsed ?? 0,
        users: managedUsers?.length ?? 1,
        templates: documentTypes?.length ?? 0,
        overageCount: usage?.overageDocuments ?? 0,
      },
      // Model C — receipt usage + plan allowance, kept separate from contracts.
      receipts: {
        used: usage?.receiptsUsed ?? 0,
        limit: usage?.monthlyReceiptLimit ?? 0,
        unlimited: usage?.receiptsUnlimited ?? false,
        overagePrice: usage?.receiptOveragePrice ?? 0.25,
      },
      role: ((dashboardUser?.role ?? "USER").toLowerCase() as
        | "superadmin"

        | "user"),
    };

    // customersV2Handlers is defined+memoized at the component top level (see
    // above the `if (newLayoutPanel)` guard). Only the role string — a
    // primitive, safe to recompute — is derived here.
    const customersV2Role = ((dashboardUser?.role ?? "USER").toLowerCase() as
      | "superadmin"

      | "user");

    // MembersPanel V2 handlers. Reuses existing page.tsx handlers (no duplication
    // of mutations — handleCreateUser/UpdateUser/DeactivateUser/ReactivateUser/
    // ResetUserPassword/UpdateAccountRequestStatus already wrap apiRequest()).
    // Only 2 new handlers are needed: fetch users and fetch account-requests
    // (page.tsx loads these via loadWorkspace, no standalone fetch existed).
    const membersV2Role = ((dashboardUser?.role ?? "USER").toLowerCase() as
      | "superadmin"

      | "user");
    const membersV2 = {
      role: membersV2Role,
      currentUserId: dashboardUser?.id ?? "",
      onFetchUsers: () => apiRequest<V2ManagedUser[]>("/users"),
      onFetchAccountRequests: () =>
        apiRequest<V2AccountRequest[]>("/users/account-requests"),
      onCreateUser: async (data: {
        email: string;
        password: string;
        role?: "SUPERADMIN" | "USER";
        accountType?: "INDIVIDUAL" | "BUSINESS";
        firstName?: string;
        lastName?: string;
        phone?: string;
      }) => {
        await handleCreateUser({ ...data, role: data.role ?? "USER" });
      },
      onUpdateUser: handleUpdateUser,
      onDeactivateUser: handleDeactivateUser,
      onReactivateUser: handleReactivateUser,
      onResetPassword: handleResetUserPassword,
      onUpdateAccountRequestStatus: handleUpdateAccountRequestStatus,
    };

    // LockedUsersPanel V2 handlers. Reuses backend admin endpoints
    // (/admin/users/locked + /admin/users/:id/unlock — same that
    // dashboard-sidebar-demo's legacy locked-users-panel hits). Adapter
    // renames backend field names (id→userId, lockedUntil→unlockAt,
    // failedLoginAttempts→failedAttempts) and derives lockedAt from
    // (lockedUntil - 15min) since backend tracks only the expiry time.
    type BackendLockedUser = {
      id: string;
      email: string;
      role: "SUPERADMIN" | "USER";
      failedLoginAttempts: number;
      lockLevel: number;
      lockedUntil: string;
    };
    const LEVEL_DURATIONS_MS: Record<number, number> = { 1: 60_000, 2: 300_000 };
    const lockedUsersV2 = {
      onFetchLockedUsers: async (): Promise<V2LockedUser[]> => {
        const backend = await apiRequest<BackendLockedUser[]>("/admin/users/locked");
        return backend.map((u) => {
          const unlockAtMs = new Date(u.lockedUntil).getTime();
          const durationMs = LEVEL_DURATIONS_MS[u.lockLevel] ?? 60_000;
          const lockedAtMs = u.lockLevel >= 3 ? unlockAtMs : unlockAtMs - durationMs;
          return {
            userId: u.id,
            email: u.email,
            lockedAt: new Date(lockedAtMs).toISOString(),
            unlockAt: u.lockedUntil,
            failedAttempts: u.failedLoginAttempts,
            lockLevel: u.lockLevel,
            lastAttemptAt: u.lockedUntil,
          };
        });
      },
      onUnlockUser: async (userId: string) => {
        await apiRequest(`/admin/users/${userId}/unlock`, { method: "POST" });
      },
    };

    // DocumentsPanel V2 adapter.
    // - Enriches each document with `customer` (looked up by customerId in
    //   the customers cache) and `user` (already present at runtime via
    //   backend `include: { user: true }` but not declared on
    //   DashboardDocument; cast through here).
    // - Handler order matches each V2 dispatch: backend-bound actions use
    //   the legacy handleDocumentAction(docId, action) signature.
    // - "New Document" in V2 routes back to legacy until Phase 2 ships the
    //   modular wizard (the form-renderer lives inside the legacy panel).
    const documentsV2Items: V2DocumentItem[] = (() => {
      if (!documents) return [];
      const customerById = new Map(
        (customers ?? []).map((c) => [c.id, c]),
      );
      return documents.map((doc) => {
        const raw = doc as DashboardDocument & {
          customerId?: string | null;
          userId?: string;
          user?: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
          };
        };
        const customer = raw.customerId
          ? customerById.get(raw.customerId) ?? null
          : null;
        const ownerUser = raw.user
          ? {
              id: raw.user.id,
              email: raw.user.email,
              name:
                [raw.user.firstName, raw.user.lastName]
                  .filter(Boolean)
                  .join(" ") || raw.user.email,
            }
          : null;
        return {
          ...doc,
          customer: customer
            ? {
                id: customer.id,
                name: customer.fullName,
                email: customer.email,
              }
            : null,
          user: ownerUser,
        };
      });
    })();

    // V2 DocumentTypes adapter — runtime payload includes schemaJson on each
    // formDefinition even though DocumentTypeCatalogItem doesn't declare it.
    // Casting through preserves the shape the wizard needs.
    const documentsV2Types: V2DocumentTypeOption[] =
      documentTypes.map(mapCatalogToV2);

    const documentsV2Customers: V2CustomerOption[] = (customers ?? []).map((c) => ({
      id: c.id,
      fullName: c.fullName,
      firstName: c.firstName,
      middleName: c.middleName,
      lastName: c.lastName,
      email: c.email,
      customerType: c.customerType,
      status: c.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      phone: c.phone,
      addressLine1: c.addressLine1,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
      business: c.business
        ? {
            primaryContactName: c.business.primaryContactName,
            primaryContactEmail: c.business.primaryContactEmail,
            primaryContactPhone: c.business.primaryContactPhone,
            primaryContactAddressLine1: c.business.primaryContactAddressLine1,
            primaryContactCity: c.business.primaryContactCity,
            primaryContactState: c.business.primaryContactState,
            primaryContactZipCode: c.business.primaryContactZipCode,
            businessAddressLine1: c.business.businessAddressLine1,
            businessCity: c.business.businessCity,
            businessState: c.business.businessState,
            businessZipCode: c.business.businessZipCode,
          }
        : null,
    }));

    const documentsV2 = {
      items: documentsV2Items,
      types: documentsV2Types,
      customers: documentsV2Customers,
      onCreateDraft: async (payload: {
        documentTypeId: string;
        formDefinitionId: string;
        signatureTemplateId: string;
        contractDate: string;
        dataJson: Record<string, unknown>;
        customerId?: string;
      }) => {
        await handleCreateDraft(payload);
      },
      onCreateReceipt: async (payload: {
        client: string;
        business?: boolean;
        company_name?: string;
        first_name?: string;
        middle_name?: string;
        last_name?: string;
        recipientEmail?: string;
        amount: number;
        date: string;
        payment_method: string;
        other_label?: string;
        payment_for?: string;
        payment_current?: number;
        payment_total?: number;
        received_by?: string;
        send: boolean;
        notifyOnIssueDate?: boolean;
        receiptTemplateId?: string;
      }) => {
        if (payload.send) {
          // Optimistic: the form already closed; show the progress toast and
          // resolve it with the REAL SENT / SEND_FAILED result.
          // I1: a future date schedules the receipt (kept as a draft, not sent now).
          const scheduled = isFutureDate(payload.date);
          runSendWithToast(
            async () => {
              const res = await apiRequest<{
                message: string;
                document: { status: string };
                sendError: string | null;
              }>("/documents/receipt", { method: "POST", body: payload });
              await loadWorkspace();
              return {
                status: res.document?.status ?? "SENT",
                sendError: res.sendError ?? null,
              };
            },
            scheduled
              ? {
                  loading: "Scheduling receipt…",
                  success: `Scheduled for ${formatDisplayDate(payload.date)}`,
                  networkError: draftMaybeSavedMessage("receipt"),
                }
              : {
                  loading: "Sending receipt…",
                  success: "Receipt sent successfully",
                  networkError: draftMaybeSavedMessage("receipt"),
                },
          );
          return { status: "SENT", sendError: null };
        }
        // Draft — no email, simple toast.
        const tid = toast.loading("Saving draft…");
        try {
          const res = await apiRequest<{
            message: string;
            document: { status: string };
            sendError: string | null;
          }>("/documents/receipt", { method: "POST", body: payload });
          await loadWorkspace();
          toast.success("Draft saved", { id: tid });
          return {
            status: res.document?.status ?? "DRAFT",
            sendError: res.sendError ?? null,
          };
        } catch (e) {
          // K2: the form already closed, so report the outcome in the toast (never
          // re-throw into an unmounted modal). Network fail → guide to the draft.
          toast.error(
            isTransportError(e)
              ? draftMaybeSavedMessage("receipt")
              : e instanceof Error
                ? e.message
                : "Could not save the draft",
            { id: tid },
          );
          return { status: "DRAFT", sendError: null };
        }
      },
      onCreateInvoice: async (payload: {
        data: Record<string, string>;
        customerId?: string;
        send?: boolean;
        recipientEmail?: string;
        notifyOnIssueDate?: boolean;
      }) => {
        // "Create and send": reuse the receipt send feedback (animated toast that
        // resolves to the REAL SENT / SEND_FAILED result). Optimistic — the modal
        // has already closed. No PDF is opened automatically.
        if (payload.send) {
          // I1: a future issue date schedules the invoice (the backend never sends
          // it now), so the toast reads "Scheduling…" / "Scheduled for DATE".
          const scheduled = isFutureDate(payload.data.issueDate);
          runSendWithToast(
            async () => {
              const res = await apiRequest<{
                message: string;
                document: { status: string };
                sendError: string | null;
              }>("/documents/invoice", { method: "POST", body: payload });
              await loadWorkspace();
              return {
                status: res.document?.status ?? "SENT",
                sendError: res.sendError ?? null,
              };
            },
            scheduled
              ? {
                  loading: "Scheduling invoice…",
                  success: `Scheduled for ${formatDisplayDate(payload.data.issueDate)}`,
                  networkError: draftMaybeSavedMessage("invoice"),
                }
              : {
                  loading: "Sending invoice…",
                  success: "Invoice sent successfully",
                  networkError: draftMaybeSavedMessage("invoice"),
                },
          );
          return;
        }
        // Draft — plain create toast, NO auto-opened PDF (standard doc feedback).
        const tid = toast.loading("Creating invoice…");
        try {
          await apiRequest("/documents/invoice", {
            method: "POST",
            body: payload,
          });
        } catch (e) {
          // K2: the form already closed — report in the toast, never re-throw.
          toast.error(
            isTransportError(e)
              ? draftMaybeSavedMessage("invoice")
              : e instanceof Error
                ? e.message
                : "Unable to create invoice",
            { id: tid },
          );
          return;
        }
        toast.success("Invoice created", { id: tid });
        try {
          await loadWorkspace();
        } catch {
          /* list refresh is best-effort */
        }
      },
      onUpdateInvoice: async (
        docId: string,
        payload: {
          data: Record<string, string>;
          customerId?: string;
          notifyOnIssueDate?: boolean;
        },
      ) => {
        const tid = toast.loading("Saving invoice…");
        try {
          await apiRequest(`/documents/invoice/${docId}`, {
            method: "PATCH",
            body: payload,
          });
        } catch (e) {
          toast.dismiss(tid);
          throw e; // modal keeps the inline error + stays open
        }
        toast.success("Invoice updated", { id: tid });
        try {
          await loadWorkspace();
        } catch {
          /* list refresh is best-effort */
        }
      },
      // Finalize a DRAFT invoice (send). Uses the shared send-toast (SENT /
      // SEND_FAILED); the backend blocks it while the invoice is still deferred.
      onSendInvoice: async (docId: string) => {
        runSendWithToast(
          async () => {
            const res = await apiRequest<{
              message: string;
              document: { status: string };
              sendError: string | null;
            }>(`/documents/invoice/${docId}/send`, { method: "POST" });
            await loadWorkspace();
            return {
              status: res.document?.status ?? "SENT",
              sendError: res.sendError ?? null,
            };
          },
          { loading: "Sending invoice…", success: "Invoice sent successfully" },
        );
      },
      // C6 "Send now": finalize a SCHEDULED invoice/receipt TODAY. The backend
      // un-defers (issue date → today, defer flags cleared, PDF re-emitted) then
      // sends. Same send-toast as the normal send.
      onSendInvoiceNow: async (docId: string) => {
        runSendWithToast(
          async () => {
            const res = await apiRequest<{
              message: string;
              document: { status: string };
              sendError: string | null;
            }>(`/documents/invoice/${docId}/send-now`, { method: "POST" });
            await loadWorkspace();
            return {
              status: res.document?.status ?? "SENT",
              sendError: res.sendError ?? null,
            };
          },
          { loading: "Sending invoice…", success: "Invoice sent successfully" },
        );
      },
      onSendReceiptNow: async (docId: string) => {
        runSendWithToast(
          async () => {
            const res = await apiRequest<{
              document: { status: string };
              sendError: string | null;
            }>(`/documents/receipt/${docId}/send-now`, { method: "POST" });
            await loadWorkspace();
            return {
              status: res.document?.status ?? "SENT",
              sendError: res.sendError ?? null,
            };
          },
          { loading: "Sending receipt…", success: "Receipt sent successfully" },
        );
      },
      defaultReceivedBy: (() => {
        const userName = [dashboardUser?.firstName, dashboardUser?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        const contactName = [
          companyProfile?.contactFirstName,
          companyProfile?.contactLastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        const isBusiness = dashboardUser?.accountType === "BUSINESS";
        return isBusiness && contactName ? contactName : userName || contactName;
      })(),
      onEditDocument: (docId: string) => {
        // Edit flow still routes to legacy: the V2 modal currently supports
        // create-only. Wiring edit requires loading the existing document's
        // schema + dataJson + customer + locking type/template — separate
        // scope from this fix.
        void handleSelectDocument(docId);
        router.replace("/dashboard");
      },
      onDocumentAction: async (
        docId: string,
        action: V2BackendDocumentAction,
      ) => {
        await handleDocumentAction(docId, action);
      },
      onSyncStatus: async (docId: string) => {
        await handleSyncDocumentStatus(docId);
      },
      onPreviewPdf: (docId: string) => {
        void handlePreviewFinalPdf(docId);
      },
      onDownloadPdf: (docId: string) => {
        void handleDownloadFinalPdf(docId);
      },
      onFetchVersions: async (
        docId: string,
      ): Promise<V2DocumentVersion[]> => {
        const detail = await apiRequest<{
          versions?: Array<{
            id: string;
            versionNumber: number;
            createdAt: string;
            changedByUserId?: string | null;
          }>;
        }>(`/documents/${docId}`);
        return (detail.versions ?? []).map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          createdAt: v.createdAt,
          changedBy: null,
        }));
      },
      onFetchDocument: handleFetchDocumentDetail,
      onFetchPdfUrl: (docId: string): Promise<string> =>
        handlePreviewFinalPdf(docId),
      onUpdateDraft: async (
        docId: string,
        payload: { contractDate: string; dataJson: Record<string, unknown> },
      ) => {
        // Lean PATCH — the modal updates its local dataJson in place (no legacy
        // loadWorkspace/loadDocumentDetail, which would re-render + flash).
        await apiRequest(`/documents/${docId}/draft`, {
          method: "PATCH",
          body: payload,
        });
      },
      onResendReceipt: handleResendReceipt,
      onUpdateReceipt: handleUpdateReceipt,
      onReissueReceipt: handleReissueReceipt,
      onVoidReceipt: handleVoidReceipt,
      onVoidInvoice: handleVoidInvoice,
      onDeleteDocument: handleDeleteDocument,
      onFetchReceiptPdf: handleFetchReceiptPdf,
      onFetchInvoicePdf: handleFetchInvoicePdf,
    };

    const panelContent =
      newLayoutPanel === "overview" ? (
        <OverviewPanel
          user={adaptUserForPanel(dashboardUser)}
          companyProfile={adaptCompanyForPanel(companyProfile)}
          usage={adaptUsageForPanel(usage)}
          monthlySummary={adaptMonthlySummaryForPanel(monthlySummary)}
          documents={adaptDocumentsForPanel(documents)}
          customers={(customers ?? []).map((c) => ({ id: c.id, fullName: c.fullName }))}
          isLoading={isLoading}
          contractsEnabled={usage?.contractsEnabled ?? true}
          onFetchReceiptStats={fetchReceiptStats}
          receiptStatsRefreshKey={workspaceVersion}
          onNewDocument={() => router.push("/dashboard?panel=documents&new=1")}
          onOpenDocument={(docId) => router.push(`/dashboard?panel=documents&doc=${docId}`)}
          onViewAllAttention={() => router.push("/dashboard?panel=documents&status=SENT")}
        />
      ) : newLayoutPanel === "profile" ? (
        <ProfilePanel
          user={adaptUserForProfilePanel(dashboardUser)}
          companyProfile={adaptCompanyForProfilePanel(companyProfile)}
          isLoading={isLoading}
          onSave={handleProfileSave}
          stats={{
            totalDocuments: documents?.length ?? 0,
            completedDocuments: documents?.filter((d) => d.status === "COMPLETED").length ?? 0,
            memberSince: dashboardUser?.createdAt ?? null,
            planName: companyProfile?.planName ?? "STARTER",
          }}
          onNavigate={(panel: string) => {
            const url = new URL(window.location.href);
            url.searchParams.set("panel", panel);
            window.history.pushState({}, "", url.toString());
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
        />
      ) : newLayoutPanel === "billing" ? (
        <BillingPanel
          currentPlan={billingV3.currentPlan}
          cycle={billingV3.cycle}
          usage={billingV3.usage}
          receipts={billingV3.receipts}
          contractsEnabled={usage?.contractsEnabled ?? true}
          role={billingV3.role}
          isLoading={isLoading}
        />
      ) : newLayoutPanel === "customers" ? (
        <CustomersPanel
          role={customersV2Role}
          currentUserId={dashboardUser?.id ?? ""}
          onFetchCustomers={customersV2Handlers.onFetchCustomers}
          onCreateCustomer={customersV2Handlers.onCreateCustomer}
          onUpdateCustomer={customersV2Handlers.onUpdateCustomer}
          onDeleteCustomer={customersV2Handlers.onDeleteCustomer}
          onAssignCustomer={customersV2Handlers.onAssignCustomer}
          onChangeStatus={customersV2Handlers.onChangeStatus}
          onFetchUsersForAssign={customersV2Handlers.onFetchUsersForAssign}
          onFetchDeletedCustomers={customersV2Handlers.onFetchDeletedCustomers}
          onRestoreCustomer={customersV2Handlers.onRestoreCustomer}
        />
      ) : newLayoutPanel === "templates" ? (
        <TemplatesPanel />
      ) : newLayoutPanel === "members" && isSuperadmin ? (
        <MembersPanel
          role={membersV2.role}
          currentUserId={membersV2.currentUserId}
          onFetchUsers={membersV2.onFetchUsers}
          onFetchAccountRequests={membersV2.onFetchAccountRequests}
          onCreateUser={membersV2.onCreateUser}
          onUpdateUser={membersV2.onUpdateUser}
          onDeactivateUser={membersV2.onDeactivateUser}
          onReactivateUser={membersV2.onReactivateUser}
          onResetPassword={membersV2.onResetPassword}
          onUpdateAccountRequestStatus={membersV2.onUpdateAccountRequestStatus}
        />
      ) : newLayoutPanel === "lockedUsers" && isSuperadmin ? (
        <LockedUsersPanel
          onFetchLockedUsers={lockedUsersV2.onFetchLockedUsers}
          onUnlockUser={lockedUsersV2.onUnlockUser}
        />
      ) : newLayoutPanel === "documents" ? (
        <DocumentsPanel
          isLoading={isLoading}
          documents={documentsV2.items}
          documentTypes={documentsV2.types}
          customers={documentsV2.customers}
          onRefreshCustomers={refreshCustomers}
          onCreateDraft={documentsV2.onCreateDraft}
          onCreateReceipt={documentsV2.onCreateReceipt}
          onCreateInvoice={documentsV2.onCreateInvoice}
          onUpdateInvoice={documentsV2.onUpdateInvoice}
          onSendInvoice={documentsV2.onSendInvoice}
          onSendInvoiceNow={documentsV2.onSendInvoiceNow}
          onSendReceiptNow={documentsV2.onSendReceiptNow}
          defaultReceivedBy={documentsV2.defaultReceivedBy}
          onEditDocument={documentsV2.onEditDocument}
          onDocumentAction={documentsV2.onDocumentAction}
          onSyncStatus={documentsV2.onSyncStatus}
          onPreviewPdf={documentsV2.onPreviewPdf}
          onDownloadPdf={documentsV2.onDownloadPdf}
          onFetchVersions={documentsV2.onFetchVersions}
          onFetchDocument={documentsV2.onFetchDocument}
          onFetchPdfUrl={documentsV2.onFetchPdfUrl}
          onUpdateDraft={documentsV2.onUpdateDraft}
          onResendReceipt={documentsV2.onResendReceipt}
          onUpdateReceipt={documentsV2.onUpdateReceipt}
          onReissueReceipt={documentsV2.onReissueReceipt}
          onVoidReceipt={documentsV2.onVoidReceipt}
          onVoidInvoice={documentsV2.onVoidInvoice}
          onDeleteDocument={documentsV2.onDeleteDocument}
          onFetchReceiptPdf={documentsV2.onFetchReceiptPdf}
          onFetchInvoicePdf={documentsV2.onFetchInvoicePdf}
          isSuperadmin={(dashboardUser?.role ?? user?.role) === "SUPERADMIN"}
          contractsEnabled={usage?.contractsEnabled ?? true}
          onFetchReceiptStats={fetchReceiptStats}
          receiptStatsRefreshKey={workspaceVersion}
          selectableUsers={selectableUsers}
          onFetchTypesAsUser={handleFetchTypesAsUser}
          receiptQuota={
            usage
              ? {
                  remaining: usage.receiptsUnlimited
                    ? null
                    : usage.remainingReceipts,
                  unlimited: usage.receiptsUnlimited,
                  overagePrice: usage.receiptOveragePrice,
                }
              : undefined
          }
          receiptUsage={
            usage
              ? {
                  used: usage.receiptsUsed,
                  limit: usage.monthlyReceiptLimit,
                  unlimited: usage.receiptsUnlimited,
                  overagePrice: usage.receiptOveragePrice,
                }
              : undefined
          }
        />
      ) : (
        <div
          className="rounded-xl p-8"
          style={{
            background: "var(--bg-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h1
            className="text-2xl font-medium mb-2"
            style={{ color: "var(--text-heading)" }}
          >
            {newLayoutPanel.charAt(0).toUpperCase() + newLayoutPanel.slice(1)}{" "}
            Panel
          </h1>
          <p style={{ color: "var(--text-body)" }}>
            Content for {newLayoutPanel} goes here. Implementation coming in
            next phases.
          </p>
        </div>
      );

    return (
      <DashboardShell
        user={shellUser}
        currentPanel={newLayoutPanel}
        onSignOut={handleSignOut}
        isLoading={isLoading}
      >
        {panelContent}
      </DashboardShell>
    );
  }

  // Unreachable: newLayoutPanel is always truthy, so the block above always
  // returns. Kept to satisfy the function's return type — the legacy
  // DashboardSidebarDemo layout that used to live here was removed.
  return null;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function formatBillingMonth(monthString: string | null | undefined): string {
  if (!monthString) return "";
  const [year, month] = monthString.split("-");
  const idx = parseInt(month, 10) - 1;
  if (idx < 0 || idx > 11) return "";
  return `${SHORT_MONTHS[idx]} ${year}`;
}

function formatNextBillingDate(monthString: string | null | undefined): string {
  if (!monthString) return "";
  const [yearStr, monthStr] = monthString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month) return "";
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  // H2: next billing date is the 1st of next month, rendered MM/DD/YYYY.
  return `${String(nextMonth).padStart(2, "0")}/01/${nextYear}`;
}

function deriveBillingPeriodStart(monthString: string | null | undefined): string {
  if (!monthString) return "";
  const [y, m] = monthString.split("-").map(Number);
  if (!y || !m) return "";
  return new Date(Date.UTC(y, m - 1, 1)).toISOString();
}

function deriveBillingPeriodEnd(monthString: string | null | undefined): string {
  if (!monthString) return "";
  const [y, m] = monthString.split("-").map(Number);
  if (!y || !m) return "";
  return new Date(Date.UTC(y, m, 0, 23, 59, 59)).toISOString();
}

const BUSINESS_OPTIONAL_FIELDS = [
  "businessLegalName",
  "licenseNumber",
  "industry",
  "website",
  "businessEmail",
  "businessPhone",
  "businessPhone2",
  "businessAddressLine1",
  "businessAddressLine2",
  "businessCity",
  "businessState",
  "businessZipCode",
  "primaryContactName",
  "primaryContactEmail",
  "primaryContactPhone",
  "primaryContactTitle",
  "primaryContactAddressLine1",
  "primaryContactCity",
  "primaryContactState",
  "primaryContactZipCode",
] as const satisfies ReadonlyArray<keyof CustomerBusinessFormValues>;

// The V2 customer form emits '' for untouched optionals. The backend's
// @IsOptional does NOT skip empty strings, so an '' email/uuid fails @IsEmail /
// @IsUUID with a 400 ("email must be an email"). CREATE: drop empty optionals.
// PATCH: send null so the field is explicitly cleared (null IS skipped by
// @IsOptional). Both recurse into the nested `business` object.
function sanitizeCustomerCreate(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) out[key] = trimmed;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = sanitizeCustomerCreate(value as Record<string, unknown>);
      if (Object.keys(nested).length) out[key] = nested;
    } else if (value != null) {
      out[key] = value;
    }
  }
  return out;
}

function sanitizeCustomerUpdate(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      out[key] = trimmed ? trimmed : null;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeCustomerUpdate(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function buildBusinessCreatePayload(
  business: CustomerBusinessFormValues,
): Record<string, string> {
  const payload: Record<string, string> = {
    businessName: business.businessName.trim(),
  };
  for (const key of BUSINESS_OPTIONAL_FIELDS) {
    const v = business[key]?.trim();
    if (v) payload[key] = v;
  }
  return payload;
}

function buildBusinessUpdatePayload(
  business: CustomerBusinessFormValues,
): Record<string, string | null> {
  // PATCH: empty fields → null (to clear). businessName never cleared — if
  // the user somehow blanked it, we keep the existing value (skip the key).
  const payload: Record<string, string | null> = {};
  const name = business.businessName.trim();
  if (name) payload.businessName = name;
  for (const key of BUSINESS_OPTIONAL_FIELDS) {
    const v = business[key]?.trim();
    payload[key] = v ? v : null;
  }
  return payload;
}

function getRecentBillingMonths(count: number) {
  const now = new Date();
  const months: string[] = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return months;
}
