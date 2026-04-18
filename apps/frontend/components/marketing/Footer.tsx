"use client";

import { useLang } from "./LandingContext";
import { T } from "../../lib/landing-i18n";

export function Footer() {
  const { lang } = useLang();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-grid">
          {/* Brand column */}
          <div className="foot-brand">
            <img
              className="foot-logo logo-light"
              src="/img/NTSSign_AzulDark_SinFondo.svg"
              alt="NTSsign"
              width={160}
              height={48}
            />
            <img
              className="foot-logo logo-dark-img"
              src="/img/NTSSign_blanco_SinFondo.svg"
              alt="NTSsign"
              width={160}
              height={48}
              style={{ display: "none" }}
            />
            <p className="foot-tag">{T[lang].ftag}</p>
            <div className="foot-mail">
              <a href="mailto:support@noatechsolutions.com">support@noatechsolutions.com</a>
            </div>
            <div className="foot-social">
              <a
                href="https://www.facebook.com/profile.php?id=100094174190829"
                className="foot-soc-ico"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/noatechsolutions/"
                className="foot-soc-ico"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://twitter.com/noatechsolution"
                className="foot-soc-ico"
                aria-label="X / Twitter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@noatechsolutions"
                className="foot-soc-ico"
                aria-label="TikTok"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/company/noatechsolutions"
                className="foot-soc-ico"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://share.google/Z70hgLNOKhBUjOyfO"
                className="foot-soc-ico"
                aria-label="Google Business"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35 11.1H12.18V13.83H18.69C18.36 17.64 15.19 19.27 12.19 19.27C8.36 19.27 5 16.25 5 12C5 7.9 8.2 4.73 12.19 4.73C15.29 4.73 17.1 6.7 17.1 6.7L19 4.72C19 4.72 16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12C2.03 17.05 6.16 22 12.25 22C17.6 22 21.5 18.33 21.5 12.91C21.5 11.76 21.35 11.1 21.35 11.1Z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="foot-col-group">
            {/* Product */}
            <div className="foot-col">
              <h3 className="foot-col-title">{T[lang].fcprod}</h3>
              <ul>
                <li><a href="#features">{T[lang].nav_f}</a></li>
                <li><a href="#how">{T[lang].nav_h || "How it works"}</a></li>
                <li><a href="#pricing">{T[lang].nav_pr}</a></li>
                <li><a href="#faq">{T[lang].f_faq}</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="foot-col">
              <h3 className="foot-col-title">{T[lang].fcres}</h3>
              <ul>
                <li><a href="#how">{T[lang].f_gs}</a></li>
                <li><a href="#faq">{T[lang].f_doc}</a></li>
                <li><a href="#features">{T[lang].f_sig}</a></li>
                <li><a href="#faq">{T[lang].f_leg}</a></li>
              </ul>
            </div>

            {/* Company */}
            <div className="foot-col">
              <h3 className="foot-col-title">{T[lang].fcco}</h3>
              <ul>
                <li><a href="https://noatechsolutions.com/nosotros/" target="_blank" rel="noopener noreferrer">{T[lang].f_abt}</a></li>
                <li><a href="/privacy">{T[lang].f_prv}</a></li>
                <li><a href="/terms">{T[lang].f_trm}</a></li>
                <li><a href="mailto:support@noatechsolutions.com">{T[lang].f_cnt}</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="foot-bottom">
          <span className="foot-copy">{T[lang].fcop}</span>
          <div className="foot-powered">Powered by <strong>NoaTechSolutions</strong></div>
          <div className="foot-legal">
            <a href="/privacy">{T[lang].f_prv}</a>
            <a href="/terms">{T[lang].f_trm}</a>
            <a href="/cookies">{T[lang].f_coo}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
