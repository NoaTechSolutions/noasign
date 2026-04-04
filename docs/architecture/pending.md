# NTSsign — Pending Work

Last updated: 2026-04-04

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

## Ideas de Producto (Futuro)

| Item | Linear | Notes |
|------|--------|-------|
| Portal de firma white-label por tenant | NOA-34 | Logo, colores, dominio propio para el firmante |
| Notificaciones por email nativos | NOA-35 | Recordatorios de vencimiento, avisos al owner |
| Dashboard de analytics por tenant | NOA-36 | Docs enviados/firmados, tiempo promedio de firma |
| Exportación masiva de PDFs firmados | NOA-37 | ZIP descargable por período, útil para auditorías |

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
- ✅ Deploy pipeline staging (SSH a Oracle VM en push a `staging`)
- ✅ Deploy pipeline prod (SSH a Oracle VM en push a `main`)
- ✅ Staging environment live: api-staging.ntssign.com + app-staging.ntssign.com
- ✅ SSL/HTTPS con Let's Encrypt + renovación automática
- ✅ Rename completo de noasign → ntssign en codebase (cookie, localStorage, eventos, emails)
- ✅ Documentación completa de arquitectura, deployment y producto
- ✅ Linear configurado como sistema de tracking (NOA-1 en adelante)
