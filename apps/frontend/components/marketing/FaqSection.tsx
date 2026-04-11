"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLang } from "./LangContext";

const faq = {
  en: [
    { q: "Does my client need to create an account to sign?", a: "No. They receive a link by email and sign directly from their browser. No registration, no downloads." },
    { q: "Is the electronic signature legally valid?", a: "Yes. Every signature complies with the ESIGN Act (US) and includes a full audit trail — IP address, timestamp, and device record." },
    { q: "Can I use my existing contract?", a: "Yes. We adapt it into NTSsign as part of the template setup service (from $49)." },
    { q: "What happens if my client doesn't sign?", a: "NTSsign sends automatic reminders. You can also track the document status from your dashboard in real time." },
    { q: "Can I cancel anytime?", a: "Yes. No long-term contracts. Cancel from your account settings whenever you want." },
  ],
  es: [
    { q: "¿Mi cliente necesita crear una cuenta para firmar?", a: "No. Recibe un link por email y firma directamente desde su navegador. Sin registro, sin descargas." },
    { q: "¿La firma electrónica tiene validez legal?", a: "Sí. Cada firma cumple con el ESIGN Act (EE.UU.) e incluye un audit trail completo — IP, timestamp y dispositivo." },
    { q: "¿Puedo usar mi contrato actual?", a: "Sí. Lo adaptamos a NTSsign como parte del servicio de template setup (desde $49)." },
    { q: "¿Qué pasa si mi cliente no firma?", a: "NTSsign envía reminders automáticos. También podés ver el estado del documento en tu dashboard en tiempo real." },
    { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Sin contratos de largo plazo. Cancelás desde la configuración de tu cuenta cuando quieras." },
  ],
};

export function FaqSection() {
  const { lang } = useLang();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const items = faq[lang];

  return (
    <section
      id="faq"
      style={{ background: isDark ? "#0b0f1a" : "#ffffff", padding: "80px 20px" }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h2
          style={{
            fontSize: 22, fontWeight: 500, textAlign: "center", marginBottom: 40,
            color: isDark ? "#f0f4ff" : "#022977",
          }}
        >
          FAQ
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                background: isDark ? "#161d30" : "#f7f8fa",
                border: isDark ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(2,41,119,0.10)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", textAlign: "left", padding: "16px 18px",
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 14, fontWeight: 500,
                    color: isDark ? "#f0f4ff" : "#022977",
                  }}
                >
                  {item.q}
                </span>
                <span
                  style={{
                    fontSize: 16, color: isDark ? "#05a5ff" : "#022977",
                    transform: open === i ? "rotate(45deg)" : "none",
                    transition: "transform 0.15s", flexShrink: 0,
                  }}
                >
                  +
                </span>
              </button>

              {open === i && (
                <div
                  style={{
                    padding: "0 18px 16px",
                    fontSize: 13, lineHeight: 1.7,
                    color: isDark ? "rgba(200,216,240,0.65)" : "rgba(2,41,119,0.65)",
                  }}
                >
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
