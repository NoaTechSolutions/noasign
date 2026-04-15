"use client";

import { useState } from "react";
import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

export function HowItWorks() {
  const { lang } = useLang();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="section sec-alt" id="how">
      <div className="wrap">
        <div className="sec-lbl rv" style={{ justifyContent: "center" }}>
          <span className="dot">&#9679;</span>
          <span>{T[lang].hl}</span>
        </div>
        <h2
          className="sh2 rv"
          style={{ textAlign: "center" }}
          dangerouslySetInnerHTML={{ __html: T[lang].hh2 }}
        />
        <p
          className="ssub rv"
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          {T[lang].how_sub}
        </p>

        <div className="how-stepper">
          {/* Step 01 */}
          <div
            className={`how-step${activeStep === 0 ? " how-step--active" : ""}`}
            onClick={() => setActiveStep(0)}
          >
            <div className="how-step-left">
              <div className="how-step-num">
                <span className="hsn-num">01</span>
                <div className="hsn-ring"></div>
              </div>
              <div className="how-step-line"></div>
            </div>
            <div className="how-step-content">
              <div className="how-step-header">
                <div className="how-step-icon">📝</div>
                <div>
                  <div className="how-step-ttl">{T[lang].s1t}</div>
                  <div className="how-step-tag">{T[lang].s1tag}</div>
                </div>
              </div>
              <div className="how-step-body">
                <p>{T[lang].s1d}</p>
                <div className="how-step-preview">
                  <div className="hsp-form">
                    <div className="hsp-field">
                      <div className="hsp-label">{T[lang].s1f1}</div>
                      <div className="hsp-input hsp-input--filled">
                        John Smith
                      </div>
                    </div>
                    <div className="hsp-field">
                      <div className="hsp-label">{T[lang].s1f2}</div>
                      <div className="hsp-input hsp-input--filled">
                        john@smithconstruction.com
                      </div>
                    </div>
                    <div className="hsp-field">
                      <div className="hsp-label">{T[lang].s1f3}</div>
                      <div className="hsp-input hsp-input--filled hsp-input--amount">
                        $15,000
                      </div>
                    </div>
                    <div className="hsp-send-btn">{T[lang].s1btn}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 02 */}
          <div
            className={`how-step${activeStep === 1 ? " how-step--active" : ""}`}
            onClick={() => setActiveStep(1)}
          >
            <div className="how-step-left">
              <div className="how-step-num">
                <span className="hsn-num">02</span>
                <div className="hsn-ring"></div>
              </div>
              <div className="how-step-line"></div>
            </div>
            <div className="how-step-content">
              <div className="how-step-header">
                <div className="how-step-icon">📧</div>
                <div>
                  <div className="how-step-ttl">{T[lang].s2t}</div>
                  <div className="how-step-tag">{T[lang].s2tag}</div>
                </div>
              </div>
              <div className="how-step-body">
                <p>{T[lang].s2d}</p>
                <div className="how-step-preview">
                  <div className="hsp-email">
                    <div className="hsp-email-header">
                      <div className="hsp-email-from">{T[lang].s2from}</div>
                      <div className="hsp-email-subj">{T[lang].s2subj}</div>
                    </div>
                    <div className="hsp-email-body">
                      <div className="hsp-email-line"></div>
                      <div
                        className="hsp-email-line"
                        style={{ width: "80%" }}
                      ></div>
                      <div className="hsp-email-cta">{T[lang].s2cta}</div>
                      <div
                        className="hsp-email-line"
                        style={{ width: "60%", marginTop: 8 }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 03 */}
          <div
            className={`how-step how-step--last${activeStep === 2 ? " how-step--active" : ""}`}
            onClick={() => setActiveStep(2)}
          >
            <div className="how-step-left">
              <div className="how-step-num">
                <span className="hsn-num">03</span>
                <div className="hsn-ring"></div>
              </div>
            </div>
            <div className="how-step-content">
              <div className="how-step-header">
                <div className="how-step-icon">&#10004;&#65039;</div>
                <div>
                  <div className="how-step-ttl">{T[lang].s3t}</div>
                  <div className="how-step-tag">{T[lang].s3tag}</div>
                </div>
              </div>
              <div className="how-step-body">
                <p>{T[lang].s3d}</p>
                <div className="how-step-preview">
                  <div className="hsp-status">
                    <div className="hsp-status-row hsp-status--done">
                      <div className="hsp-status-dot hsp-status-dot--done"></div>
                      <span>{T[lang].hss1}</span>
                      <span className="hsp-status-time">{T[lang].hss1t}</span>
                    </div>
                    <div className="hsp-status-row hsp-status--done">
                      <div className="hsp-status-dot hsp-status-dot--done"></div>
                      <span>{T[lang].hss2}</span>
                      <span className="hsp-status-time">{T[lang].hss2t}</span>
                    </div>
                    <div className="hsp-status-row hsp-status--done">
                      <div className="hsp-status-dot hsp-status-dot--done"></div>
                      <span>{T[lang].hss3}</span>
                      <span className="hsp-status-time">{T[lang].hss3t}</span>
                    </div>
                    <div className="hsp-status-row hsp-status--active">
                      <div className="hsp-status-dot hsp-status-dot--active"></div>
                      <span>{T[lang].hss4}</span>
                      <span className="hsp-status-time hsp-status-time--active">
                        {T[lang].hss4t}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
