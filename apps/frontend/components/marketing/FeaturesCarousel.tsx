"use client";

import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

/* SVG icons for each slide, copied exactly from the HTML reference */
const icons = [
  /* 1 - Guided creation (document) */
  <svg key="f1" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>,
  /* 2 - Live tracking (clock) */
  <svg key="f2" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>,
  /* 3 - Multi-signer (people) */
  <svg key="f3" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>,
  /* 4 - Auto reminders (pulse) */
  <svg key="f4" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
  </svg>,
  /* 5 - ESIGN Act (shield) */
  <svg key="f5" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>,
  /* 6 - Any device (monitor) */
  <svg key="f6" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8m-4-4v4" />
  </svg>,
  /* 7 - Custom forms (sun/settings) — ACCENT */
  <svg key="f7" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>,
  /* 8 - Team workspace (chat) */
  <svg key="f8" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>,
];

interface SlideData {
  titleKey: string;
  descKey: string;
  iconIndex: number;
  accent?: boolean;
}

const slides: SlideData[] = [
  { titleKey: "f1t", descKey: "f1ds", iconIndex: 0 },
  { titleKey: "f2t", descKey: "f2ds", iconIndex: 1 },
  { titleKey: "f3t", descKey: "f3ds", iconIndex: 2 },
  { titleKey: "f4t", descKey: "f4ds", iconIndex: 3 },
  { titleKey: "f5t", descKey: "f5ds", iconIndex: 4 },
  { titleKey: "f6t", descKey: "f6ds", iconIndex: 5 },
  { titleKey: "f7t", descKey: "f7ds", iconIndex: 6, accent: true },
  { titleKey: "f8t", descKey: "f8ds", iconIndex: 7 },
];

function Slide({
  slide,
  lang,
  ariaHidden,
}: {
  slide: SlideData;
  lang: "en" | "es";
  ariaHidden?: boolean;
}) {
  const t = T[lang] as Record<string, string>;
  return (
    <div
      className={`fc-slide${slide.accent ? " fc-slide--accent" : ""}`}
      aria-hidden={ariaHidden || undefined}
    >
      <div className={`fc-slide-icon${slide.accent ? " fc-slide-icon--light" : ""}`}>
        {icons[slide.iconIndex]}
      </div>
      <div className={`fc-slide-ttl${slide.accent ? " fc-slide-ttl--light" : ""}`}>
        {t[slide.titleKey]}
      </div>
      <div className={`fc-slide-dsc${slide.accent ? " fc-slide-dsc--light" : ""}`}>
        {t[slide.descKey]}
      </div>
    </div>
  );
}

export function FeaturesCarousel() {
  const { lang } = useLang();

  return (
    <section className="section" id="features">
      <div className="wrap">
        <div className="sec-lbl rv" style={{ justifyContent: "center" }}>
          <span className="dot">&#9679;</span>
          <span>{T[lang].fl}</span>
        </div>
        <h2
          className="sh2 rv"
          style={{ textAlign: "center" }}
          dangerouslySetInnerHTML={{ __html: T[lang].fh2 }}
        />
      </div>

      {/* Full-bleed carousel */}
      <div className="feat-carousel-outer rv">
        <div className="feat-carousel-track" id="featTrack">
          {/* SET 1 */}
          {slides.map((slide, i) => (
            <Slide key={`s1-${i}`} slide={slide} lang={lang} />
          ))}
          {/* SET 2 — duplicate for seamless loop */}
          {slides.map((slide, i) => (
            <Slide key={`s2-${i}`} slide={slide} lang={lang} ariaHidden />
          ))}
        </div>
      </div>
    </section>
  );
}
