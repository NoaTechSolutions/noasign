# Linear Tasks — Landing Page + SiteGround Setup

> Proyecto: NTSSign | Equipo: NoaTechSolutions
> Epic nuevo: **NOA-56 — Landing Page Pública**
> Agregar estas tareas en Linear en el orden indicado.

---

## Epic NOA-56 — Landing Page Pública NTSsign

**Descripción del epic:**
Publicar la landing page de NTSsign (ntssign-landing-v3.html) en producción bajo ntssign.com usando SiteGround como hosting estático, con CDN de Cloudflare para máxima velocidad de carga.

---

### Tier 0 — Infraestructura SiteGround

| # | Título | Tipo | Prioridad | Notas |
|---|--------|------|-----------|-------|
| NOA-57 | Configurar dominio ntssign.com en SiteGround | Task | Urgent | Agregar ntssign.com como dominio en Site Tools → Domains |
| NOA-58 | Instalar SSL Let's Encrypt en SiteGround para ntssign.com | Task | Urgent | Site Tools → Security → SSL Manager → Let's Encrypt |
| NOA-59 | Actualizar registros DNS en Cloudflare | Task | Urgent | A record raíz (@) → IP SiteGround. Mantener app.* y api.* → Oracle VM |
| NOA-60 | Crear archivo .htaccess con caché, gzip y headers de seguridad | Task | High | Ver siteground-landing-setup.md para contenido exacto |
| NOA-61 | Activar CDN Cloudflare para ntssign.com desde SiteGround | Task | High | Site Tools → Speed → Cloudflare. Cache rule para /img/* |

---

### Tier 1 — Archivos de la landing

| # | Título | Tipo | Prioridad | Notas |
|---|--------|------|-----------|-------|
| NOA-62 | Preparar carpeta de deploy: index.html + img/ | Task | Urgent | Renombrar ntssign-landing-v3.html → index.html. Incluir las 4 imágenes 3D |
| NOA-63 | Subir landing page a SiteGround via File Manager o FTP | Task | Urgent | Subir index.html y carpeta img/ a public_html/ |
| NOA-64 | Verificar carga correcta en https://ntssign.com | Task | Urgent | Checklist completo: HTTPS, imágenes, dark mode, EN/ES toggle, secciones visibles |
| NOA-65 | Verificar que app.ntssign.com y api.ntssign.com no fueron afectados | Task | Urgent | Los subdominios siguen apuntando a Oracle Cloud VM |

---

### Tier 2 — Imágenes 3D

| # | Título | Tipo | Prioridad | Notas |
|---|--------|------|-----------|-------|
| NOA-66 | Regenerar hero-3d.png a alta resolución (mínimo 2048px) | Task | High | Usar prompt sin sombras/glow. Quitar fondo en Canva → PNG transparente |
| NOA-67 | Regenerar security-3d.png a alta resolución | Task | High | Mismo proceso que NOA-66 |
| NOA-68 | Regenerar workflow-3d.png a alta resolución | Task | High | Mismo proceso que NOA-66 |
| NOA-69 | Crear y subir devices-3d.png (teléfono + laptop + tablet) | Task | High | Nueva imagen. Reemplaza mockups CSS en sección devices |
| NOA-70 | Implementar devices-3d.png en sección devices (reemplaza mockups CSS) | Task | High | Ver instrucción en CLAUDE_CODE_INSTRUCTIONS.md §devices |

---

### Tier 3 — Optimización y SEO

| # | Título | Tipo | Prioridad | Notas |
|---|--------|------|-----------|-------|
| NOA-71 | Agregar meta tags SEO a index.html | Task | Medium | og:title, og:description, og:image, canonical, description, keywords |
| NOA-72 | Crear og:image (1200×630px) para compartir en redes sociales | Task | Medium | Versión de la landing adaptada a esa proporción. Generar en Canva |
| NOA-73 | Conectar botones CTA con flujo real de signup | Task | Medium | "Request access" y "Get started" deben apuntar a app.ntssign.com/request-access |
| NOA-74 | Agregar Google Analytics o Plausible a la landing | Task | Medium | Tracking de visitas, conversiones y clicks en CTA |
| NOA-75 | PageSpeed Insights > 90 en desktop y > 75 en mobile | Task | Medium | Verificar con https://pagespeed.web.dev después del deploy |
| NOA-76 | Agregar links reales a redes sociales en el footer | Task | Low | LinkedIn, Instagram, Facebook, X, YouTube de NoaTechSolutions |
| NOA-77 | Reemplazar email placeholder con email de producción | Task | Low | support@noatechsolutions.com ya está en el HTML, verificar que sea correcto |

---

### Tier 4 — Post-launch

| # | Título | Tipo | Prioridad | Notas |
|---|--------|------|-----------|-------|
| NOA-78 | Setup pipeline de deploy automático para la landing | Task | Low | GitHub Action que sube a SiteGround via FTP/SFTP en push a main |
| NOA-79 | Agregar favicon y apple-touch-icon | Task | Low | Generar en Canva desde el logo. Tamaños: 16, 32, 180, 192, 512px |
| NOA-80 | Implementar formulario de contacto funcional | Task | Low | Conectar el email "Still have questions?" con un backend o Formspree |

---

## Orden de ejecución recomendado

```
Semana 1:
  NOA-57 → NOA-58 → NOA-59 (infraestructura DNS/SSL)
  NOA-62 → NOA-63 → NOA-64 → NOA-65 (subir y verificar landing)

Semana 2:
  NOA-66 → NOA-67 → NOA-68 → NOA-69 → NOA-70 (imágenes HD)
  NOA-60 → NOA-61 (optimización caché y CDN)

Semana 3+:
  NOA-71 → NOA-72 → NOA-73 → NOA-74 → NOA-75 (SEO y analytics)
  NOA-76 → NOA-77 → NOA-79 (detalles finales)
  NOA-78 → NOA-80 (automatización)
```

---

## Documentación a actualizar

Después de completar el Tier 0 y Tier 1, actualizar estos archivos en el repo:

### `docs/production.md`
Agregar sección nueva al inicio:

```markdown
## Landing Page (ntssign.com)

La landing page pública está hospedada como sitio estático 
en SiteGround, separada de la aplicación Next.js.

- URL: https://ntssign.com
- Hosting: SiteGround (static files)
- Archivos: index.html + img/ en public_html/
- CDN: Cloudflare (activo)
- SSL: Let's Encrypt (renovación automática)
- Deploy: manual via File Manager o FTP
  (pipeline automático pendiente — NOA-78)
```

### `docs/overview.md`
Actualizar el diagrama de arquitectura:

```
Internet
  ↓
Cloudflare DNS
  ├── ntssign.com     → SiteGround (landing estática HTML/CSS/JS)
  ├── app.ntssign.com → Oracle Cloud VM (Next.js :3001)
  └── api.ntssign.com → Oracle Cloud VM (NestJS :3000)
```

### `docs/roadmap.md`
En la sección "Landing page pública" (NOA-39), marcar como:
- ✅ Landing page v1 — completada (ntssign-landing-v3.html)
- ✅ EN/ES bilingüe
- ✅ Dark/light mode
- ✅ Deploy en SiteGround
- ⬜ SEO meta tags (NOA-71)
- ⬜ Analytics (NOA-74)
- ⬜ CTAs conectados (NOA-73)
- ⬜ Pipeline automático (NOA-78)

### `docs/pending.md`
Agregar el epic NOA-56 con todas las tareas de este documento.

---

*Documento creado: Abril 2026*
