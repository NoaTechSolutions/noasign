"use client";

import { useEffect } from "react";
import { ThemeProvider } from "../../components/theme-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sync class="dark" (next-themes legacy) with data-theme attribute (new
  // design tokens). Lets old components keep using `.dark` selector while
  // new components consume `:root[data-theme="..."]` tokens.
  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light",
      );
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      // Remove data-theme on unmount so /login and /landing aren't
      // contaminated with the new dashboard design tokens when the
      // user navigates away.
      document.documentElement.removeAttribute("data-theme");
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <div className="app-shell">{children}</div>
    </ThemeProvider>
  );
}
