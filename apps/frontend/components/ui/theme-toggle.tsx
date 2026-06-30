"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsHydrated } from "@/lib/use-is-hydrated";

const themeLabels = {
  light: { icon: "☀️", label: "Light" },
  dark: { icon: "🌙", label: "Dark" },
  system: { icon: "💻", label: "System" },
} as const;

type ThemeKey = keyof typeof themeLabels;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useIsHydrated();

  if (!mounted) return null;

  const currentTheme = (theme || "system") as ThemeKey;

  // View Transition API for smooth theme swap. Falls back to instant set
  // on browsers without support (Firefox today). The matching keyframes
  // live in app/globals.css.
  const handleThemeChange = (next: ThemeKey) => {
    if (typeof document === "undefined" || !document.startViewTransition) {
      setTheme(next);
      setIsOpen(false);
      return;
    }
    document.startViewTransition(() => {
      setTheme(next);
      setIsOpen(false);
    });
  };

  return (
    <div className="fixed top-5 left-5 z-[1000]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-[10px] border-[1.5px] px-4 py-2.5",
          "bg-white/95 dark:bg-[color:var(--bg-elevated)]",
          "border-[color:var(--border)]",
          "shadow-[var(--shadow-soft)]",
          "backdrop-blur-[10px]",
          "transition-all hover:bg-white dark:hover:bg-[color:var(--bg-surface-strong)]",
        )}
      >
        <span className="text-base">{themeLabels[currentTheme].icon}</span>
        <span className="text-sm font-medium">{themeLabels[currentTheme].label}</span>
        <svg
          className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-[999]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              "absolute left-0 top-[calc(100%+8px)] z-[1001]",
              "min-w-[140px] rounded-[10px] border-[1.5px] p-1.5",
              "bg-[color:var(--menu-bg)]",
              "border-[color:var(--menu-border)]",
              "shadow-[var(--shadow-dropdown)]",
              "animate-in fade-in slide-in-from-top-2 duration-200",
            )}
          >
            {(Object.keys(themeLabels) as ThemeKey[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleThemeChange(t)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                  "text-[color:var(--menu-text)]",
                  "transition-colors",
                  "hover:bg-[color:var(--menu-hover)]",
                  currentTheme === t &&
                    "bg-[color:var(--menu-active)] text-[color:var(--brand-accent-strong)] dark:text-[color:var(--brand-accent)] font-medium",
                )}
              >
                <span className="text-base">{themeLabels[t].icon}</span>
                <span>{themeLabels[t].label}</span>
                {currentTheme === t ? (
                  <span className="ml-auto text-[color:var(--brand-accent-strong)] dark:text-[color:var(--brand-accent)]">✓</span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
