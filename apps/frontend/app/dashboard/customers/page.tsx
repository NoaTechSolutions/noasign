"use client";

import { CustomersSidebar } from "@/components/dashboard/customers/customers-sidebar";
import { CustomersPanel } from "@/components/dashboard/customers/customers-panel";
import { CustomersTopBar } from "@/components/dashboard/customers/customers-topbar";

export default function CustomersListPage() {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[color:var(--bg-page)]/70 backdrop-blur md:flex-row xl:overflow-visible">
      <CustomersSidebar activeKey="customers" />
      <main className="flex-1 xl:ml-0">
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-3 xl:px-8 xl:pt-4">
          <CustomersTopBar breadcrumbs={[{ label: "Customers" }]} />
          <div className="mt-6 pb-12 xl:mt-8">
            <CustomersPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
