"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomersSidebar } from "@/components/dashboard/customers/customers-sidebar";
import { CustomerForm } from "@/components/dashboard/customers/customer-form";
import { apiRequest } from "@/lib/api";
import type { Customer, CustomerFormValues } from "../types";

export default function NewCustomerPage() {
  const router = useRouter();

  async function handleSubmit(values: CustomerFormValues) {
    const payload: Record<string, string> = { fullName: values.fullName.trim() };
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
      if (v) payload[key] = v;
    });

    const created = await apiRequest<Customer>("/customers", {
      method: "POST",
      body: payload,
    });
    router.push(`/dashboard/customers/${created.id}`);
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[color:var(--bg-page)]/70 backdrop-blur md:flex-row xl:overflow-visible">
      <CustomersSidebar activeKey="customers" />
      <main className="flex-1 xl:ml-0">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-8 xl:px-8 xl:py-12">
          <div className="flex flex-col gap-6">
            <Link
              href="/dashboard/customers"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to customers
            </Link>

            <header>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                New customer
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Add a customer to reuse their contact data on future documents.
              </p>
            </header>

            <CustomerForm
              onSubmit={handleSubmit}
              submitLabel="Create customer"
              onCancel={() => router.push("/dashboard/customers")}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
