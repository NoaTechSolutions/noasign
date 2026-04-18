"use client";

import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

export function SecuritySection() {
  const { lang } = useLang();

  return (
    <section className="section sec-alt">
      <div className="wrap">
        <div className="sec-layout">
          <div className="sec-text-top rv">
            <div className="sec-lbl">
              <span className="dot">&#9679;</span>
              <span>{T[lang].sel}</span>
            </div>
            <h2
              className="sh2"
              dangerouslySetInnerHTML={{ __html: T[lang].seh2 }}
            />
            <p className="ssub">{T[lang].ses}</p>
          </div>

          <div className="sec-img-col rv rv1">
            <picture>
              <source
                type="image/webp"
                srcSet="/img/security-3d-sm-v2.webp 600w, /img/security-3d-md-v2.webp 900w, /img/security-3d-lg-v2.webp 1400w, /img/security-3d-xl-v2.webp 1800w"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
              <source
                type="image/png"
                srcSet="/img/security-3d-sm-v2.png 600w, /img/security-3d-md-v2.png 900w, /img/security-3d-lg-v2.png 1400w, /img/security-3d-xl-v2.png 1800w"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
              <img
                className="sec-img security-img"
                src="/img/security-3d-lg-v2.png"
                alt="Security and compliance — ESIGN Act compliant"
                width={600}
                height={600}
                loading="lazy"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: 20 }}
              />
            </picture>
          </div>

          <div className="sec-cards-bottom">
            <div
              className="tb-card rv"
              style={{ display: "flex", alignItems: "center", gap: "1rem" }}
            >
              <div style={{ fontSize: 20 }}>🔐</div>
              <div>
                <div className="tb-ttl">{T[lang].se1t}</div>
                <div className="tb-dsc">{T[lang].se1d}</div>
              </div>
            </div>
            <div
              className="tb-card rv rv1"
              style={{ display: "flex", alignItems: "center", gap: "1rem" }}
            >
              <div style={{ fontSize: 20 }}>🕵️</div>
              <div>
                <div className="tb-ttl">{T[lang].se2t}</div>
                <div className="tb-dsc">{T[lang].se2d}</div>
              </div>
            </div>
            <div
              className="tb-card rv rv2"
              style={{ display: "flex", alignItems: "center", gap: "1rem" }}
            >
              <div style={{ fontSize: 20 }}>📜</div>
              <div>
                <div className="tb-ttl">{T[lang].se3t}</div>
                <div className="tb-dsc">{T[lang].se3d}</div>
              </div>
            </div>
            <div
              className="tb-card rv rv3"
              style={{ display: "flex", alignItems: "center", gap: "1rem" }}
            >
              <div style={{ fontSize: 20 }}>🔒</div>
              <div>
                <div className="tb-ttl">{T[lang].se4t}</div>
                <div className="tb-dsc">{T[lang].se4d}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
