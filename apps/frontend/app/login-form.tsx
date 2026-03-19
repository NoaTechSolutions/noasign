"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem("noasign.accessToken");

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

      window.localStorage.setItem("noasign.accessToken", data.accessToken);
      window.localStorage.setItem("noasign.user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("noasign-auth-change"));

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
    <div className="grid gap-6">
      <div className="grid gap-2">
        <span className="inline-flex w-fit items-center rounded-full border border-[color:var(--border-strong)] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--ink-soft)]">
          NoaSign Access
        </span>
        <h1 className="max-w-md text-balance text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)] sm:text-5xl">
          Sign in and keep document operations under control.
        </h1>
        <p className="max-w-lg text-base leading-7 text-[color:var(--ink-soft)] sm:text-lg">
          Start with contracts, quotes, invoices and billing visibility in one
          clean workspace built for service businesses in the U.S.
        </p>
      </div>

      <form
        className="grid gap-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_24px_80px_rgba(13,26,38,0.10)] backdrop-blur sm:p-7"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-1">
          <label
            className="text-sm font-medium text-[color:var(--ink)]"
            htmlFor="email"
          >
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="owner@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-13 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
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
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-13 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-base text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-soft)]"
            required
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#f2b79e] bg-[#fff1ea] px-4 py-3 text-sm text-[#8c3d1b]">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex h-13 items-center justify-center rounded-2xl bg-[color:var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing in..." : "Sign in to NoaSign"}
        </button>

        <div className="grid gap-3 rounded-2xl border border-dashed border-[color:var(--border)] bg-white/65 p-4 text-sm text-[color:var(--ink-soft)]">
          <div className="flex items-center justify-between gap-4">
            <span>Backend URL</span>
            <span className="font-medium text-[color:var(--ink)]">{API_URL}</span>
          </div>
          <p>
            Use an existing account from the backend. Registration flow and role
            management will follow in the next frontend pass.
          </p>
        </div>
      </form>
    </div>
  );
}
