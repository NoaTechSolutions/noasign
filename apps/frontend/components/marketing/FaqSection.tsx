"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

const faqKeys = [
  { q: "fq1q", a: "fq1a" },
  { q: "fq2q", a: "fq2a" },
  { q: "fq3q", a: "fq3a" },
  { q: "fq4q", a: "fq4a" },
  { q: "fq5q", a: "fq5a" },
  { q: "fq6q", a: "fq6a" },
  { q: "fq7q", a: "fq7a" },
  { q: "fq8q", a: "fq8a" },
] as const;

const ChevronSvg = () => (
  <svg viewBox="0 0 16 16" fill="none">
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function FaqSection() {
  const { lang } = useLang();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const leftCol = faqKeys.slice(0, 4);
  const rightCol = faqKeys.slice(4, 8);

  const renderItem = (item: (typeof faqKeys)[number], idx: number) => {
    const isOpen = openIdx === idx;
    return (
      <div className="faq-item" key={idx}>
        <button
          className={`faq-q${isOpen ? " open" : ""}`}
          onClick={() => toggle(idx)}
        >
          <span className="faq-q-text">{T[lang][item.q]}</span>
          <span className="faq-chevron" aria-hidden="true">
            <ChevronSvg />
          </span>
        </button>
        <div className={`faq-a${isOpen ? " open" : ""}`}>
          <p>{T[lang][item.a]}</p>
        </div>
      </div>
    );
  };

  return (
    <section className="section sec-alt" id="faq">
      <div className="wrap">
        <div className="faq-header rv">
          <div>
            <div className="sec-lbl">
              <span className="dot">&#9679;</span>
              <span>{T[lang].faq_lbl}</span>
            </div>
            <h2
              className="sh2"
              dangerouslySetInnerHTML={{ __html: T[lang].faq_h2 }}
            />
          </div>
          <div className="faq-header-right">
            <p className="faq-intro">{T[lang].faq_sub}</p>
          </div>
        </div>

        <div className="faq-cols rv">
          <div className="faq-col">
            {leftCol.map((item, i) => renderItem(item, i))}
          </div>
          <div className="faq-col">
            {rightCol.map((item, i) => renderItem(item, i + 4))}
          </div>
        </div>

        <div className="faq-footer rv">
          <p className="faq-intro">{T[lang].faq_sub}</p>
          <Link
            href="/#contact"
            className="faq-contact-link"
          >
            {T[lang].faq_contact}
          </Link>
        </div>
      </div>
    </section>
  );
}
