"use client";

import { useState } from "react";
import { useLang } from "./LandingContext";
import { APP_URL } from "../../lib/app-url";
import { PricingSection } from "./PricingSection";

const copy = {
  en: {
    hero_h: "Simple, transparent pricing",
    hero_s: "Start free. Scale as you grow. No hidden fees.",
    faq_h: "Pricing FAQ",
    cta_h: "Ready to get started?",
    cta_btn: "Start your free trial \u2192",
    faqs: [
      { q: "Can I change plans anytime?", a: "Yes, you can upgrade or downgrade at any time. Changes take effect on your next billing cycle." },
      { q: "Is there a free trial?", a: "Yes, new accounts get 2 free documents to test the platform." },
      { q: "What payment methods do you accept?", a: "We accept all major credit cards via Stripe." },
      { q: "Is my data secure?", a: "Yes, all documents are encrypted and stored securely in the US." },
      { q: "Do signers need an account?", a: "No, signers receive a link and sign directly from their browser." },
    ],
  },
  es: {
    hero_h: "Precios simples y transparentes",
    hero_s: "Empieza gratis. Crece a tu ritmo. Sin costos ocultos.",
    faq_h: "Preguntas frecuentes sobre precios",
    cta_h: "\u00bfListo para empezar?",
    cta_btn: "Inicia tu prueba gratis \u2192",
    faqs: [
      { q: "\u00bfPuedo cambiar de plan en cualquier momento?", a: "S\u00ed, puedes cambiar tu plan en cualquier momento." },
      { q: "\u00bfHay una prueba gratuita?", a: "S\u00ed, las cuentas nuevas tienen 2 documentos gratis para probar la plataforma." },
      { q: "\u00bfQu\u00e9 m\u00e9todos de pago aceptan?", a: "Aceptamos todas las tarjetas de cr\u00e9dito principales via Stripe." },
      { q: "\u00bfMis datos est\u00e1n seguros?", a: "S\u00ed, todos los documentos est\u00e1n encriptados y almacenados de forma segura en EE.UU." },
      { q: "\u00bfLos firmantes necesitan una cuenta?", a: "No, los firmantes reciben un link y firman directamente desde su navegador." },
    ],
  },
} as const;

export function PricingPageContent() {
  const { lang } = useLang();
  const t = copy[lang];
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <>
      {/* Hero */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="wrap" style={{ textAlign: "center" }}>
          <h1 className="sh1">{t.hero_h}</h1>
          <p className="ssub" style={{ maxWidth: "34rem", margin: "0 auto" }}>{t.hero_s}</p>
        </div>
      </section>

      {/* Pricing cards (existing component) */}
      <PricingSection />

      {/* FAQ */}
      <section className="section sec-alt" id="pricing-faq">
        <div className="wrap">
          <h2 className="sh2" style={{ textAlign: "center", marginBottom: "2rem" }}>{t.faq_h}</h2>
          <div className="faq-cols">
            <div className="faq-col">
              {t.faqs.slice(0, 3).map((faq, i) => (
                <div className="faq-item" key={i}>
                  <button
                    className={`faq-q${openIdx === i ? " open" : ""}`}
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  >
                    <span className="faq-q-text">{faq.q}</span>
                    <span className="faq-chevron" aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                  <div className="faq-a" style={{ display: openIdx === i ? "block" : "none" }}>
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="faq-col">
              {t.faqs.slice(3).map((faq, i) => {
                const idx = i + 3;
                return (
                  <div className="faq-item" key={idx}>
                    <button
                      className={`faq-q${openIdx === idx ? " open" : ""}`}
                      onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                    >
                      <span className="faq-q-text">{faq.q}</span>
                      <span className="faq-chevron" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none">
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                    <div className="faq-a" style={{ display: openIdx === idx ? "block" : "none" }}>
                      <p>{faq.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <div className="wrap" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <h2 className="sh2" style={{ color: "#fff", marginBottom: "1.5rem" }}>{t.cta_h}</h2>
          <a href={`${APP_URL}/request-access`} className="btn btn-a" style={{ fontSize: 16, padding: "14px 32px" }}>
            {t.cta_btn}
          </a>
        </div>
      </section>
    </>
  );
}
