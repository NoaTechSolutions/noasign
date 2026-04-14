"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

const authors = [
  { initials: "MR", name: "Marcus R.", roleKey: "r1", quoteKey: "q1" },
  { initials: "SL", name: "Sandra L.", roleKey: "r2", quoteKey: "q2" },
  { initials: "JP", name: "James P.", roleKey: "r3", quoteKey: "q3" },
  { initials: "AL", name: "Ana L.", roleKey: "r4", quoteKey: "q4" },
  { initials: "DM", name: "David M.", roleKey: "r5", quoteKey: "q5" },
] as const;

export function Testimonials() {
  const { lang } = useLang();
  const [carIdx, setCarIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);

  const updateWidth = useCallback(() => {
    if (trackRef.current) {
      const firstCard = trackRef.current.querySelector(".car-card");
      if (firstCard) {
        setCardWidth((firstCard as HTMLElement).offsetWidth + 12);
      }
    }
  }, []);

  useEffect(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [updateWidth]);

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(i, authors.length - 1));
      setCarIdx(clamped);
    },
    []
  );

  return (
    <section className="section" id="testimonials">
      <div className="wrap">
        <div className="sec-lbl rv">
          <span className="dot">&#9679;</span>
          <span>{T[lang].tl}</span>
        </div>
        <h2 className="sh2 rv">{T[lang].th2}</h2>

        <div className="carousel-wrap rv">
          <div
            className="carousel-track"
            ref={trackRef}
            style={{
              transform: `translateX(-${carIdx * cardWidth}px)`,
            }}
          >
            {authors.map((a) => (
              <div className="car-card" key={a.initials}>
                <div className="car-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <p className="car-quote">
                  {T[lang][a.quoteKey]}
                </p>
                <div className="car-author">
                  <div className="car-av">{a.initials}</div>
                  <div>
                    <div className="car-nm">{a.name}</div>
                    <div className="car-rl">
                      {T[lang][a.roleKey]}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="car-controls">
            <button
              className="car-btn"
              aria-label="Previous"
              onClick={() => goTo(carIdx - 1)}
            >
              &#8592;
            </button>
            <div className="car-dots">
              {authors.map((_, i) => (
                <div
                  key={i}
                  className={`car-dot${i === carIdx ? " on" : ""}`}
                  onClick={() => goTo(i)}
                ></div>
              ))}
            </div>
            <button
              className="car-btn"
              aria-label="Next"
              onClick={() => goTo(carIdx + 1)}
            >
              &#8594;
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
