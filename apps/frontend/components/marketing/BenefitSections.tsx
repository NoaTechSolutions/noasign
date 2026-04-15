"use client";

import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

/* ── Section 2a: Client Experience ── */
function SectionClientExperience({ lang }: { lang: "en" | "es" }) {
  return (
    <section className="section bsec" id="client-experience">
      <div className="wrap">
        <div className="bsec-grid">
          {/* Text left */}
          <div className="bsec-text rv">
            <div className="sec-lbl">
              <span className="dot">&#9679;</span>
              <span>{T[lang].bs1_lbl}</span>
            </div>
            <h2
              className="sh2"
              dangerouslySetInnerHTML={{ __html: T[lang].bs1_h2 }}
            />
            <p className="bsec-lead">{T[lang].bs1_lead}</p>
          </div>

          {/* Image right — signing mockup */}
          <div className="bsec-img-wrap rv rv1">
            <div className="bsec-img-card bsec-img-card--a">
              <div className="bsec-mockup-screen">
                {/* Top bar */}
                <div className="bsec-mock-topbar">
                  <div className="bsec-mock-logo">
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: "var(--navy)" }}></div>
                    <div style={{ width: 60, height: 8, borderRadius: 4, background: "var(--navy)", opacity: 0.7 }}></div>
                  </div>
                  <div className="bsec-mock-status">
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28ca41", animation: "pulse 1.5s infinite" }}></div>
                    <div style={{ width: 50, height: 7, borderRadius: 3, background: "var(--bd)" }}></div>
                  </div>
                </div>

                {/* Document area */}
                <div className="bsec-mock-doc">
                  <div className="bsec-mock-doc-header">
                    <div style={{ width: "40%", height: 10, borderRadius: 4, background: "var(--bdm)" }}></div>
                    <div style={{ width: "60%", height: 7, borderRadius: 3, background: "var(--bd)", marginTop: 6 }}></div>
                    <div style={{ width: "50%", height: 7, borderRadius: 3, background: "var(--bd)", marginTop: 4 }}></div>
                  </div>
                  <div className="bsec-mock-doc-body">
                    <div className="bsec-mock-line"></div>
                    <div className="bsec-mock-line" style={{ width: "85%" }}></div>
                    <div className="bsec-mock-line" style={{ width: "70%" }}></div>
                    <div className="bsec-mock-line" style={{ width: "90%" }}></div>
                    <div className="bsec-mock-line" style={{ width: "60%" }}></div>
                  </div>
                  <div className="bsec-mock-sig-area">
                    <div className="bsec-mock-sig-label">{T[lang].bs1_sign_lbl}</div>
                    <div className="bsec-mock-sig-box">
                      <svg viewBox="0 0 120 40" style={{ width: "100%", opacity: 0.6 }}>
                        <path
                          d="M10 30 C 20 10, 35 35, 50 20 C 65 5, 75 35, 90 20 C 100 10, 108 25, 115 22"
                          stroke="var(--navy)"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bsec-mock-footer">
                  <div className="bsec-mock-devices">
                    <span style={{ fontSize: 14 }}>&#128241;</span>
                    <span style={{ fontSize: 14 }}>&#128187;</span>
                    <span style={{ fontSize: 14 }}>&#128421;&#65039;</span>
                  </div>
                  <a className="bsec-mock-cta-btn">{T[lang].bs1_mock_btn}</a>
                </div>
              </div>

              {/* Floating badges */}
              <div className="bsec-float-badge bsec-float-badge--tl">
                <span style={{ fontSize: 18 }}>&#9997;&#65039;</span>
                <div>
                  <div className="bfb-ttl">{T[lang].bs1_b1t}</div>
                  <div className="bfb-sub">{T[lang].bs1_b1s}</div>
                </div>
              </div>
              <div className="bsec-float-badge bsec-float-badge--br">
                <span style={{ fontSize: 18 }}>&#128272;</span>
                <div>
                  <div className="bfb-ttl">{T[lang].bs1_b2t}</div>
                  <div className="bfb-sub">{T[lang].bs1_b2s}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bsec-points">
            <div className="bsec-pt rv rv1">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs1_p1t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs1_p1d}</div>
              </div>
            </div>
            <div className="bsec-pt rv rv2">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs1_p2t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs1_p2d}</div>
              </div>
            </div>
            <div className="bsec-pt rv rv3">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs1_p3t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs1_p3d}</div>
              </div>
            </div>
          </div>
          <a href="#features" className="btn btn-p bsec-btn rv rv4">
            {T[lang].bs1_cta}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Section 2b: Document Management ── */
function SectionDocumentManagement({ lang }: { lang: "en" | "es" }) {
  return (
    <section className="section sec-alt bsec">
      <div className="wrap">
        <div className="bsec-grid">
          {/* Image left — dashboard mockup */}
          <div className="bsec-img-wrap rv">
            <div className="bsec-img-card bsec-img-card--b">
              <div className="bsec-dash">
                <div className="bsec-dash-topbar">
                  <div style={{ width: 90, height: 8, borderRadius: 4, background: "var(--bdm)" }}></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ width: 60, height: 22, borderRadius: 6, background: "var(--ib)" }}></div>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--navy)", opacity: 0.8 }}></div>
                  </div>
                </div>

                <div className="bsec-dash-rows">
                  {/* Row 1: Completed */}
                  <div className="bsec-dash-row">
                    <div className="bsec-dash-row-info">
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--navy)", opacity: 0.7, flexShrink: 0 }}></div>
                      <div>
                        <div style={{ width: 140, height: 8, borderRadius: 3, background: "var(--bdm)" }}></div>
                        <div style={{ width: 80, height: 6, borderRadius: 3, background: "var(--bd)", marginTop: 4 }}></div>
                      </div>
                    </div>
                    <div className="dash-status dash-completed">{T[lang].ds_comp}</div>
                  </div>

                  {/* Row 2: Sent (highlighted) */}
                  <div className="bsec-dash-row" style={{ background: "var(--navy)", borderColor: "var(--navy)" }}>
                    <div className="bsec-dash-row-info">
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(255,255,255,.5)", flexShrink: 0 }}></div>
                      <div>
                        <div style={{ width: 120, height: 8, borderRadius: 3, background: "rgba(255,255,255,.3)" }}></div>
                        <div style={{ width: 70, height: 6, borderRadius: 3, background: "rgba(255,255,255,.15)", marginTop: 4 }}></div>
                      </div>
                    </div>
                    <div className="dash-status dash-sent">{T[lang].ds_sent}</div>
                  </div>

                  {/* Row 3: Viewed */}
                  <div className="bsec-dash-row">
                    <div className="bsec-dash-row-info">
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--navy)", opacity: 0.7, flexShrink: 0 }}></div>
                      <div>
                        <div style={{ width: 100, height: 8, borderRadius: 3, background: "var(--bdm)" }}></div>
                        <div style={{ width: 90, height: 6, borderRadius: 3, background: "var(--bd)", marginTop: 4 }}></div>
                      </div>
                    </div>
                    <div className="dash-status dash-viewed">{T[lang].ds_view}</div>
                  </div>

                  {/* Row 4: Draft */}
                  <div className="bsec-dash-row">
                    <div className="bsec-dash-row-info">
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--navy)", opacity: 0.7, flexShrink: 0 }}></div>
                      <div>
                        <div style={{ width: 130, height: 8, borderRadius: 3, background: "var(--bdm)" }}></div>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: "var(--bd)", marginTop: 4 }}></div>
                      </div>
                    </div>
                    <div className="dash-status dash-draft">{T[lang].ds_draft}</div>
                  </div>
                </div>

                {/* Footer stats */}
                <div className="bsec-dash-footer">
                  <div className="bsec-dash-stat">
                    <div className="bds-n">12</div>
                    <div className="bds-l">{T[lang].ds_sent_mo}</div>
                  </div>
                  <div className="bsec-dash-stat">
                    <div className="bds-n" style={{ color: "#28ca41" }}>9</div>
                    <div className="bds-l">{T[lang].ds_signed_mo}</div>
                  </div>
                  <div className="bsec-dash-stat">
                    <div className="bds-n" style={{ color: "var(--amber)" }}>3</div>
                    <div className="bds-l">{T[lang].ds_pend_mo}</div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="bsec-float-badge bsec-float-badge--tr">
                <span style={{ fontSize: 18 }}>&#128202;</span>
                <div>
                  <div className="bfb-ttl">{T[lang].bs2_b1t}</div>
                  <div className="bfb-sub">{T[lang].bs2_b1s}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Text right */}
          <div className="bsec-text rv rv1">
            <div className="sec-lbl">
              <span className="dot">&#9679;</span>
              <span>{T[lang].bs2_lbl}</span>
            </div>
            <h2
              className="sh2"
              dangerouslySetInnerHTML={{ __html: T[lang].bs2_h2 }}
            />
            <p className="bsec-lead">{T[lang].bs2_lead}</p>
          </div>
          <div className="bsec-points">
            <div className="bsec-pt rv rv1">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs2_p1t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs2_p1d}</div>
              </div>
            </div>
            <div className="bsec-pt rv rv2">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs2_p2t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs2_p2d}</div>
              </div>
            </div>
            <div className="bsec-pt rv rv3">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs2_p3t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs2_p3d}</div>
              </div>
            </div>
          </div>
          <a href="#how" className="btn btn-p bsec-btn rv rv4">
            {T[lang].bs2_cta}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Section 2c: Automation ── */
function SectionAutomation({ lang }: { lang: "en" | "es" }) {
  return (
    <section className="section bsec">
      <div className="wrap">
        <div className="bsec-grid bsec-grid--rev">
          {/* Text first (reversed grid) */}
          <div className="bsec-text rv">
            <div className="sec-lbl">
              <span className="dot">&#9679;</span>
              <span>{T[lang].bs3_lbl}</span>
            </div>
            <h2
              className="sh2"
              dangerouslySetInnerHTML={{ __html: T[lang].bs3_h2 }}
            />
            <p className="bsec-lead">{T[lang].bs3_lead}</p>
          </div>

          {/* Image — flow timeline mockup */}
          <div className="bsec-img-wrap rv rv1">
            <div className="bsec-img-card bsec-img-card--c">
              <div className="bsec-flow">
                {/* Step 1: done */}
                <div className="bsec-flow-step bsec-flow-done">
                  <div className="bfs-ico">&#10003;</div>
                  <div>
                    <div className="bfs-ttl">{T[lang].bsf1t}</div>
                    <div className="bfs-sub">{T[lang].bsf1s}</div>
                  </div>
                </div>
                <div className="bsec-flow-line bsec-flow-line--done"></div>

                {/* Step 2: done */}
                <div className="bsec-flow-step bsec-flow-done">
                  <div className="bfs-ico">&#10003;</div>
                  <div>
                    <div className="bfs-ttl">{T[lang].bsf2t}</div>
                    <div className="bfs-sub">{T[lang].bsf2s}</div>
                  </div>
                </div>
                <div className="bsec-flow-line bsec-flow-line--done"></div>

                {/* Step 3: active */}
                <div className="bsec-flow-step bsec-flow-active">
                  <div className="bfs-ico bfs-ico--pulse">&#9679;</div>
                  <div>
                    <div className="bfs-ttl">{T[lang].bsf3t}</div>
                    <div className="bfs-sub">{T[lang].bsf3s}</div>
                  </div>
                </div>
                <div className="bsec-flow-line"></div>

                {/* Step 4: pending */}
                <div className="bsec-flow-step bsec-flow-pending">
                  <div className="bfs-ico bfs-ico--empty">&#9675;</div>
                  <div>
                    <div className="bfs-ttl">{T[lang].bsf4t}</div>
                    <div className="bfs-sub">{T[lang].bsf4s}</div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="bsec-float-badge bsec-float-badge--tl">
                <span style={{ fontSize: 18 }}>&#128276;</span>
                <div>
                  <div className="bfb-ttl">{T[lang].bs3_b1t}</div>
                  <div className="bfb-sub">{T[lang].bs3_b1s}</div>
                </div>
              </div>
              <div className="bsec-float-badge bsec-float-badge--br">
                <span style={{ fontSize: 18 }}>&#9889;</span>
                <div>
                  <div className="bfb-ttl">{T[lang].bs3_b2t}</div>
                  <div className="bfb-sub">{T[lang].bs3_b2s}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bsec-points">
            <div className="bsec-pt rv rv1">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs3_p1t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs3_p1d}</div>
              </div>
            </div>
            <div className="bsec-pt rv rv2">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs3_p2t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs3_p2d}</div>
              </div>
            </div>
            <div className="bsec-pt rv rv3">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs3_p3t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs3_p3d}</div>
              </div>
            </div>
          </div>
          <a href="#how" className="btn btn-p bsec-btn rv rv4">
            {T[lang].bs3_cta}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Section 2d: Legal Protection ── */
function SectionLegalProtection({ lang }: { lang: "en" | "es" }) {
  return (
    <section className="section sec-alt bsec">
      <div className="wrap">
        <div className="bsec-grid bsec-grid--rev">
          {/* Image first (reversed grid) */}
          <div className="bsec-img-wrap rv">
            <div className="bsec-img-card bsec-img-card--d">
              <div className="bsec-cert">
                {/* Certificate header */}
                <div className="bsec-cert-header">
                  <div style={{ fontSize: 24 }}>&#128737;&#65039;</div>
                  <div>
                    <div className="bsc-ttl">{T[lang].bsc_ttl}</div>
                    <div className="bsc-sub">{T[lang].bsc_sub}</div>
                  </div>
                </div>

                {/* Certificate rows */}
                <div className="bsec-cert-rows">
                  <div className="bsc-row">
                    <span className="bsc-lbl">{T[lang].bsc_doc}</span>
                    <span className="bsc-val">Construction Contract #0042</span>
                  </div>
                  <div className="bsc-row">
                    <span className="bsc-lbl">{T[lang].bsc_sig}</span>
                    <span className="bsc-val">John Smith</span>
                  </div>
                  <div className="bsc-row">
                    <span className="bsc-lbl">{T[lang].bsc_ts}</span>
                    <span className="bsc-val">Apr 11, 2026 &middot; 14:32 UTC</span>
                  </div>
                  <div className="bsc-row">
                    <span className="bsc-lbl">{T[lang].bsc_ip}</span>
                    <span className="bsc-val">192.168.1.xxx</span>
                  </div>
                  <div className="bsc-row">
                    <span className="bsc-lbl">{T[lang].bsc_dev}</span>
                    <span className="bsc-val">iPhone 15 &middot; Safari</span>
                  </div>
                </div>

                {/* Certificate footer badges */}
                <div className="bsec-cert-footer">
                  <div className="bsc-badge">{T[lang].bsc_esign}</div>
                  <div className="bsc-badge">{T[lang].bsc_tamper}</div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="bsec-float-badge bsec-float-badge--tr">
                <span style={{ fontSize: 18 }}>&#128220;</span>
                <div>
                  <div className="bfb-ttl">{T[lang].bs4_b1t}</div>
                  <div className="bfb-sub">{T[lang].bs4_b1s}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="bsec-text rv rv1">
            <div className="sec-lbl">
              <span className="dot">&#9679;</span>
              <span>{T[lang].bs4_lbl}</span>
            </div>
            <h2
              className="sh2"
              dangerouslySetInnerHTML={{ __html: T[lang].bs4_h2 }}
            />
            <p className="bsec-lead">{T[lang].bs4_lead}</p>
          </div>
          <div className="bsec-points">
            <div className="bsec-pt rv rv1">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs4_p1t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs4_p1d}</div>
              </div>
            </div>
            <div className="bsec-pt rv rv2">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs4_p2t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs4_p2d}</div>
              </div>
            </div>
            <div className="bsec-pt rv rv3">
              <div className="bsec-pt-ico">&#10022;</div>
              <div>
                <div className="bsec-pt-ttl">{T[lang].bs4_p3t}</div>
                <div className="bsec-pt-dsc">{T[lang].bs4_p3d}</div>
              </div>
            </div>
          </div>
          <a href="#faq" className="btn btn-p bsec-btn rv rv4">
            {T[lang].bs4_cta}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── Main export ── */
export function BenefitSections() {
  const { lang } = useLang();

  return (
    <>
      <SectionClientExperience lang={lang} />
      <SectionDocumentManagement lang={lang} />
      <SectionAutomation lang={lang} />
      <SectionLegalProtection lang={lang} />
    </>
  );
}
