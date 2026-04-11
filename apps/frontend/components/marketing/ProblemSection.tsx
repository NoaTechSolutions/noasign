"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLang } from "./LangContext";
import { copy, t } from "../../lib/copy";

export function ProblemSection() {
  const { lang } = useLang();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const items = t(copy.problem.items, lang);

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
          {t(copy.problem.title, lang)}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
                padding: "24px 20px",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
              <h3
                style={{
                  fontSize: 15, fontWeight: 500, marginBottom: 8,
                  color: isDark ? "#f0f4ff" : "#022977",
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 13, lineHeight: 1.7, margin: 0,
                  color: isDark ? "rgba(200,216,240,0.60)" : "rgba(2,41,119,0.65)",
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
