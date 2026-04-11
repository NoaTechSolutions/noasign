"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLang } from "./LangContext";
import { copy, t } from "../../lib/copy";

const Dot = ({ isDark }: { isDark: boolean }) => (
  <span
    style={{
      display: "inline-block", width: 4, height: 4, borderRadius: "50%",
      background: "#ff9900", verticalAlign: "middle", margin: "0 8px",
    }}
  />
);

const TrustDot = () => (
  <span
    style={{
      display: "inline-block", width: 3, height: 3, borderRadius: "50%",
      background: "#ff9900", verticalAlign: "middle", margin: "0 10px",
    }}
  />
);

export function HeroSection() {
  const { lang } = useLang();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const eyebrow = t(copy.hero.eyebrow, lang);
  const h1 = t(copy.hero.h1, lang);
  const subtitle = t(copy.hero.subtitle, lang);
  const trust = t(copy.hero.trust, lang);

  return (
    <section
      id="hero"
      style={{
        background: isDark ? "#0f1628" : "#f0f4ff",
        borderBottom: isDark ? "0.5px solid rgba(255,255,255,0.07)" : "none",
        padding: "80px 20px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
            color: isDark ? "#05a5ff" : "#022977",
            display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 0,
          }}
        >
          <Dot isDark={isDark} />
          {eyebrow.map((item, i) => (
            <span key={i}>
              {item}
              <Dot isDark={isDark} />
            </span>
          ))}
        </div>

        {/* H1 */}
        <h1
          style={{
            fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 500, lineHeight: 1.25,
            color: isDark ? "#f0f4ff" : "#022977",
            marginTop: 20, marginBottom: 0,
          }}
        >
          {h1.pre}
          <span style={{ color: "#ff9900" }}>{h1.accent}</span>
          {h1.post}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 14, lineHeight: 1.75, maxWidth: 420, margin: "16px auto 0",
            color: isDark ? "#c8d8f0" : "rgba(2,41,119,0.70)",
            whiteSpace: "pre-line",
          }}
        >
          {subtitle}
        </p>

        {/* CTAs */}
        <div
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}
        >
          <a
            href="https://app.ntssign.com/request-access"
            style={{
              fontSize: 14, fontWeight: 500, padding: "11px 26px", borderRadius: 8, textDecoration: "none",
              background: isDark ? "#05a5ff" : "#022977",
              color: isDark ? "#00183a" : "#ffffff",
              border: "none", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "#33b8ff" : "#0400f0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? "#05a5ff" : "#022977"; }}
          >
            {t(copy.hero.ctaPrimary, lang)}
          </a>
          <a
            href="#como-funciona"
            style={{
              fontSize: 14, fontWeight: 500, padding: "11px 26px", borderRadius: 8, textDecoration: "none",
              background: "#ff9900", color: "#ffffff",
              border: "none", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#cc7a00"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#ff9900"; }}
          >
            {t(copy.hero.ctaSecondary, lang)}
          </a>
        </div>

        {/* Trust line */}
        <p
          style={{
            fontSize: 12, marginTop: 20,
            color: isDark ? "rgba(5,165,255,0.70)" : "rgba(2,41,119,0.50)",
            display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 0,
          }}
        >
          {trust.map((item, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center" }}>
              {item}
              {i < trust.length - 1 && <TrustDot />}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
