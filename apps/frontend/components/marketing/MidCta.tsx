"use client";

import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

export function MidCta() {
  const { lang } = useLang();

  return (
    <section className="mid-cta-band">
      <div className="wrap">
        <div className="mid-cta-compact rv">
          <div className="mcc-badge">{T[lang].mcta_ey}</div>
          <div className="mcc-title">Launch</div>
          <div className="mcc-price-block">
            <span className="mcc-price-main">$39<span>/mo</span></span>
            <span className="mcc-price-annual">{T[lang].save_launch || 'or $32/mo billed annually — save $84/yr'}</span>
          </div>
          <div className="mcc-pills">
            <span className="mcc-pill">
              👥 <span>{T[lang].mlc1t}</span>
            </span>
            <span className="mcc-pill">
              📋 <span>{T[lang].mlc2t}</span>
            </span>
            <span className="mcc-pill">
              ✍️ <span>{T[lang].mlc3t}</span>
            </span>
            <span className="mcc-pill">
              🔔 <span>{T[lang].mlc4t}</span>
            </span>
          </div>
          <a
            href="#pricing"
            className="btn btn-a"
            style={{
              fontSize: 15,
              padding: "13px 28px",
              whiteSpace: "nowrap",
            }}
          >
            {T[lang].mcta_btn}
          </a>
          <div className="mid-cta-trust">{T[lang].mcta_tr}</div>
        </div>
      </div>
    </section>
  );
}
