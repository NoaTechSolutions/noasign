"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../../../lib/api";

type Me = { id: string; role: string };

export default function FormDefinitionsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<Me>("/users/me")
      .then((me) => {
        if (cancelled) return;
        if (me.role !== "MASTER") {
          router.replace("/dashboard");
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (!cancelled) router.replace("/");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-400">
        Verifying access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-amber-400" />
            <span className="font-medium">Admin · Form Definitions</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-100 transition"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
