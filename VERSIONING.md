# Versioning — NTSsign

Format: **MAJOR.MINOR.PATCH** (Semantic Versioning).

- **PATCH** (`2.0.0 → 2.0.1`): bug fixes, no API/behavior changes.
- **MINOR** (`2.0.0 → 2.1.0`): new backwards-compatible features.
- **MAJOR** (`2.0.0 → 3.0.0`): breaking changes / large redesigns.

## Single source of truth

The version lives in **`apps/frontend/package.json`** (and `apps/backend/package.json`,
kept in sync). The dashboard footer reads it at build time:

- `apps/frontend/next.config.ts` exposes it as `NEXT_PUBLIC_APP_VERSION`.
- `Sidebar.tsx` renders `NTSsign v{NEXT_PUBLIC_APP_VERSION} · By NoaTechSolutions`.

Never hardcode the version in components — bump `package.json` only.

## Release process (to production)

**On `develop` (staging):**
1. Bump `version` in `apps/frontend/package.json` **and** `apps/backend/package.json`.
2. Add the release notes to `CHANGELOG.md`.
3. Commit: `chore(release): vX.Y.Z`.
4. Push `develop` → auto-deploys to **staging**. Verify there.

**On `main` (production) — when the release is ready to ship:**
5. Merge `develop` → `main` and push → auto-deploys to **production**.
6. Tag the production commit and push the tag:
   ```bash
   git tag -a vX.Y.Z -m "Release X.Y.Z — <summary>"
   git push origin vX.Y.Z
   ```

> The tag marks the commit that ships to **production** (`main`) — created at the
> prod release, NOT on `develop`. Staging deploys from `develop`, production from
> `main`. A tag push does **not** trigger any deploy on its own.

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) — keep an entry per released version.
