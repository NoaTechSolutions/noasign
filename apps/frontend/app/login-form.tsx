"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="mx-auto grid w-full max-w-md gap-6">
      <div className="grid gap-2">
        <span className="inline-flex w-fit items-center rounded-full border border-[#dce8ff] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5d7391] shadow-[0_10px_24px_rgba(54,102,181,0.08)]">
          NoaSign Access
        </span>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ink)] sm:text-4xl">
          Log in
        </h1>
        <p className="max-w-sm text-sm leading-6 text-[color:var(--ink-soft)]">
          Sign in to continue to your workspace.
        </p>
      </div>

      <form
        className="grid gap-4 rounded-[2rem] border border-[#e2ebff] bg-white p-5 shadow-[0_24px_80px_rgba(59,100,176,0.12)] sm:p-7"
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
            className="h-13 rounded-2xl border border-[#dbe5f8] bg-[#fbfdff] px-4 text-base text-[color:var(--ink)] outline-none transition focus:border-[#2a6af2] focus:ring-4 focus:ring-[#d8e6ff]"
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
            className="h-13 rounded-2xl border border-[#dbe5f8] bg-[#fbfdff] px-4 text-base text-[color:var(--ink)] outline-none transition focus:border-[#2a6af2] focus:ring-4 focus:ring-[#d8e6ff]"
            required
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#ffd2c1] bg-[#fff4ef] px-4 py-3 text-sm text-[#9b4620]">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 text-sm text-[#7b8ea8]">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#c9d8f5] text-[#2a6af2] focus:ring-[#d8e6ff]"
            />
            <span>Remember me</span>
          </label>
          <span className="text-[#2a6af2]">Need help?</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex h-13 items-center justify-center rounded-2xl bg-[#1d62f0] px-5 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(29,98,240,0.22)] transition hover:bg-[#1252d9] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="grid gap-2 rounded-2xl border border-dashed border-[#dce6f7] bg-[#f8fbff] p-4 text-sm text-[#6e7f95]">
          <p>Use an existing backend account to enter the app.</p>
        </div>
      </form>
    </div>
  );
}
