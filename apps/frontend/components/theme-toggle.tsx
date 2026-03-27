"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, SunMedium } from "lucide-react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";

type ThemeName = "light" | "dark";

export function ThemeToggle({
  className,
  duration = 400,
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
    const button = buttonRef.current;
    if (!button) {
      return;
    }

    const nextTheme: ThemeName = isDark ? "light" : "dark";
    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y),
    );

    const startViewTransition = (
      document as Document & {
        startViewTransition?: (callback: () => void) => {
          ready: Promise<void>;
        };
      }
    ).startViewTransition;

    if (typeof startViewTransition !== "function") {
      applyTheme(nextTheme);
      return;
    }

    const transition = startViewTransition.call(document, () => {
      flushSync(() => {
        applyTheme(nextTheme);
      });
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        applyTheme(nextTheme);
      });
  }, [applyTheme, duration, isDark]);

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
