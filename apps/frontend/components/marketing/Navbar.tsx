"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useLang } from "./LangContext";
import { copy, t } from "../../lib/copy";

export function Navbar() {
  const { lang, setLang } = useLang();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const navStyle: React.CSSProperties = isDark
    ? {
        background: "#0f1628",
        borderBottom: "0.5px solid rgba(255,255,255,0.10)",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.32)" : "none",
      }
    : {
        background: "#ffffff",
        borderBottom: "0.5px solid rgba(2,41,119,0.15)",
        boxShadow: scrolled ? "0 4px 20px rgba(2,41,119,0.08)" : "none",
      };

  const linkColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(2,41,119,0.65)";

  return (
    <nav
      style={{ ...navStyle, position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)", transition: "box-shadow 0.2s" }}
    >
      <div
        style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 0 }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginRight: "auto" }}>
          <span
            style={{
              width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
              background: isDark ? "#05a5ff" : "#022977",
              color: isDark ? "#00183a" : "#fff",
              fontWeight: 500, fontSize: 13, flexShrink: 0,
            }}
          >
            N
          </span>
          <span style={{ fontWeight: 500, fontSize: 15, color: isDark ? "#f0f4ff" : "#022977" }}>NTSsign</span>
        </Link>

        {/* Center links — hidden on mobile */}
        <div className="hidden md:flex" style={{ gap: 28, marginRight: 28 }}>
          {[
            { label: t(copy.nav.howItWorks, lang), href: "/#como-funciona" },
            { label: t(copy.nav.pricing, lang), href: "/#precios" },
            { label: t(copy.nav.faq, lang), href: "/#faq" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{ fontSize: 13, color: linkColor, textDecoration: "none", fontWeight: 400, transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? "#fff" : "#022977")}
              onMouseLeave={(e) => (e.currentTarget.style.color = linkColor)}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Lang toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            style={{
              fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
              background: "transparent",
              border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(2,41,119,0.2)",
              color: isDark ? "rgba(255,255,255,0.55)" : "rgba(2,41,119,0.6)",
              transition: "all 0.15s",
            }}
          >
            {lang === "en" ? "ES" : "EN"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => mounted && setTheme(isDark ? "light" : "dark")}
            aria-label="Toggle theme"
            style={{
              width: 32, height: 32, borderRadius: 6, border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(2,41,119,0.15)",
              background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: isDark ? "rgba(255,255,255,0.6)" : "rgba(2,41,119,0.6)",
            }}
          >
            {mounted && isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Login ghost */}
          <a
            href="https://app.ntssign.com/login"
            style={{
              fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 8, textDecoration: "none",
              background: isDark ? "#0b0f1a" : "#ffffff",
              color: isDark ? "#05a5ff" : "#022977",
              border: isDark ? "2.5px solid #05a5ff" : "2.5px solid #022977",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "#05a5ff" : "#022977";
              e.currentTarget.style.color = isDark ? "#00183a" : "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? "#0b0f1a" : "#ffffff";
              e.currentTarget.style.color = isDark ? "#05a5ff" : "#022977";
            }}
          >
            {t(copy.nav.login, lang)}
          </a>

          {/* Request access primary */}
          <a
            href="https://app.ntssign.com/request-access"
            className="hidden sm:inline-flex"
            style={{
              fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 8, textDecoration: "none",
              background: isDark ? "#05a5ff" : "#022977",
              color: isDark ? "#00183a" : "#ffffff",
              border: "none", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "#33b8ff" : "#0400f0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? "#05a5ff" : "#022977"; }}
          >
            {t(copy.nav.cta, lang)}
          </a>
        </div>
      </div>
    </nav>
  );
}
