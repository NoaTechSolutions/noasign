"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api-url";

type Props = {
  token: string | null;
  // Present once the document is COMPLETED; null while BoldSign's webhook is
  // still finalizing (a few seconds after signing).
  initialDownloadUrl: string | null;
};

/**
 * Download the signed copy. If the final PDF isn't ready yet (status not
 * COMPLETED at redirect time), softly poll the public endpoint until the
 * downloadUrl appears, then reveal the button — no manual refresh needed.
 */
export function DownloadSignedCopy({ token, initialDownloadUrl }: Props) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(
    initialDownloadUrl,
  );
  const ready = Boolean(downloadUrl);

  useEffect(() => {
    if (ready || !token) return;
    let active = true;
    let tries = 0;
    const MAX_TRIES = 20; // ~80s of polling, then give up (email still arrives)

    const poll = async () => {
      if (!active) return;
      tries += 1;
      try {
        const res = await fetch(
          `${API_URL}/public/signatures/${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as { downloadUrl?: string | null };
          if (active && data?.downloadUrl) {
            setDownloadUrl(data.downloadUrl);
            return;
          }
        }
      } catch {
        // ignore — retry below
      }
      if (active && tries < MAX_TRIES) {
        window.setTimeout(poll, 4000);
      }
    };

    const t = window.setTimeout(poll, 4000);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [ready, token]);

  if (downloadUrl) {
    return (
      <a
        href={downloadUrl}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#022977] px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(2,41,119,0.28)] transition hover:bg-[#0400f0] md:px-6 md:py-3.5 dark:bg-[#05a5ff] dark:text-[#00183a] dark:shadow-[0_8px_24px_rgba(5,165,255,0.32)] dark:hover:bg-[#33b8ff]"
      >
        <Download className="h-4 w-4" />
        Download your signed copy
      </a>
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 rounded-2xl border border-[rgba(2,41,119,0.2)] bg-white px-5 py-3 text-sm font-medium text-[rgba(2,41,119,0.7)] dark:border-[rgba(226,232,240,0.22)] dark:bg-[#0f1628] dark:text-[#c8d8f0]">
      <Loader2 className="h-4 w-4 animate-spin text-[rgba(2,41,119,0.5)] dark:text-[rgba(200,216,240,0.6)]" />
      Preparing your copy — we&apos;ll email it to you.
    </div>
  );
}
