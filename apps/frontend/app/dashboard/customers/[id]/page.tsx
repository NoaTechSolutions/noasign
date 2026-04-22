"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { CustomersSidebar } from "@/components/dashboard/customers/customers-sidebar";
import { CustomerForm } from "@/components/dashboard/customers/customer-form";
import { CustomersTopBar } from "@/components/dashboard/customers/customers-topbar";
import { apiRequest } from "@/lib/api";
import type {
  Customer,
  CustomerFormValues,
  CustomerWithCount,
} from "../types";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params?.id;

  const [customer, setCustomer] = useState<CustomerWithCount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomer = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await apiRequest<CustomerWithCount>(`/customers/${customerId}`);
      setCustomer(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load customer");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  async function handleSubmit(values: CustomerFormValues) {
    if (!customerId) return;
    const payload: Record<string, string | null> = { fullName: values.fullName.trim() };
    (
      [
        "email",
        "phone",
        "addressLine1",
        "addressLine2",
        "city",
        "state",
        "zipCode",
        "country",
        "notes",
      ] as const
    ).forEach((key) => {
      const v = values[key]?.trim();
      // Send null to clear previously-set optional fields; empty string would fail
      // the backend IsEmail validator on email.
      payload[key] = v ? v : null;
    });
    const updated = await apiRequest<Customer>(`/customers/${customerId}`, {
      method: "PATCH",
      body: payload,
    });
    setCustomer((prev) => (prev ? { ...prev, ...updated } : null));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  async function handleDelete() {
    if (!customerId) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/customers/${customerId}`, { method: "DELETE" });
      router.push("/dashboard/customers");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to delete customer");
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[color:var(--bg-page)]/70 backdrop-blur md:flex-row xl:overflow-visible">
      <CustomersSidebar activeKey="customers" />
      <main className="flex-1 xl:ml-0">
        <div className="mx-auto w-full max-w-[1100px] px-4 pt-3 xl:px-8 xl:pt-4">
          <CustomersTopBar
            breadcrumbs={[
              { label: "Customers", href: "/dashboard/customers" },
              {
                label:
                  customer?.fullName ?? (isLoading ? "Loading..." : "Customer"),
              },
            ]}
          />
          <div className="mt-6 flex flex-col gap-6 pb-12 xl:mt-8">
            {isLoading ? (
              <div className="rounded-[1.8rem] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-400">
                Loading customer...
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {loadError}
              </div>
            ) : customer ? (
              <>
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                      {customer.fullName}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {customer._count.documents === 0
                        ? "No documents associated yet"
                        : customer._count.documents === 1
                          ? "1 document associated"
                          : `${customer._count.documents} documents associated`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </header>

                {saveSuccess ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Customer saved.
                  </div>
                ) : null}

                <CustomerForm
                  initialData={customer}
                  onSubmit={handleSubmit}
                  submitLabel="Save changes"
                />
              </>
            ) : null}
          </div>
        </div>
      </main>

      {confirmDelete && customer ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-md rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Delete customer?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This will permanently remove <strong>{customer.fullName}</strong>. Any existing
              documents linked to this customer keep their snapshot — only the relation is cleared.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
                className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-11 items-center rounded-2xl bg-rose-600 px-5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-70"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
