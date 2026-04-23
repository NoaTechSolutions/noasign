import { CustomersSidebarProvider } from "./sidebar-context";

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return <CustomersSidebarProvider>{children}</CustomersSidebarProvider>;
}
