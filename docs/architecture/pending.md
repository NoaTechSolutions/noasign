# NTSsign — Pending Work

Last updated: 2026-04-07

Tracking system: **Linear** (project NTSSign, team NoaTechSolutions). Issues referenced as NOA-XX.

---

## Tier 0 — Pre-launch (before first real customer)

| Item | Linear | Status |
|------|--------|--------|
| Crear VM de producción en Oracle Cloud | NOA-5 | Pendiente |
| Configurar DNS de producción en Cloudflare | NOA-6 | Pendiente |
| Obtener certificados SSL para producción | NOA-7 | Pendiente |
| Configurar secrets de producción en GitHub Actions | NOA-8 | Pendiente |
| Configurar archivo .env de producción en la VM | NOA-9 | Pendiente |
| Hacer deploy inicial a producción | NOA-10 | Pendiente |
| Verificar workflow deploy-prod.yml en GitHub Actions | NOA-11 | Pendiente |
| Auditar variables de entorno sensibles antes de prod | NOA-13 | Pendiente |
| Agregar endpoint /health al backend | NOA-16 | Pendiente |
| Fix: BOLDSIGN_WEBHOOK_SECRET sin validación de presencia | NOA-32 | Pendiente |

---

## Epic NOA-46 — Schema-Driven Document Forms

Replaces hardcoded form fields with a fully dynamic, schema-based system. Enables onboarding any new client without code changes. See [schema-driven-forms.md](schema-driven-forms.md) for full spec.

| Item | Linear | Tipo | Prioridad | Notas |
|------|--------|------|-----------|-------|
| DB migration: `schemaJson Json?` en `FormDefinition` | NOA-47 | Task | Urgent | Prisma migration + `prisma generate` |
| Backend: exponer `schemaJson` en `/documents/types` | NOA-48 | Task | Urgent | Agregar campo al select del endpoint |
| Backend: admin endpoints FormDefinition CRUD | NOA-49 | Feature | High | POST/GET/PATCH/DELETE `/admin/form-definitions` |
| Backend: admin endpoints SignatureTemplate CRUD | NOA-50 | Feature | High | POST/GET/PATCH/DELETE `/admin/signature-templates` |
| Backend: admin endpoint UserDocumentConfig assignment | NOA-51 | Feature | High | POST/DELETE `/admin/users/:id/document-configs` |
| Frontend: Dynamic document form renderer | NOA-52 | Feature | Urgent | Reemplaza form hardcodeado. Lee `schemaJson`, renderiza campos por `type` |
| Frontend: Admin panel — FormDefinition manager | NOA-53 | Feature | Medium | ⏸️ **PAUSED** — Onboarding via DB scripts hasta tener volumen. Phase 1: validation ✅ (760bb96). Phase 2: preview component creado pero con bug rendering (no se usa en prod). Se retoma cuando volumen de clientes justifique UI. |
| Frontend: Admin panel — SignatureTemplate manager | NOA-54 | Feature | High | Crear/editar templates con providerTemplateId + fieldMappingJson |
| Frontend: Admin panel — UserDocumentConfig assignments | NOA-55 | Feature | High | Asignar form+template a cada usuario por tipo de documento |

**Dependencias:** NOA-52 bloquea el lanzamiento. NOA-47 y NOA-48 son prerequisitos de NOA-52. NOA-49/50/51 son prerequisitos del panel admin (NOA-53/54/55).

**Nota sobre NOA-41:** El item "Document Templates" del roadmap queda absorbido por este epic. NOA-41 se puede cerrar o redirigir a NOA-46.

---

## Epic NOA-56 — Landing Page Pública NTSsign

Publicar la landing page de NTSsign (ntssign-landing-v3.html) en producción bajo ntssign.com usando SiteGround como hosting estático, con CDN de Cloudflare para máxima velocidad de carga.

### Tier 0 — Infraestructura SiteGround

| Item | Linear | Tipo | Prioridad | Notas |
|------|--------|------|-----------|-------|
| Configurar dominio ntssign.com en SiteGround | NOA-57 | Task | Urgent | Agregar ntssign.com como dominio en Site Tools → Domains |
| Instalar SSL Let's Encrypt en SiteGround para ntssign.com | NOA-58 | Task | Urgent | Site Tools → Security → SSL Manager → Let's Encrypt |
| Actualizar registros DNS en Cloudflare | NOA-59 | Task | Urgent | A record raíz (@) → IP SiteGround. Mantener app.* y api.* → Oracle VM |
| Crear archivo .htaccess con caché, gzip y headers de seguridad | NOA-60 | Task | High | Ver siteground.md para contenido exacto |
| Activar CDN Cloudflare para ntssign.com desde SiteGround | NOA-61 | Task | High | Site Tools → Speed → Cloudflare. Cache rule para /img/* |

### Tier 1 — Archivos de la landing

| Item | Linear | Tipo | Prioridad | Notas |
|------|--------|------|-----------|-------|
| Preparar carpeta de deploy: index.html + img/ | NOA-62 | Task | Urgent | Renombrar ntssign-landing-v3.html → index.html. Incluir las 4 imágenes 3D |
| Subir landing page a SiteGround via File Manager o FTP | NOA-63 | Task | Urgent | Subir index.html y carpeta img/ a public_html/ |
| Verificar carga correcta en https://ntssign.com | NOA-64 | Task | Urgent | Checklist completo: HTTPS, imágenes, dark mode, EN/ES toggle, secciones visibles |
| Verificar que app.ntssign.com y api.ntssign.com no fueron afectados | NOA-65 | Task | Urgent | Los subdominios siguen apuntando a Oracle Cloud VM |

### Tier 2 — Imágenes 3D

| Item | Linear | Tipo | Prioridad | Notas |
|------|--------|------|-----------|-------|
| Regenerar hero-3d.png a alta resolución (mínimo 2048px) | NOA-66 | Task | High | Usar prompt sin sombras/glow. Quitar fondo en Canva → PNG transparente |
| Regenerar security-3d.png a alta resolución | NOA-67 | Task | High | Mismo proceso que NOA-66 |
| Regenerar workflow-3d.png a alta resolución | NOA-68 | Task | High | Mismo proceso que NOA-66 |
| Crear y subir devices-3d.png (teléfono + laptop + tablet) | NOA-69 | Task | High | Nueva imagen. Reemplaza mockups CSS en sección devices |
| Implementar devices-3d.png en sección devices (reemplaza mockups CSS) | NOA-70 | Task | High | Ver instrucción en CLAUDE_CODE_INSTRUCTIONS.md §devices |

### Tier 3 — Optimización y SEO

| Item | Linear | Tipo | Prioridad | Notas |
|------|--------|------|-----------|-------|
| Agregar meta tags SEO a index.html | NOA-71 | Task | Medium | og:title, og:description, og:image, canonical, description, keywords |
| Crear og:image (1200×630px) para compartir en redes sociales | NOA-72 | Task | Medium | Versión de la landing adaptada a esa proporción. Generar en Canva |
| Conectar botones CTA con flujo real de signup | NOA-73 | Task | Medium | "Request access" y "Get started" deben apuntar a app.ntssign.com/request-access |
| Agregar Google Analytics o Plausible a la landing | NOA-74 | Task | Medium | Tracking de visitas, conversiones y clicks en CTA |
| PageSpeed Insights > 90 en desktop y > 75 en mobile | NOA-75 | Task | Medium | Verificar con https://pagespeed.web.dev después del deploy |
| Agregar links reales a redes sociales en el footer | NOA-76 | Task | Low | LinkedIn, Instagram, Facebook, X, YouTube de NoaTechSolutions |
| Reemplazar email placeholder con email de producción | NOA-77 | Task | Low | support@noatechsolutions.com ya está en el HTML, verificar que sea correcto |

### Tier 4 — Post-launch

| Item | Linear | Tipo | Prioridad | Notas |
|------|--------|------|-----------|-------|
| Setup pipeline de deploy automático para la landing | NOA-78 | Task | Low | GitHub Action que sube a SiteGround via FTP/SFTP en push a main |
| Agregar favicon y apple-touch-icon | NOA-79 | Task | Low | Generar en Canva desde el logo. Tamaños: 16, 32, 180, 192, 512px |
| Implementar formulario de contacto funcional | NOA-80 | Task | Low | Conectar el email "Still have questions?" con un backend o Formspree |

---

## Tier 1 — Fase 1: B2B API foundation

Requerido antes de que una integración externa pueda usar NTSSign como plataforma.

| Item | Linear | Notes |
|------|--------|-------|
| API versioning: `/v1/` global prefix | NOA-17 | `app.setGlobalPrefix('v1')` en main.ts |
| Instalar + configurar `@nestjs/swagger` | NOA-18 | Spec en `/v1/docs` (dev/staging only) |
| `ApiKey` Prisma model + migración | NOA-19 | keyHash, companyProfileId, expiresAt, revokedAt |
| Endpoints de gestión de API Keys | NOA-20 | POST + DELETE, solo MASTER |
| `ApiKeyGuard` + `AnyAuthGuard` | NOA-21 | JWT cookie OR API Key |

---

## Tier 2 — Fase 2: Outbound webhooks

Permite a clientes B2B recibir eventos de documentos en tiempo real.

| Item | Linear | Notes |
|------|--------|-------|
| `WebhookEndpoint` Prisma model + migración | NOA-22 | url, secret, events[], isActive |
| Endpoints CRUD de webhooks | NOA-23 | POST/GET/DELETE /v1/webhooks |
| `OutboundWebhookService` con HMAC-SHA256 | NOA-24 | Dispatch, firma, un retry. Hook en VIEWED/SIGNED/COMPLETED/CANCELLED |

---

## Tier 3 — Hardening

No bloquea el B2B inicial pero necesario antes de escalar.

| Item | Linear | Notes |
|------|--------|-------|
| Rate limiting por tenant (@nestjs/throttler) | NOA-25 | Keyed por companyProfileId |
| Correlation IDs (X-Request-Id) | NOA-26 | Propagado en logs |
| Webhook retry queue (Bull + Redis) | NOA-27 | Exponential backoff, dead-letter |
| Audit Log model en DB | NOA-28 | Envíos, cancelaciones, keys |
| Row-Level Security en PostgreSQL | NOA-29 | Defense-in-depth multi-tenant |
| Aumentar cobertura de tests a 70% | NOA-30 | DocumentsService + BillingService |

---

## Deuda Técnica

| Item | Linear | Riesgo |
|------|--------|--------|
| `loadWorkspace` hace 7 requests paralelos | NOA-31 | Medio — un fallo de billing rompe todo el dashboard |
| BOLDSIGN_WEBHOOK_SECRET sin validación en startup | NOA-32 | Medio — fallo silencioso en webhooks si no está seteado |
| Sin connection pooling config en Prisma | NOA-33 | Bajo — pool default insuficiente bajo carga |
| Migrar metadata keys de BoldSign: noasign → ntssign | NOA-12 | Medio — requiere migración de datos en BoldSign |

---

## Roadmap de Producto

Ordenado por prioridad e impacto en competitividad. Las primeras tres features forman el núcleo diferenciador.

### Fase A — Núcleo CRM (base de todo lo demás)

| Item | Linear | Notes |
|------|--------|-------|
| Customer Management — CRM-lite de contactos | NOA-40 | CRUD de clientes, pre-fill en wizard, historial por cliente |
| Document Templates — plantillas reutilizables | NOA-41 | Asocia BoldSign template ID, flujo de 3 clicks |
| Recordatorios automáticos de firma pendiente | NOA-42 | Cron job + BoldSign reminder API, configurable por workspace |

### Fase B — Escala y diferenciación

| Item | Linear | Notes |
|------|--------|-------|
| Bulk Send — envío masivo a múltiples clientes | NOA-43 | Requiere NOA-40 + NOA-41. N documentos en una operación |
| Multi-signer — firmantes múltiples con orden | NOA-44 | Secuencial o paralelo. BoldSign ya lo soporta |
| Landing page pública NTSsign | NOA-39 | ✅ Landing v1 completada · ✅ EN/ES bilingüe · ✅ Dark/light mode · ✅ Deploy en SiteGround · ⬜ SEO (NOA-71) · ⬜ Analytics (NOA-74) · ⬜ CTAs (NOA-73) · ⬜ Pipeline (NOA-78) |

### Fase C — Experiencia avanzada

| Item | Linear | Notes |
|------|--------|-------|
| Portal de firma white-label por tenant | NOA-34 | Logo, colores, dominio propio para el firmante |
| Organización de documentos — carpetas/proyectos | NOA-45 | Se potencia con Customer Management |
| Dashboard de analytics por tenant | NOA-36 | Docs enviados/firmados, tiempo promedio de firma |
| Notificaciones por email nativos | NOA-35 | Recordatorios de vencimiento, avisos al owner |
| Exportación masiva de PDFs firmados | NOA-37 | ZIP descargable por período, útil para auditorías |

### Pendientes de linking

| Item | Linear | Notes |
|------|--------|-------|
| Link CTA signature-complete → landing page | NOA-38 | Requiere NOA-39 (landing page) |

---

## Completado

- ✅ Multi-tenant document lifecycle (DRAFT → COMPLETED → CANCELLED)
- ✅ BoldSign integration (create, send, webhook, PDF download)
- ✅ Usage-based billing with overage
- ✅ User management con roles MASTER / ADMIN / USER
- ✅ Company profile management
- ✅ Account request intake flow
- ✅ Password reset flow (secure token, 30-min expiry)
- ✅ simulate-* endpoints blocked in production
- ✅ PUBLIC_LINK_SECRET separado de JWT_SECRET
- ✅ `lastSentRecipientEmail` — resend cooldown bypass al cambiar email
- ✅ CI pipeline (tests + lint en cada PR)
- ✅ Deploy pipeline staging (SSH a Oracle VM en push a `develop`)
- ✅ Deploy pipeline prod (SSH a Oracle VM en push a `main`)
- ✅ Production environment live: api.ntssign.com + app.ntssign.com
- ✅ Staging environment live: api-staging.ntssign.com + app-staging.ntssign.com
- ✅ SSL/HTTPS con Let's Encrypt + renovación automática
- ✅ Rename completo de noasign → ntssign en codebase (cookie, localStorage, eventos, emails)
- ✅ Documentación completa de arquitectura, deployment y producto
- ✅ Linear configurado como sistema de tracking (NOA-1 en adelante)
- ✅ Startup validation: fail-fast si faltan variables de entorno críticas (NOA-13)
- ✅ BOLDSIGN_WEBHOOK_SECRET validado en startup (NOA-32)
- ✅ Dashboard optimizado: static data cacheado con useRef, 9 requests → 4 en refreshes (NOA-31)
- ✅ Signature-complete page redesign: 2 columnas, dark/light mode, brand colors, responsive
- ✅ @custom-variant dark en globals.css — dark: variants funcionan con next-themes en toda la app
