# NTSsign Landing Page — SiteGround Hosting Setup

> **Objetivo:** Hospedar `ntssign-landing-v3.html` como sitio estático en SiteGround bajo `ntssign.com`, mientras `app.ntssign.com` y `api.ntssign.com` siguen apuntando a Oracle Cloud VM.

---

## Arquitectura final después de este setup

```
Internet
  ↓
Cloudflare DNS
  ├── ntssign.com          → SiteGround (landing estática)
  ├── app.ntssign.com      → Oracle Cloud VM (Next.js frontend :3001)
  └── api.ntssign.com      → Oracle Cloud VM (NestJS backend :3000)
```

---

## Paso 1 — Preparar los archivos para subir

En tu máquina local, crea esta estructura de carpetas:

```
ntssign-landing/
├── index.html              ← renombra ntssign-landing-v3.html a index.html
└── img/
    ├── logo-transparent.svg
    ├── logo-dark.svg
    ├── hero-3d.png
    ├── security-3d.png
    ├── workflow-3d.png
    └── devices-3d.png
```

**IMPORTANTE:** El archivo HTML debe llamarse `index.html` para que SiteGround lo sirva como página principal del dominio.

---

## Paso 2 — Subir archivos a SiteGround

### Opción A — File Manager (más fácil)

1. Entra a **SiteGround → Site Tools → File Manager**
2. Navega a `public_html/` (o la carpeta raíz del dominio ntssign.com)
3. Si la carpeta está vacía o tiene archivos viejos, limpia primero
4. Sube `index.html` directamente
5. Crea la carpeta `img/` dentro de `public_html/`
6. Sube todos los archivos de la carpeta `img/` dentro de `public_html/img/`

### Opción B — FTP (más rápido para muchos archivos)

Credenciales en SiteGround → Site Tools → FTP Accounts:

```
Host:     ftp.noatechsolutions.com
Usuario:  ntssign-deploy@noatechsolutions.com
Password: (guardado en GitHub secret SITEGROUND_PASSWORD)
Puerto:   21 (FTP)
Directorio remoto: /ntssign/
```

> **Nota:** SiteGround shared hosting usa FTP en el puerto 21. El puerto 22 (SFTP) está bloqueado en shared hosting.

Sube toda la carpeta `ntssign-landing/` con FileZilla u otro cliente FTP.

### Opción C — Deploy automático vía GitHub Actions

El workflow `.github/workflows/deploy-landing.yml` se dispara en cada push a `main` que toque `apps/frontend/**` o los scripts de export. Usa `SamKirkland/FTP-Deploy-Action@v4.3.5` contra `ftp.noatechsolutions.com:21` con los secrets `SITEGROUND_USER` y `SITEGROUND_PASSWORD`.

---

## Paso 3 — Configurar el dominio ntssign.com en SiteGround

Si ntssign.com no está aún en SiteGround:

1. **SiteGround → Site Tools → Domains → Add Domain**
2. Agrega `ntssign.com` como dominio adicional o principal
3. SiteGround te dará los nameservers o una IP para apuntar el dominio

Si ya tienes el dominio en Cloudflare (según la documentación actual), **no muevas los nameservers** — solo cambia el registro A (ver Paso 5).

---

## Paso 4 — Activar HTTPS en SiteGround

1. **SiteGround → Site Tools → Security → SSL Manager**
2. Selecciona el dominio `ntssign.com`
3. Instala **Let's Encrypt** (gratis) → clic en "Get"
4. Activa **Force HTTPS** para redirigir todo HTTP → HTTPS automáticamente

---

## Paso 5 — Configurar DNS en Cloudflare

En tu panel de Cloudflare para `ntssign.com`, actualiza los registros DNS:

| Tipo | Nombre | Contenido | Proxy | Descripción |
|------|--------|-----------|-------|-------------|
| A | `@` (raíz) | `IP de SiteGround` | ✅ Proxied | Landing page |
| A | `www` | `IP de SiteGround` | ✅ Proxied | Redirect a raíz |
| A | `app` | `IP de Oracle VM` | ✅ Proxied | Frontend Next.js |
| A | `api` | `IP de Oracle VM` | ✅ Proxied | Backend NestJS |

**Para encontrar la IP de SiteGround:**
SiteGround → Site Tools → Dashboard → la IP aparece en "Server Information"

**SSL en Cloudflare:** Mantén en `Full (strict)` — SiteGround ya tiene Let's Encrypt instalado.

---

## Paso 6 — Crear .htaccess para optimización

Crea un archivo `.htaccess` en `public_html/` con este contenido:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Force www redirect (opcional — elige uno)
# RewriteCond %{HTTP_HOST} !^www\. [NC]
# RewriteRule ^(.*)$ https://www.%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Cache de imágenes — 1 año
<FilesMatch "\.(png|jpg|jpeg|gif|svg|webp|ico)$">
  Header set Cache-Control "max-age=31536000, public, immutable"
</FilesMatch>

# Cache de HTML — revalidar siempre
<FilesMatch "\.html$">
  Header set Cache-Control "no-cache, must-revalidate"
</FilesMatch>

# Compresión gzip
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>

# Seguridad básica
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options SAMEORIGIN
Header always set Referrer-Policy strict-origin-when-cross-origin
```

---

## Paso 7 — Activar Cloudflare CDN en SiteGround

SiteGround tiene integración nativa con Cloudflare:

1. **SiteGround → Site Tools → Speed → Cloudflare**
2. Si el dominio ya está en Cloudflare, conecta la cuenta
3. Activa **"Auto Minify"** para HTML, CSS y JS
4. Activa **"Browser Cache TTL"** → 1 year para assets estáticos
5. En Cloudflare → **Caching → Cache Rules** → agrega regla:
   - URL: `ntssign.com/img/*`
   - Cache level: Cache Everything
   - Edge TTL: 1 month

---

## Paso 8 — Verificar que todo funciona

Checklist post-deploy:

- [ ] `https://ntssign.com` carga la landing correctamente
- [ ] `https://www.ntssign.com` redirige a `https://ntssign.com`
- [ ] `https://app.ntssign.com` sigue abriendo la app Next.js
- [ ] `https://api.ntssign.com` sigue respondiendo el backend
- [ ] Las imágenes 3D cargan nítidas (sin compresión de Next.js)
- [ ] Dark mode funciona
- [ ] Toggle EN/ES funciona
- [ ] Formulario de contacto (si aplica) funciona
- [ ] HTTPS activo (candado verde en el navegador)
- [ ] PageSpeed Insights > 90 en desktop

**Herramientas de verificación:**
- PageSpeed: https://pagespeed.web.dev
- SSL check: https://www.ssllabs.com/ssltest/
- Headers: https://securityheaders.com

---

## Ventajas de este setup

| Aspecto | Antes | Después |
|---------|-------|---------|
| Landing speed | Oracle VM (app server) | SiteGround CDN + Cloudflare |
| Imágenes 3D | Comprimidas por Next.js | Servidas como PNG puro desde CDN |
| SSL landing | Pendiente | Let's Encrypt automático |
| Separación de responsabilidades | Todo en Oracle VM | Landing estática separada de la app |
| Costo | Oracle VM carga con todo | Landing en hosting ya pagado |

---

*Documento creado: Abril 2026 | Relacionado con: production.md, overview.md*
