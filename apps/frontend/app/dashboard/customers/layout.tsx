// Pass-through layout for /dashboard/customers/*. The parent /dashboard/layout.tsx
// already provides ThemeProvider and the app-shell wrapper; this file exists so
// the customers module owns its route segment explicitly and can host
// customers-scoped metadata / error boundaries in the future.
export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
