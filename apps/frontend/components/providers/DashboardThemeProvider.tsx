"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface DashboardThemeProviderProps {
  children: ReactNode;
}

// Standalone dashboard theme provider that drives the `data-theme` attribute
// directly. Lives alongside next-themes (which still drives `class="dark"`
// for login/landing) — the two systems coexist without sync. Dashboard
// components consume CSS tokens via `:root[data-theme="..."]` selectors.
const STORAGE_KEY = "ntssign-dashboard-theme";

export function DashboardThemeProvider({
  children,
}: DashboardThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const systemPreference = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches
      ? "dark"
      : "light";
    const initialTheme = stored ?? systemPreference;

    setThemeState(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    window.localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Avoid flash of unstyled content on first paint by deferring context
  // until after the effect runs. children are still rendered (no blank
  // page) — they just don't get the context value until mounted.
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(
      "useDashboardTheme must be used within DashboardThemeProvider",
    );
  }
  return context;
}
