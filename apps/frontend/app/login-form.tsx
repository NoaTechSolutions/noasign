"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { API_URL } from "../lib/api";
import { getStoredToken, persistSession } from "../lib/auth-storage";

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    companyProfileId: string | null;
    email: string;
    role: string;
    status: string;
  };
  message: string;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStoredToken();

    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await response.json()) as Partial<LoginResponse> & {
        message?: string;
      };

      if (!response.ok || !data.accessToken || !data.user) {
        throw new Error(data.message ?? "Unable to sign in");
      }

      persistSession(data.accessToken, data.user);

      startTransition(() => {
        router.push("/dashboard");
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6 md:max-w-[30rem] md:gap-8 xl:max-w-md">
      <div className="grid justify-items-center gap-3 text-center md:gap-4">
        <div className="inline-flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--brand-secondary)] text-base font-bold tracking-[-0.04em] text-white shadow-[var(--shadow-medium)]">
            N
          </span>
          <div>
            <div className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--brand-secondary)]">
              NTSsign
            </div>
            <div className="text-sm text-[color:var(--text-secondary)]">
              Contract workflow platform
            </div>
          </div>
        </div>
      </div>

      <form
        className="grid gap-5 bg-transparent p-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--border-strong)] sm:bg-[image:var(--bg-form)] sm:p-6 sm:shadow-[var(--shadow-medium)] md:p-7 lg:p-8"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-1">
          <label
            className="text-sm font-medium text-[color:var(--ink)]"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="owner@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-13 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-base text-[color:var(--ink)] outline-none transition focus:border-[color:var(--brand-accent)] focus:ring-4 focus:ring-[color:var(--brand-accent-soft)]"
            required
          />
        </div>

        <div className="grid gap-1">
          <label
            className="text-sm font-medium text-[color:var(--ink)]"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-13 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 pr-12 text-base text-[color:var(--ink)] outline-none transition focus:border-[color:var(--brand-accent)] focus:ring-4 focus:ring-[color:var(--brand-accent-soft)]"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-surface)] hover:text-[color:var(--text-primary)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4.5 w-4.5" />
              ) : (
                <Eye className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 text-sm text-[color:var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--border-strong)] text-[color:var(--brand-accent)] focus:ring-[color:var(--brand-accent-soft)]"
            />
            <span>Remember me</span>
          </label>
          <button
            type="button"
            className="text-left font-medium text-[color:var(--brand-accent)] hover:text-[color:var(--brand-accent-strong)] sm:text-right"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex h-13 items-center justify-center rounded-2xl bg-[color:var(--button-primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-strong)] transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <button
          type="button"
          className="inline-flex h-13 items-center justify-center rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--button-neutral)] px-5 text-sm font-semibold text-[color:var(--brand-secondary)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-neutral-hover)]"
        >
          Create account
        </button>

        <a
          href="https://noatechsolutions.com/"
          target="_blank"
          rel="noreferrer"
          className="text-center text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:text-[color:var(--brand-secondary)]"
        >
          Created by{" "}
          <span className="text-[color:var(--brand-secondary)]">
            NoaTechSolutions
          </span>
        </a>
      </form>
    </div>
  );
}
