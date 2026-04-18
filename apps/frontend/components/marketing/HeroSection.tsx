"use client";

import { useEffect, useRef } from "react";
import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";
import { APP_URL } from "../../lib/app-url";
import { openChat } from "../../lib/open-chat";

export function HeroSection() {
  const { lang } = useLang();
  const b1Ref = useRef<HTMLDivElement>(null);
  const b2Ref = useRef<HTMLDivElement>(null);
  const b3Ref = useRef<HTMLDivElement>(null);

  /* Parallax blobs on scroll */
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (b1Ref.current) b1Ref.current.style.transform = `translateY(${y * 0.08}px)`;
      if (b2Ref.current) b2Ref.current.style.transform = `translateY(${y * -0.05}px)`;
      if (b3Ref.current) b3Ref.current.style.transform = `translateY(${y * 0.06}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="hero" aria-labelledby="hero-h1">
      <div className="blob b1" aria-hidden="true" ref={b1Ref}></div>
      <div className="blob b2" aria-hidden="true" ref={b2Ref}></div>
      <div className="blob b3" aria-hidden="true" ref={b3Ref}></div>

      <div className="hero-grid">
        <div className="hero-left">
          <div className="eyebrow-row">
            <span className="eyebrow-pill">{T[lang].ey1}</span>
            <span className="eyebrow-pill">{T[lang].ey2}</span>
          </div>

          <h1
            className="h1"
            id="hero-h1"
            dangerouslySetInnerHTML={{ __html: T[lang].hero_h1 }}
          />

          <p className="hero-sub">{T[lang].hero_s}</p>

          <div className="hero-btns">
            <button onClick={openChat} className="btn btn-p">
              {T[lang].h_b1}
            </button>
            <a href="#how" className="btn btn-a">
              {T[lang].h_b2}
            </a>
          </div>

          <div className="trust">
            <span>{T[lang].tr1}</span>
            <span className="t-sep">&bull;</span>
            <span>{T[lang].tr2}</span>
            <span className="t-sep">&bull;</span>
            <span>{T[lang].tr3}</span>
            <span className="t-sep">&bull;</span>
            <span>{T[lang].tr4}</span>
          </div>
        </div>

        <div className="hero-right" aria-hidden="true">
          <div className="hero-img-wrap">
            <picture>
              <source
                type="image/webp"
                srcSet="/img/hero-3d-sm-v2.webp 600w, /img/hero-3d-md-v2.webp 900w, /img/hero-3d-lg-v2.webp 1400w, /img/hero-3d-xl-v2.webp 1800w"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 45vw"
              />
              <source
                type="image/png"
                srcSet="/img/hero-3d-sm-v2.png 600w, /img/hero-3d-md-v2.png 900w, /img/hero-3d-lg-v2.png 1400w, /img/hero-3d-xl-v2.png 1800w"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 45vw"
              />
              <img
                src="/img/hero-3d-lg-v2.png"
                alt="NTSsign — sign documents from any device"
                width={600}
                height={550}
                fetchPriority="high"
                loading="eager"
                className="hero-img"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 16 }}
              />
            </picture>
          </div>
        </div>
      </div>
    </section>
  );
}
