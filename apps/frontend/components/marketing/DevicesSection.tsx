"use client";

import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

export function DevicesSection() {
  const { lang } = useLang();

  return (
    <section className="devices-section" id="devices">
      <div className="devices-inner">
        <div className="sec-lbl rv" style={{ justifyContent: "center" }}>
          <span className="dot">&#9679;</span>
          <span>{T[lang].dev_l}</span>
        </div>
        <div className="devices-text rv">
          <h2
            className="sh2"
            dangerouslySetInnerHTML={{ __html: T[lang].dev_h2 }}
          />
          <p className="ssub">{T[lang].dev_s}</p>
        </div>

        <div className="dev-layout rv">
          {/* LEFT: single hero image */}
          <div className="dev-mockups">
            <picture>
              <source
                type="image/webp"
                srcSet="/img/devices-3d-sm-v2.webp 600w, /img/devices-3d-md-v2.webp 900w, /img/devices-3d-lg-v2.webp 1400w, /img/devices-3d-xl-v2.webp 1800w"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <source
                type="image/png"
                srcSet="/img/devices-3d-sm-v2.png 600w, /img/devices-3d-md-v2.png 900w, /img/devices-3d-lg-v2.png 1400w, /img/devices-3d-xl-v2.png 1800w"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <img
                src="/img/devices-3d-lg-v2.png"
                alt="Sign from any device — phone, tablet, laptop"
                width={600}
                height={500}
                className="devices-hero-img"
                loading="lazy"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </picture>
          </div>

          {/* RIGHT: tab switcher + feature pills */}
          <div className="dev-right">
            <div className="dev-right-pills">
              <div className="dev-pill">
                <span className="dev-pill-ico">📱</span>
                <div>
                  <div className="dev-pill-ttl">{T[lang].devf1t}</div>
                  <div className="dev-pill-dsc">{T[lang].devf1d}</div>
                </div>
              </div>
              <div className="dev-pill">
                <span className="dev-pill-ico">📊</span>
                <div>
                  <div className="dev-pill-ttl">{T[lang].devf2t}</div>
                  <div className="dev-pill-dsc">{T[lang].devf2d}</div>
                </div>
              </div>
              <div className="dev-pill">
                <span className="dev-pill-ico">🔔</span>
                <div>
                  <div className="dev-pill-ttl">{T[lang].devf3t}</div>
                  <div className="dev-pill-dsc">{T[lang].devf3d}</div>
                </div>
              </div>
              <div className="dev-pill">
                <span className="dev-pill-ico">🔗</span>
                <div>
                  <div className="dev-pill-ttl">{T[lang].devf4t}</div>
                  <div className="dev-pill-dsc">{T[lang].devf4d}</div>
                </div>
              </div>
            </div>

            <div className="dev-status-badge">
              <div className="dev-status-dot"></div>
              <div>
                <div className="dev-status-ttl">{T[lang].dev_badge_t}</div>
                <div className="dev-status-sub">{T[lang].dev_badge_s}</div>
              </div>
              <div className="dev-status-check">&#10003;</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
