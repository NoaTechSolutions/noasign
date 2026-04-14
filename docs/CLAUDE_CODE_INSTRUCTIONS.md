# NTSsign Landing Page — Claude Code Implementation Instructions

> **Purpose:** Reproduce `ntssign-landing-v3.html` exactly in the NTSsign frontend (Next.js 16 / React 19 / Tailwind 4). Be precise — this document describes every design decision, component, animation, and interaction.

---

## 1. FILE REFERENCE

The canonical source is `/mnt/user-data/outputs/ntssign-landing-v3.html` (~195KB, single-file implementation):
- CSS: ~68KB of custom styles using CSS custom properties
- HTML body: ~80KB of section markup
- JS: ~45KB (i18n, theme, billing toggle, FAQ accordion, carousels, parallax, 3D effects)

Copy this file to the project and reference it as truth for any ambiguity.

---

## 2. DESIGN TOKENS (CSS custom properties)

Defined on `:root`, toggled by adding `.dark` to `<html>`:

```css
/* Brand */
--navy: #022977       /* primary CTA, headings, links */
--electric: #0400f0   /* hover of primary button ONLY */
--sky: #05a5ff        /* dark mode primary */
--amber: #ff9900      /* accent, secondary CTA, highlights */
--amber-h: #cc7a00    /* amber hover */

/* Light mode backgrounds */
--bg: #ffffff
--bg-s: #f0f4ff       /* hero, alternating sections */
--bg-c: #f7f8fa       /* cards, inputs */

/* Dark mode backgrounds */
--bg: #0b0f1a
--bg-s: #0f1628
--bg-c: #161d30

/* Light text */
--th: #022977         /* headings */
--tb: rgba(2,41,119,.72)  /* body */
--tl: rgba(2,41,119,.5)   /* labels, muted */
--tt: rgba(2,41,119,.4)   /* footnotes */

/* Dark text */
--th: #f0f4ff
--tb: #c8d8f0
--tl: rgba(200,216,240,.6)
--tt: rgba(200,216,240,.4)

/* Borders */
--bd: rgba(2,41,119,.1)    /* default */
--bdm: rgba(2,41,119,.18)  /* hover/emphasis */
--ib: #e8eeff              /* icon backgrounds, tags */

/* Shadows */
--sc: 0 2px 28px rgba(2,41,119,.08)   /* card hover */
--sp: 0 14px 55px rgba(2,41,119,.18)  /* prominent */

/* Fonts */
--fd: 'Bricolage Grotesque', sans-serif  /* display: headings, prices */
--fb: 'DM Sans', sans-serif             /* body: everything else */
```

**Font weights used: 300, 400, 500 only. Never 600 or 700.**

Google Fonts import:
```
Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600
DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300
```

---

## 3. BUTTON SYSTEM

Four button variants:

| Class | Description | Background | Text |
|-------|-------------|------------|------|
| `.btn.btn-p` | Primary | `--navy` (dark: `--sky`) | white |
| `.btn.btn-a` | Amber/CTA | `--amber` | white |
| `.btn.btn-g` | Ghost outline | `--bg` | `--navy`, border 2px navy |
| `.btn.btn-wo` | White outline (on dark bg) | transparent | white, border white |

- Base padding: `11px 26px`, border-radius: `8px`, font-weight: 500
- `.btn-sm`: `7px 16px`, font-size: 12px
- All hover: `transform: translateY(-1px)`

---

## 4. SECTION STRUCTURE (in order)

### NAV (sticky)
- `position: sticky; top: 0; z-index: 500`
- `backdrop-filter: blur(24px) saturate(180%)`
- Height: 64px. Max-width: 1120px centered.
- **Logo**: `img/logo-transparent.svg` (light), `img/logo-dark.svg` (dark) + text "NTSsign" in `--fd` 17px weight 500
- **Links**: Features · How it works · Pricing · Reviews · FAQ — underline animation on hover (scaleX 0→1 from center, spring easing `cubic-bezier(.34,1.56,.64,1)`)
- **Right**: Log in (`.btn-g.btn-sm`) + Request access (`.btn-p.btn-sm`) + hamburger
- **Scroll state**: adds `.scrolled` class at scrollY > 20 → stronger shadow + opacity
- **Active link**: IntersectionObserver on `section[id]` → adds `.active` to matching nav `<a>`
- **NO lang/theme buttons in nav** — those are in the floating panel (see §11)

### LOGOS (infinite marquee)
- Full-width strip, `overflow: hidden`, fade edges via `::before`/`::after` gradient masks
- `animation: marquee 28s linear infinite` — pauses on hover
- 10 industry pills with emoji: 🏗️ Construction, 🧒 Childcare, 🏠 Real Estate, 🛡️ Insurance, ⚖️ Legal Services, 🎵 Entertainment, 🔧 HVAC & Trades, 💼 Freelancers, 🌿 Landscaping, 🏥 Healthcare
- Duplicated set for seamless loop (`translateX(0 → -50%)`)

### ① HERO
- Background: `--bg-s` with 60px grid pattern overlay
- 3 animated blobs (blur:90px): navy top-right, amber bottom-left, sky center
- 2-column grid (1fr 1fr), left col padding-bottom: 90px
- **Eyebrow**: uppercase pill with gradient bg, border, entrance animation
- **H1**: `clamp(2.2rem, 4.5vw, 3.5rem)`, `--fd`, weight 500, letter-spacing -1.5px. Accent word in `--amber` with underline decoration
- **Subtext**: 16px, weight 300, `rgba(2,41,119,.7)`
- **Buttons**: `.btn-p` + `.btn-a` side by side
- **Trust line**: 4 items with `•` separators, 12px muted
- **Right image**: `img/hero-3d.png` in card with 3D mouse-tilt JS (`perspective rotateX/Y`)
- **Entrance animations**: staggered `slide-up` 0s → 0.12s → 0.22s → 0.32s → 0.4s

### ② BENEFIT SECTIONS (4 alternating 2-col)

Each section uses `.bsec-grid` (CSS Grid 1fr 1fr, gap 5rem). The alternation:
- **2a** — text LEFT, mockup RIGHT (no `--rev`)
- **2b** — mockup LEFT, text RIGHT (no `--rev`, image first in DOM)
- **2c** — mockup LEFT, text RIGHT (`bsec-grid--rev` with text first in DOM)
- **2d** — text LEFT, mockup RIGHT (`bsec-grid--rev` with image first in DOM, `order:2`)

**Text column** (`.bsec-text`): sec-lbl → h2 → `.bsec-lead` (16px, weight 300) → 3 bullet points with `✦` marker → CTA button

**Image column** (`.bsec-img-wrap`): floating card (`.bsec-img-card`) with `box-shadow: --sp`, hover lift, floating animation, 2 floating badges (`.bsec-float-badge`) positioned TL/BR/TR

**4 CSS-rendered mockups** (no real images):
- **2a** — Signing screen: topbar, form fields, SVG signature, CTA button
- **2b** — Dashboard: document rows with status pills (Completed/Sent/Viewed/Draft), stats footer
- **2c** — Automation flow: 4-step vertical timeline (done/done/active-pulse/pending)
- **2d** — Certificate: header with shield emoji, table of fields (doc, signer, timestamp, IP, device), ESIGN badges

**Floating badges**: white bg, border, shadow, `border-radius:14px`, `min-width:140px`, flex with emoji + title + subtitle

### ③ FEATURES (infinite carousel)
- Full-bleed (no `.wrap` constraint), `overflow:hidden`, fade edges
- `animation: feat-scroll 32s linear infinite` — pauses on hover
- 8 cards × 2 (duplicated): width 220px each, gap 14px
- **Card hover**: `perspective(800px) rotateX(-4deg) translateY(-6px)` + shadow
- One accent card with `background: --navy`
- **Icon**: 44px rounded square, lifts and rotates on hover with spring
- No description text — just icon + 2-word title + 1-line description (max 12px)

### ④½ DEVICES (sign & manage)
- Background: gradient `bg-s → bg`, radial glow accents
- Center-aligned header + subtext
- **2-column layout** (`.dev-layout`): mockups left, controls right
- **LEFT (`.dev-mockups`)**: 3 CSS-rendered devices floating:
  - Tablet-sm (130×180px): absolute, top-left, `animation: devfloat2`
  - Laptop (full width - 80px offset): center, `animation: devfloat1`
  - Phone (90px): absolute top-right overlapping laptop, `animation: devfloat3`
  - All devices: dark gradient body `#1a2540→#0d1a33`, screen content in dark blue
  - Two tab content states in laptop screen: `.dscr-sign` (form) / `.dscr-manage` (dashboard rows)
- **RIGHT (`.dev-right`)**: tab switcher (✍️ Signing / 📊 Dashboard) → 4 feature pills → animated status badge (green dot + "John Smith just signed")
- **Parallax JS**: `onScroll` function moves laptop/tablet/phone at different rates

### ④ HOW IT WORKS (animated stepper)
- Center header, max-width 820px centered stepper
- 3 steps vertical, each with:
  - **Number circle** (52px): normal = border + grey. Active = navy bg + shadow + scale(1.08) + amber ring rotates 120°
  - **Vertical line** between steps: grey → navy gradient when active
  - **Header** (flex): emoji icon (scales 1.2 when active) + title (grows from 18→20px) + tag pill (slides in from left)
  - **Body** (`.how-step-body`): `max-height: 0 → 500px` CSS transition + `opacity 0→1`
  - **Preview card** inside each step:
    - Step 1: form preview with filled inputs (navy border + `--ib` bg), amber CTA button with `@keyframes pulse-btn`
    - Step 2: email mockup with header, body lines, amber CTA "Review & Sign →"
    - Step 3: status timeline (✓ green dots for Sent/Viewed/Signed + active pulsing dot for Completed)
- Clicking a step runs `setStep(n)` which removes `.how-step--active` from all, adds to clicked

### ⑥ MID-PAGE CTA (Launch plan)
- Full-width navy band with radial glow
- **Compact bar** (`.mid-cta-compact`): glassmorphism card `rgba(255,255,255,.06)` with backdrop-filter
  - Left: "Most popular plan" badge + "Launch $39/mo" in display font + 4 feature pills (amber bg)
  - Right: amber CTA button "See the Launch plan →"

### ⑦ SECURITY
- 2-column: text left (4 `.tb-card` rows with emoji + title + desc), image right (`img/security-3d.png` with 3D tilt animation)

### ⑧ TESTIMONIALS
- Carousel with 5 cards, arrow buttons + dot indicators
- `.carousel-track` with `transition: transform .45s cubic-bezier(.4,0,.2,1)`
- Active dot: width grows 7px → 20px (pill shape)

### ⑨ PRICING

**Header**: 2-column — title/desc left, controls right
**Controls**: billing toggle (Monthly/Annual switch) + 3-tab selector (Plans / More options / Services)

**Billing toggle**: `setBilling('monthly'|'annual')` — updates `.p-num` elements from `data-mo` / `data-an` attributes, shows/hides `.ann-note` and `.ann-save-tag`

**Tab: Plans** (default) — 3 cards in `grid-template-columns: 1fr 1.3fr 1fr`:
- Starter (left): `.pc.pc-side`
- **Launch (center)**: `.pc.pc-launch` — navy bg, `margin-top: -20px` (rises above others), amber pulsing badge "⭐ Best seller", price 2.8rem, amber CTA button, glow orb, `box-shadow: 0 20px 60px rgba(2,41,119,.45)`
- Pro (right): `.pc.pc-side`

**Tab: More options** — 2 cards in `price-row-2` (max-width 700px): Pay-per-contract ($12) + Scale ($229/mo)

**Tab: Services** — 3 cards in `flex-grid`: Pay-per-contract · Template Setup ($49/$79/+$29) · Onboarding ($149/$249)

`setPlanTab(tab)` hides/shows `panel-sub`, `panel-extra`, `panel-flex` by toggling `display: none/block`

### ⑩ BOTTOM CTA
- Navy band, `text-align: center`
- Badge "Start with Starter — $19/month" → H2 → paragraph → plan preview pills row → 2 buttons (amber + white outline) → annual hint → trust line

### FAQ
- Section background: `--bg-s`
- **Header**: just sec-lbl + H2 (no subtext here)
- **2-column grid** (`.faq-cols`): 4 items per column, gap 10px
- **Each card** (`.faq-item`): rounded-14px card with border
  - On hover: `translateY(-2px)` + shadow
  - When open (`:has(.faq-q.open)`): navy border + stronger shadow
  - Button: question text (14px 500) + chevron SVG (rotates 180° on open)
  - When open: navy background, white text, **amber 3px left border** `::before`
  - Answer: `max-height 0 → 240px` + `opacity 0→1` + `@keyframes faqSlideIn` (translateY -6px → 0)
- **Footer bar** (`.faq-footer`): flex row — "No sales pitch..." text left + "Email us →" link right
- `toggleFaq(btn)`: closes all open items, then opens clicked one

### FOOTER
- Background: `--bg-s`, 4-column grid: brand (1.8fr) + Product + Resources + Company (1fr each)
- Brand column: logo + tagline + email + **5 social icons** (LinkedIn, Instagram, Facebook, X, YouTube) — 34px rounded squares with hover navy/sky fill
- Bottom bar: copyright + "Powered by NoaTechSolutions" + legal links

### FLOATING CONTROLS (fixed right side)
- `position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 600`
- Attached to right edge (no right border, `border-radius: 12px 0 0 12px`)
- Contains: theme toggle (`id="thmBtn"`, `id="thmK"`) + EN/ES buttons (`id="btnEN"`, `id="btnES"`)
- **CRITICAL**: These IDs must exist in DOM — `applyTheme()` and `setLang()` reference them

---

## 5. JAVASCRIPT FUNCTIONS (all required)

```js
setLang(l)          // 'en'|'es' — updates data-i and data-ih elements, null-safe for btnEN/btnES
applyTheme(d)       // true=dark — toggles .dark on <html>, updates thmK icon, swaps logos, null-safe for thmK/thmBtn
closeMob()          // closes mobile menu
setBilling(mode)    // 'monthly'|'annual' — updates p-num, ann-note, ann-save-tag
setPlanTab(tab)     // 'sub'|'extra'|'flex' — shows/hides pricing panels
setStep(n)          // 0|1|2 — how-it-works stepper
setDevTab(tab)      // 'sign'|'manage' — switches device screen content
buildDots(count)    // builds testimonial carousel dots
goTo(i)             // moves carousel to slide i
toggleFaq(btn)      // closes all FAQ items, opens clicked one
onScroll()          // parallax for devices (devLaptop/devTablet/devPhone)
```

**Scroll-driven:**
- `IntersectionObserver` on `.rv` elements → adds `.in` class (scroll reveal: opacity 0→1, translateY 28px→0)
- `IntersectionObserver` on `section[id]` → active nav link tracking
- `window.scroll` → `.scrolled` on nav at scrollY > 20
- Parallax blobs (b1/b2/b3) on scroll
- Device parallax on scroll (laptop, tablet, phone at different speeds)

**3D effects (mousemove):**
- Hero image card: `perspective rotateX/Y` on mousemove
- Feature carousel cards: `perspective(900px) rotateX/Y` + CSS vars `--mx`/`--my` for sheen overlay

**i18n**: `const T = { en: {...344 keys...}, es: {...344 keys...} }` — `setLang()` iterates `[data-i]` (textContent) and `[data-ih]` (innerHTML)

---

## 6. SCROLL REVEAL SYSTEM

```css
.rv { opacity: 0; transform: translateY(28px); transition: opacity .55s ease, transform .55s ease }
.rv.in { opacity: 1; transform: translateY(0) }
.rv1 { transition-delay: .1s }
.rv2 { transition-delay: .2s }
.rv3 { transition-delay: .3s }
.rv4 { transition-delay: .4s }
```

All section content uses `.rv` (and `.rv1`–`.rv4` for stagger). IntersectionObserver adds `.in` at threshold 0.1.

---

## 7. IMAGE ASSETS REQUIRED

All in `img/` folder relative to HTML:

| File | Used in |
|------|---------|
| `logo-transparent.svg` | Nav (light mode), Footer (light mode) |
| `logo-dark.svg` | Nav (dark mode), Footer (dark mode) |
| `hero-3d.png` | Hero right column |
| `security-3d.png` | Security section |
| `workflow-3d.png` | How it works browser mockup |
| `team-service-3d.png` | (legacy, may not be used) |

**Note**: The 4 benefit section mockups (2a–2d) are fully CSS-rendered, no images needed.

---

## 8. RESPONSIVE BREAKPOINTS

```css
@media (max-width: 1024px)  /* reduce gaps, pricing 3-col stays */
@media (max-width: 768px)   /* bsec-grid → 1col, dev-layout → 1col */
@media (max-width: 860px)   /* nav links hidden (hamburger), hero 1col */
@media (max-width: 600px)   /* full mobile: 1col pricing, 1col footer, padding reduced */
```

Key: `.bsec-grid` stays 2 columns down to 768px (NOT 1024px — common mistake).

---

## 9. DARK MODE

Controlled by adding/removing `.dark` class on `<html>`. Persisted in `localStorage('nts-theme')`. Initial state: respects `prefers-color-scheme`. All colors, shadows, borders defined via CSS vars that automatically swap.

Logo swap: `.logo-light { display: block }` / `.logo-dark-img { display: none }` — reversed in `.dark`.

---

## 10. NULL SAFETY RULES (CRITICAL)

These IDs were moved out of the nav to the floating panel. Always use null checks:

```js
const thmK = document.getElementById('thmK');
if (thmK) thmK.textContent = d ? '🌙' : '☀';

const _thmBtn = document.getElementById('thmBtn');
if (_thmBtn) _thmBtn.addEventListener('click', ...);

const _btnEN = document.getElementById('btnEN');
if (_btnEN) _btnEN.classList.toggle('on', l === 'en');

const _btnES = document.getElementById('btnES');
if (_btnES) _btnES.classList.toggle('on', l === 'es');
```

If any of these IDs are missing from DOM, the whole script crashes and ALL `.rv` elements stay invisible (sections appear blank).

---

## 11. KNOWN PATTERNS & GOTCHAS

1. **`.rv` elements invisible** = JS crash. Check console. 99% caused by `getElementById(null).something`.

2. **Benefit sections wrong columns** = check DOM order vs `bsec-grid--rev`:
   - No `--rev` → first child = left column
   - With `--rev` → first child = right column (direction:rtl trick)

3. **Pricing shows wrong plans** = `panel-sub` must contain ONLY Starter + Launch + Pro. Pay-per-doc and Scale go in `panel-extra` only.

4. **`setPlanTab` / `setBilling` not found** = these functions are defined in the script block, ensure they're not accidentally removed.

5. **Device layout 1-column on laptop** = `dev-layout` should collapse at 768px, NOT 1024px.

6. **IntersectionObserver structure** must be:
   ```js
   new IntersectionObserver(entries => {
     entries.forEach(e => {
       if (e.isIntersecting) { /* ... */ }
     });
   }, options)
   ```
   Missing the `e => {` arrow causes silent failure.

---

## 12. DOCUMENTATION TO UPDATE

Update these files in the project docs:

**`/product/saas-overview.md`** — Add landing page section noting:
- Public marketing site now live at `ntssign.com` (or staging URL)
- EN/ES bilingual (344 i18n keys each language)
- Dark/light mode with system preference detection

**`/product/pricing-canonical.md`** — Verify landing page matches canonical prices:
- Pay-per-contract: $12/doc (in "More options" tab only)
- Starter: $19/mo ($16 annual)
- Launch: $39/mo ($32 annual) — bestseller, elevated card
- Pro: $89/mo ($74 annual)
- Scale: $229/mo ($190 annual) (in "More options" tab only)
- Setup service: $49 / $79 / +$29 express
- Onboarding: $149 / $249

**`/product/roadmap.md`** — The landing page is now v1 complete. Mark as shipped and add backlog items from this build:
- [ ] Swap CSS device mockups for real screenshots when UI is stable
- [ ] Connect CTA buttons to actual signup/request-access flow
- [ ] Add real social media links in footer
- [ ] Replace `support@noatechsolutions.com` with production email
- [ ] Add Google Analytics / conversion tracking
- [ ] SEO meta tags (og:image, og:description, canonical URL)

---

## 13. QUICK REFERENCE: SECTION ID MAP

```
#features       ← Features carousel
#devices        ← Devices section  
#how            ← How it works
#testimonials   ← Testimonials carousel
#pricing        ← Pricing (tabs: Plans / More options / Services)
#cta            ← Bottom CTA (Starter $19)
#faq            ← FAQ accordion
```

Nav links: Features · How it works · Pricing · Reviews · FAQ

---

*Document generated: April 2026 | Source: ntssign-landing-v3.html | Version: 1.0*
