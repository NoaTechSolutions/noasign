"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { LoginHeroCarousel } from "../components/login-hero-carousel";
import { ThemeToggle } from "../components/theme-toggle";
import { LoginForm } from "./login-form";

export default function Home() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const shellClassName = isDark
    ? "relative grid h-full w-full overflow-hidden bg-transparent shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--border-strong)] sm:bg-[image:var(--bg-shell-inner)] sm:shadow-[var(--shadow-strong)] md:grid-cols-[1fr_1fr] xl:grid-cols-[1.05fr_0.95fr]"
    : "relative grid h-full w-full overflow-hidden bg-transparent shadow-none sm:rounded-[2rem] sm:border sm:border-[#022977] sm:bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] sm:shadow-[0_26px_80px_rgba(2,41,119,0.18)] md:grid-cols-[1fr_1fr] xl:grid-cols-[1.05fr_0.95fr]";
  const leftPanelClassName = isDark
    ? "relative hidden min-h-[24rem] border-r border-[color:var(--border-strong)] bg-[#0b1220] md:block md:h-full md:min-h-0"
    : "relative hidden min-h-[24rem] border-r border-[#022977] bg-white md:block md:h-full md:min-h-0";
  const leftPanelOverlayClassName = isDark
    ? "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(5,165,255,0.08),transparent_26%),radial-gradient(circle_at_85%_18%,rgba(2,41,119,0.18),transparent_22%),linear-gradient(180deg,rgba(11,18,32,0.94),rgba(15,23,42,0.98))]"
    : "absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.98))]";

  return (
    <main className="relative h-screen overflow-hidden bg-[color:var(--background)] px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,var(--bg-page)_0%,var(--bg-page-subtle)_52%,var(--bg-surface)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(5,165,255,0.08),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(2,41,119,0.06),_transparent_18%),linear-gradient(135deg,rgba(5,165,255,0.02),transparent_35%)]" />
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] w-full max-w-7xl items-center justify-center bg-transparent p-0 sm:h-[calc(100vh-2rem)] sm:p-3 md:h-screen md:py-[19vh] lg:h-[calc(100vh-3rem)] lg:p-5">
        <div className={shellClassName}>
          <div className="absolute right-4 top-4 z-20 md:right-5 md:top-5">
            <ThemeToggle />
          </div>

          <section className={leftPanelClassName}>
            <div className={leftPanelOverlayClassName} />
            <LoginHeroCarousel />
          </section>

          <section className="relative flex h-full min-h-0 items-center overflow-hidden bg-transparent px-4 py-4 sm:bg-[image:var(--bg-form)] sm:p-5 md:px-5 md:py-5 lg:px-7 lg:py-6">
            <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(5,165,255,0.03),transparent)]" />
            <div className="mx-auto grid w-full max-w-md gap-4 md:max-w-none md:gap-4">
              <LoginForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
