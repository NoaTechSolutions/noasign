"use client";

import { useState } from "react";
import { useLang } from "./LandingContext";
import { openChat } from "../../lib/open-chat";
import { PricingSection } from "./PricingSection";

const copy = {
  en: {
    hero_h_1: "Choose The Perfect Plan ",
    hero_h_2: "For Your Business",
    hero_s: "No contracts. No surprises. Cancel anytime.",
    badge1: "Legally binding in the US",
    badge2: "Ready in 48 hours",
    badge3: "No account needed to sign",
    badge4: "No contracts. Cancel anytime.",
    compare_h: "Compare all plans",
    compare_sub: "All plans include personal onboarding support and full audit trail.",
    feat: "Feature",
    docs: "Docs/month",
    users: "Users",
    templates: "Active templates",
    multisign: "Multi-signer",
    team: "Team management",
    audit: "Full audit trail",
    dashboard: "Full dashboard",
    reminders: "Auto reminders",
    priority: "Priority support",
    onboarding: "Personal onboarding",
    monthly: "Monthly price",
    unlimited: "Unlimited",
    get_started: "Get started",
    get_started_accent: "Get started!",
    faq_h: "Pricing FAQ",
    cta_h: "Ready to get started?",
    cta_btn: "Start your free trial \u2192",
    faqs: [
      { q: "Can I change plans anytime?", a: "Yes, upgrade or downgrade whenever you need. Changes apply immediately." },
      { q: "Is there a free trial?", a: "New accounts get 2 free documents to test everything \u2014 no credit card needed." },
      { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards through Stripe, a trusted payment processor." },
      { q: "Is my data secure?", a: "Yes. All documents are encrypted and stored in secure servers in the United States." },
      { q: "Do my clients need an account to sign?", a: "No. Your clients receive a link by email and sign directly from their browser \u2014 no downloads, no accounts." },
      { q: "Are signed documents legally valid?", a: "Yes. NTSsign complies with the ESIGN Act, making all signatures legally binding across the United States." },
      { q: "What happens if I exceed my document limit?", a: "You can continue sending documents by paying a small overage fee per document, shown clearly in your plan." },
      { q: "Can I invite my team?", a: "Yes. The Launch and Pro plans include multiple user seats so your team can collaborate." },
      { q: "Is there a long-term contract?", a: "No contracts. You can cancel your subscription at any time from your account settings." },
      { q: "What is the difference between Starter and Launch?", a: "Starter is for solo users with up to 5 documents per month. Launch adds team collaboration, more documents, and multiple templates." },
    ],
  },
  es: {
    hero_h_1: "Elige El Plan Perfecto ",
    hero_h_2: "Para Tu Negocio",
    hero_s: "Sin contratos. Sin sorpresas. Cancela cuando quieras.",
    badge1: "Firma legal en EE.UU.",
    badge2: "Listo en 48 horas",
    badge3: "Sin cuenta para firmar",
    badge4: "Sin contratos ni sorpresas",
    compare_h: "Compara todos los planes",
    compare_sub: "Todos los planes incluyen soporte de onboarding personal y audit trail completo.",
    feat: "Caracter\u00edstica",
    docs: "Documentos/mes",
    users: "Usuarios",
    templates: "Plantillas activas",
    multisign: "Firmas m\u00faltiples",
    team: "Gesti\u00f3n de equipo",
    audit: "Audit trail completo",
    dashboard: "Dashboard completo",
    reminders: "Recordatorios autom\u00e1ticos",
    priority: "Soporte prioritario",
    onboarding: "Onboarding personal",
    monthly: "Precio mensual",
    unlimited: "Ilimitado",
    get_started: "Empezar",
    get_started_accent: "\u00a1Empezar!",
    faq_h: "Preguntas frecuentes sobre precios",
    cta_h: "\u00bfListo para empezar?",
    cta_btn: "Inicia tu prueba gratis \u2192",
    faqs: [
      { q: "\u00bfPuedo cambiar de plan en cualquier momento?", a: "S\u00ed, puedes subir o bajar de plan cuando lo necesites. Los cambios se aplican de inmediato." },
      { q: "\u00bfHay una prueba gratuita?", a: "Las cuentas nuevas tienen 2 documentos gratis para probar todo \u2014 sin tarjeta de cr\u00e9dito." },
      { q: "\u00bfQu\u00e9 m\u00e9todos de pago aceptan?", a: "Aceptamos todas las tarjetas de cr\u00e9dito y d\u00e9bito principales a trav\u00e9s de Stripe, un procesador de pagos de confianza." },
      { q: "\u00bfMis datos est\u00e1n seguros?", a: "S\u00ed. Todos los documentos est\u00e1n encriptados y almacenados en servidores seguros en Estados Unidos." },
      { q: "\u00bfMis clientes necesitan una cuenta para firmar?", a: "No. Tus clientes reciben un enlace por correo y firman directamente desde su navegador \u2014 sin descargas ni cuentas." },
      { q: "\u00bfLos documentos firmados tienen validez legal?", a: "S\u00ed. NTSsign cumple con el ESIGN Act, haciendo que todas las firmas sean legalmente v\u00e1lidas en Estados Unidos." },
      { q: "\u00bfQu\u00e9 pasa si supero mi l\u00edmite de documentos?", a: "Puedes seguir enviando documentos pagando un peque\u00f1o costo por documento adicional, indicado claramente en tu plan." },
      { q: "\u00bfPuedo invitar a mi equipo?", a: "S\u00ed. Los planes Launch y Pro incluyen varios usuarios para que tu equipo pueda colaborar." },
      { q: "\u00bfHay contrato de permanencia?", a: "No hay contratos. Puedes cancelar tu suscripci\u00f3n en cualquier momento desde la configuraci\u00f3n de tu cuenta." },
      { q: "\u00bfQu\u00e9 diferencia hay entre Starter y Launch?", a: "Starter es para usuarios individuales con hasta 5 documentos al mes. Launch agrega colaboraci\u00f3n en equipo, m\u00e1s documentos y m\u00faltiples plantillas." },
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
      <section className="pricing-hero rv">
        <h1 className="pricing-hero-title">
          {t.hero_h_1}<span className="pricing-hero-accent">{t.hero_h_2}</span>
        </h1>
        <p className="pricing-hero-sub">{t.hero_s}</p>
        <div className="pricing-hero-badges">
          <div className="pricing-badge">
            <span className="pricing-badge-icon">{"\u2705"}</span>
            <span>{t.badge1}</span>
          </div>
          <div className="pricing-badge">
            <span className="pricing-badge-icon">{"\ud83d\ude80"}</span>
            <span>{t.badge2}</span>
          </div>
          <div className="pricing-badge">
            <span className="pricing-badge-icon">{"\ud83d\udcf1"}</span>
            <span>{t.badge3}</span>
          </div>
          <div className="pricing-badge">
            <span className="pricing-badge-icon">{"\ud83d\udd12"}</span>
            <span>{t.badge4}</span>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <PricingSection isPricingPage />

      {/* Compare table */}
      <section className="pricing-compare rv">
        <h2 className="compare-title">{t.compare_h}</h2>
        <p className="compare-sub">{t.compare_sub}</p>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="compare-feature-col">{t.feat}</th>
                <th className="col-starter">Starter<br /><span>$19/mo</span></th>
                <th className="col-launch">{"\u2b50"} Launch<br /><span>$39/mo</span></th>
                <th className="col-pro">Pro<br /><span>$89/mo</span></th>
                <th className="col-ppc">Pay/Doc<br /><span>$12/doc</span></th>
                <th className="col-scale">Scale<br /><span>$229/mo</span></th>
              </tr>
            </thead>
            <tbody>
              <tr><td>{t.docs}</td><td>5</td><td className="col-launch-cell">15</td><td>50</td><td>{t.unlimited}</td><td>{t.unlimited}</td></tr>
              <tr><td>{t.users}</td><td>1</td><td className="col-launch-cell">2</td><td>5</td><td>1</td><td>{t.unlimited}</td></tr>
              <tr><td>{t.templates}</td><td>1</td><td className="col-launch-cell">3</td><td>10</td><td>{"\u2014"}</td><td>{t.unlimited}</td></tr>
              <tr><td>{t.multisign}</td><td>{"\u2014"}</td><td className="col-launch-cell">{"\u2705"}</td><td>{"\u2705"}</td><td>{"\u2014"}</td><td>{"\u2705"}</td></tr>
              <tr><td>{t.team}</td><td>{"\u2014"}</td><td className="col-launch-cell">{"\u2705"}</td><td>{"\u2705"}</td><td>{"\u2014"}</td><td>{"\u2705"}</td></tr>
              <tr><td>{t.audit}</td><td>{"\u2705"}</td><td className="col-launch-cell">{"\u2705"}</td><td>{"\u2705"}</td><td>{"\u2705"}</td><td>{"\u2705"}</td></tr>
              <tr><td>{t.dashboard}</td><td>{"\u2705"}</td><td className="col-launch-cell">{"\u2705"}</td><td>{"\u2705"}</td><td>{"\u2014"}</td><td>{"\u2705"}</td></tr>
              <tr><td>{t.reminders}</td><td>{"\u2705"}</td><td className="col-launch-cell">{"\u2705"}</td><td>{"\u2705"}</td><td>{"\u2014"}</td><td>{"\u2705"}</td></tr>
              <tr><td>{t.priority}</td><td>{"\u2014"}</td><td className="col-launch-cell">{"\u2014"}</td><td>{"\u2705"}</td><td>{"\u2014"}</td><td>{"\u2705"}</td></tr>
              <tr><td>{t.onboarding}</td><td>{"\u2705"}</td><td className="col-launch-cell">{"\u2705"}</td><td>{"\u2705"}</td><td>{"\u2014"}</td><td>{"\u2705"}</td></tr>
              <tr className="compare-price-row">
                <td><strong>{t.monthly}</strong></td>
                <td>$19</td>
                <td className="col-launch-cell"><strong>$39</strong></td>
                <td>$89</td>
                <td>$12/doc</td>
                <td>$229</td>
              </tr>
              <tr>
                <td></td>
                <td><button onClick={openChat} className="compare-cta-btn compare-cta-secondary">{t.get_started}</button></td>
                <td className="col-launch-cell"><button onClick={openChat} className="compare-cta-btn compare-cta-primary">{t.get_started_accent}</button></td>
                <td><button onClick={openChat} className="compare-cta-btn compare-cta-secondary">{t.get_started}</button></td>
                <td><button onClick={openChat} className="compare-cta-btn compare-cta-secondary">{t.get_started}</button></td>
                <td><button onClick={openChat} className="compare-cta-btn compare-cta-secondary">{t.get_started}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="section sec-alt" id="pricing-faq">
        <div className="wrap">
          <h2 className="sh2" style={{ textAlign: "center", marginBottom: "2rem" }}>{t.faq_h}</h2>
          <div className="faq-cols">
            <div className="faq-col">
              {t.faqs.slice(0, 5).map((faq, i) => (
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
              {t.faqs.slice(5).map((faq, i) => {
                const idx = i + 5;
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
          <button onClick={openChat} className="btn btn-a" style={{ fontSize: 16, padding: "14px 32px" }}>
            {t.cta_btn}
          </button>
        </div>
      </section>
    </>
  );
}
