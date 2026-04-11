"use client";

import { useLang } from "./LangContext";
import { copy, t } from "../../lib/copy";

const TrustDot = () => (
  <span
    style={{
      display: "inline-block", width: 3, height: 3, borderRadius: "50%",
      background: "rgba(255,153,0,0.70)", verticalAlign: "middle", margin: "0 10px",
    }}
  />
);

export function CtaSection() {
  const { lang } = useLang();
  const trust = t(copy.cta.trust, lang);

  return (
    <section
      style={{
        background: "#022977",
        padding: "80px 20px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontSize: 22, fontWeight: 500, color: "#ffffff", marginBottom: 12,
          }}
        >
          {t(copy.cta.title, lang)}
        </h2>

        <p
          style={{
            fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 28,
          }}
        >
          {t(copy.cta.subtitle, lang)}
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
          {/* Amber primary */}
          <a
            href="https://app.ntssign.com/request-access"
            style={{
              fontSize: 14, fontWeight: 500, padding: "11px 26px", borderRadius: 8,
              textDecoration: "none", background: "#ff9900", color: "#ffffff",
              border: "none", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#cc7a00"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#ff9900"; }}
          >
            {t(copy.cta.primary, lang)}
          </a>

          {/* White outline secondary */}
          <a
            href="#precios"
            style={{
              fontSize: 14, fontWeight: 500, padding: "9px 24px", borderRadius: 8,
              textDecoration: "none", background: "transparent", color: "#ffffff",
              border: "2.5px solid #ffffff", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {t(copy.cta.secondary, lang)}
          </a>
        </div>

        {/* Trust line */}
        <p
          style={{
            fontSize: 11, color: "rgba(255,255,255,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 0,
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
