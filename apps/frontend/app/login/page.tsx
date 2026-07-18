"use client";

import { LoginPanel } from "../../components/login-panel";
import { ThemeToggle } from "../../components/theme-toggle";
import { LoginForm } from "./login-form";

/**
 * Login shell.
 *
 * Layout reference: designer's `login/login.html`.
 *   · Phone (≤480px)        →  form only, no panel
 *   · Tablet (481-1023px)   →  form + form-header, no panel
 *   · Laptop (1024-1599px)  →  split 50/50 (panel | form)
 *   · Desktop (≥1600px)     →  split 55/45 (panel | form)
 *
 * The brand panel (left column on ≥1024px) lives in `login-panel.tsx`.
 * The form card and its 5 views (login, createAccount, forgotPassword,
 * forcePasswordChange, resetPassword) live in `login-form.tsx`.
 */
export default function Home() {
  return (
    <div
      className="grid min-h-[100dvh] min-h-screen grid-rows-[1fr_auto] lg:grid-cols-[1fr_1fr] lg:grid-rows-1 xl:grid-cols-[55fr_45fr]"
      style={{ background: "var(--bg-page)" }}
    >
      {/* Floating theme toggle (top-right, above everything) */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-end p-5">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* LEFT (laptop+): brand panel */}
      <LoginPanel />

      {/* RIGHT: form column (stage + footer share this column on laptop+) */}
      <div className="flex min-h-[100dvh] flex-col lg:min-h-0">
        <main
          role="main"
          className="grid flex-1 place-items-center px-5 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12 xl:px-8 xl:py-16"
        >
          <section className="flex w-full flex-col items-center">
            <LoginForm />
          </section>
        </main>

        <footer
          className="flex flex-wrap items-center justify-center gap-3 px-5 pb-6 pt-4 text-[11px] font-normal leading-[1.5] sm:pb-7 sm:text-[12px] lg:px-8 lg:pb-8"
          style={{ color: "rgba(2, 41, 119, 0.35)" }}
        >
          <span>© 2026 NoaTechSolutions</span>
          <span
            aria-hidden
            className="h-[3px] w-[3px] rounded-full opacity-50"
            style={{ background: "currentColor" }}
          />
          <a href="/privacy" className="text-inherit transition hover:text-[color:var(--text-primary)]">
            Privacy
          </a>
          <span
            aria-hidden
            className="h-[3px] w-[3px] rounded-full opacity-50"
            style={{ background: "currentColor" }}
          />
          <a href="/terms" className="text-inherit transition hover:text-[color:var(--text-primary)]">
            Terms
          </a>
          <span
            aria-hidden
            className="h-[3px] w-[3px] rounded-full opacity-50"
            style={{ background: "currentColor" }}
          />
          <a href="#help" className="text-inherit transition hover:text-[color:var(--text-primary)]">
            Help
          </a>
        </footer>
      </div>
    </div>
  );
}
