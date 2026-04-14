# Instrucciones para Claude Code — Landing page ntssign.com

## Objetivo

Construir la landing page pública de `ntssign.com` — página de marketing y conversión del producto NTSsign. Esta página vive en el repo del frontend de NTSsign como ruta raíz `/` (o en una ruta `/landing` si el app está en `/app`).

---

## Stack y contexto técnico

- **Framework:** Next.js 16 con App Router
- **Styling:** Tailwind CSS 4
- **Repo:** mismo repo que `app.ntssign.com` — frontend en `apps/frontend/`
- **Ruta:** `apps/frontend/app/(marketing)/page.tsx` o `apps/frontend/app/page.tsx` según estructura actual
- **Dark mode:** implementado con `next-themes` (ya instalado en el proyecto)
- **Fuente de verdad visual:** `docs/product/design-system.md` — leer ese archivo antes de escribir una sola línea de CSS

---

## PARTE 1 — Setup previo

### 1.1 Leer el design system

Antes de empezar, leer completo: `docs/product/design-system.md`

Ese archivo contiene todos los colores, tokens, reglas de botones, componentes y reglas absolutas. No inventar nada — todo está definido ahí.

### 1.2 CSS variables globales

En `apps/frontend/app/globals.css`, agregar las variables del design system dentro de `:root` y `.dark`:

```css
:root {
  --color-navy: #022977;
  --color-electric: #0400f0;
  --color-sky: #05a5ff;
  --color-amber: #ff9900;
  --color-amber-hover: #cc7a00;

  --bg-page: #ffffff;
  --bg-section: #f0f4ff;
  --bg-card: #f7f8fa;
  --bg-cta: #022977;

  --text-primary: #022977;
  --text-body: rgba(2, 41, 119, 0.70);
  --text-muted: rgba(2, 41, 119, 0.50);
  --text-subtle: rgba(2, 41, 119, 0.45);

  --border-default: rgba(2, 41, 119, 0.12);
  --border-pop: 2.5px solid #022977;
}

.dark {
  --bg-page: #0b0f1a;
  --bg-section: #0f1628;
  --bg-card: #161d30;

  --text-primary: #f0f4ff;
  --text-body: #c8d8f0;
  --text-muted: rgba(200, 216, 240, 0.60);
  --text-subtle: rgba(200, 216, 240, 0.45);

  --border-default: rgba(255, 255, 255, 0.08);
  --border-pop: 2.5px solid #05a5ff;
}
```

### 1.3 Componente ThemeToggle

Crear `apps/frontend/components/marketing/ThemeToggle.tsx`:

```tsx
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle dark mode"
      className="..."
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
```

---

## PARTE 2 — Estructura de la página

La landing tiene **8 secciones en orden fijo**. No reordenar.

```
1. Navbar
2. Hero
3. Problema (3 pain points)
4. Cómo funciona (3 pasos)
5. Features (6 cards)
6. Pricing (4 planes + pay-per-contract)
7. CTA final
8. Footer
```

Crear en: `apps/frontend/app/(marketing)/page.tsx`

Estructura de componentes:
```
components/marketing/
  Navbar.tsx
  HeroSection.tsx
  ProblemSection.tsx
  HowItWorksSection.tsx
  FeaturesSection.tsx
  PricingSection.tsx
  CtaSection.tsx
  Footer.tsx
```

---

## PARTE 3 — Cada sección en detalle

---

### SECCIÓN 1 — Navbar

**Archivo:** `components/marketing/Navbar.tsx`

**Estructura visual:**
```
[Logo mark "N"] NTSsign    |    Cómo funciona   Precios   FAQ    |    [Login ghost] [Solicitar acceso primary] [ThemeToggle]
```

**Especificaciones:**
- `position: sticky`, `top: 0`, `z-index: 50`
- Light: `background: #ffffff`, `border-bottom: 0.5px solid rgba(2,41,119,0.15)`, `backdrop-filter: blur(8px)`
- Dark: `background: #0f1628`, `border-bottom: 0.5px solid rgba(255,255,255,0.1)`
- Logo mark: `width: 28px height: 28px border-radius: 7px`
  - Light: `background: #022977 color: #fff`
  - Dark: `background: #05a5ff color: #00183a`
- Links: `font-size: 13px`
  - Light: `color: rgba(2,41,119,0.65)`
  - Dark: `color: rgba(255,255,255,0.55)`
- Botón Login: ghost, `padding: 6px 16px font-size: 12px`
- Botón Solicitar acceso: primario, `padding: 6px 16px font-size: 12px`
- En móvil (`< 768px`): ocultar links del centro, mantener logo + botón CTA + toggle
- Scroll behavior: agregar `shadow` sutil cuando `scrollY > 10`

**Copy:**
```
Logo: "NTSsign"
Links: "Cómo funciona" | "Precios" | "FAQ"
Botón ghost: "Login" → href="/login"
Botón primario: "Solicitar acceso" → href="/request-access"
```

---

### SECCIÓN 2 — Hero

**Archivo:** `components/marketing/HeroSection.tsx`

**Fondo:**
- Light: `background: #f0f4ff`
- Dark: `background: #0f1628`, `border-bottom: 0.5px solid rgba(255,255,255,0.07)`

**Padding:** `80px 24px` desktop / `60px 20px` móvil

**Layout:** centrado, `max-width: 680px margin: 0 auto text-align: center`

**Elementos en orden:**
1. Eyebrow
2. H1
3. Subtítulo
4. CTAs
5. Trust line

**1. Eyebrow:**
```
● firma digital ● contratos ● audit trail legal ●
```
- `font-size: 11px font-weight: 500 letter-spacing: 0.12em text-transform: uppercase`
- Light: `color: #022977`
- Dark: `color: #05a5ff`
- Los `●` son `<span>` con `width: 4px height: 4px border-radius: 50% background: #ff9900`

**2. H1:**
```
Send contracts.
Get them signed. Done.
```
- `font-size: clamp(26px, 5vw, 40px) font-weight: 500 line-height: 1.25`
- Light: `color: #022977`
- Dark: `color: #f0f4ff`
- La palabra **"signed."** va en `<span style="color: #ff9900">`

**3. Subtítulo (bilingüe — mostrar ambos o con toggle EN/ES):**
```
EN: The document workspace for service businesses.
    No printing, no scanning, no chasing clients.

ES: El workspace de documentos para negocios de servicios.
    Sin imprimir, sin escanear, sin perseguir clientes.
```
- `font-size: 14px line-height: 1.75 max-width: 420px margin: 0 auto`
- Light: `color: rgba(2,41,119,0.70)` — **nunca gris**
- Dark: `color: #c8d8f0`

**4. CTAs:**
```
[Solicitar acceso]  [Ver cómo funciona]
```
- Gap: `12px`, centrado, `flex-wrap: wrap`
- Primero: botón primario → `href="/request-access"`
- Segundo: botón secundario amber → scroll a `#como-funciona`

**5. Trust line:**
```
Firma electrónica legal  •  ESIGN Act compliant  •  Setup en 48h  •  Cancela cuando quieras
```
- `font-size: 12px`
- Light: `color: rgba(2,41,119,0.50)` — nunca gris
- Dark: `color: rgba(5,165,255,0.70)`
- Separadores `•`: `<span>` amber `#ff9900`, `width: 3px height: 3px border-radius: 50%`

---

### SECCIÓN 3 — Problema

**Archivo:** `components/marketing/ProblemSection.tsx`

**Fondo:**
- Light: `background: #ffffff`
- Dark: `background: #0b0f1a`

**Padding:** `80px 24px` desktop / `60px 20px` móvil

**Layout:**
- Título centrado arriba
- 3 cards en grid `grid-template-columns: repeat(3, 1fr)` → `1fr` en móvil

**Título:**
```
¿Te suena familiar?
```
- H2, centrado, `margin-bottom: 48px`

**3 cards de pain points:**

| # | Ícono | Título | Descripción |
|---|---|---|---|
| 1 | 📄 | "Mandas el contrato por email" | "Lo imprimen, lo firman, le toman foto y te lo regresan. Tres días después." |
| 2 | 📱 | "No sabes si tu cliente lo abrió" | "Sin visibilidad. Sin notificaciones. Sin saber si firmaron o no." |
| 3 | 📁 | "No encuentras el PDF firmado" | "El historial de contratos está en emails, carpetas y WhatsApp. En ningún lugar fácil." |

**Estilo de cards:**
- Light: `background: #f7f8fa border: 0.5px solid rgba(2,41,119,0.1) border-radius: 12px padding: 24px`
- Dark: `background: #161d30 border: 0.5px solid rgba(255,255,255,0.08)`
- Ícono: `font-size: 28px margin-bottom: 12px`
- Título card: `font-size: 15px font-weight: 500`
  - Light: `color: #022977`
  - Dark: `color: #f0f4ff`
- Descripción: `font-size: 13px line-height: 1.7`
  - Light: `color: rgba(2,41,119,0.65)`
  - Dark: `color: rgba(200,216,240,0.60)`

---

### SECCIÓN 4 — Cómo funciona

**Archivo:** `components/marketing/HowItWorksSection.tsx`

**ID:** `id="como-funciona"` — el CTA del hero scrollea aquí

**Fondo:**
- Light: `background: #f0f4ff`
- Dark: `background: #0f1628`

**Padding:** `80px 24px`

**Título:**
```
Tres pasos. Nada más.
```

**3 step cards en grid:**

| # | Título | Descripción |
|---|---|---|
| 1 | Crea tu documento | Llena el formulario guiado con los datos de tu cliente. Listo en minutos. |
| 2 | Envíalo a firmar | Tu cliente recibe un email con un link seguro. Sin cuenta, sin descargas. |
| 3 | Descarga el PDF | Tracking en tiempo real. PDF firmado con audit trail completo. |

**Número de paso:**
- Círculo `32px`, `border-radius: 50%`
- Light: `background: #022977 color: #ffffff`
- Dark: `background: #05a5ff color: #00183a`
- `font-size: 13px font-weight: 500`

**Card estilo:** igual que feature cards.

---

### SECCIÓN 5 — Features

**Archivo:** `components/marketing/FeaturesSection.tsx`

**Fondo:**
- Light: `background: #ffffff`
- Dark: `background: #0b0f1a`

**Título:**
```
Todo lo que necesitas para cerrar contratos más rápido
```

**6 feature cards en grid `repeat(3, 1fr)` → `repeat(2, 1fr)` tablet → `1fr` móvil:**

| Ícono | Título | Descripción |
|---|---|---|
| ✍️ | Formularios adaptados a tu negocio | No un template genérico. Tus campos, tu workflow, tu proceso. |
| 📊 | Tracking en tiempo real | Sabe exactamente cuándo tu cliente abrió el link y cuándo firmó. |
| 🔔 | Reminders automáticos | Deja de perseguir. NTSsign le recuerda a tu cliente por ti. |
| 👥 | Workspace de equipo | Todo tu equipo envía y hace seguimiento desde una sola cuenta. |
| 📋 | Firma electrónica legal | Cada firma incluye IP, timestamp y certificado. ESIGN Act compliant. |
| 📁 | Historial de 2 años | Encuentra cualquier contrato firmado, en cualquier momento. |

**Ícono container:**
- `width: 36px height: 36px border-radius: 8px`
- Light: `background: #e8eeff`
- Dark: `background: rgba(5,165,255,0.12)`

---

### SECCIÓN 6 — Pricing

**Archivo:** `components/marketing/PricingSection.tsx`

**ID:** `id="precios"`

**Fondo:**
- Light: `background: #f0f4ff`
- Dark: `background: #0f1628`

**Título:**
```
Planes para cada etapa de tu negocio
```

**Toggle mensual / anual:**
- Switch que cambia los precios mostrados
- Estado "Anual" muestra badge `"Ahorras ~17%"` en amber
- Precios mensuales: Starter $19 · Launch $39 · Pro $89 · Scale $229
- Precios anuales: Starter $16 · Launch $32 · Pro $74 · Scale $190

**Layout pricing:**
- Primero: card Pay-per-contract a ancho completo o como card pequeña aparte
- Luego: grid `repeat(4, 1fr)` → `repeat(2, 1fr)` tablet → `1fr` móvil

**Planes:**

| Plan | Tag | Precio | Docs | Usuarios | Templates | Features clave | Botón |
|---|---|---|---|---|---|---|---|
| Pay-per-contract | Ocasional | $12/doc | 1 crédito | 1 | — | PDF + audit trail, 90 días | Ghost |
| Starter | Arranque | $19/mes | 5 | 1 | 1 | Dashboard, 1 año historial | Ghost |
| Launch ⭐ | Más popular | $39/mes | 15 | 2 | 3 | Multi-signer, 2 años | Primario navy |
| Pro | Crecimiento | $89/mes | 50 | 5 | 10 | Branding, analytics | Ghost |
| Scale | Alto volumen | $229/mes | 150 | 15 | ∞ | Soporte prioritario, 5 años | Ghost |

**Card "Más popular" (Launch):**
- Light: `background: #ffffff border: 2.5px solid #022977`
- Dark: `background: #0a1a3a border: 2.5px solid #05a5ff`
- Ligeramente más alta con `transform: translateY(-4px)` en desktop

**Badge tags — colores definidos en design-system.md.**

**Overage badge:**
- Texto: `"Extra: $X/doc"`
- Light: `background: #e8eeff color: #022977`
- Dark: `background: rgba(5,165,255,0.10) color: #7dcfff`
- `border-radius: 5px padding: 4px 7px font-size: 10px`

**Nota debajo del pricing:**
```
Todos los planes incluyen: PDF firmado · Audit trail · ESIGN Act compliant · Soporte por email
```
- Centrado, `font-size: 12px`
- Light: `color: rgba(2,41,119,0.50)`
- Dark: `color: rgba(200,216,240,0.45)`

---

### SECCIÓN 7 — CTA Final

**Archivo:** `components/marketing/CtaSection.tsx`

**Fondo: siempre `#022977` — no cambia con dark/light mode**

**Padding:** `80px 24px`

**Layout:** centrado, `max-width: 560px`

**Contenido:**
```
H2: ¿Listo para dejar de perseguir firmas?
Sub: Configura tu cuenta en menos de 48h. Tu primer template incluido.
CTAs: [Solicitar acceso] (amber)  [Ver planes] (outline blanco)
Trust: Sin tarjeta de crédito  •  Cancela cuando quieras  •  A product by NTSolutions
```

**Especificaciones:**
- H2: `color: #ffffff font-size: 22px font-weight: 500`
- Sub: `color: rgba(255,255,255,0.65) font-size: 14px line-height: 1.7`
- Botón primario: amber `background: #ff9900 color: #ffffff`
- Botón secundario: outline blanco `border: 2.5px solid #ffffff color: #ffffff`
- Trust: `color: rgba(255,255,255,0.45) font-size: 11px`
- Separadores trust: `rgba(255,153,0,0.70)`

---

### SECCIÓN 8 — Footer

**Archivo:** `components/marketing/Footer.tsx`

**Fondo:**
- Light: `background: #f0f4ff`
- Dark: `background: #0f1628`

**Layout:**
```
[Logo NTSsign]
[Cómo funciona] [Precios] [FAQ] [Soporte] [Privacy Policy] [Terms of Service]
A product by NTSolutions · noatechsolutions.com · support@noatechsolutions.com
```

**Especificaciones:**
- Logo: `font-size: 15px font-weight: 500`
  - Light: `color: #022977`
  - Dark: `color: #f0f4ff`
- Links: `font-size: 12px`
  - Light: `color: rgba(2,41,119,0.60)`
  - Dark: `color: rgba(200,216,240,0.50)`
- Nota final: `font-size: 11px`
  - Light: `color: rgba(2,41,119,0.35)`
  - Dark: `color: rgba(200,216,240,0.30)`
- "NTSolutions" en la nota tiene link a `https://noatechsolutions.com`

---

## PARTE 4 — Internacionalización (EN/ES)

La página es bilingüe. Implementar con un toggle EN/ES en la navbar.

**Opción simple (sin i18n library):**
- Crear `lib/copy.ts` con objeto de strings en EN y ES
- `useContext` o `useState` en layout para el idioma activo
- Persistir en `localStorage` con key `ntssign-lang`
- Default: detectar `navigator.language` — si empieza con `es`, mostrar ES

**Copy clave:**

| Elemento | EN | ES |
|---|---|---|
| H1 | "Send contracts. Get them signed. Done." | "Envía contratos. Recibe firmas. Listo." |
| Subtítulo | "The document workspace for service businesses." | "El workspace de documentos para negocios de servicios." |
| CTA principal | "Request access" | "Solicitar acceso" |
| CTA secundario | "See how it works" | "Ver cómo funciona" |
| Nav link 1 | "How it works" | "Cómo funciona" |
| Nav link 2 | "Pricing" | "Precios" |
| CTA final H2 | "Ready to stop chasing signatures?" | "¿Listo para dejar de perseguir firmas?" |

---

## PARTE 5 — Rutas y links

| Elemento | Destino |
|---|---|
| Logo / "NTSsign" | `/` (home) |
| Nav "Cómo funciona" | `/#como-funciona` |
| Nav "Precios" | `/#precios` |
| Nav "FAQ" | `/#faq` (agregar sección FAQ simple al final si hay espacio) |
| "Solicitar acceso" (todos) | `https://app.ntssign.com/request-access` |
| "Login" | `https://app.ntssign.com/login` |
| "NTSolutions" en footer | `https://noatechsolutions.com` |
| "Privacy Policy" | `/privacy` (crear página placeholder) |
| "Terms of Service" | `/terms` (crear página placeholder) |

---

## PARTE 6 — SEO y metadata

En `app/(marketing)/layout.tsx` o directamente en `page.tsx`:

```tsx
export const metadata = {
  title: 'NTSsign · Digital Contracts & E-Signatures for Service Businesses',
  description: 'Create, send, and track business contracts in minutes. Your clients sign from any device — no account needed. Plans from $19/mo.',
  openGraph: {
    title: 'NTSsign · Send contracts. Get them signed. Done.',
    description: 'The document workspace for service businesses.',
    url: 'https://ntssign.com',
    siteName: 'NTSsign',
    type: 'website',
  },
  alternates: {
    canonical: 'https://ntssign.com',
  },
}
```

---

## PARTE 7 — Responsive breakpoints

| Breakpoint | Comportamiento |
|---|---|
| `< 480px` | Todo en 1 columna. Botones full-width en hero. |
| `480–768px` | Grids en 2 columnas. Nav sin links del centro. |
| `768–1024px` | Grids en 2–3 columnas. Nav completa. |
| `> 1024px` | Layout completo. Pricing en 4 columnas. |

---

## PARTE 8 — Checklist de verificación antes de PR

- [ ] Toggle dark/light funciona y persiste en localStorage
- [ ] Toggle EN/ES funciona y persiste en localStorage
- [ ] Todos los textos en light mode son navy — ninguno gris genérico
- [ ] Botón secundario es amber sólido visible en todos los fondos
- [ ] Botón ghost es outline navy 2.5px con fondo blanco
- [ ] CTA final es navy tanto en light como dark mode
- [ ] Scroll a `#como-funciona` y `#precios` funciona desde el nav
- [ ] Link "Solicitar acceso" apunta a `app.ntssign.com/request-access`
- [ ] Footer tiene link a noatechsolutions.com
- [ ] metadata de SEO está configurado
- [ ] Página es responsive en 320px, 768px y 1280px
- [ ] No hay `console.error` ni warnings de hidratación
- [ ] Lighthouse score accesibilidad > 90
