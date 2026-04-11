"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLang } from "./LangContext";
import { copy, t } from "../../lib/copy";

export function FeaturesSection() {
  const { lang } = useLang();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const items = t(copy.features.items, lang);

  return (
    <section
      style={{
        background: isDark ? "#0b0f1a" : "#ffffff",
        padding: "80px 20px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: 22, fontWeight: 500, textAlign: "center", marginBottom: 48,
            color: isDark ? "#f0f4ff" : "#022977",
          }}
        >
          {t(copy.features.title, lang)}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                background: isDark ? "#161d30" : "#f7f8fa",
                border: isDark ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(2,41,119,0.10)",
                borderRadius: 12,
                padding: "18px",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: isDark ? "rgba(5,165,255,0.12)" : "#e8eeff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {item.icon}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 14, fontWeight: 500, marginBottom: 6,
                    color: isDark ? "#f0f4ff" : "#022977",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 13, lineHeight: 1.65, margin: 0,
                    color: isDark ? "rgba(200,216,240,0.55)" : "rgba(2,41,119,0.60)",
                  }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
