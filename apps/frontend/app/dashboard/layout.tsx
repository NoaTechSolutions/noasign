"use client";

import { useEffect } from "react";
import { DashboardThemeProvider } from "../../components/providers/DashboardThemeProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove data-theme on unmount so /login and /landing aren't contaminated
  // with the new dashboard design tokens when the user navigates away.
  // DashboardThemeProvider re-sets it on mount of any dashboard route.
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, []);

  return (
    <DashboardThemeProvider>
      <div className="app-shell">{children}</div>
    </DashboardThemeProvider>
  );
}
