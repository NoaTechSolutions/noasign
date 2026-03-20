"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
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
  contactEmail: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [dashboardUser, setDashboardUser] = useState<DashboardUser | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [usage, setUsage] = useState<CurrentUsage | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [documents, setDocuments] = useState<DashboardDocument[] | null>(null);
  const [documentDetail, setDocumentDetail] = useState<DocumentDetail | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isDocumentDetailLoading, setIsDocumentDetailLoading] = useState(false);
  const [documentActionId, setDocumentActionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(
    async (accessToken: string, currentSelectedId?: string | null) => {
    const [me, profile, currentUsage, summary, myDocuments] = await Promise.all([
      apiRequest<DashboardUser>("/users/me", { token: accessToken }),
      apiRequest<CompanyProfile>("/company-profile/me", { token: accessToken }),
      apiRequest<CurrentUsage>("/billing/current-usage", { token: accessToken }),
      apiRequest<MonthlySummary>("/billing/summary", { token: accessToken }),
      apiRequest<DashboardDocument[]>("/documents/my-documents", {
        token: accessToken,
      }),
    ]);

    setDashboardUser(me);
    setCompanyProfile(profile);
    setUsage(currentUsage);
    setMonthlySummary(summary);
    setDocuments(myDocuments);

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

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      {error ? (
        <div className="border-b border-[#ffd2c1] bg-[#fff4ef] px-4 py-3 text-sm text-[#9b4620]">
          {error}
        </div>
      ) : null}
      <DashboardSidebarDemo
        user={dashboardUser ?? user}
        companyProfile={companyProfile}
        usage={usage}
        monthlySummary={monthlySummary}
        documents={documents}
        documentDetail={documentDetail}
        selectedDocumentId={selectedDocumentId}
        isDocumentDetailLoading={isDocumentDetailLoading}
        documentActionId={documentActionId}
        isLoading={isLoading}
        onSelectDocument={handleSelectDocument}
        onDocumentAction={handleDocumentAction}
        onSignOut={handleSignOut}
      />
    </main>
  );
}
