"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLang } from "./LangContext";
import { copy, t } from "../../lib/copy";

const linkHrefs = [
  "#como-funciona",
  "#precios",
  "#faq",
  "mailto:support@noatechsolutions.com",
  "/privacy",
  "/terms",
];

export function Footer() {
  const { lang } = useLang();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const links = t(copy.footer.links, lang);

  return (
    <footer
      style={{
        background: isDark ? "#0f1628" : "#f0f4ff",
        padding: "48px 20px 36px",
      }}
    >
      <div
        style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 24, height: 24, borderRadius: 6,
              background: isDark ? "#05a5ff" : "#022977",
              color: isDark ? "#00183a" : "#fff",
              fontSize: 11, fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            N
          </span>
          <span
            style={{
              fontSize: 15, fontWeight: 500,
              color: isDark ? "#f0f4ff" : "#022977",
            }}
          >
            NTSsign
          </span>
        </div>

        {/* Links */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", justifyContent: "center" }}>
          {links.map((link, i) => (
            <a
              key={i}
              href={linkHrefs[i]}
              style={{
                fontSize: 12, textDecoration: "none",
                color: isDark ? "rgba(200,216,240,0.50)" : "rgba(2,41,119,0.60)",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? "#c8d8f0" : "#022977"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "rgba(200,216,240,0.50)" : "rgba(2,41,119,0.60)"; }}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Note */}
        <p
          style={{
            fontSize: 11, textAlign: "center", margin: 0,
            color: isDark ? "rgba(200,216,240,0.30)" : "rgba(2,41,119,0.35)",
          }}
        >
          A product by{" "}
          <a
            href="https://noatechsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            NTSolutions
          </a>
          {" · noatechsolutions.com · support@noatechsolutions.com"}
        </p>
      </div>
    </footer>
  );
}
