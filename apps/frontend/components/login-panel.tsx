"use client";

/**
 * Login brand panel — left column on laptop+ (≥1024px).
 *
 * Visual reference: designer's `login/login.html` (lines 728-849).
 * Renders: brand wordmark, eyebrow + headline + subtitle, an SVG mockup
 * of a document being signed with floating chips, and a trust strip
 * (SOC 2, eIDAS, GDPR).
 *
 * Hidden below 1024px — page.tsx handles the responsive grid.
 */

export function LoginPanel() {
  return (
    <aside
      aria-label="Product preview"
      className="relative hidden overflow-hidden text-white isolation-isolate lg:block"
      style={{
        background: "var(--panel-bg, linear-gradient(135deg, #022977 0%, #0400f0 100%))",
        padding: "clamp(48px, 6vw, 72px) clamp(40px, 4vw, 64px)",
      }}
    >
      {/* Glow orbs — top-left sky + bottom-right amber */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full opacity-70 blur-[60px]"
        style={{ background: "rgba(5,165,255,0.55)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full opacity-60 blur-[60px]"
        style={{ background: "rgba(255,153,0,0.35)" }}
      />

      <div className="relative z-10 mx-auto flex h-full max-w-[600px] flex-col gap-8">
        {/* Brand row */}
        <header className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-[7px] text-sm font-medium tracking-[0.02em] backdrop-blur"
            style={{
              background: "rgba(255,255,255,0.14)",
              border: "0.5px solid rgba(255,255,255,0.20)",
              color: "#ffffff",
            }}
            aria-hidden
          >
            NT
          </div>
          <div className="text-base font-medium tracking-[-0.005em] text-white">
            NTSsign
          </div>
        </header>

        {/* Headline block — pushed to mid-height via mt-auto */}
        <div className="mt-auto flex flex-col gap-4">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            <span
              className="inline-block h-[1px] w-6"
              style={{ background: "#ff9900" }}
            />
            E-signature platform
          </span>
          <h1
            className="m-0 font-medium leading-[1.15] tracking-[-0.02em]"
            style={{ fontSize: "clamp(28px, 3vw, 44px)" }}
          >
            Sign in <em className="not-italic" style={{ color: "#ff9900" }}>seconds</em>
            .<br />
            Close in minutes.
          </h1>
          <p
            className="m-0 max-w-[38ch] font-normal leading-[1.6]"
            style={{ color: "rgba(255,255,255,0.78)", fontSize: "clamp(15px, 1.2vw, 17px)" }}
          >
            Send, track and close legally binding documents — without leaving
            your browser.
          </p>
        </div>

        {/* Visual mockup — document being signed */}
        <div className="relative my-2 grid min-h-[280px] w-full flex-1 place-items-center">
          <svg
            viewBox="0 0 480 380"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-auto w-full max-w-[460px]"
            style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.25))" }}
            aria-hidden
          >
            <defs>
              <linearGradient id="docBar" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#022977" />
                <stop offset="100%" stopColor="#0400f0" />
              </linearGradient>
              <linearGradient id="sigStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#022977" />
                <stop offset="100%" stopColor="#ff9900" />
              </linearGradient>
            </defs>

            {/* Back card (tilted, peeking) */}
            <g transform="translate(180, 50) rotate(6)">
              <rect width="240" height="300" rx="12" fill="#ffffff" opacity="0.32" />
              <rect width="240" height="32" rx="12" fill="#ffffff" opacity="0.20" />
            </g>

            {/* Main document card */}
            <g transform="translate(70, 30)">
              <rect width="280" height="330" rx="14" fill="#ffffff" />
              <rect width="280" height="44" rx="14" fill="url(#docBar)" />
              <path d="M0 30 L0 44 L280 44 L280 30 Z" fill="url(#docBar)" />
              <rect x="18" y="16" width="14" height="14" rx="3" fill="#ffffff" opacity="0.95" />
              <text
                x="40"
                y="27"
                fontFamily="-apple-system, system-ui, sans-serif"
                fontSize="11"
                fontWeight="500"
                fill="#ffffff"
                letterSpacing="0.3"
              >
                NTSsign · Service Agreement
              </text>

              {/* Title */}
              <rect x="20" y="64" width="140" height="10" rx="5" fill="#022977" opacity="0.85" />
              <rect x="20" y="82" width="80" height="6" rx="3" fill="#022977" opacity="0.30" />

              {/* Body lines */}
              <rect x="20" y="110" width="240" height="5" rx="2.5" fill="#022977" opacity="0.18" />
              <rect x="20" y="124" width="220" height="5" rx="2.5" fill="#022977" opacity="0.18" />
              <rect x="20" y="138" width="232" height="5" rx="2.5" fill="#022977" opacity="0.18" />
              <rect x="20" y="152" width="180" height="5" rx="2.5" fill="#022977" opacity="0.18" />
              <rect x="20" y="178" width="240" height="5" rx="2.5" fill="#022977" opacity="0.18" />
              <rect x="20" y="192" width="200" height="5" rx="2.5" fill="#022977" opacity="0.18" />
              <rect x="20" y="206" width="160" height="5" rx="2.5" fill="#022977" opacity="0.18" />

              {/* Signature box */}
              <rect
                x="20"
                y="234"
                width="240"
                height="80"
                rx="8"
                fill="#f0f4ff"
                stroke="#022977"
                strokeOpacity="0.18"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
              <text
                x="28"
                y="248"
                fontFamily="-apple-system, system-ui, sans-serif"
                fontSize="9"
                fontWeight="500"
                fill="#022977"
                fillOpacity="0.5"
                letterSpacing="0.5"
              >
                SIGN HERE
              </text>
              <path
                d="M 40 290 C 55 270, 70 305, 85 285 S 110 265, 125 290 Q 140 305 155 280 T 195 285 Q 215 295 235 275"
                stroke="url(#sigStroke)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <line x1="32" y1="304" x2="248" y2="304" stroke="#022977" strokeOpacity="0.25" strokeWidth="0.5" />
            </g>

            {/* Floating chip: Signed (top-right) */}
            <g transform="translate(280, 38)">
              <rect width="148" height="42" rx="21" fill="#ffffff" />
              <rect width="148" height="42" rx="21" fill="none" stroke="#022977" strokeOpacity="0.10" strokeWidth="0.5" />
              <circle cx="22" cy="21" r="11" fill="#22c55e" />
              <path d="M 17 21 L 21 25 L 28 18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <text x="40" y="19" fontFamily="-apple-system, system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#022977">
                Signed
              </text>
              <text x="40" y="32" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">
                2 of 3 · just now
              </text>
            </g>

            {/* Floating chip: signer avatar (bottom-left) */}
            <g transform="translate(20, 280)">
              <rect width="172" height="56" rx="14" fill="#ffffff" />
              <rect width="172" height="56" rx="14" fill="none" stroke="#022977" strokeOpacity="0.10" strokeWidth="0.5" />
              <circle cx="32" cy="28" r="16" fill="#ff9900" />
              <text x="32" y="33" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontSize="13" fontWeight="500" fill="#ffffff">
                SC
              </text>
              <text x="56" y="26" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">
                Sarah Chen
              </text>
              <text x="56" y="40" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">
                Legal Counsel
              </text>
              <circle cx="156" cy="28" r="4" fill="#22c55e" />
            </g>

            {/* Floating chip: audit trail (right edge) */}
            <g transform="translate(310, 240)">
              <rect width="138" height="34" rx="17" fill="#022977" />
              <circle cx="20" cy="17" r="4" fill="#ff9900" />
              <text x="32" y="21" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="500" fill="#ffffff" letterSpacing="0.4">
                Audit trail · live
              </text>
            </g>
          </svg>
        </div>

        {/* Trust strip */}
        <div
          className="mt-auto flex flex-wrap items-center gap-[18px] pt-5"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.16)" }}
        >
          {[
            "SOC 2 Type II",
            "eIDAS & ESIGN",
            "GDPR · HIPAA",
          ].map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[11px] w-[11px] flex-shrink-0"
                style={{ color: "#ff9900" }}
                aria-hidden
              >
                <path d="m5 12 5 5L20 7" />
              </svg>
              {label}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
