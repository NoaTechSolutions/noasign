/**
 * Text formatters for form input fields. Each function is idempotent (calling
 * it twice with its own output produces the same result) and safe to wire as
 * an onChange transform without breaking caret behavior for typical typing.
 */

/** Title Case — capitalize the first letter of every word. Subsequent letters
 *  are left untouched, so pasting all-caps text stays all-caps. */
export function formatTitleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Sentence case — capitalize the first letter of the string only. */
export function formatSentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** US state code — strip non-letters, uppercase, truncate to 2 characters. */
export function formatState(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
}
