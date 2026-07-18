# Legal acceptance — Terms/Privacy versioned acceptance

## The problem this solves

NTSsign has real clients in production signing contracts, but the product captured
**no** acceptance of Terms/Privacy and **no** ESIGN consent anywhere (verified: no
schema field, dead footer links, no checkbox at signup). Real Terms/Privacy/Cookie
pages **do** exist (`app/(marketing)/terms|privacy|cookies`, NTSsign-specific, written
2026-04-15) and are live at `app.ntssign.com/terms` — but self-declared *interim,
pending legal review*, `noindex`, and **never accepted by anyone**.

⚠️ **The content (what the terms say) is the lawyer's job. The mechanism (how
acceptance is captured) is ours** — and a well-built mechanism reduces what the text
has to cover.

## The model — three roles, one truth each (no duplication)

| Role | Where | Why |
|---|---|---|
| **SOURCE** (edited) | Versioned markdown in the repo (`legal/…`) | One writer = a PR the lawyer reviews as a **diff**. Not a DB row, not JSX. |
| **RENDER** (what the user reads) | The app's `/terms` `/privacy` pages render the active version | ONE rendered page. The **landing keeps NO copy** — its footer links to the app URL. Kills the landing↔app divergence. |
| **PUBLISHED / AUDIT** (what was accepted) | A **frozen, append-only DB row** (text + sha256 hash) | Years later, a dispute over v1 → show the exact frozen row; the hash proves it wasn't changed. |

They don't diverge because: the landing has no copy (links only), and the DB rows are
**immutable snapshots** — a change is a NEW version, never an edit (same pattern as the
`supersededAt`/VOID model).

## Versioned, NOT a boolean

🔴 The error everyone makes: storing `acceptedTerms: true`. It doesn't say **to what**.
The record must answer, in 2 years: *who accepted WHICH VERSION, WHEN, from WHAT IP, and
what did that version say?*

### Schema (`prisma/schema.prisma`, migration `20260718000000_add_legal_acceptance`)

- **`LegalDocumentVersion`** — append-only frozen versions: `docType` (TERMS/PRIVACY/COOKIES),
  `version` (human label), `contentHash` (sha256), `content` (frozen text), `publishedAt`,
  `isActive` (the current one, one per docType), `requiresReacceptance` (material change →
  re-accept), `isDraft`.
- **`LegalAcceptance`** — append-only: `userId`, `versionId` (FK → the frozen version),
  `docType`, `acceptedAt`, `ipAddress`, `userAgent`. The `versionId` FK + the frozen row
  ARE the proof — never a bare boolean.

## "The content is the gate, not the code"

The mechanism is **content-agnostic** — it's built and tested now against a **DRAFT**
version (`isDraft = true`). ⚠️ **A draft version must NEVER be activated in production** —
users would "accept" unreviewed text (false acceptance). Publishing a real version in prod
waits for the lawyer's approval. The code is ready; the **content** is the gate.

## The popup (mechanism)

At first login and **every time the active version changes** (material), a **blocking**
popup: checkbox **not pre-checked** (accepting is an act of the user), links open the
**exact version being accepted**. On accept → a `LegalAcceptance` row (with IP). The links
**must work** — if the copy says "I have read the Terms" and the link 404s, the copy lies
(same rule as "cannot be undone" that could be undone). This is red-testable at the backend:
the active version must be servable, or the accept flow errors.

## What this doc does NOT decide (owner + lawyer)

- **The text itself** — the lawyer reviews/corrects the existing pages (they are the base
  draft, not a throwaway) against the checklist in the Drive legal package.
- **The rollout to existing users** — real clients are working; a hard block would be worse
  than the problem. The mechanism supports a staged rollout (grace window → block at a
  legally-significant action, never locking someone out of their own data), but the **grace
  period and what retroactive acceptance covers** are an owner + lawyer decision.
- **The live pages** — left live for now (no one reaches them: dead-then-fixed links +
  `noindex`); the lawyer reviews. Taking them down would leave the owner with nothing, worse
  than interim text.

## Related
- The `IssueDateDisclaimerModal` (back-dating acknowledgement) already states the `createdAt`
  vs `issueDate` fact to the user — see [F3 / date transparency] (audit-trail step pending).
- [document-lifecycle.md](document-lifecycle.md) for the immutable-published-record pattern.
