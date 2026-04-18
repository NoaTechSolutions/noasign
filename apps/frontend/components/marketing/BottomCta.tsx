"use client";

import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";
import { APP_URL } from "../../lib/app-url";
import { openChat } from "../../lib/open-chat";

export function BottomCta() {
  const { lang } = useLang();

  return (
    <section className="cta-band" id="cta">
      <div className="wrap cta-inner">
        <div className="cta-starter-badge">{T[lang].cta_badge}</div>
        <h2 dangerouslySetInnerHTML={{ __html: T[lang].ctah }} />
        <p>{T[lang].ctap}</p>

        <div className="cta-plan-preview">
          <div className="cpp-item">
            <span className="cpp-icon">&#10003;</span>
            <span>{T[lang].cpp1}</span>
          </div>
          <div className="cpp-sep">&middot;</div>
          <div className="cpp-item">
            <span className="cpp-icon">&#10003;</span>
            <span>{T[lang].cpp2}</span>
          </div>
          <div className="cpp-sep">&middot;</div>
          <div className="cpp-item">
            <span className="cpp-icon">&#10003;</span>
            <span>{T[lang].cpp3}</span>
          </div>
          <div className="cpp-sep">&middot;</div>
          <div className="cpp-item">
            <span className="cpp-icon">&#10003;</span>
            <span>{T[lang].cpp4}</span>
          </div>
          <div className="cpp-sep">&middot;</div>
          <div className="cpp-item">
            <span className="cpp-icon">&#10003;</span>
            <span>{T[lang].cpp5}</span>
          </div>
        </div>

        <div className="cta-btns">
          <button
            onClick={openChat}
            className="btn btn-a"
            style={{ fontSize: 16, padding: "14px 32px" }}
          >
            {T[lang].ctab1}
          </button>
          <a href="#pricing" className="btn btn-wo">
            {T[lang].ctab2}
          </a>
        </div>

        <div className="cta-annual-hint">{T[lang].cta_annual}</div>

        <div className="cta-tr">
          <span>{T[lang].ct1}</span>
          <span className="cta-tr-s">&bull;</span>
          <span>{T[lang].ct2}</span>
          <span className="cta-tr-s">&bull;</span>
          <span>{T[lang].ct3}</span>
          <span className="cta-tr-s">&bull;</span>
          <span>{T[lang].ct4}</span>
        </div>
      </div>
    </section>
  );
}
