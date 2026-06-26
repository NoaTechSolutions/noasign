"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";
import { SendToast } from "../../components/dashboard/panels/v2/documents/SendToast";
import { API_URL, apiRequest } from "../../lib/api";
import { DashboardSidebarDemo } from "../../components/dashboard-sidebar-demo";
import { DashboardShell } from "../../components/dashboard/layout/DashboardShell";
import { OverviewPanel, ProfilePanel, BillingPanel, CustomersPanel, MembersPanel, LockedUsersPanel } from "../../components/dashboard/panels/v2";
import { DocumentsPanel } from "../../components/dashboard/panels/v2/documents";
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
  // Default to the V2 "overview" panel when no ?panel= is present. This makes
  // the V2 dashboard the default and leaves the legacy DashboardSidebarDemo
  // (the `else` branch of the `if (newLayoutPanel)` below) unreachable via the
  // normal flow — without deleting it yet.
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
  // Superadmin flow: all users across all tenants (MASTER only) for the
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

      // Superadmin flow: load the cross-tenant user list for MASTER only
      // (the endpoint 403s otherwise). Best-effort — never blocks the workspace.
      if (me.role === "MASTER") {
        apiRequest<SelectableUser[]>("/documents/selectable-users")
          .then(setSelectableUsers)
          .catch(() => setSelectableUsers(undefined));
      }

      if (staticResult) {
        const [profile, availableDocumentTypes, summaryHistory] = staticResult;
        // Individual users have their own data — don't leak company profile into state
        const isIndividual = me.role !== "MASTER" && me.accountType === "INDIVIDUAL";
        setCompanyProfile(isIndividual ? null : profile);
        setDocumentTypes(availableDocumentTypes);
        setBillingHistory(summaryHistory);
        staticDataLoaded.current = true;
      }

      const [workspaceUsers, workspaceAccountRequests] =
        me.role === "MASTER"
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
  // sidebar for non-MASTER, but a direct ?panel= URL would still render them.
  // Redirect non-MASTER away once the role is known (the backend already gates
  // the data — this just stops the privileged UI from rendering at all).
  useEffect(() => {
    const MASTER_ONLY_PANELS = ["members", "lockedUsers"];
    const role = dashboardUser?.role ?? user?.role;
    if (!role) return; // role not loaded yet — don't redirect a MASTER prematurely
    if (
      newLayoutPanel &&
      MASTER_ONLY_PANELS.includes(newLayoutPanel) &&
      role !== "MASTER"
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

  useEffect(() => {
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
  }, [documentActionId, documents, refreshLiveDocumentData, selectedDocumentId]);

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

  // Optimistic send: show a top-right toast with an animated bar that resolves
  // to the REAL result (SENT → success; SEND_FAILED / cooldown 400 → error with
  // the reason). The caller has already closed the popup. Fire-and-forget.
  // Shared send/resend toast orchestrator for receipts AND contracts. `send`
  // resolves with { status, sendError } (status "SEND_FAILED" → error state) or
  // throws (network/unknown → error state). Copy is per-flow.
  function runSendWithToast(
    send: () => Promise<{ status: string; sendError: string | null }>,
    copy: { loading: string; success: string },
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
        toast.custom(
          () => (
            <SendToast
              state="error"
              message={`Could not send: ${e instanceof Error ? e.message : "unknown error"}`}
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
        return apiRequest<Customer>("/customers", { method: "POST", body: data });
      },
      onUpdateCustomer: async (id: string, data: V2CustomerFormData) => {
        return apiRequest<Customer>(`/customers/${id}`, {
          method: "PATCH",
          body: data,
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
        // Backend update() syncs deletedAt and gates restores to MASTER, so a
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

  // Dual-mode rendering: if `?panel=` is in URL, render the new DashboardShell
  // layout. Otherwise fall through to the legacy DashboardSidebarDemo below.
  // This lets the redesign coexist with the live SPA during the rebuild.
  if (newLayoutPanel) {
    // Defensive render gate (pairs with the redirect effect above): never render
    // the privileged panels for a non-MASTER, even for the frame before the
    // redirect fires. Role unknown (still loading) also counts as not-master.
    const isMaster = (dashboardUser?.role ?? user?.role) === "MASTER";

    const fullName =
      [dashboardUser?.firstName, dashboardUser?.lastName]
        .filter(Boolean)
        .join(" ") || "User";
    const shellUser = {
      name: fullName,
      email: dashboardUser?.email ?? user?.email ?? "",
      role: ((dashboardUser?.role ?? user?.role) as
        | "MASTER"
        | "ADMIN"
        | "USER") || "USER",
      companyName:
        companyProfile?.companyName ||
        companyProfile?.legalName ||
        "Company",
      avatarUrl: dashboardUser?.avatarUrl ?? null,
      // Topbar shows name/company + plan beside the avatar. accountType
      // drives which name to show (INDIVIDUAL → person, else → company).
      accountType: dashboardUser?.accountType ?? null,
      plan: companyProfile?.planName ?? null,
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
        documentsUsed: backendUsage.documentsUsed,
        documentsLimit: backendUsage.monthlyDocLimit,
        overageCount: backendUsage.overageDocuments,
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
      return backendDocs.map((doc) => ({
        id: doc.id,
        documentNumber: doc.documentNumber,
        status: doc.status,
        recipientEmail: doc.lastSentRecipientEmail || "N/A",
        createdAt: doc.createdAt,
        sentAt: doc.sentAt ?? null,
        viewedAt: doc.viewedAt ?? null,
        completedAt: doc.completedAt ?? null,
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
    // from frontend BILLING_PLAN_CONFIG (backend has no plan-price / max-users
    // / max-templates columns). Doc limit is the live backend value. Users
    // count = managedUsers length; templates count = documentTypes length as
    // a proxy until backend tracks "templates in use".
    const billingPlanCfg = getBillingPlanConfig(companyProfile?.planName);
    const billingPlanKey = (companyProfile?.planName ?? "LAUNCH").toUpperCase();
    const billingV3 = {
      currentPlan: {
        name: billingPlanCfg.name,
        plan: billingPlanKey,
        price: billingPlanCfg.price,
        documentsLimit:
          usage?.monthlyDocLimit ??
          companyProfile?.monthlyDocLimit ??
          billingPlanCfg.docsLimit,
        usersLimit: billingPlanCfg.usersLimit,
        templatesLimit: billingPlanCfg.templatesLimit,
        overageRate: billingPlanCfg.overageRate,
        features: billingPlanCfg.features,
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
      role: ((dashboardUser?.role ?? "USER").toLowerCase() as
        | "master"
        | "admin"
        | "user"),
    };

    // customersV2Handlers is defined+memoized at the component top level (see
    // above the `if (newLayoutPanel)` guard). Only the role string — a
    // primitive, safe to recompute — is derived here.
    const customersV2Role = ((dashboardUser?.role ?? "USER").toLowerCase() as
      | "master"
      | "admin"
      | "user");

    // MembersPanel V2 handlers. Reuses existing page.tsx handlers (no duplication
    // of mutations — handleCreateUser/UpdateUser/DeactivateUser/ReactivateUser/
    // ResetUserPassword/UpdateAccountRequestStatus already wrap apiRequest()).
    // Only 2 new handlers are needed: fetch users and fetch account-requests
    // (page.tsx loads these via loadWorkspace, no standalone fetch existed).
    const membersV2Role = ((dashboardUser?.role ?? "USER").toLowerCase() as
      | "master"
      | "admin"
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
        role?: "MASTER" | "USER";
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
      role: "MASTER" | "ADMIN" | "USER";
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
        receiptTemplateId?: string;
      }) => {
        if (payload.send) {
          // Optimistic: the form already closed; show the progress toast and
          // resolve it with the REAL SENT / SEND_FAILED result.
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
            { loading: "Sending receipt…", success: "Receipt sent successfully" },
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
          toast.error(
            e instanceof Error ? e.message : "Could not save the draft",
            { id: tid },
          );
          return { status: "DRAFT", sendError: null };
        }
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
      onFetchReceiptPdf: handleFetchReceiptPdf,
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
      ) : newLayoutPanel === "members" && isMaster ? (
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
      ) : newLayoutPanel === "lockedUsers" && isMaster ? (
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
          onCreateDraft={documentsV2.onCreateDraft}
          onCreateReceipt={documentsV2.onCreateReceipt}
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
          onFetchReceiptPdf={documentsV2.onFetchReceiptPdf}
          isMaster={(dashboardUser?.role ?? user?.role) === "MASTER"}
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

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      {error ? (
        <div className="border-b border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
          {error}
        </div>
      ) : null}
      <Suspense fallback={<div className="px-4 py-6 text-sm text-[color:var(--text-muted)]">Loading workspace...</div>}>
        <DashboardSidebarDemo
          user={dashboardUser ?? user}
          companyProfile={companyProfile}
          usage={usage}
          monthlySummary={monthlySummary}
          billingHistory={billingHistory}
          users={managedUsers}
          accountRequests={accountRequests}
          documents={documents}
          documentTypes={documentTypes}
          documentDetail={documentDetail}
          selectedDocumentId={selectedDocumentId}
          isDocumentDetailLoading={isDocumentDetailLoading}
          documentActionId={documentActionId}
          isLoading={isLoading}
          customers={customers}
          customerDetail={customerDetail}
          selectedCustomerId={selectedCustomerId}
          isCustomerDetailLoading={isCustomerDetailLoading}
          customerActionId={customerActionId}
          onSelectCustomer={handleSelectCustomer}
          onCloseCustomerDetail={handleCloseCustomerDetail}
          onDeleteCustomer={handleDeleteCustomer}
          onCreateCustomer={handleCreateCustomer}
          onUpdateCustomer={handleUpdateCustomer}
          onSelectDocument={handleSelectDocument}
          onDocumentAction={handleDocumentAction}
          onUpdateDraft={handleUpdateDraft}
          onSyncDocumentStatus={handleSyncDocumentStatus}
          onPreviewFinalPdf={handlePreviewFinalPdf}
          onDownloadFinalPdf={handleDownloadFinalPdf}
          onCreateDraft={handleCreateDraft}
          onFetchTemplatesAsUser={handleFetchTemplatesAsUser}
          onUpdateMe={handleUpdateMe}
          onUpdateCompanyProfile={handleUpdateCompanyProfile}
          onCreateUser={handleCreateUser}
          onUpdateUser={handleUpdateUser}
          onDeactivateUser={handleDeactivateUser}
          onReactivateUser={handleReactivateUser}
          onResetUserPassword={handleResetUserPassword}
          onUpdateAccountRequestStatus={handleUpdateAccountRequestStatus}
          onSignOut={handleSignOut}
          onChangeOwnPassword={handleChangeOwnPassword}
        />
      </Suspense>
    </main>
  );
}

// BillingPanel V3 plan config. Mirrors ComparisonSection's PLANS table so the
// current-plan limits + features stay consistent with the comparison view.
// SCALE.usersLimit = 9999 is a sentinel: BillingPanel's interface types it as
// `number` (non-nullable) but ComparisonSection's row renders "Unlimited" for
// users via its own table — so the UX wart only shows up in the Plan Features
// header line for actual Scale tenants. Acceptable for MVP.
type BillingPlanConfig = {
  name: string;
  price: number;
  docsLimit: number;
  usersLimit: number;
  templatesLimit: number | null;
  overageRate: number;
  features: {
    userManagement: boolean;
    multiSigner: boolean;
    branding: boolean;
    bulkSend: boolean;
    analytics: boolean;
    prioritySupport: boolean;
    retention: string;
  };
};

const BILLING_PLAN_CONFIG: Record<string, BillingPlanConfig> = {
  STARTER: {
    name: "Starter",
    price: 19,
    docsLimit: 10,
    usersLimit: 2,
    templatesLimit: 5,
    overageRate: 5.0,
    features: {
      userManagement: false,
      multiSigner: false,
      branding: false,
      bulkSend: false,
      analytics: false,
      prioritySupport: false,
      retention: "1 year",
    },
  },
  LAUNCH: {
    name: "Launch",
    price: 39,
    docsLimit: 15,
    usersLimit: 3,
    templatesLimit: 8,
    overageRate: 3.5,
    features: {
      userManagement: true,
      multiSigner: true,
      branding: false,
      bulkSend: false,
      analytics: false,
      prioritySupport: false,
      retention: "2 years",
    },
  },
  PRO: {
    name: "Pro",
    price: 89,
    docsLimit: 50,
    usersLimit: 5,
    templatesLimit: null,
    overageRate: 2.5,
    features: {
      userManagement: true,
      multiSigner: true,
      branding: true,
      bulkSend: true,
      analytics: true,
      prioritySupport: false,
      retention: "5 years",
    },
  },
  SCALE: {
    name: "Scale",
    price: 229,
    docsLimit: 9999,
    usersLimit: 9999,
    templatesLimit: null,
    overageRate: 0,
    features: {
      userManagement: true,
      multiSigner: true,
      branding: true,
      bulkSend: true,
      analytics: true,
      prioritySupport: true,
      retention: "Unlimited",
    },
  },
};

function getBillingPlanConfig(planName: string | null | undefined): BillingPlanConfig {
  const key = (planName ?? "LAUNCH").toUpperCase();
  return BILLING_PLAN_CONFIG[key] ?? BILLING_PLAN_CONFIG.LAUNCH;
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
  return `${SHORT_MONTHS[nextMonth - 1]} 1, ${nextYear}`;
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
