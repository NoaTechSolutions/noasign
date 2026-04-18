"use client";

import { useState } from "react";
import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";
import { APP_URL } from "../../lib/app-url";

type Billing = "monthly" | "annual";
type PlanTab = "sub" | "extra" | "flex";

export function PricingSection({ isPricingPage = false }: { isPricingPage?: boolean } = {}) {
  const { lang } = useLang();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [planTab, setPlanTab] = useState<PlanTab>("sub");

  const isAnn = billing === "annual";

  const price = (mo: number, an: number) => (isAnn ? an : mo);

  return (
    <section className="section sec-alt" id="pricing">
      <div className="wrap">
        {/* Header */}
        <div className="pricing-header rv">
          <div className="pricing-header-left">
            <div className="sec-lbl">
              <span className="dot">&#9679;</span>
              <span>{T[lang].pl}</span>
            </div>
            <h2
              className="sh2"
              dangerouslySetInnerHTML={{ __html: T[lang].ph2p }}
            />
            <p className="ssub">{T[lang].ps}</p>
          </div>
          <div className="pricing-header-right">
            <div className="billing-toggle">
              <span className="bt-lbl">{T[lang].bt_mo}</span>
              <div
                className={`bt-switch${isAnn ? " on" : ""}`}
                onClick={() =>
                  setBilling(billing === "monthly" ? "annual" : "monthly")
                }
              >
                <div className="bt-knob"></div>
              </div>
              <span className="bt-lbl">{T[lang].bt_an}</span>
              <span className="bt-save">{T[lang].bt_save}</span>
            </div>
            <div className="plan-tabs">
              <button
                className={`pt-tab${planTab === "sub" ? " on" : ""}`}
                onClick={() => setPlanTab("sub")}
              >
                {T[lang].tab_sub}
              </button>
              <button
                className={`pt-tab${planTab === "extra" ? " on" : ""}`}
                onClick={() => setPlanTab("extra")}
              >
                {T[lang].tab_extra}
              </button>
              <button
                className={`pt-tab${planTab === "flex" ? " on" : ""}`}
                onClick={() => setPlanTab("flex")}
              >
                {T[lang].tab_flex}
              </button>
            </div>
          </div>
        </div>

        {/* PANEL: Sub (Plans) */}
        <div
          className="plans-panel"
          style={{ display: planTab === "sub" ? "block" : "none" }}
        >
          <div className="price-row rv">
            {/* Starter */}
            <div className="pc pc-side">
              <span className="ptag t0">{T[lang].p1tg}</span>
              <div className="pc-name">Starter</div>
              <div className="pc-price">
                <sup>$</sup>
                <span className="p-num">{price(19, 16)}</span>
              </div>
              <div className="pc-per">
                <span>{T[lang].p1pr}</span>
                {isAnn && (
                  <span className="ann-note"> {T[lang].billed_an}</span>
                )}
              </div>
              {isAnn && (
                <div className="ann-save-tag">{T[lang].save_starter}</div>
              )}
              <div className="pc-ov">{T[lang].p1ov}</div>
              <div className="pc-div"></div>
              <div className="pc-feats">
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p1f1}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p1f2}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p1f3}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p1f4}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p1f5}</span>
                </div>
              </div>
              <a href={`${APP_URL}/request-access`} className="btn btn-g pc-btn">
                {T[lang].bs}
              </a>
            </div>

            {/* LAUNCH — BESTSELLER */}
            <div className="pc pc-launch">
              <div className="pc-launch-glow" aria-hidden="true"></div>
              <div className="pc-launch-badge">{T[lang].p2tg}</div>
              <div className="pc-name pc-launch-name">Launch</div>
              <div className="pc-price pc-launch-price">
                <sup>$</sup>
                <span className="p-num">{price(39, 32)}</span>
              </div>
              <div className="pc-per" style={{ color: "rgba(255,255,255,.65)" }}>
                <span>{T[lang].p2pr}</span>
                {isAnn && (
                  <span className="ann-note"> {T[lang].billed_an}</span>
                )}
              </div>
              {isAnn && (
                <div className="ann-save-tag ann-save-dark">
                  {T[lang].save_launch}
                </div>
              )}
              <div className="pc-ov pc-ov-light">{T[lang].p2ov}</div>
              <div className="pc-div pc-div-light"></div>
              <div className="pc-feats">
                <div className="pf pf-light">
                  <span className="pfc-light">&#10003;</span>
                  <span>{T[lang].p2f1}</span>
                </div>
                <div className="pf pf-light">
                  <span className="pfc-light">&#10003;</span>
                  <span>{T[lang].p2f2}</span>
                </div>
                <div className="pf pf-light">
                  <span className="pfc-light">&#10003;</span>
                  <span>{T[lang].p2f3}</span>
                </div>
                <div className="pf pf-light">
                  <span className="pfc-light">&#10003;</span>
                  <span>{T[lang].p2f4}</span>
                </div>
                <div className="pf pf-light">
                  <span className="pfc-light">&#10003;</span>
                  <span>{T[lang].p2f5}</span>
                </div>
              </div>
              <a href={`${APP_URL}/request-access`} className="btn pc-launch-btn pc-btn">
                {T[lang].launch_cta}
              </a>
              <div className="pc-launch-trust">{T[lang].launch_trust}</div>
            </div>

            {/* Pro */}
            <div className="pc pc-side">
              <span className="ptag t2">{T[lang].p3tg}</span>
              <div className="pc-name">Pro</div>
              <div className="pc-price">
                <sup>$</sup>
                <span className="p-num">{price(89, 74)}</span>
              </div>
              <div className="pc-per">
                <span>{T[lang].p3pr}</span>
                {isAnn && (
                  <span className="ann-note"> {T[lang].billed_an}</span>
                )}
              </div>
              {isAnn && (
                <div className="ann-save-tag">{T[lang].save_pro}</div>
              )}
              <div className="pc-ov">{T[lang].p3ov}</div>
              <div className="pc-div"></div>
              <div className="pc-feats">
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p3f1}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p3f2}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p3f3}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p3f4}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p3f5}</span>
                </div>
              </div>
              <a href={`${APP_URL}/request-access`} className="btn btn-g pc-btn">
                {T[lang].bs}
              </a>
            </div>
          </div>
        </div>

        {/* PANEL: Extra */}
        <div
          className="plans-panel"
          style={{ display: planTab === "extra" ? "block" : "none" }}
        >
          <div className="price-row-2 rv">
            {/* Pay per contract */}
            <div className="pc pc-side">
              <span className="ptag t0">{T[lang].p0tg}</span>
              <div className="pc-name">Pay-per-contract</div>
              <div className="pc-price">
                <sup>$</sup>12
              </div>
              <div className="pc-per">{T[lang].p0pr}</div>
              <div className="pc-div"></div>
              <div className="pc-feats">
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p0f1}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p0f2}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p0f3}</span>
                </div>
                <div className="pf">
                  <span className="pfc-no">&mdash;</span>
                  <span style={{ color: "var(--tl)" }}>{T[lang].p0x1}</span>
                </div>
                <div className="pf">
                  <span className="pfc-no">&mdash;</span>
                  <span style={{ color: "var(--tl)" }}>{T[lang].p0x2}</span>
                </div>
              </div>
              <a href={`${APP_URL}/request-access`} className="btn btn-g pc-btn">
                {T[lang].bs}
              </a>
              <div className="pc-hint">{T[lang].p0hint}</div>
            </div>

            {/* Scale */}
            <div className="pc pc-side">
              <span className="ptag t3">{T[lang].p4tg}</span>
              <div className="pc-name">Scale</div>
              <div className="pc-price">
                <sup>$</sup>
                <span className="p-num">{price(229, 190)}</span>
              </div>
              <div className="pc-per">
                <span>{T[lang].scale_per}</span>
                {isAnn && (
                  <span className="ann-note"> {T[lang].billed_an}</span>
                )}
              </div>
              {isAnn && (
                <div className="ann-save-tag">{T[lang].save_scale}</div>
              )}
              <div className="pc-ov">{T[lang].p4ov}</div>
              <div className="pc-div"></div>
              <div className="pc-feats">
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p4f1}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p4f2}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p4f3}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p4f4}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p4f5}</span>
                </div>
              </div>
              <a href={`${APP_URL}/request-access`} className="btn btn-g pc-btn">
                {T[lang].bs}
              </a>
            </div>
          </div>
        </div>

        {/* PANEL: Flex (Services) */}
        <div
          className="plans-panel"
          style={{ display: planTab === "flex" ? "block" : "none" }}
        >
          <div className="flex-grid rv">
            {/* Pay-per-contract */}
            <div className="plan flex-plan rv">
              <div className="flex-plan-icon">📄</div>
              <span className="ptag t0">{T[lang].p0tg}</span>
              <div className="pn">Pay-per-contract</div>
              <div className="pp">
                <sup>$</sup>12
              </div>
              <div className="ppr">{T[lang].p0pr}</div>
              <div className="pdiv"></div>
              <p className="flex-desc">{T[lang].p0desc}</p>
              <div className="pfs">
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p0f1}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p0f2}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].p0f3}</span>
                </div>
              </div>
              <a
                href={`${APP_URL}/request-access`}
                className="btn btn-g"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {T[lang].bs}
              </a>
            </div>

            {/* Template Setup Service */}
            <div className="plan flex-plan setup-plan rv rv1">
              <div className="flex-plan-icon">&#9889;</div>
              <span
                className="ptag"
                style={{ background: "var(--amber)", color: "#fff" }}
              >
                One-time
              </span>
              <div className="pn">{T[lang].setup_title}</div>
              <div className="setup-prices">
                <div className="setup-row">
                  <div className="setup-name">{T[lang].su1n}</div>
                  <div className="setup-price">$49</div>
                </div>
                <div className="setup-row">
                  <div className="setup-name">{T[lang].su2n}</div>
                  <div className="setup-price">$79</div>
                </div>
                <div className="setup-row">
                  <div className="setup-name">{T[lang].su3n}</div>
                  <div className="setup-price">+$29</div>
                </div>
              </div>
              <div className="pdiv"></div>
              <p className="flex-desc">{T[lang].setup_desc}</p>
              <div className="pfs">
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].su_f1}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].su_f2}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].su_f3}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].su_f4}</span>
                </div>
              </div>
              <a
                href={`${APP_URL}/request-access`}
                className="btn btn-a"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {T[lang].setup_btn}
              </a>
            </div>

            {/* Onboarding Packages */}
            <div className="plan flex-plan rv rv2">
              <div className="flex-plan-icon">👥</div>
              <span className="ptag t0">{T[lang].onb_tag}</span>
              <div className="pn">{T[lang].onb_title}</div>
              <div className="setup-prices">
                <div className="setup-row">
                  <div className="setup-name">{T[lang].ob1n}</div>
                  <div className="setup-price">$149</div>
                </div>
                <div className="setup-row">
                  <div className="setup-name">{T[lang].ob2n}</div>
                  <div className="setup-price">$249</div>
                </div>
              </div>
              <div className="pdiv"></div>
              <p className="flex-desc">{T[lang].onb_desc}</p>
              <div className="pfs">
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].ob_f1}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].ob_f2}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].ob_f3}</span>
                </div>
                <div className="pf">
                  <span className="pfc">&#10003;</span>
                  <span>{T[lang].ob_f4}</span>
                </div>
              </div>
              <a
                href={`${APP_URL}/request-access`}
                className="btn btn-g"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {T[lang].ob_btn}
              </a>
            </div>
          </div>
        </div>
        {!isPricingPage && (
          <div className="pricing-view-all rv">
            <a href="/pricing" className="btn-view-all">
              {T[lang].tab_sub === "Plans"
                ? "See full plan comparison \u2192"
                : "Ver comparaci\u00f3n completa de planes \u2192"}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
