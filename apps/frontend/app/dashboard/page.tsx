"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { API_URL, apiRequest } from "../../lib/api";
import { DashboardSidebarDemo } from "../../components/dashboard-sidebar-demo";
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
  overagePrice: string | number;
  documentsUsed: number;
  remainingDocuments: number | null;
  overageDocuments: number;
};

type MonthlySummary = {
  month: string;
  planName: string;
  monthlyDocLimit: number;
  isUnlimited: boolean;
  overagePrice: string | number;
  documentsSent: number;
  overageDocuments: number;
  estimatedOverageCost: number;
};

type DashboardDocument = {
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
const DASHBOARD_SELECTED_DOCUMENT_KEY = "noasign:dashboard:selected-document-id";

export default function DashboardPage() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [dashboardUser, setDashboardUser] = useState<DashboardUser | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [usage, setUsage] = useState<CurrentUsage | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [billingHistory, setBillingHistory] = useState<MonthlySummary[]>([]);
  const [documents, setDocuments] = useState<DashboardDocument[] | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[] | null>(null);
  const [accountRequests, setAccountRequests] = useState<AccountRequest[] | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeCatalogItem[]>([]);
  const [documentDetail, setDocumentDetail] = useState<DocumentDetail | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isDocumentDetailLoading, setIsDocumentDetailLoading] = useState(false);
  const [documentActionId, setDocumentActionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(
    async (currentSelectedId?: string | null) => {
      const recentMonths = getRecentBillingMonths(3);
      const [me, profile, currentUsage, summary, myDocuments, availableDocumentTypes, summaryHistory] =
        await Promise.all([
          apiRequest<DashboardUser>("/users/me"),
          apiRequest<CompanyProfile>("/company-profile/me"),
          apiRequest<CurrentUsage>("/billing/current-usage"),
          apiRequest<MonthlySummary>("/billing/summary"),
          apiRequest<DashboardDocument[]>("/documents/my-documents"),
          apiRequest<DocumentTypeCatalogItem[]>("/documents/types"),
          Promise.all(
            recentMonths.map((month) =>
              apiRequest<MonthlySummary>(`/billing/summary?month=${month}`),
            ),
          ),
        ]);

      const [workspaceUsers, workspaceAccountRequests] =
        me.role === "MASTER"
          ? await Promise.all([
              apiRequest<ManagedUser[]>("/users"),
              apiRequest<AccountRequest[]>("/users/account-requests"),
            ])
          : [[], []];

      setDashboardUser(me);
      setCompanyProfile(profile);
      setUsage(currentUsage);
      setMonthlySummary(summary);
      setBillingHistory(summaryHistory);
      setDocuments(myDocuments);
      setDocumentTypes(availableDocumentTypes);
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
    setTheme("dark");
  }, [setTheme]);

  useEffect(() => {
    function syncUser() {
      setUser(getStoredUser());
    }

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("noasign-auth-change", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("noasign-auth-change", syncUser);
    };
  }, []);

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
      window.location.replace("/");
      return;
    }
    router.replace("/");
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

  async function handleDocumentAction(documentId: string, action: DocumentAction) {
    setDocumentActionId(documentId);
    setError("");
    let actionSucceeded = false;

    try {
      await apiRequest<DocumentActionResponse>(`/documents/${documentId}/${action}`, {
        method: "POST",
      });
      actionSucceeded = true;

      const { nextSelectedId } = await loadWorkspace(selectedDocumentId);
      const detailTarget =
        documentId === selectedDocumentId ? documentId : nextSelectedId;

      if (detailTarget) {
        await loadDocumentDetail(detailTarget);
      } else {
        setDocumentDetail(null);
      }
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

  async function handleCreateDraft(payload: {
    documentTypeId: string;
    formDefinitionId: string;
    signatureTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
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
          onSelectDocument={handleSelectDocument}
          onDocumentAction={handleDocumentAction}
          onUpdateDraft={handleUpdateDraft}
          onSyncDocumentStatus={handleSyncDocumentStatus}
          onPreviewFinalPdf={handlePreviewFinalPdf}
          onDownloadFinalPdf={handleDownloadFinalPdf}
          onCreateDraft={handleCreateDraft}
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

function getRecentBillingMonths(count: number) {
  const now = new Date();
  const months: string[] = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return months;
}
