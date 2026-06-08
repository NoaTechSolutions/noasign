"use client";

import { Sun, Moon } from "lucide-react";
import { useDashboardTheme } from "@/components/providers/DashboardThemeProvider";

// Theme toggle for the new dashboard topbar. Uses CSS vars directly
// (via `var()`) instead of Tailwind classes because the new dashboard
// tokens aren't registered in tailwind.config yet.
export function ThemeToggle() {
  const { theme, toggleTheme } = useDashboardTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg border-[0.5px] bg-transparent inline-flex items-center justify-center transition-all duration-150"
      style={{
        borderColor: "var(--border-soft)",
        color: "var(--text-heading)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "var(--border-soft)";
      }}
      aria-label="Toggle theme"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-[18px] h-[18px]" />
      ) : (
        <Moon className="w-[18px] h-[18px]" />
      )}
    </button>
  );
}
