// Characterization test — pins the document-lifecycle invariants that
// docs/architecture/document-lifecycle.md documents against the ACTUAL code.
//
// Why this exists: a business-rule doc can silently drift from the code (it did —
// the 2026-07-14 lifecycle note mis-described Discard because B7 changed the code
// under it). A prose doc can't defend itself; these are the *mechanical* claims of
// that doc, pinned so a code change that breaks them turns a test RED with a pointer
// to the doc — instead of the doc quietly starting to lie.
//
// Pure unit test: reads the generated Prisma enum, no DB, no app boot.
import { DocumentStatus } from '@prisma/client';

const DOC = 'docs/architecture/document-lifecycle.md';

describe(`document-lifecycle invariants (see ${DOC})`, () => {
  it('DocumentStatus enum has EXACTLY the documented values', () => {
    // document-lifecycle.md §"Status lifecycle" lists these verbatim.
    const documented = [
      'DRAFT',
      'SENT',
      'SEND_FAILED',
      'VIEWED',
      'SIGNED',
      'COMPLETED',
      'CANCELLED',
    ].sort();
    const actual = Object.values(DocumentStatus).sort();

    if (JSON.stringify(actual) !== JSON.stringify(documented)) {
      throw new Error(
        `DocumentStatus drifted from ${DOC}.\n` +
          `  documented: ${documented.join(', ')}\n` +
          `  actual:     ${actual.join(', ')}\n` +
          `→ update ${DOC} to match the new reality, THEN update this list.`,
      );
    }
  });

  it('VOID is intentionally NOT a status value (it is derived from supersededAt)', () => {
    // document-lifecycle.md §"Why three mechanisms": VOID must NEVER become an enum
    // value — the single source of truth is the supersession link. If someone adds a
    // VOID status, this fails on purpose so they read the doc before "fixing" it.
    if (Object.values(DocumentStatus).includes('VOID' as DocumentStatus)) {
      throw new Error(
        `A 'VOID' value was added to DocumentStatus. ${DOC} §"Why three mechanisms" ` +
          `explains VOID is DERIVED from supersededAt (one source of truth), not a status. ` +
          `→ read that section before adding a VOID status.`,
      );
    }
  });
});
