"use client";

/**
 * Login brand panel — left column on laptop+ (>=1024px).
 *
 * Visual reference: designer's mocks at the open-design login folder.
 * Three variants drive the SVG + headline/eyebrow/trust copy:
 *   · "default" — login.html (document being signed + SOC2/eIDAS/GDPR)
 *   · "approval" — request-access.html (approval queue + SOC2/eIDAS/GDPR)
 *   · "security" — forgot-password.html (security event log + AES/TLS/Tamper)
 *
 * Hidden below 1024px — page.tsx handles the responsive grid.
 */

type Variant = "default" | "approval" | "security";

export function LoginPanel({ variant = "default" }: { variant?: Variant } = {}) {
  const copy = COPY[variant];

  return (
    <aside
      aria-label="Product preview"
      className="relative hidden overflow-hidden text-white isolation-isolate lg:block"
      style={{
        background: "var(--panel-bg, linear-gradient(135deg, #022977 0%, #0400f0 100%))",
        padding: "clamp(48px, 6vw, 72px) clamp(40px, 4vw, 64px)",
      }}
    >
      {/* Glow orbs */}
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
          <div className="text-base font-medium tracking-[-0.005em] text-white">NTSsign</div>
        </header>

        <div className="mt-auto flex flex-col gap-4">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            <span className="inline-block h-[1px] w-6" style={{ background: "#ff9900" }} />
            {copy.eyebrow}
          </span>
          <h1
            className="m-0 font-medium leading-[1.15] tracking-[-0.02em]"
            style={{ fontSize: "clamp(28px, 3vw, 44px)" }}
            dangerouslySetInnerHTML={{ __html: copy.titleHtml }}
          />
          <p
            className="m-0 max-w-[38ch] font-normal leading-[1.6]"
            style={{ color: "rgba(255,255,255,0.78)", fontSize: "clamp(15px, 1.2vw, 17px)" }}
          >
            {copy.sub}
          </p>
        </div>

        <div className="relative my-2 grid min-h-[280px] w-full flex-1 place-items-center">
          {variant === "approval" ? (
            <ApprovalSvg />
          ) : variant === "security" ? (
            <SecuritySvg />
          ) : (
            <DocumentSvg />
          )}
        </div>

        <div
          className="mt-auto flex flex-wrap items-center gap-[18px] pt-5"
          style={{ borderTop: "0.5px solid rgba(255,255,255,0.16)" }}
        >
          {copy.trust.map((label) => (
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

const COPY: Record<Variant, { eyebrow: string; titleHtml: string; sub: string; trust: string[] }> = {
  default: {
    eyebrow: "E-signature platform",
    titleHtml:
      'Sign in <em class="not-italic" style="color:#ff9900">seconds</em>.<br/>Close in minutes.',
    sub: "Send, track and close legally binding documents — without leaving your browser.",
    trust: ["SOC 2 Type II", "eIDAS & ESIGN", "GDPR · HIPAA"],
  },
  approval: {
    eyebrow: "Request access",
    titleHtml:
      'Built for teams that need <em class="not-italic" style="color:#ff9900">certainty</em>.',
    sub: "Tell us about your workflow. We'll set up your workspace and have you sending documents within 1-2 business days.",
    trust: ["SOC 2 Type II", "eIDAS & ESIGN", "GDPR · HIPAA"],
  },
  security: {
    eyebrow: "Account recovery",
    titleHtml:
      'Recovery, fully <em class="not-italic" style="color:#ff9900">audited</em>.',
    sub: "Every recovery event is cryptographically signed and stored in a tamper-evident log.",
    trust: ["AES-256 at rest", "TLS 1.3 in transit", "Tamper-evident log"],
  },
};

// ---------- SVG: default login (document being signed) ----------
function DocumentSvg() {
  return (
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
      <g transform="translate(180, 50) rotate(6)">
        <rect width="240" height="300" rx="12" fill="#ffffff" opacity="0.32" />
        <rect width="240" height="32" rx="12" fill="#ffffff" opacity="0.20" />
      </g>
      <g transform="translate(70, 30)">
        <rect width="280" height="330" rx="14" fill="#ffffff" />
        <rect width="280" height="44" rx="14" fill="url(#docBar)" />
        <path d="M0 30 L0 44 L280 44 L280 30 Z" fill="url(#docBar)" />
        <rect x="18" y="16" width="14" height="14" rx="3" fill="#ffffff" opacity="0.95" />
        <text x="40" y="27" fontFamily="-apple-system, system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#ffffff" letterSpacing="0.3">
          NTSsign · Service Agreement
        </text>
        <rect x="20" y="64" width="140" height="10" rx="5" fill="#022977" opacity="0.85" />
        <rect x="20" y="82" width="80" height="6" rx="3" fill="#022977" opacity="0.30" />
        <rect x="20" y="110" width="240" height="5" rx="2.5" fill="#022977" opacity="0.18" />
        <rect x="20" y="124" width="220" height="5" rx="2.5" fill="#022977" opacity="0.18" />
        <rect x="20" y="138" width="232" height="5" rx="2.5" fill="#022977" opacity="0.18" />
        <rect x="20" y="152" width="180" height="5" rx="2.5" fill="#022977" opacity="0.18" />
        <rect x="20" y="178" width="240" height="5" rx="2.5" fill="#022977" opacity="0.18" />
        <rect x="20" y="192" width="200" height="5" rx="2.5" fill="#022977" opacity="0.18" />
        <rect x="20" y="206" width="160" height="5" rx="2.5" fill="#022977" opacity="0.18" />
        <rect x="20" y="234" width="240" height="80" rx="8" fill="#f0f4ff" stroke="#022977" strokeOpacity="0.18" strokeWidth="0.5" strokeDasharray="4 4" />
        <text x="28" y="248" fontFamily="-apple-system, system-ui, sans-serif" fontSize="9" fontWeight="500" fill="#022977" fillOpacity="0.5" letterSpacing="0.5">
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
      <g transform="translate(280, 38)">
        <rect width="148" height="42" rx="21" fill="#ffffff" />
        <rect width="148" height="42" rx="21" fill="none" stroke="#022977" strokeOpacity="0.10" strokeWidth="0.5" />
        <circle cx="22" cy="21" r="11" fill="#22c55e" />
        <path d="M 17 21 L 21 25 L 28 18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="40" y="19" fontFamily="-apple-system, system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#022977">Signed</text>
        <text x="40" y="32" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">2 of 3 · just now</text>
      </g>
      <g transform="translate(20, 280)">
        <rect width="172" height="56" rx="14" fill="#ffffff" />
        <rect width="172" height="56" rx="14" fill="none" stroke="#022977" strokeOpacity="0.10" strokeWidth="0.5" />
        <circle cx="32" cy="28" r="16" fill="#ff9900" />
        <text x="32" y="33" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontSize="13" fontWeight="500" fill="#ffffff">SC</text>
        <text x="56" y="26" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">Sarah Chen</text>
        <text x="56" y="40" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Legal Counsel</text>
        <circle cx="156" cy="28" r="4" fill="#22c55e" />
      </g>
      <g transform="translate(310, 240)">
        <rect width="138" height="34" rx="17" fill="#022977" />
        <circle cx="20" cy="17" r="4" fill="#ff9900" />
        <text x="32" y="21" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="500" fill="#ffffff" letterSpacing="0.4">Audit trail · live</text>
      </g>
    </svg>
  );
}

// ---------- SVG: approval queue (request-access) ----------
function ApprovalSvg() {
  return (
    <svg
      viewBox="0 0 480 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-[460px]"
      style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.25))" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="docBarRA" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#022977" />
          <stop offset="100%" stopColor="#0400f0" />
        </linearGradient>
      </defs>
      <g transform="translate(60, 30)">
        <rect width="360" height="320" rx="14" fill="#ffffff" />
        <rect width="360" height="48" rx="14" fill="url(#docBarRA)" />
        <path d="M0 34 L0 48 L360 48 L360 34 Z" fill="url(#docBarRA)" />
        <rect x="20" y="18" width="14" height="14" rx="3" fill="#ffffff" opacity="0.95" />
        <text x="42" y="29" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#ffffff" letterSpacing="0.3">
          Approval queue · 3 pending
        </text>
        {/* Tabs */}
        <rect x="20" y="62" width="68" height="22" rx="11" fill="#022977" />
        <text x="54" y="77" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="500" fill="#ffffff">Pending</text>
        <text x="110" y="77" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Signed</text>
        <text x="160" y="77" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Drafts</text>
        <text x="208" y="77" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Archived</text>
        {/* Row 1 */}
        <rect x="20" y="100" width="320" height="58" rx="10" fill="#f0f4ff" />
        <circle cx="40" cy="129" r="14" fill="#ff9900" />
        <text x="40" y="134" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#ffffff">AB</text>
        <text x="62" y="124" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">Service Agreement · v3</text>
        <text x="62" y="138" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Alex Brown · waiting for legal</text>
        <rect x="240" y="116" width="84" height="22" rx="11" fill="#022977" />
        <text x="282" y="131" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="500" fill="#ffffff">Review</text>
        {/* Row 2 (highlighted) */}
        <rect x="20" y="166" width="320" height="58" rx="10" fill="#ffffff" stroke="#022977" strokeOpacity="0.20" strokeWidth="0.5" />
        <rect x="20" y="166" width="3" height="58" rx="1.5" fill="#022977" />
        <circle cx="40" cy="195" r="14" fill="#022977" />
        <text x="40" y="200" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#ffffff">SC</text>
        <text x="62" y="190" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">NDA · Acme Construction</text>
        <text x="62" y="204" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Sarah Chen · ready to send</text>
        <rect x="232" y="182" width="92" height="22" rx="11" fill="#ff9900" />
        <text x="278" y="197" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="500" fill="#ffffff">Send now</text>
        {/* Row 3 */}
        <rect x="20" y="232" width="320" height="58" rx="10" fill="#f0f4ff" />
        <circle cx="40" cy="261" r="14" fill="#22c55e" />
        <path d="M 33 261 L 38 266 L 47 257" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="62" y="256" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">Invoice #2476</text>
        <text x="62" y="270" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Signed by 3 of 3 · audit complete</text>
        <rect x="246" y="248" width="78" height="22" rx="11" fill="none" stroke="#022977" strokeOpacity="0.20" strokeWidth="0.5" />
        <text x="285" y="263" textAnchor="middle" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="500" fill="#022977" fillOpacity="0.7">Open</text>
      </g>
      {/* Floating chip: live count */}
      <g transform="translate(330, 20)">
        <rect width="124" height="34" rx="17" fill="#ffffff" />
        <rect width="124" height="34" rx="17" fill="none" stroke="#022977" strokeOpacity="0.10" strokeWidth="0.5" />
        <circle cx="18" cy="17" r="4" fill="#22c55e" />
        <text x="30" y="21" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="500" fill="#022977" letterSpacing="0.3">12 signed today</text>
      </g>
    </svg>
  );
}

// ---------- SVG: security event log (forgot-password) ----------
function SecuritySvg() {
  return (
    <svg
      viewBox="0 0 480 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-[460px]"
      style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.25))" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#022977" />
          <stop offset="100%" stopColor="#0400f0" />
        </linearGradient>
        <linearGradient id="cardEdge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#022977" />
          <stop offset="100%" stopColor="#0400f0" />
        </linearGradient>
      </defs>
      <g transform="translate(60, 24)">
        <rect width="320" height="332" rx="16" fill="#ffffff" />
        <rect width="320" height="48" rx="16" fill="url(#cardEdge)" />
        <path d="M0 32 L0 48 L320 48 L320 32 Z" fill="url(#cardEdge)" />
        <text x="22" y="30" fontFamily="-apple-system, system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#ffffff" letterSpacing="0.4">Security event log</text>
        <rect x="280" y="14" width="22" height="22" rx="11" fill="rgba(255,255,255,0.18)" />
        <circle cx="291" cy="25" r="3.5" fill="#ff9900" />
        {/* entry 1 */}
        <circle cx="32" cy="84" r="9" fill="#022977" />
        <path d="M27 84 L31 88 L37 81" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="32" y1="93" x2="32" y2="130" stroke="#022977" strokeOpacity="0.18" strokeWidth="0.5" strokeDasharray="3 3" />
        <text x="52" y="80" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">Reset link requested</text>
        <text x="52" y="94" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">sarah@buildco.com · 2:14 PM</text>
        {/* entry 2 */}
        <circle cx="32" cy="146" r="9" fill="#022977" />
        <path d="M27 146 L31 150 L37 143" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="32" y1="155" x2="32" y2="192" stroke="#022977" strokeOpacity="0.18" strokeWidth="0.5" strokeDasharray="3 3" />
        <text x="52" y="142" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">Email delivered &amp; opened</text>
        <text x="52" y="156" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">IP 192.168.1.42 · 2:15 PM</text>
        {/* entry 3 */}
        <circle cx="32" cy="208" r="9" fill="#022977" />
        <path d="M27 208 L31 212 L37 205" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="32" y1="217" x2="32" y2="254" stroke="#022977" strokeOpacity="0.18" strokeWidth="0.5" strokeDasharray="3 3" />
        <text x="52" y="204" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">Link verified · single-use token</text>
        <text x="52" y="218" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Expires in 14:32 · 2:15 PM</text>
        {/* entry 4 (in progress) */}
        <circle cx="32" cy="270" r="9" fill="#ff9900" />
        <circle cx="32" cy="270" r="9" fill="none" stroke="#ff9900" strokeOpacity="0.30" strokeWidth="6" />
        <text x="52" y="266" fontFamily="-apple-system, system-ui, sans-serif" fontSize="12" fontWeight="500" fill="#022977">New password being set...</text>
        <text x="52" y="280" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">AES-256 · hashed at rest</text>
        {/* footer chip */}
        <rect x="20" y="296" width="280" height="22" rx="11" fill="#022977" fillOpacity="0.06" />
        <circle cx="32" cy="307" r="4" fill="#16a34a" />
        <text x="44" y="311" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="500" fill="#022977">All events cryptographically signed</text>
      </g>
      {/* Floating chip: shield */}
      <g transform="translate(330, 0)">
        <rect x="0" y="8" width="118" height="48" rx="14" fill="#ffffff" />
        <rect x="0" y="8" width="118" height="48" rx="14" fill="none" stroke="#022977" strokeOpacity="0.10" strokeWidth="0.5" />
        <g transform="translate(14, 18)">
          <path d="M14 0 L26 5 V14 C26 21 20 26 14 28 C8 26 2 21 2 14 V5 Z" fill="url(#shieldFill)" />
          <path d="M8 14 L12 18 L20 10" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
        <text x="50" y="29" fontFamily="-apple-system, system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#022977">SOC 2 vault</text>
        <text x="50" y="42" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#022977" fillOpacity="0.55">Zero-knowledge</text>
      </g>
      {/* Floating chip: key */}
      <g transform="translate(0, 296)">
        <rect width="148" height="56" rx="14" fill="#022977" />
        <g transform="translate(16, 18)" stroke="#ff9900" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <circle cx="6" cy="10" r="5" />
          <line x1="11" y1="10" x2="24" y2="10" />
          <line x1="20" y1="10" x2="20" y2="14" />
          <line x1="24" y1="10" x2="24" y2="14" />
        </g>
        <text x="56" y="32" fontFamily="-apple-system, system-ui, sans-serif" fontSize="11" fontWeight="500" fill="#ffffff">Single-use</text>
        <text x="56" y="46" fontFamily="-apple-system, system-ui, sans-serif" fontSize="10" fontWeight="400" fill="#ffffff" fillOpacity="0.7">Expires in 15 min</text>
      </g>
    </svg>
  );
}
