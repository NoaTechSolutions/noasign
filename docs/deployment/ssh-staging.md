# Guía de conexión SSH a Staging

> VM de staging en **Oracle Cloud** (Ubuntu 22.04). Toda la info de acá es
> NO-secreta. La clave privada (`~/.ssh/staging_vm`) y el contenido del `.env`
> viven solo en la máquina del owner / en el VM — nunca en el repo.

## Datos de conexión

| Dato | Valor |
|---|---|
| Host / IP | `163.192.12.220` |
| Usuario SSH | `ubuntu` |
| Puerto SSH | `22` (default) |
| Autenticación | Clave SSH (ed25519) — `~/.ssh/staging_vm` (en la máquina del owner) |
| Proveedor | Oracle Cloud VM |
| Ruta del proyecto | `~/apps/ntssign` → backend en `~/apps/ntssign/apps/backend` |
| Process manager | pm2 (`ntssign-backend`, `ntssign-frontend`) |

> El deploy NO se hace por SSH: un **self-hosted GitHub runner** corre dentro
> del VM y se dispara con cada push a `develop`. Este SSH es para tareas
> manuales (scripts one-shot, logs, etc.).

---

## 1. Conectarse

Desde Git Bash / PowerShell (OpenSSH) en la máquina del owner:

```bash
ssh -i ~/.ssh/staging_vm ubuntu@163.192.12.220
```

- El puerto es el 22 (default), no hace falta `-p`.
- En Windows `~` = `C:\Users\<tu-usuario>`. Si `~` no resuelve, usá la ruta
  completa:
  ```bash
  ssh -i C:/Users/15107/.ssh/staging_vm ubuntu@163.192.12.220
  ```

Primera vez: va a pedir confirmar el fingerprint del host → escribí `yes`.

---

## 2. Una vez adentro

```bash
# Ir al backend (donde viven los scripts y el .env)
cd ~/apps/ntssign/apps/backend

# Estado de las apps
pm2 status

# Logs en tiempo real (Ctrl+C para salir)
pm2 logs ntssign-backend
pm2 logs ntssign-frontend

# Confirmar la rama/commit desplegado
git -C ~/apps/ntssign log --oneline -1
```

El `.env` de backend ya está en `~/apps/ntssign/apps/backend/.env` (lo preserva
el deploy). Los scripts lo cargan solos vía `dotenv`, así que **no** necesitás
exportar `DATABASE_URL` a mano.

---

## 3. Ejemplo concreto: backfill de overage

> Corrige los tenants que quedaron con el `overagePrice = $5` (default filtrado)
> al precio canónico de su plan. Solo toca los de `$5` exactos; cualquier otro
> valor (override deliberado) lo lista pero NO lo toca.

```bash
cd ~/apps/ntssign/apps/backend

# 1) DRY-RUN primero (preview, NO escribe nada) — revisá la salida
DRY_RUN=true node scripts/backfill-overage.js

# 2) Si la lista "TO FIX" es correcta, recién entonces aplicar:
DRY_RUN=false node scripts/backfill-overage.js
```

- Requiere el backend buildeado (`dist/billing/plan-defaults`) → ya existe
  porque el deploy corre `nest build`.
- **Siempre dry-run primero.** Pasale la salida al owner antes de aplicar.

---

## 4. Troubleshooting

| Síntoma | Qué revisar |
|---|---|
| `Permission denied (publickey)` | ¿Estás usando `-i ~/.ssh/staging_vm`? ¿La clave existe y tiene permisos correctos? En Windows, asegurate de que el archivo no sea world-readable. |
| `Connection timed out` | (a) ¿IP correcta `163.192.12.220`? (b) **Oracle Cloud Security List / NSG** — el puerto 22 tiene que permitir tu IP pública. Si cambiaste de red/IP, agregá tu IP al ingress 22 en la consola de Oracle. |
| `Connection refused` | El VM puede estar reiniciándose o sshd caído. Esperá y reintentá. Las reglas iptables del VM mantienen 22/80/443 abiertos. |
| Conecta pero los comandos `pm2`/`node` no existen | nvm no cargó en la shell no-interactiva. Corré `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`. |
| `Host key verification failed` | Cambió la host key del VM (reinstalación). Borrá la línea vieja: `ssh-keygen -R 163.192.12.220` y reconectá. |

---

## 5. ¿El script backfill está en el VM?

**SÍ.** `apps/backend/scripts/backfill-overage.js` está **trackeado en git**, así
que llega al VM con cada deploy (`git reset --hard origin/develop`). No hay que
copiarlo ni generarlo a mano.

> (Distinto de `seed-receipts-test-data.js` y `setup-billing-test-tenants.js`,
> que SÍ están untracked y NO están en el VM.)

---

## Notas

- Comandos útiles extra (nginx, certbot, pm2 restart) están en
  [`staging.md`](./staging.md).
- ⚠️ `staging.md` línea 10 dice que el deploy se dispara con push a `staging`,
  pero el workflow real escucha `develop` (`.github/workflows/deploy-staging.yml`).
  Corregir cuando se toque ese doc.
