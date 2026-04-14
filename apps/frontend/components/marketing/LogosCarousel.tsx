"use client";

import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

export function LogosCarousel() {
  const { lang } = useLang();

  const pills = [
    { emoji: "\u{1F3D7}\uFE0F", label: "Construction" },
    { emoji: "\u{1F9D2}", label: "Childcare" },
    { emoji: "\u{1F3E0}", label: "Real Estate" },
    { emoji: "\u{1F6E1}\uFE0F", label: "Insurance" },
    { emoji: "\u2696\uFE0F", label: "Legal Services" },
    { emoji: "\u{1F3B5}", label: "Entertainment" },
    { emoji: "\u{1F527}", label: "HVAC & Trades" },
    { emoji: "\u{1F4BC}", label: "Freelancers" },
    { emoji: "\u{1F33F}", label: "Landscaping" },
    { emoji: "\u{1F3E5}", label: "Healthcare" },
  ];

  const renderSet = (ariaHidden?: boolean) => (
    <div className="logos-set" aria-hidden={ariaHidden || undefined}>
      <span className="logos-lbl">{T[lang].log_l}</span>
      {pills.map((p, i) => (
        <span className="lp" key={i}>
          {p.emoji} {p.label}
        </span>
      ))}
    </div>
  );

  return (
    <div className="logos" aria-label="Industries we serve">
      <div className="logos-track">
        {renderSet()}
        {renderSet(true)}
      </div>
    </div>
  );
}
