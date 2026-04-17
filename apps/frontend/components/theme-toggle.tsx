"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

type ThemeName = "light" | "dark";

export function ThemeToggle({
  className,
}: {
  className?: string;
  duration?: number;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = resolvedTheme === "dark";
  const buttonClassName = mounted && !isDark
    ? "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#022977] bg-white text-[#022977] shadow-[0_10px_24px_rgba(2,41,119,0.12)] transition hover:bg-[#f5f8ff] hover:text-[#022977]"
    : "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-neutral-hover)] hover:text-[color:var(--text-primary)]";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const applyTheme = useCallback(
    (nextTheme: ThemeName) => {
      const root = document.documentElement;
      root.classList.toggle("dark", nextTheme === "dark");
      localStorage.setItem("theme", nextTheme);
      setTheme(nextTheme);
    },
    [setTheme],
  );

  const toggleTheme = useCallback(() => {
    applyTheme(isDark ? "light" : "dark");
  }, [applyTheme, isDark]);

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      suppressHydrationWarning
      className={[
        buttonClassName,
        className ?? "",
      ].join(" ").trim()}
      aria-label="Toggle theme"
    >
      {mounted && isDark ? (
        <SunMedium className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
