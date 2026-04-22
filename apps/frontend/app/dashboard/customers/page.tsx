"use client";

import { CustomersSidebar } from "@/components/dashboard/customers/customers-sidebar";
import { CustomersPanel } from "@/components/dashboard/customers/customers-panel";

// Mini-monster scope: owns its own sidebar + content shell for the /dashboard/customers
// route segment. Mirrors dashboard/page.tsx's pattern of sidebar + section content.
export default function CustomersListPage() {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[color:var(--bg-page)]/70 backdrop-blur md:flex-row xl:overflow-visible">
      <CustomersSidebar activeKey="customers" />
      <main className="flex-1 xl:ml-0">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-8 xl:px-8 xl:py-12">
          <CustomersPanel />
        </div>
      </main>
    </div>
  );
}
