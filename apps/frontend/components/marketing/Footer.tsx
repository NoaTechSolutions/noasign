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

            <div className="foot-contact">
              <h4>{T[lang].fcgt}</h4>
              <a href="tel:+15107786601" aria-label="Phone">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                </svg>
                <span>(510) 778-6601</span>
              </a>
              <a
                href="https://wa.me/15107786601"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
                <span>WhatsApp</span>
              </a>
              <a href="mailto:contact@noatechsolutions.com" aria-label="Email">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span>contact@noatechsolutions.com</span>
              </a>
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
                <li><a href="/#contact">{T[lang].f_cnt}</a></li>
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
