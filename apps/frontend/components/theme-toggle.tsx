"use client";

import { useEffect, useRef, useState } from "react";
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

  // Smooth theme swap via the View Transition API (graceful fallback to
  // instant set on browsers without support — Firefox today). Computes the
  // toggle's center position and exposes it as CSS vars so the reveal
  // circle in app/globals.css expands from the actual button regardless of
  // viewport / layout. Falls back to the literal 96%/3.5% defaults baked
  // into the keyframes if no button is found.
  const handleThemeChange = (nextTheme: ThemeName) => {
    if (typeof document === "undefined" || !document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const button = document.querySelector("[data-theme-toggle]");
    if (button) {
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      document.documentElement.style.setProperty("--toggle-x", `${x}px`);
      document.documentElement.style.setProperty("--toggle-y", `${y}px`);
    }

    document.startViewTransition(() => {
      setTheme(nextTheme);
    });
  };

  return (
    <button
      type="button"
      ref={buttonRef}
      data-theme-toggle
      onClick={() => handleThemeChange(isDark ? "light" : "dark")}
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
