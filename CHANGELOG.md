# Changelog

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
