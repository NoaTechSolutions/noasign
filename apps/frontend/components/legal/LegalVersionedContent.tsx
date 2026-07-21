"use client";

import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { API_URL } from "../../lib/api-url";

// The shape the public GET /legal/:docType/active endpoint returns for a
// servable version. `content` is raw markdown (the exact text the acceptance
// popup asks the user to accept).
interface ActiveLegalVersion {
  docType: string;
  version: string;
  contentHash: string;
  content: string;
  publishedAt: string | null;
  isDraft: boolean;
}

interface LegalVersionedContentProps {
  docType: "TERMS" | "PRIVACY";
  // The interim, hand-written page. Rendered server-side (SEO + static export)
  // AND kept as the fallback whenever the DB has no servable active version —
  // so a "read the Terms" link is NEVER dead.
  fallback: ReactNode;
}

/**
 * Wires /terms and /privacy to the EXACT active version stored in the DB — the
 * one the acceptance popup asks the user to accept ("copy cannot lie"). It is a
 * progressive enhancement:
 *
 * - Server-renders the static `fallback` first → works in the SiteGround static
 *   export (ntssign.com) and for SEO/crawlers, and never shows a blank page.
 * - On mount, fetches the active version. If one is servable, it swaps in the
 *   DB markdown (same origin styles apply — it renders inside `.legal-content`).
 * - If the fetch fails or 404s (no active version, e.g. before the lawyer
 *   publishes one), it silently keeps the static fallback.
 *
 * Public content only → a plain fetch WITHOUT credentials, so the cross-origin
 * call from the static landing does not require CORS credential allow-listing.
 */
export function LegalVersionedContent({
  docType,
  fallback,
}: LegalVersionedContentProps) {
  const [version, setVersion] = useState<ActiveLegalVersion | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/legal/${docType}/active`, {
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ActiveLegalVersion | null) => {
        if (
          active &&
          data &&
          typeof data.content === "string" &&
          data.content.trim() !== ""
        ) {
          setVersion(data);
        }
      })
      .catch(() => {
        // Keep the static fallback — never blank out a legal page on a
        // transient error.
      });
    return () => {
      active = false;
    };
  }, [docType]);

  if (!version) {
    return <div className="legal-content">{fallback}</div>;
  }

  const publishedLabel = version.publishedAt
    ? new Date(version.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // The DB markdown carries its own top-level heading, so we do not add another.
  return (
    <div className="legal-content">
      <p className="legal-meta">
        Version {version.version}
        {publishedLabel ? ` · ${publishedLabel}` : ""}
      </p>
      <div className="legal-markdown">
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
          {version.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
