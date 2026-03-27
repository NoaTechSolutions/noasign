"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { API_URL, apiRequest } from "../../lib/api";
import { DashboardSidebarDemo } from "../../components/dashboard-sidebar-demo";
import {
  clearSession,
  getStoredToken,
  getStoredUser,
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
  pandadocTemplate?: {
    name: string;
    templateKey: string;
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

type DocumentAction = "send" | "cancel" | "reactivate";

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
  pandaTemplates: Array<{
    id: string;
    name: string;
    templateKey: string;
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
    async (accessToken: string, currentSelectedId?: string | null) => {
    const recentMonths = getRecentBillingMonths(3);
    const [me, profile, currentUsage, summary, myDocuments, availableDocumentTypes, summaryHistory] = await Promise.all([
      apiRequest<DashboardUser>("/users/me", { token: accessToken }),
      apiRequest<CompanyProfile>("/company-profile/me", { token: accessToken }),
      apiRequest<CurrentUsage>("/billing/current-usage", { token: accessToken }),
      apiRequest<MonthlySummary>("/billing/summary", { token: accessToken }),
      apiRequest<DashboardDocument[]>("/documents/my-documents", {
        token: accessToken,
      }),
      apiRequest<DocumentTypeCatalogItem[]>("/documents/types", {
        token: accessToken,
      }),
      Promise.all(
        recentMonths.map((month) =>
          apiRequest<MonthlySummary>(`/billing/summary?month=${month}`, {
            token: accessToken,
          }),
        ),
      ),
    ]);

    const [workspaceUsers, workspaceAccountRequests] =
      me.role === "MASTER"
        ? await Promise.all([
            apiRequest<ManagedUser[]>("/users", { token: accessToken }),
            apiRequest<AccountRequest[]>("/users/account-requests", {
              token: accessToken,
            }),
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
      currentSelectedId && myDocuments.some((document) => document.id === currentSelectedId)
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

  const loadDocumentDetail = useCallback(async (accessToken: string, documentId: string) => {
    setIsDocumentDetailLoading(true);

    try {
      const detail = await apiRequest<DocumentDetail>(`/documents/${documentId}`, {
        token: accessToken,
      });

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
    const accessToken = getStoredToken();

    if (typeof accessToken !== "string" || !user) {
      router.replace("/");
      return;
    }

    const token = accessToken;

    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const { nextSelectedId } = await loadWorkspace(token);

        if (!isMounted) {
          return;
        }

        if (nextSelectedId) {
          await loadDocumentDetail(token, nextSelectedId);
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
  }, [loadDocumentDetail, loadWorkspace, router, user]);

  function handleSignOut() {
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      await loadDocumentDetail(accessToken, documentId);
    } catch (detailError) {
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Unable to load document detail",
      );
    }
  }

  async function handleDocumentAction(documentId: string, action: DocumentAction) {
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setDocumentActionId(documentId);
    setError("");

    try {
      await apiRequest<DocumentActionResponse>(`/documents/${documentId}/${action}`, {
        token: accessToken,
        method: "POST",
      });

      const { nextSelectedId } = await loadWorkspace(accessToken, selectedDocumentId);
      const detailTarget =
        documentId === selectedDocumentId ? documentId : nextSelectedId;

      if (detailTarget) {
        await loadDocumentDetail(accessToken, detailTarget);
      } else {
        setDocumentDetail(null);
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update document",
      );
    } finally {
      setDocumentActionId(null);
    }
  }

  async function handleSyncDocumentStatus(documentId: string) {
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setDocumentActionId(documentId);
    setError("");

    try {
      await apiRequest<DocumentActionResponse>(`/documents/${documentId}/sync-status`, {
        token: accessToken,
        method: "POST",
      });

      await loadWorkspace(accessToken, documentId);
      await loadDocumentDetail(accessToken, documentId);
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setDocumentActionId(documentId);
    setError("");

    try {
      const response = await fetch(`${API_URL}/documents/${documentId}/final-pdf`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return "";
    }

    setDocumentActionId(documentId);
    setError("");

    try {
      const response = await fetch(`${API_URL}/documents/${documentId}/final-pdf`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setDocumentActionId(documentId);
    setError("");

    try {
      await apiRequest<UpdateDraftResponse>(`/documents/${documentId}/draft`, {
        token: accessToken,
        method: "PATCH",
        body: payload,
      });

      await loadWorkspace(accessToken, documentId);
      await loadDocumentDetail(accessToken, documentId);
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
    pandadocTemplateId: string;
    contractDate: string;
    dataJson: Record<string, unknown>;
  }) {
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      const response = await apiRequest<CreateDraftResponse>("/documents/draft", {
        token: accessToken,
        method: "POST",
        body: payload,
      });

      await loadWorkspace(accessToken, response.document.id);
      await loadDocumentDetail(accessToken, response.document.id);
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      const updatedProfile = await apiRequest<CompanyProfile>("/company-profile/me", {
        token: accessToken,
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      await apiRequest<CreateUserResponse>("/users", {
        token: accessToken,
        method: "POST",
        body: payload,
      });

      await loadWorkspace(accessToken, selectedDocumentId);
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      await apiRequest<UpdateUserResponse>(`/users/${userId}`, {
        token: accessToken,
        method: "PATCH",
        body: payload,
      });

      await loadWorkspace(accessToken, selectedDocumentId);
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Unable to update user",
      );
      throw updateError;
    }
  }

  async function handleDeactivateUser(userId: string) {
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      await apiRequest<UpdateUserResponse>(`/users/${userId}/deactivate`, {
        token: accessToken,
        method: "POST",
      });

      await loadWorkspace(accessToken, selectedDocumentId);
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Unable to deactivate user",
      );
      throw actionError;
    }
  }

  async function handleReactivateUser(userId: string) {
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      await apiRequest<UpdateUserResponse>(`/users/${userId}/reactivate`, {
        token: accessToken,
        method: "POST",
      });

      await loadWorkspace(accessToken, selectedDocumentId);
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      await apiRequest<ResetUserPasswordResponse>(`/users/${userId}/password`, {
        token: accessToken,
        method: "POST",
        body: payload,
      });

      await loadWorkspace(accessToken, selectedDocumentId);
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      await apiRequest<{ message: string }>("/auth/change-password", {
        token: accessToken,
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
        window.localStorage.setItem(
          "noasign.user",
          JSON.stringify({ ...storedUser, mustChangePassword: false }),
        );
        window.dispatchEvent(new Event("noasign-auth-change"));
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
    const accessToken = getStoredToken();

    if (!accessToken) {
      clearSession();
      router.replace("/");
      return;
    }

    setError("");

    try {
      await apiRequest<UpdateAccountRequestResponse>(
        `/users/account-requests/${requestId}`,
        {
          token: accessToken,
          method: "PATCH",
          body: { status },
        },
      );

      await loadWorkspace(accessToken, selectedDocumentId);
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
