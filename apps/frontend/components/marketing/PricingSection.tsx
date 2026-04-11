"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLang } from "./LangContext";
import { copy, t } from "../../lib/copy";

type BillingCycle = "monthly" | "annual";

const plans = [
  {
    id: "pay-per-contract",
    nameKey: "Pay-per-contract",
    tagKey: { en: "Occasional", es: "Ocasional" },
    tagStyle: "neutral",
    priceMonthly: 12,
    priceAnnual: 12,
    perUnit: true,
    docs: { en: "1 credit", es: "1 crédito" },
    users: "1",
    templates: "—",
    historyDays: { en: "90-day history", es: "Historial 90 días" },
    overage: null,
    features: {
      en: ["PDF + audit trail", "90-day history"],
      es: ["PDF + audit trail", "Historial 90 días"],
    },
    popular: false,
    buttonStyle: "ghost",
  },
  {
    id: "starter",
    nameKey: "Starter",
    tagKey: { en: "Getting started", es: "Arranque" },
    tagStyle: "neutral",
    priceMonthly: 19,
    priceAnnual: 16,
    perUnit: false,
    docs: { en: "5 docs/mo", es: "5 docs/mes" },
    users: "1",
    templates: "1",
    historyDays: { en: "1-year history", es: "Historial 1 año" },
    overage: { en: "$4/doc", es: "$4/doc" },
    features: {
      en: ["Full dashboard", "Company profile + logo", "Auto reminders", "1-year history"],
      es: ["Dashboard completo", "Perfil empresa + logo", "Reminders automáticos", "Historial 1 año"],
    },
    popular: false,
    buttonStyle: "ghost",
  },
  {
    id: "launch",
    nameKey: "Launch",
    tagKey: { en: "Most popular", es: "Más popular" },
    tagStyle: "popular",
    priceMonthly: 39,
    priceAnnual: 32,
    perUnit: false,
    docs: { en: "15 docs/mo", es: "15 docs/mes" },
    users: "2",
    templates: "3",
    historyDays: { en: "2-year history", es: "Historial 2 años" },
    overage: { en: "$3.50/doc", es: "$3.50/doc" },
    features: {
      en: ["Everything in Starter", "Team & role management", "Multi-signer", "2-year history"],
      es: ["Todo lo de Starter", "Gestión de equipo y roles", "Multi-firmante", "Historial 2 años"],
    },
    popular: true,
    buttonStyle: "primary",
  },
  {
    id: "pro",
    nameKey: "Pro",
    tagKey: { en: "Growth", es: "Crecimiento" },
    tagStyle: "growth",
    priceMonthly: 89,
    priceAnnual: 74,
    perUnit: false,
    docs: { en: "50 docs/mo", es: "50 docs/mes" },
    users: "5",
    templates: "10",
    historyDays: { en: "3-year history", es: "Historial 3 años" },
    overage: { en: "$2.50/doc", es: "$2.50/doc" },
    features: {
      en: ["Everything in Launch", "Custom branding", "Analytics", "Bulk send"],
      es: ["Todo lo de Launch", "Branding personalizado", "Analytics", "Bulk send"],
    },
    popular: false,
    buttonStyle: "ghost",
  },
  {
    id: "scale",
    nameKey: "Scale",
    tagKey: { en: "High volume", es: "Alto volumen" },
    tagStyle: "scale",
    priceMonthly: 229,
    priceAnnual: 190,
    perUnit: false,
    docs: { en: "150 docs/mo", es: "150 docs/mes" },
    users: "15",
    templates: "∞",
    historyDays: { en: "5-year history", es: "Historial 5 años" },
    overage: { en: "$1.50/doc", es: "$1.50/doc" },
    features: {
      en: ["Everything in Pro", "Priority support", "Bulk ZIP export", "5-year history"],
      es: ["Todo lo de Pro", "Soporte prioritario", "Export ZIP masivo", "Historial 5 años"],
    },
    popular: false,
    buttonStyle: "ghost",
  },
];

function tagStyles(tagStyle: string, isDark: boolean) {
  if (tagStyle === "popular") {
    return { background: isDark ? "#05a5ff" : "#022977", color: isDark ? "#00183a" : "#fff" };
  }
  if (tagStyle === "growth") {
    return { background: isDark ? "rgba(255,153,0,0.15)" : "#fff3e0", color: isDark ? "#ffb84d" : "#b36b00" };
  }
  if (tagStyle === "scale") {
    return { background: isDark ? "rgba(138,43,226,0.15)" : "#f3e8ff", color: isDark ? "#c084fc" : "#6b00b3" };
  }
  return { background: isDark ? "rgba(5,165,255,0.12)" : "#e8eeff", color: isDark ? "#7dcfff" : "#022977" };
}

export function PricingSection() {
  const { lang } = useLang();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const isAnnual = cycle === "annual";

  return (
    <section
      id="precios"
      style={{ background: isDark ? "#0f1628" : "#f0f4ff", padding: "80px 20px" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: 22, fontWeight: 500, textAlign: "center", marginBottom: 24,
            color: isDark ? "#f0f4ff" : "#022977",
          }}
        >
          {t(copy.pricing.title, lang)}
        </h2>

        {/* Monthly / Annual toggle */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 40 }}>
          {(["monthly", "annual"] as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              style={{
                fontSize: 13, fontWeight: 500, padding: "6px 16px", borderRadius: 20, cursor: "pointer",
                border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(2,41,119,0.2)",
                background: cycle === c
                  ? isDark ? "#05a5ff" : "#022977"
                  : "transparent",
                color: cycle === c
                  ? isDark ? "#00183a" : "#fff"
                  : isDark ? "rgba(255,255,255,0.55)" : "rgba(2,41,119,0.60)",
                transition: "all 0.15s",
              }}
            >
              {c === "monthly" ? t(copy.pricing.monthly, lang) : t(copy.pricing.annual, lang)}
              {c === "annual" && (
                <span
                  style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 500, padding: "1px 6px",
                    borderRadius: 10, background: "#ff9900", color: "#fff",
                  }}
                >
                  {t(copy.pricing.saveBadge, lang)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            alignItems: "end",
          }}
        >
          {plans.map((plan) => {
            const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;
            const isPopular = plan.popular;
            const features = t(plan.features, lang);
            const docs = t(plan.docs, lang);
            const overage = plan.overage ? t(plan.overage, lang) : null;
            const tagLabel = t(plan.tagKey, lang);
            const tagStyle = tagStyles(plan.tagStyle, isDark);

            const cardStyle: React.CSSProperties = isPopular
              ? {
                  background: isDark ? "#0a1a3a" : "#ffffff",
                  border: isDark ? "2.5px solid #05a5ff" : "2.5px solid #022977",
                  borderRadius: 12,
                  padding: "22px 18px",
                  transform: "translateY(-4px)",
                  position: "relative",
                }
              : {
                  background: isDark ? "#161d30" : "#f7f8fa",
                  border: isDark ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(2,41,119,0.10)",
                  borderRadius: 12,
                  padding: "22px 18px",
                  position: "relative",
                };

            return (
              <div key={plan.id} style={cardStyle}>
                {/* Tag */}
                <span
                  style={{
                    ...tagStyle,
                    fontSize: 10, fontWeight: 500, padding: "3px 10px",
                    borderRadius: 20, display: "inline-block", marginBottom: 12,
                  }}
                >
                  {tagLabel}
                </span>

                {/* Plan name */}
                <div style={{ fontSize: 17, fontWeight: 500, color: isDark ? "#f0f4ff" : "#022977", marginBottom: 4 }}>
                  {plan.nameKey}
                </div>

                {/* Price */}
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 500, color: isDark ? "#f0f4ff" : "#022977" }}>
                    ${price}
                  </span>
                  <span style={{ fontSize: 12, color: isDark ? "rgba(200,216,240,0.5)" : "rgba(2,41,119,0.45)" }}>
                    {plan.perUnit
                      ? t(copy.pricing.perDoc, lang)
                      : t(copy.pricing.perMonth, lang)}
                  </span>
                </div>

                {/* Overage badge */}
                {overage && (
                  <div
                    style={{
                      fontSize: 10, fontWeight: 500, padding: "3px 7px", borderRadius: 5,
                      background: isDark ? "rgba(5,165,255,0.10)" : "#e8eeff",
                      color: isDark ? "#7dcfff" : "#022977",
                      display: "inline-block", marginBottom: 14,
                    }}
                  >
                    {t(copy.pricing.extra, lang)}: {overage}
                  </div>
                )}
                {!overage && <div style={{ marginBottom: 14 }} />}

                {/* Key metrics */}
                <div
                  style={{
                    fontSize: 12, color: isDark ? "rgba(200,216,240,0.55)" : "rgba(2,41,119,0.55)",
                    marginBottom: 16, lineHeight: 1.8,
                  }}
                >
                  <div>📄 {docs}</div>
                  <div>👤 {plan.users} {t(copy.pricing.users, lang)}</div>
                  <div>📋 {plan.templates} {t(copy.pricing.templates, lang)}</div>
                </div>

                {/* Features */}
                <ul style={{ margin: 0, padding: 0, listStyle: "none", marginBottom: 20 }}>
                  {features.map((f, fi) => (
                    <li
                      key={fi}
                      style={{
                        fontSize: 12, lineHeight: 1.7, color: isDark ? "rgba(200,216,240,0.75)" : "rgba(2,41,119,0.70)",
                        display: "flex", gap: 6, alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: isDark ? "#05a5ff" : "#022977", marginTop: 1, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <a
                  href="https://app.ntssign.com/request-access"
                  style={
                    plan.buttonStyle === "primary"
                      ? {
                          display: "block", textAlign: "center", textDecoration: "none",
                          fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 8,
                          background: isDark ? "#05a5ff" : "#022977",
                          color: isDark ? "#00183a" : "#ffffff",
                          border: "none", transition: "background 0.15s",
                        }
                      : {
                          display: "block", textAlign: "center", textDecoration: "none",
                          fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 8,
                          background: isDark ? "#0b0f1a" : "#ffffff",
                          color: isDark ? "#05a5ff" : "#022977",
                          border: isDark ? "2px solid #05a5ff" : "2px solid #022977",
                          transition: "all 0.15s",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (plan.buttonStyle === "primary") {
                      e.currentTarget.style.background = isDark ? "#33b8ff" : "#0400f0";
                    } else {
                      e.currentTarget.style.background = isDark ? "#05a5ff" : "#022977";
                      e.currentTarget.style.color = isDark ? "#00183a" : "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.buttonStyle === "primary") {
                      e.currentTarget.style.background = isDark ? "#05a5ff" : "#022977";
                    } else {
                      e.currentTarget.style.background = isDark ? "#0b0f1a" : "#ffffff";
                      e.currentTarget.style.color = isDark ? "#05a5ff" : "#022977";
                    }
                  }}
                >
                  {t(copy.pricing.cta, lang)}
                </a>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <p
          style={{
            fontSize: 12, textAlign: "center", marginTop: 28,
            color: isDark ? "rgba(200,216,240,0.45)" : "rgba(2,41,119,0.50)",
          }}
        >
          {t(copy.pricing.note, lang)}
        </p>
      </div>
    </section>
  );
}
