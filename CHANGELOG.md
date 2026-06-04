# Changelog

Versioning follows [SemVer](https://semver.org/) — see [VERSIONING.md](./VERSIONING.md).

## [2.0.0] - 2026-06-04

Full dashboard redesign (V2). V2 is now the default; the legacy dashboard is
kept in the codebase but no longer reachable through the normal flow.

### Added
- **Dashboard V2** — collapsible sidebar (MASTER-only "User management" group),
  shell, topbar.
- **Overview** — redesigned: subtle header, 4 metric cards, "Needs attention"
  widget, status breakdown, recent documents, responsive 2-column layout.
- **Documents V2** — detail modal (per-card edit, Finance toggle + colored grid,
  signed-PDF tab), schema-driven creation wizard, client select popup +
  Client-tab auto-fill, Send/Cancel confirmations, mobile collapsible cards.
- **Customers V2** — table + mobile cards, status (Active/Inactive/Deleted),
  owner assignment, detail modal, form drawer.
- **Members V2** — members + account requests (approve/reject) in one panel;
  locked-users panel.
- **Profile / Billing V2** — per-section inline editing, plan features, usage.
- Shared building blocks: ConfirmActionModal, DiscardChangesModal,
  GroupEditPopup, unsaved-changes guard (`useBeforeUnload` + dirty-form).
- Versioned footer that reads the version from `package.json`.

### Changed
- Default dashboard route renders the V2 overview (no `?panel=` → overview).
- Backend: customer soft-delete + status model, document detail includes,
  `streamFinalPdf` test-pdf bypass for QA.

### Removed
- Form Definitions admin UI (route + components). Backend endpoints kept for
  script-based form seeding.

### Notes
- Legacy dashboard (`DashboardSidebarDemo` + legacy panels) retained in the
  codebase, unreachable via the normal flow — deletion is a follow-up.

## [Abril 2026] — Session 2

### Nuevas funcionalidades
- NOA-130: Pagina /pricing con tabla comparativa, FAQ x10, hero naranja
- NOA-99: Google Analytics 4 (G-R6HRNC9LWG) solo en produccion
- NOA-133: Landing staging en staging.noatechsolutions.com

### Fixes
- NOA-139: Chatbot Tawk.to inicia minimizado (autoStart=false)
- NOA-140: Icono chatbot no se corta (bottom: 32px)
- NOA-141: Texto card Launch visible en light mode
- NOA-142: Preconnect app.ntssign.com
- NOA-143: Login ThemeProvider + logo azul + toggle dark/light
- NOA-147: APP_URL configurable por env var (16 hardcodes)
- NOA-148: Login card dark/light via Tailwind dark: variants
- NOA-158: Proceso de versionado de imagenes (og-image-v4.png)
- NOA-165: Chatbot Tawk.to sin guard NODE_ENV — visible en todos los ambientes

### SEO
- NOA-138: og:image, favicon suite, metadata completa, GA4, JSON-LD

### Infraestructura
- Landing staging: staging.noatechsolutions.com
- NEXT_PUBLIC_GA_ID solo en produccion via workflow
- NEXT_PUBLIC_APP_URL configurable por ambiente
- Proceso versionado imagenes documentado

---

## Proceso: Actualizar imagenes en produccion

### Regla de oro

Nunca reemplazar un archivo de imagen existente con el mismo nombre. Siempre usar nombre versionado.

### Por que

SiteGround NGINX Direct Delivery cachea imagenes en memoria. Reemplazar el archivo no invalida el cache — NGINX sigue sirviendo la version anterior aunque el archivo en disco ya sea el nuevo.

### Proceso estandar

1. Disenar la imagen nueva en Canva
2. Exportar como PNG con nombre versionado:
   `public/img/og-image-v5.png` (siguiente version)
3. Actualizar la referencia en `layout.tsx`:
   `url: '/img/og-image-v5.png'`
4. Push a develop
5. Verificar en staging.noatechsolutions.com
6. Merge a main — deploy automatico

### Resultado

- Cero problemas de cache (NGINX, Cloudflare, browser)
- Sin purge manual de ningun tipo
- Sin File Manager de SiteGround

### Historial og-image

| Version | Archivo | Estado |
|---------|---------|--------|
| v1 | og-image.png | Deprecado |
| v2 | og-image.png?v=2 | Deprecado (workaround) |
| v4 | og-image-v4.png | Actual (Abril 2026) |

### Aplica a cualquier imagen en public/img/
